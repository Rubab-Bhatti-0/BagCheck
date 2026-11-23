'use strict';

const jwt = require('jsonwebtoken');

/**
 * Verifies Authorization: Bearer <token> header.
 * Sets req.user = { id, name, email } on success.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, name: payload.name, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth — sets req.user if token present, but does not block.
 */
function optionalAuth(req, _res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, name: payload.name, email: payload.email };
    } catch (_) {
      // ignore bad token for optional routes
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
