'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/universities
router.get('/', async (_req, res) => {
  try {
    const universities = await db('universities').orderBy('name');
    const campuses     = await db('campuses').orderBy('name');

    const result = universities.map((uni) => ({
      ...uni,
      campuses: campuses.filter((c) => c.university_id === uni.id),
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
