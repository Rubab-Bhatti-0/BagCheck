'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/matches/:reportId
router.get('/:reportId', async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId, 10);
    if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid reportId' });

    const report = await db('reports').where({ id: reportId }).first('id');
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Raw query for the CASE expression
    const matches = await db.raw(`
      SELECT
        m.id, m.score, m.status, m.created_at,
        CASE WHEN m.report_a_id = ? THEN m.report_b_id ELSE m.report_a_id END AS matched_report_id,
        r.type, r.title, r.description, r.category, r.location,
        r.event_date, r.photo_url, r.status AS report_status,
        u.name AS university_name, c.name AS campus_name
      FROM matches m
      JOIN reports r ON r.id = (CASE WHEN m.report_a_id = ? THEN m.report_b_id ELSE m.report_a_id END)
      LEFT JOIN universities u ON u.id = r.university_id
      LEFT JOIN campuses c ON c.id = r.campus_id
      WHERE (m.report_a_id = ? OR m.report_b_id = ?)
        AND m.status != 'Dismissed'
        AND r.status != 'Deleted'
      ORDER BY m.score DESC
    `, [reportId, reportId, reportId, reportId]);

    const rows = matches.rows || matches; // knex raw returns differently per driver
    const result = (Array.isArray(rows) ? rows : []).map((m) => ({
      match_id:          m.id,
      matched_report_id: m.matched_report_id,
      score:             m.score,
      score_percent:     m.score !== null ? Math.round(m.score) : null,
      match_status:      m.status,
      matched_at:        m.created_at,
      report: {
        id:              m.matched_report_id,
        type:            m.type,
        title:           m.title,
        description:     m.description,
        category:        m.category,
        location:        m.location,
        event_date:      m.event_date,
        photo_url:       m.photo_url,
        status:          m.report_status,
        university_name: m.university_name,
        campus_name:     m.campus_name,
      },
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
