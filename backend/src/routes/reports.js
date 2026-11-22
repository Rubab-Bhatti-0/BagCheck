'use strict';

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadImage } = require('../services/cloudinary');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function callML(endpoint, body) {
  const response = await fetch(`${ML_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`ML responded ${response.status}`);
  return response.json();
}

async function sendRejectionEmail(to, title) {
  if (!to || !process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to: [to],
      subject: 'BagCheck report could not be published',
      text: `Your report "${title}" was not published because it did not appear to describe a lost or found item.`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function decorateReport(report) {
  if (!report) return null;
  const { universities, campuses, users } = db.collections();
  const [university, campus, user] = await Promise.all([
    report.university_id ? universities.findOne({ id: report.university_id }) : null,
    report.campus_id ? campuses.findOne({ id: report.campus_id }) : null,
    report.user_id ? users.findOne({ id: report.user_id }) : null,
  ]);
  return {
    ...report,
    university_name: university?.name || null,
    university_short_name: university?.short_name || null,
    campus_name: campus?.name || null,
    user_name: user?.name || null,
  };
}

async function getMatchesForReport(reportId) {
  const { matches } = db.collections();
  return matches.find({
    $or: [{ report_a_id: reportId }, { report_b_id: reportId }],
    status: { $ne: 'Dismissed' },
  }).sort({ score: -1 }).toArray();
}

// Live text check used by the first step of the report form. The final POST
// repeats moderation so this endpoint is only an early user-facing signal.
router.post('/check-content', requireAuth, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }
    try {
      const result = await callML('/api/moderate', { title, description });
      return res.json({ ...result, available: true });
    } catch (error) {
      console.warn('Live moderation unavailable:', error.message);
      return res.json({ relevant: null, confidence: null, reason: 'service_unavailable', available: false });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { reports } = db.collections();
    const { type, university_id, campus_id, category, keyword, dateRange, status } = req.query;
    const pageNum = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const filter = {};

    if (!req.user) {
      filter.moderation_status = 'Approved';
      filter.status = 'Active';
    } else {
      filter.status = { $ne: 'Deleted' };
      if (status) filter.status = status;
    }
    if (type) filter.type = type;
    if (university_id) filter.university_id = toOptionalInt(university_id);
    if (campus_id) filter.campus_id = toOptionalInt(campus_id);
    if (category) filter.category = category;
    if (keyword) {
      const regex = new RegExp(escapeRegex(keyword), 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }
    if (dateRange && dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : 30;
      filter.created_at = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    const total = await reports.countDocuments(filter);
    const rows = await reports.find(filter).sort({ created_at: -1 }).skip((pageNum - 1) * limit).limit(limit).toArray();
    const data = await Promise.all(rows.map(decorateReport));

    return res.json({ data, pagination: { total, page: pageNum, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { reports, matches } = db.collections();
    const { type, title, description, category, university_id, campus_id, location, event_date, contact_email } = req.body;
    if (!type || !title || !description) return res.status(400).json({ error: 'type, title and description are required' });
    if (!['Lost', 'Found'].includes(type)) return res.status(400).json({ error: "type must be 'Lost' or 'Found'" });

    const photoUrl = req.file ? await uploadImage(req.file) : null;
    const reportId = await db.nextId('reports');
    const reportDocument = {
      id: reportId,
      user_id: req.user.id,
      type,
      title: String(title).trim(),
      description: String(description).trim(),
      category: category || 'General',
      university_id: toOptionalInt(university_id),
      campus_id: toOptionalInt(campus_id),
      location: location || null,
      event_date: event_date || null,
      photo_url: photoUrl,
      contact_email: contact_email || req.user.email,
      status: 'Active',
      moderation_status: 'Pending',
      created_at: new Date(),
    };
    await reports.insertOne(reportDocument);

    let moderated = false;
    let matchList = [];
    try {
      const modResult = await callML('/api/moderate', { title, description });
      moderated = true;
      if (modResult.relevant === false) {
        await reports.updateOne({ id: reportId }, { $set: { moderation_status: 'Rejected', status: 'Deleted' } });
        sendRejectionEmail(contact_email || req.user.email, title).catch((emailErr) => console.warn('Rejection email unavailable:', emailErr.message));
      } else {
        await reports.updateOne({ id: reportId }, { $set: { moderation_status: 'Approved' } });
        try {
          const matchResult = await callML('/api/match', { report_id: reportId, title, description, category: category || 'General', campus_id: toOptionalInt(campus_id) ?? -1, type });
          const matched = Array.isArray(matchResult.matches) ? matchResult.matches : [];
          for (const match of matched) {
            if (match.report_id && match.score !== undefined) {
              const matchId = await db.nextId('matches');
              await matches.insertOne({ id: matchId, report_a_id: reportId, report_b_id: match.report_id, score: match.score, status: 'Suggested', created_at: new Date() });
              matchList.push(match);
            }
          }
        } catch (matchError) {
          console.warn('ML match unavailable:', matchError.message);
        }
      }
    } catch (moderationError) {
      console.warn('ML moderation unavailable:', moderationError.message);
      await reports.updateOne({ id: reportId }, { $set: { moderation_status: 'Approved' } });
    }

    return res.status(201).json({ report: await reports.findOne({ id: reportId }), matches: matchList, moderated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my/list', requireAuth, async (req, res) => {
  try {
    const { reports } = db.collections();
    const rows = await reports.find({ user_id: req.user.id, status: { $ne: 'Deleted' } }).sort({ created_at: -1 }).toArray();
    return res.json(await Promise.all(rows.map(decorateReport)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const { reports } = db.collections();
    const report = await reports.findOne({ id });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if ((report.status === 'Deleted' || report.moderation_status === 'Rejected') && (!req.user || req.user.id !== report.user_id)) return res.status(404).json({ error: 'Report not found' });
    return res.json({ ...await decorateReport(report), matches: await getMatchesForReport(id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reports } = db.collections();
    const report = await reports.findOne({ id });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (req.body.status !== 'Resolved') return res.status(400).json({ error: "status must be 'Resolved'" });
    await reports.updateOne({ id }, { $set: { status: 'Resolved' } });
    return res.json({ id, status: 'Resolved' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reports } = db.collections();
    const report = await reports.findOne({ id });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await reports.updateOne({ id }, { $set: { status: 'Deleted' } });
    return res.json({ id, status: 'Deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
