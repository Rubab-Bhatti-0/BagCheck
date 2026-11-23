'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, async (req, res) => {
  try {
    const { reports, contactRequests, notifications, users } = db.collections();
    const reportId = Number(req.body.report_id);
    const message = String(req.body.message || '').trim();
    const contactMethod = String(req.body.contact_method || '').trim();
    if (!Number.isInteger(reportId) || !message || !contactMethod) {
      return res.status(400).json({ error: 'report_id, message, and contact method are required' });
    }
    if (message.length > 1000) return res.status(400).json({ error: 'Message must be 1000 characters or fewer' });
    if (!['Email', 'Phone', 'In-app message'].includes(contactMethod)) return res.status(400).json({ error: 'Choose a valid contact method' });

    const report = await reports.findOne({ id: reportId, status: 'Active', moderation_status: 'Approved' });
    if (!report) return res.status(404).json({ error: 'This report is no longer available' });
    if (report.user_id === req.user.id) return res.status(400).json({ error: 'You cannot contact yourself about your own report' });
    const existing = await contactRequests.findOne({ report_id: reportId, from_user_id: req.user.id, status: 'pending' });
    if (existing) return res.status(409).json({ error: 'You already have a pending request for this report' });

    const request = {
      id: await db.nextId('contact_requests'), report_id: reportId, from_user_id: req.user.id,
      to_user_id: report.user_id, message, contact_method: contactMethod, status: 'pending',
      created_at: new Date(), updated_at: new Date(),
    };
    await contactRequests.insertOne(request);
    const requester = await users.findOne({ id: req.user.id }, { projection: { name: 1 } });
    await notifications.insertOne({
      id: await db.nextId('notifications'), user_id: report.user_id, type: 'contact_request',
      title: `${requester?.name || 'A student'} wants to contact you`, body: message,
      report_id: reportId, contact_request_id: request.id, read: false, created_at: new Date(),
    });
    return res.status(201).json({ request: { id: request.id, status: request.status, contact_method: request.contact_method } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/respond', requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const decision = String(req.body.status || '').toLowerCase();
    if (!Number.isInteger(requestId) || !['accepted', 'declined'].includes(decision)) return res.status(400).json({ error: 'status must be accepted or declined' });
    const { contactRequests, notifications, reports, users } = db.collections();
    const request = await contactRequests.findOne({ id: requestId });
    if (!request) return res.status(404).json({ error: 'Contact request not found' });
    if (request.to_user_id !== req.user.id) return res.status(403).json({ error: 'Only the report owner can respond' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'This request has already been answered' });

    await contactRequests.updateOne({ id: requestId }, { $set: { status: decision, updated_at: new Date() } });
    await notifications.updateMany({ contact_request_id: requestId }, { $set: { read: true, updated_at: new Date() } });
    const report = await reports.findOne({ id: request.report_id });
    const owner = await users.findOne({ id: req.user.id }, { projection: { name: 1 } });
    await notifications.insertOne({
      id: await db.nextId('notifications'), user_id: request.from_user_id, type: `contact_${decision}`,
      title: `${owner?.name || 'The report owner'} ${decision} your contact request`,
      body: decision === 'accepted' ? 'You can now view the contact details on the report.' : 'You can browse other reports for a possible match.',
      report_id: request.report_id, contact_request_id: requestId, read: false, created_at: new Date(),
    });
    return res.json({ id: requestId, status: decision, report_id: report?.id || request.report_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
