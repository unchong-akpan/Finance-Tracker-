import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../models/database.js';
import { signToken, authMiddleware } from '../lib/auth.js';

const router = Router();

// Password hashing with scrypt (no external deps)
const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const testHash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

// Register
router.post('/register', (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, email.toLowerCase(), passwordHash, name || null, now);

  const token = signToken({ id, email: email.toLowerCase() });
  res.status(201).json({
    token,
    user: { id, email: email.toLowerCase(), name: name || null },
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({ id: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Check if auth is required (any users exist)
router.get('/status', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  res.json({ authRequired: userCount > 0 });
});

export default router;
