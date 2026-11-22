'use strict';

const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');
const db      = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const upload  = require('../middleware/upload');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function callML(endpoint, body) {
  const res = await fetch(`${ML_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ML responded ${res.status}`);
  return res.json();
}

async function sendRejectionEmail(to, title) {
  if (!to || !process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to: [to],
      subject: 'BagCheck report could not be published',
      text: `Your report "${title}" was not published because it did not appear to describe a lost or found item.`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
}

// ── GET /api/reports ────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, university_id, campus_id, category, keyword, dateRange, status, page = 1, limit = 20 } = req.query;

    let q = db('reports as r')
      .leftJoin('universities as u', 'u.id', 'r.university_id')
      .leftJoin('campuses as c',      'c.id', 'r.campus_id')
      .leftJoin('users as usr',       'usr.id', 'r.user_id')
      .select(
        'r.*',
        'u.name as university_name', 'u.short_name as university_short_name',
        'c.name as campus_name',
        'usr.name as user_name'
      );

    // Public: only approved active items
    if (!req.user) {
      q = q.where('r.moderation_status', 'Approved').where('r.status', 'Active');
    } else {
      q = q.whereNot('r.status', 'Deleted');
    }

    if (type)          q = q.where('r.type', type);
    if (university_id) q = q.where('r.university_id', parseInt(university_id, 10));
    if (campus_id)     q = q.where('r.campus_id',     parseInt(campus_id, 10));
    if (category)      q = q.where('r.category', category);
    if (status && req.user) q = q.where('r.status', status);
    if (keyword) {
      q = q.where((builder) => {
        builder.whereILike('r.title', `%${keyword}%`).orWhereILike('r.description', `%${keyword}%`);
      });
    }
    if (dateRange && dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : 30;
      q = q.whereRaw(`r.created_at >= datetime('now', '-${days} days')`);
    }

    const countQ  = q.clone().clearSelect().count('r.id as total').first();
    const countRow = await countQ;
    const total    = parseInt(countRow.total, 10);

    const pageNum = Math.max(1, parseInt(page, 10));
    const lim     = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const rows    = await q.orderBy('r.created_at', 'desc').limit(lim).offset((pageNum - 1) * lim);

    return res.json({
      data:       rows,
      pagination: { total, page: pageNum, limit: lim, pages: Math.ceil(total / lim) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/reports ───────────────────────────────────────────────────────
router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { type, title, description, category, university_id, campus_id, location, event_date, contact_email } = req.body;

    if (!type || !title || !description)
      return res.status(400).json({ error: 'type, title and description are required' });
    if (!['Lost', 'Found'].includes(type))
      return res.status(400).json({ error: "type must be 'Lost' or 'Found'" });

    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    const [reportId] = await db('reports').insert({
      user_id:           req.user.id,
      type,
      title,
      description,
      category:          category || 'General',
      university_id:     university_id ? parseInt(university_id, 10) : null,
      campus_id:         campus_id    ? parseInt(campus_id,    10) : null,
      location:          location     || null,
      event_date:        event_date   || null,
      photo_url,
      contact_email:     contact_email || req.user.email,
      status:            'Active',
      moderation_status: 'Pending',
    });

    let moderated  = false;
    let matchList  = [];

    // ── ML Moderation ──────────────────────────────────────────────────────
    try {
      const modResult = await callML('/api/moderate', { title, description });
      moderated = true;

      if (modResult.relevant === false) {
        await db('reports').where({ id: reportId }).update({ moderation_status: 'Rejected', status: 'Deleted' });
        sendRejectionEmail(contact_email || req.user.email, title).catch((emailErr) => {
          console.warn('Rejection email unavailable:', emailErr.message);
        });
      } else {
        await db('reports').where({ id: reportId }).update({ moderation_status: 'Approved' });

        // ── ML Matching ──────────────────────────────────────────────────
        try {
          const matchResult = await callML('/api/match', {
            report_id: reportId,
            title,
            description,
            category:  category || 'General',
            campus_id: campus_id ? parseInt(campus_id, 10) : -1,
            type,
          });

          const matched = Array.isArray(matchResult.matches) ? matchResult.matches : [];
          for (const m of matched) {
            if (m.report_id && m.score !== undefined) {
              await db('matches').insert({ report_a_id: reportId, report_b_id: m.report_id, score: m.score });
              matchList.push(m);
            }
          }
        } catch (mErr) {
          console.warn('ML match unavailable:', mErr.message);
        }
      }
    } catch (modErr) {
      // ML down — approve by default
      console.warn('ML moderation unavailable:', modErr.message);
      await db('reports').where({ id: reportId }).update({ moderation_status: 'Approved' });
    }

    const report = await db('reports').where({ id: reportId }).first();
    return res.status(201).json({ report, matches: matchList, moderated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/reports/my/list ─────────────────────────────────────────────────
// This must be declared before /:id, otherwise Express treats "my" as an ID.
router.get('/my/list', requireAuth, async (req, res) => {
  try {
    const rows = await db('reports as r')
      .leftJoin('universities as u', 'u.id', 'r.university_id')
      .leftJoin('campuses as c',      'c.id', 'r.campus_id')
      .select('r.*', 'u.name as university_name', 'c.name as campus_name')
      .where('r.user_id', req.user.id)
      .whereNot('r.status', 'Deleted')
      .orderBy('r.created_at', 'desc');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/reports/:id ────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const report = await db('reports as r')
      .leftJoin('universities as u', 'u.id', 'r.university_id')
      .leftJoin('campuses as c',      'c.id', 'r.campus_id')
      .leftJoin('users as usr',       'usr.id', 'r.user_id')
      .select('r.*', 'u.name as university_name', 'c.name as campus_name', 'usr.name as user_name')
      .where('r.id', id)
      .first();

    if (!report) return res.status(404).json({ error: 'Report not found' });

    if ((report.status === 'Deleted' || report.moderation_status === 'Rejected') &&
        (!req.user || req.user.id !== report.user_id)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const matches = await db('matches as m')
      .where(function () {
        this.where('m.report_a_id', id).orWhere('m.report_b_id', id);
      })
      .whereNot('m.status', 'Dismissed')
      .orderBy('m.score', 'desc')
      .select(
        'm.id', 'm.score', 'm.status',
        db.raw('CASE WHEN m.report_a_id = ? THEN m.report_b_id ELSE m.report_a_id END AS matched_report_id', [id])
      );

    return res.json({ ...report, matches });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/reports/:id/status ──────────────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const report = await db('reports').where({ id }).first();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { status } = req.body;
    if (status !== 'Resolved') return res.status(400).json({ error: "status must be 'Resolved'" });

    await db('reports').where({ id }).update({ status: 'Resolved' });
    return res.json({ id, status: 'Resolved' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/reports/:id ─────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const report = await db('reports').where({ id }).first();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await db('reports').where({ id }).update({ status: 'Deleted' });
    return res.json({ id, status: 'Deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
