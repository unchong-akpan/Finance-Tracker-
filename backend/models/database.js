import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'finance.db');

const db = new DatabaseSync(dbPath);

// Enable WAL for better concurrency
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    amount REAL NOT NULL CHECK(amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    recurring_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    month TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    UNIQUE(category, month)
  );

  CREATE TABLE IF NOT EXISTS recurring (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    amount REAL NOT NULL CHECK(amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    day_of_month INTEGER NOT NULL CHECK(day_of_month BETWEEN 1 AND 31),
    start_month TEXT,
    end_month TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
  CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring(active);

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Auto-migrate from data.json if it exists
const jsonPath = path.join(__dirname, '..', 'data.json');
if (fs.existsSync(jsonPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    db.exec('BEGIN');
    try {
      // Transactions
      const tStmt = db.prepare(`INSERT OR IGNORE INTO transactions (id, type, amount, category, description, date, recurring_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const t of raw.transactions || []) {
        tStmt.run(String(t.id), t.type, t.amount, t.category, t.description || '', t.date, t.recurring_id || null, t.created_at || new Date().toISOString(), t.updated_at || null);
      }

      // Budgets
      const bStmt = db.prepare(`INSERT OR IGNORE INTO budgets (id, category, amount, month, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const b of raw.budgets || []) {
        bStmt.run(String(b.id), b.category, b.amount, b.month, b.created_at || new Date().toISOString(), b.updated_at || null);
      }

      // Recurring
      const rStmt = db.prepare(`INSERT OR IGNORE INTO recurring (id, type, amount, category, description, day_of_month, start_month, end_month, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const r of raw.recurring || []) {
        rStmt.run(String(r.id), r.type, r.amount, r.category, r.description || '', r.day_of_month || 1, r.start_month || null, r.end_month || null, r.active !== false ? 1 : 0, r.created_at || new Date().toISOString(), r.updated_at || null);
      }

      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    fs.renameSync(jsonPath, jsonPath + '.migrated');
    console.log(`Migrated data.json → finance.db (${(raw.transactions || []).length} txns, ${(raw.budgets || []).length} budgets, ${(raw.recurring || []).length} recurring)`);
  } catch (err) {
    console.error('Migration from data.json failed:', err.message);
  }
}

export const newId = () => crypto.randomUUID();

export async function initDatabase() {
  const count = db.prepare('SELECT COUNT(*) as n FROM transactions').get().n;
  console.log(`SQLite ready (${count} transactions)`);
}

export async function getAll(type) {
  const valid = ['transactions', 'budgets', 'recurring'];
  if (!valid.includes(type)) return [];
  return db.prepare(`SELECT * FROM ${type}`).all();
}

export async function create(type, item) {
  const id = newId();
  const now = new Date().toISOString();

  if (type === 'transactions') {
    db.prepare('INSERT INTO transactions (id, type, amount, category, description, date, recurring_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, item.type, item.amount, item.category, item.description || '', item.date, item.recurring_id || null, now);
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  }

  if (type === 'budgets') {
    db.prepare('INSERT INTO budgets (id, category, amount, month, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, item.category, item.amount, item.month, now);
    return db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  }

  if (type === 'recurring') {
    db.prepare('INSERT INTO recurring (id, type, amount, category, description, day_of_month, start_month, end_month, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, item.type, item.amount, item.category, item.description || '', item.day_of_month, item.start_month || null, item.end_month || null, item.active !== false ? 1 : 0, now);
    return db.prepare('SELECT * FROM recurring WHERE id = ?').get(id);
  }

  throw new Error(`Unknown table: ${type}`);
}

export async function upsert(type, matcher, item) {
  if (type === 'budgets') {
    const existing = db.prepare('SELECT * FROM budgets WHERE category = ? AND month = ?').get(item.category, item.month);
    if (existing) {
      const now = new Date().toISOString();
      db.prepare('UPDATE budgets SET amount = ?, updated_at = ? WHERE id = ?').run(item.amount, now, existing.id);
      return { item: db.prepare('SELECT * FROM budgets WHERE id = ?').get(existing.id), created: false };
    }
    const created = await create('budgets', item);
    return { item: created, created: true };
  }

  // Generic fallback
  const existing = (await getAll(type)).find(matcher);
  if (existing) {
    const now = new Date().toISOString();
    const cols = Object.keys(item).filter(k => item[k] !== undefined && k !== 'id' && k !== 'created_at');
    if (cols.length > 0) {
      const setClause = cols.map(c => `${c} = ?`).join(', ');
      db.prepare(`UPDATE ${type} SET ${setClause}, updated_at = ? WHERE id = ?`).run(...cols.map(c => item[c]), now, existing.id);
    }
    return { item: db.prepare(`SELECT * FROM ${type} WHERE id = ?`).get(existing.id), created: false };
  }
  const created = await create(type, item);
  return { item: created, created: true };
}

export async function update(type, id, patch) {
  const valid = ['transactions', 'budgets', 'recurring'];
  if (!valid.includes(type)) return null;

  const existing = db.prepare(`SELECT * FROM ${type} WHERE id = ?`).get(String(id));
  if (!existing) return null;

  const cols = Object.keys(patch).filter(k => patch[k] !== undefined && k !== 'id' && k !== 'created_at');
  if (cols.length === 0) return existing;

  const now = new Date().toISOString();
  const setClause = cols.map(c => `${c} = ?`).join(', ');
  db.prepare(`UPDATE ${type} SET ${setClause}, updated_at = ? WHERE id = ?`).run(...cols.map(c => patch[c]), now, String(id));

  return db.prepare(`SELECT * FROM ${type} WHERE id = ?`).get(String(id));
}

export async function remove(type, id) {
  const valid = ['transactions', 'budgets', 'recurring'];
  if (!valid.includes(type)) return false;

  const result = db.prepare(`DELETE FROM ${type} WHERE id = ?`).run(String(id));
  return result.changes > 0;
}

export async function query(type, filters = {}) {
  const valid = ['transactions', 'budgets', 'recurring'];
  if (!valid.includes(type)) return [];

  let sql = `SELECT * FROM ${type}`;
  const conditions = [];
  const params = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  return db.prepare(sql).all(...params);
}

export { db };
