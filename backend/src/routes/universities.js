'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (_req, res) => {
  try {
    const { universities, campuses } = db.collections();
    const [universityRows, campusRows] = await Promise.all([
      universities.find({}).sort({ name: 1 }).toArray(),
      campuses.find({}).sort({ name: 1 }).toArray(),
    ]);

    const result = universityRows.map((university) => ({
      id: university.id,
      name: university.name,
      short_name: university.short_name,
      campuses: campusRows
        .filter((campus) => campus.university_id === university.id)
        .map((campus) => ({ id: campus.id, name: campus.name, city: campus.city })),
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
