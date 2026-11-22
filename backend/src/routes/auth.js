'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET ;

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    SECRET,
    { expiresIn: '7d' },
  );
}

router.post('/register', async (req, res) => {
  try {
    const { users } = db.collections();
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (await users.findOne({ email })) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = { id: await db.nextId('users'), name, email, password_hash: await bcrypt.hash(password, 10), created_at: new Date() };
    await users.insertOne(user);
    const publicUser = { id: user.id, name: user.name, email: user.email };
    return res.status(201).json({ token: signToken(publicUser), user: publicUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { users } = db.collections();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await users.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const publicUser = { id: user.id, name: user.name, email: user.email };
    return res.json({ token: signToken(publicUser), user: publicUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
