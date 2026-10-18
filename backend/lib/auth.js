import jwt from 'jsonwebtoken';
import { db } from '../models/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function authMiddleware(req, res, next) {
  const authHeader = req.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Optional: only require auth if users exist
export function optionalAuth(req, res, next) {
  const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  if (userCount === 0) return next(); // No users registered yet, open access

  const authHeader = req.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return authMiddleware(req, res, next);
}
