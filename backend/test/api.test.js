import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}/api`;
const TEST_DB = path.join(__dirname, 'test-finance.db');

let server;

before(async () => {
  // Clean test DB
  for (const ext of ['', '-wal', '-shm']) {
    fs.rmSync(TEST_DB + ext, { force: true });
  }

  server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), DB_PATH: TEST_DB, NODE_ENV: 'test' },
    stdio: 'pipe',
  });

  // Wait for server to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 10000);
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Server running')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on('error', reject);
  });
});

after(async () => {
  if (server) {
    server.kill();
    await new Promise((resolve) => {
      server.on('exit', resolve);
      setTimeout(resolve, 2000);
    });
  }
  // Clean test DB files
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(TEST_DB + ext, { force: true });
    } catch {
      // Ignore
    }
  }
});

// Helper
async function api(method, path, body, headers = {}) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

// ============ Health ============
test('GET /health returns ok', async () => {
  const { status, data } = await api('GET', '/health');
  assert.equal(status, 200);
  assert.equal(data.status, 'ok');
});

// ============ Transactions CRUD ============
test('POST /transactions creates a transaction', async () => {
  const { status, data } = await api('POST', '/transactions', {
    type: 'expense',
    amount: 25.5,
    category: 'Food',
    description: 'Test lunch',
    date: '2026-10-16',
  });
  assert.equal(status, 201);
  assert.ok(data.id);
  assert.equal(data.amount, 25.5);
  assert.equal(data.type, 'expense');
});

test('POST /transactions rejects invalid data', async () => {
  const { status, data } = await api('POST', '/transactions', {
    type: 'invalid',
    amount: -5,
    category: '',
    date: 'bad',
  });
  assert.equal(status, 400);
  assert.ok(data.issues.length > 0);
});

test('GET /transactions returns list', async () => {
  const { status, data } = await api('GET', '/transactions');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
});

test('GET /transactions filters by type', async () => {
  const { data } = await api('GET', '/transactions?type=income');
  for (const t of data) {
    assert.equal(t.type, 'income');
  }
});

test('GET /transactions filters by date range', async () => {
  const { data } = await api('GET', '/transactions?start_date=2026-10-01&end_date=2026-10-31');
  for (const t of data) {
    assert.ok(t.date >= '2026-10-01' && t.date <= '2026-10-31');
  }
});

test('PUT /transactions/:id updates', async () => {
  const created = await api('POST', '/transactions', {
    type: 'expense',
    amount: 10,
    category: 'Test',
    date: '2026-10-16',
  });
  const { status, data } = await api('PUT', `/transactions/${created.data.id}`, {
    amount: 99.99,
  });
  assert.equal(status, 200);
  assert.equal(data.amount, 99.99);
});

test('PUT /transactions/:id returns 404 for missing', async () => {
  const { status } = await api('PUT', '/transactions/nonexistent', { amount: 10 });
  assert.equal(status, 404);
});

test('DELETE /transactions/:id removes', async () => {
  const created = await api('POST', '/transactions', {
    type: 'expense',
    amount: 5,
    category: 'Test',
    date: '2026-10-16',
  });
  const { status } = await api('DELETE', `/transactions/${created.data.id}`);
  assert.equal(status, 200);

  // Verify gone
  const list = await api('GET', '/transactions');
  const found = list.data.find((t) => t.id === created.data.id);
  assert.equal(found, undefined);
});

// ============ Budgets ============
test('POST /budgets creates (upsert)', async () => {
  const { status, data } = await api('POST', '/budgets', {
    category: 'Groceries',
    amount: 300,
    month: '2026-10',
  });
  assert.ok([200, 201].includes(status));
  assert.equal(data.amount, 300);
});

test('POST /budgets upserts existing', async () => {
  await api('POST', '/budgets', { category: 'Rent', amount: 1000, month: '2026-10' });
  const { status, data } = await api('POST', '/budgets', {
    category: 'Rent',
    amount: 1200,
    month: '2026-10',
  });
  assert.equal(status, 200); // updated, not created
  assert.equal(data.amount, 1200);
});

test('GET /budgets filters by month', async () => {
  const { data } = await api('GET', '/budgets?month=2026-10');
  for (const b of data) {
    assert.equal(b.month, '2026-10');
  }
});

test('DELETE /budgets/:id removes', async () => {
  const created = await api('POST', '/budgets', {
    category: 'Temp',
    amount: 50,
    month: '2026-12',
  });
  const { status } = await api('DELETE', `/budgets/${created.data.id}`);
  assert.equal(status, 200);
});

// ============ Stats ============
test('GET /stats/summary returns income/expenses/balance', async () => {
  const { status, data } = await api('GET', '/stats/summary');
  assert.equal(status, 200);
  assert.ok(typeof data.income === 'number');
  assert.ok(typeof data.expenses === 'number');
  assert.ok(typeof data.balance === 'number');
  assert.equal(data.balance, data.income - data.expenses);
});

test('GET /stats/by-category returns categories with totals', async () => {
  const { status, data } = await api('GET', '/stats/by-category');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
  if (data.length > 0) {
    assert.ok(data[0].category);
    assert.ok(typeof data[0].total === 'number');
  }
});

test('GET /stats/monthly returns monthly breakdown', async () => {
  const { status, data } = await api('GET', '/stats/monthly');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
});

test('GET /stats/recent returns limited list', async () => {
  const { data } = await api('GET', '/stats/recent?limit=3');
  assert.ok(data.length <= 3);
});

// ============ Recurring ============
test('POST /recurring creates a rule', async () => {
  const { status, data } = await api('POST', '/recurring', {
    type: 'expense',
    amount: 50,
    category: 'Subscriptions',
    day_of_month: 15,
    start_month: '2026-10',
  });
  assert.equal(status, 201);
  assert.ok(data.id);
  assert.equal(data.day_of_month, 15);
});

test('POST /recurring rejects day_of_month out of range', async () => {
  const { status } = await api('POST', '/recurring', {
    type: 'expense',
    amount: 50,
    category: 'Test',
    day_of_month: 32,
  });
  assert.equal(status, 400);
});

test('POST /recurring rejects end before start', async () => {
  const { status } = await api('POST', '/recurring', {
    type: 'expense',
    amount: 50,
    category: 'Test',
    day_of_month: 1,
    start_month: '2026-12',
    end_month: '2026-01',
  });
  assert.equal(status, 400);
});

test('POST /recurring/generate creates transactions for month', async () => {
  const rule = await api('POST', '/recurring', {
    type: 'expense',
    amount: 99.99,
    category: 'Generate Test',
    day_of_month: 20,
    start_month: '2026-11',
  });

  const { status, data } = await api('POST', '/recurring/generate', { month: '2026-11' });
  assert.equal(status, 200);
  assert.ok(data.created >= 1);

  // Clean up
  await api('DELETE', `/recurring/${rule.data.id}`);
  for (const t of data.transactions) {
    await api('DELETE', `/transactions/${t.id}`);
  }
});

test('POST /recurring/generate is idempotent', async () => {
  const rule = await api('POST', '/recurring', {
    type: 'expense',
    amount: 10,
    category: 'Idem Test',
    day_of_month: 10,
    start_month: '2026-12',
  });

  await api('POST', '/recurring/generate', { month: '2026-12' });
  const second = await api('POST', '/recurring/generate', { month: '2026-12' });

  assert.equal(second.data.created, 0); // Already generated

  // Clean up
  await api('DELETE', `/recurring/${rule.data.id}`);
  const txns = await api('GET', '/transactions?category=Idem%20Test');
  for (const t of txns.data) {
    await api('DELETE', `/transactions/${t.id}`);
  }
});

// ============ Auth ============
test('GET /auth/status returns authRequired', async () => {
  const { status, data } = await api('GET', '/auth/status');
  assert.equal(status, 200);
  assert.ok(typeof data.authRequired === 'boolean');
});

test('POST /auth/register creates user and returns token', async () => {
  const email = `test-${Date.now()}@example.com`;
  const { status, data } = await api('POST', '/auth/register', {
    email,
    password: 'password123',
    name: 'Test',
  });
  assert.equal(status, 201);
  assert.ok(data.token);
  assert.equal(data.user.email, email);
});

test('POST /auth/register rejects duplicate email', async () => {
  const email = `dup-${Date.now()}@example.com`;
  await api('POST', '/auth/register', { email, password: 'password123' });
  const { status } = await api('POST', '/auth/register', { email, password: 'password123' });
  assert.equal(status, 409);
});

test('POST /auth/register rejects short password', async () => {
  const { status } = await api('POST', '/auth/register', {
    email: 'x@y.com',
    password: 'short',
  });
  assert.equal(status, 400);
});

test('POST /auth/login returns token for valid credentials', async () => {
  const email = `login-${Date.now()}@example.com`;
  await api('POST', '/auth/register', { email, password: 'password123' });
  const { status, data } = await api('POST', '/auth/login', {
    email,
    password: 'password123',
  });
  assert.equal(status, 200);
  assert.ok(data.token);
});

test('POST /auth/login rejects bad password', async () => {
  const { status } = await api('POST', '/auth/login', {
    email: 'nobody@example.com',
    password: 'wrongpass',
  });
  assert.equal(status, 401);
});

test('GET /auth/me requires valid token', async () => {
  const { status } = await api('GET', '/auth/me');
  assert.equal(status, 401);
});

test('GET /auth/me works with valid token', async () => {
  const email = `me-${Date.now()}@example.com`;
  const reg = await api('POST', '/auth/register', { email, password: 'password123' });
  const { status, data } = await api('GET', '/auth/me', null, {
    Authorization: `Bearer ${reg.data.token}`,
  });
  assert.equal(status, 200);
  assert.equal(data.user.email, email);
});
