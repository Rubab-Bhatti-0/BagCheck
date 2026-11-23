'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:reportId', async (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId)) return res.status(400).json({ error: 'Invalid reportId' });

    const { reports, matches, universities, campuses } = db.collections();
    const report = await reports.findOne({ id: reportId, status: { $ne: 'Deleted' }, moderation_status: 'Approved' }, { projection: { id: 1 } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const matchRows = await matches.find({
      $or: [{ report_a_id: reportId }, { report_b_id: reportId }],
      status: { $ne: 'Dismissed' },
    }).sort({ score: -1 }).toArray();

    const result = [];
    for (const match of matchRows) {
      const matchedId = match.report_a_id === reportId ? match.report_b_id : match.report_a_id;
      const matched = await reports.findOne({ id: matchedId, status: { $ne: 'Deleted' }, moderation_status: 'Approved' });
      if (!matched) continue;
      const [university, campus] = await Promise.all([
        matched.university_id ? universities.findOne({ id: matched.university_id }) : null,
        matched.campus_id ? campuses.findOne({ id: matched.campus_id }) : null,
      ]);
      result.push({
        match_id: match.id,
        matched_report_id: matchedId,
        score: match.score,
        score_percent: match.score == null ? null : Math.round(match.score),
        match_status: match.status,
        matched_at: match.created_at,
        report: {
          id: matched.id,
          type: matched.type,
          title: matched.title,
          description: matched.description,
          category: matched.category,
          location: matched.location,
          event_date: matched.event_date,
          photo_url: matched.photo_url,
          status: matched.status,
          university_name: university?.name || null,
          campus_name: campus?.name || null,
        },
      });
    }

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
