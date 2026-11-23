'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { notifications, contactRequests, users } = db.collections();
    const rows = await notifications.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(50).toArray();
    const data = await Promise.all(rows.map(async (notification) => {
      let request = null;
      let requester = null;
      if (notification.contact_request_id) {
        request = await contactRequests.findOne({ id: notification.contact_request_id });
        if (request) requester = await users.findOne({ id: request.from_user_id }, { projection: { name: 1, email: 1 } });
      }
      return { ...notification, request: request ? { ...request, requester_name: requester?.name || null, requester_email: request.status === 'accepted' ? (requester?.email || null) : null } : null };
    }));
    return res.json({ data, unread: data.filter((item) => !item.read).length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { notifications } = db.collections();
    const result = await notifications.updateOne({ id, user_id: req.user.id }, { $set: { read: true, updated_at: new Date() } });
    if (!result.matchedCount) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ id, read: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
