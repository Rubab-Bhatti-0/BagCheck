'use strict';

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadImage } = require('../services/cloudinary');

const ML_URL = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

async function callML(endpoint, body) {
  const response = await fetch(`${ML_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(endpoint === '/api/match' ? 60_000 : 5_000),
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
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function decorateReport(report, includePrivate = false) {
  if (!report) return null;
  const { universities, campuses, users } = db.collections();
  const [university, campus, user] = await Promise.all([
    report.university_id ? universities.findOne({ id: report.university_id }) : null,
    report.campus_id ? campuses.findOne({ id: report.campus_id }) : null,
    report.user_id ? users.findOne({ id: report.user_id }) : null,
  ]);
  const decorated = {
    ...report,
    university_name: university?.name || null,
    university_short_name: university?.short_name || null,
    campus_name: campus?.name || null,
    user_name: user?.name || null,
  };
  if (!includePrivate) delete decorated.contact_email;
  return decorated;
}

async function getMatchesForReport(reportId) {
  const { matches } = db.collections();
  return matches.find({
    $or: [{ report_a_id: reportId }, { report_b_id: reportId }],
    status: { $ne: 'Dismissed' },
  }).sort({ score: -1 }).toArray();
}

async function getContactContext(report, viewerId) {
  if (!viewerId) return { status: null, role: null, request: null, partner: null };
  const { contactRequests, users } = db.collections();
  const isOwner = viewerId === report.user_id;
  const request = await contactRequests.findOne(
    isOwner ? { report_id: report.id, to_user_id: viewerId } : { report_id: report.id, from_user_id: viewerId },
    { sort: { created_at: -1 } },
  );
  if (!request) return { status: null, role: isOwner ? 'owner' : 'requester', request: null, partner: null };
  const partnerId = isOwner ? request.from_user_id : request.to_user_id;
  const partner = await users.findOne({ id: partnerId }, { projection: { name: 1, email: 1 } });
  return {
    status: request.status,
    role: isOwner ? 'owner' : 'requester',
    request: { id: request.id, status: request.status, message: request.message, contact_method: request.contact_method },
    partner: { name: partner?.name || null, email: request.status === 'accepted' ? (partner?.email || null) : null },
  };
}

async function findAndPersistMatches(report) {
  const { matches } = db.collections();
  const result = await callML('/api/match', {
    report_id: report.id,
    title: report.title,
    description: report.description,
    category: report.category || 'General',
    campus_id: report.campus_id ?? -1,
    type: report.type,
  });
  const suggestions = Array.isArray(result.matches) ? result.matches : [];
  const persisted = [];
  for (const suggestion of suggestions) {
    if (!Number.isInteger(suggestion.report_id) || !Number.isFinite(suggestion.score)) continue;
    const pair = { report_a_id: Math.min(report.id, suggestion.report_id), report_b_id: Math.max(report.id, suggestion.report_id) };
    const reverse = { report_a_id: pair.report_b_id, report_b_id: pair.report_a_id };
    const existing = await matches.findOne({ $or: [pair, reverse] });
    if (existing?.status === 'Dismissed') continue;
    if (!existing) {
      const matchId = await db.nextId('matches');
      await matches.updateOne(pair, {
        $setOnInsert: { id: matchId, score: suggestion.score, status: 'Suggested', created_at: new Date() },
      }, { upsert: true });
    }
    persisted.push(suggestion);
  }
  return persisted;
}

// The Next button uses this endpoint before the details step is revealed.
// Multer validates an optional picture here; ML currently evaluates the text.
router.post('/check-content', requireAuth, (req, res, next) => {
  upload.single('photo')(req, res, (uploadError) => {
    if (uploadError) return res.status(400).json({ error: uploadError.message });
    next();
  });
}, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }
    try {
      const result = await callML('/api/moderate', { title, description });
      return res.json({ ...result, available: true, image_valid: req.file ? true : null, image_checked: Boolean(req.file) });
    } catch (error) {
      console.warn('Live moderation unavailable:', error.message);
      return res.json({ relevant: null, confidence: null, reason: 'service_unavailable', available: false, image_valid: req.file ? true : null, image_checked: Boolean(req.file) });
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
    const pageNum = Math.max(1, toOptionalInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, toOptionalInt(req.query.limit) || 20));
    const filter = {
      moderation_status: 'Approved',
      status: req.user && status === 'Resolved' ? 'Resolved' : 'Active',
    };
    if (type === 'Lost' || type === 'Found') filter.type = type;
    if (university_id !== undefined) {
      filter.university_id = toOptionalInt(university_id);
      if (!filter.university_id) return res.status(400).json({ error: 'Invalid university ID' });
    }
    if (campus_id !== undefined) {
      filter.campus_id = toOptionalInt(campus_id);
      if (!filter.campus_id) return res.status(400).json({ error: 'Invalid campus ID' });
    }
    if (typeof category === 'string' && category) filter.category = category;
    if (typeof keyword === 'string' && keyword.trim()) {
      const regex = new RegExp(escapeRegex(keyword.trim()), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { location: regex }];
    }
    if (dateRange === '7d' || dateRange === '30d') {
      const days = dateRange === '7d' ? 7 : 30;
      filter.created_at = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    const total = await reports.countDocuments(filter);
    const pages = Math.ceil(total / limit);
    const rows = pageNum <= pages
      ? await reports.find(filter).sort({ created_at: -1, _id: -1 }).skip((pageNum - 1) * limit).limit(limit).toArray()
      : [];
    const data = await Promise.all(rows.map((row) => decorateReport(row, false)));

    return res.json({ data, pagination: { total, page: pageNum, limit, pages } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { reports, campuses } = db.collections();
    const { type, category, university_id, campus_id, location, event_date, event_time, contact_email } = req.body;
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    if (!type || !title || !description) return res.status(400).json({ error: 'type, title and description are required' });
    if (!['Lost', 'Found'].includes(type)) return res.status(400).json({ error: "type must be 'Lost' or 'Found'" });
    if (!university_id || !campus_id || !String(location || '').trim() || !event_date || !event_time || !String(contact_email || '').trim()) {
      return res.status(400).json({ error: 'university, campus, date, time, location, and contact email are required' });
    }
    const universityId = toOptionalInt(university_id);
    const campusId = toOptionalInt(campus_id);
    if (!universityId || !campusId || !await campuses.findOne({ id: campusId, university_id: universityId })) {
      return res.status(400).json({ error: 'Select a campus that belongs to the selected university' });
    }

    let approved;
    try {
      const result = await callML('/api/moderate', { title, description });
      if (typeof result.relevant !== 'boolean') throw new Error('ML moderation returned no decision');
      approved = result.relevant;
    } catch (error) {
      console.warn('ML moderation unavailable:', error.message);
      return res.status(503).json({ error: 'Moderation service is unavailable. Please try again shortly.' });
    }

    const photoUrl = approved && req.file ? await uploadImage(req.file) : null;
    const reportId = await db.nextId('reports');
    const reportDocument = {
      id: reportId,
      user_id: req.user.id,
      type,
      title,
      description,
      category: category || 'General',
      university_id: universityId,
      campus_id: campusId,
      location: location || null,
      event_date: event_date || null,
      event_time: event_time || null,
      photo_url: photoUrl,
      contact_email: contact_email || req.user.email,
      status: approved ? 'Active' : 'Deleted',
      moderation_status: approved ? 'Approved' : 'Rejected',
      created_at: new Date(),
    };
    await reports.insertOne(reportDocument);

    if (!approved) {
      sendRejectionEmail(contact_email || req.user.email, title).catch((error) => console.warn('Rejection email unavailable:', error.message));
    }

    return res.status(201).json({ report: reportDocument, matches: [], moderated: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/match', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reports } = db.collections();
    const report = await reports.findOne({ id });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (report.status !== 'Active' || report.moderation_status !== 'Approved') return res.status(409).json({ error: 'Only approved active reports can be matched' });
    return res.json({ matches: await findAndPersistMatches(report) });
  } catch (err) {
    console.error('Matching failed:', err);
    return res.status(503).json({ error: 'Matching service is unavailable. Your report is still posted; please try again.' });
  }
});

router.get('/my/list', requireAuth, async (req, res) => {
  try {
    const { reports } = db.collections();
    const rows = await reports.find({ user_id: req.user.id, status: { $ne: 'Deleted' } }).sort({ created_at: -1 }).toArray();
    return res.json(await Promise.all(rows.map((row) => decorateReport(row, true))));
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
    if ((report.status === 'Deleted' || report.moderation_status !== 'Approved') && (!req.user || req.user.id !== report.user_id)) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const contact = await getContactContext(report, req.user?.id);
    const canSeeOwnerEmail = Boolean(req.user && (req.user.id === report.user_id || (contact.role === 'requester' && contact.status === 'accepted')));
    return res.json({ ...await decorateReport(report, canSeeOwnerEmail), contact_request: contact.request, contact_role: contact.role, contact_status: contact.status, contact_partner: contact.partner, matches: await getMatchesForReport(id) });
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
