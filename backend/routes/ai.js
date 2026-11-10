import { Router } from 'express';
import { db } from '../models/database.js';
import {
  validate,
  aiAnalyzeSchema,
  aiSuggestSchema,
  aiApplySchema,
} from '../lib/validate.js';
import { categoriesForType } from '../lib/categories.js';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5055';
const AI_TIMEOUT_MS = 15000;

function aiError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function callAi(pathname, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}${pathname}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw aiError(data.error || data.detail || `AI service returned ${response.status}`, response.status);
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw aiError('AI service timed out. Please try again.', 504);
    }
    if (/fetch failed|ECONNREFUSED|ECONNRESET|connect/i.test(String(error.message))) {
      throw aiError('AI service is not running. Start it with "npm run ai".', 503);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function sendError(res, error) {
  res.status(error.status || 500).json({ error: error.message || 'AI request failed' });
}

router.get('/status', async (req, res) => {
  try {
    const data = await callAi('/health');
    res.json({ ...data, service_url: AI_SERVICE_URL });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/suggest', validate(aiSuggestSchema), async (req, res) => {
  try {
    const data = await callAi('/categorize-one', { method: 'POST', body: req.body });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/analyze', validate(aiAnalyzeSchema), async (req, res) => {
  try {
    const transactions =
      req.body.transactions && req.body.transactions.length
        ? req.body.transactions
        : db
            .prepare(
              'SELECT id, type, amount, category, description, date FROM transactions ORDER BY date DESC'
            )
            .all();

    if (!transactions.length) {
      return res.json({
        results: [],
        summary: { total: 0, suggestions: 0, anomalies: 0 },
        message: 'No transactions to analyse yet.',
      });
    }

    const data = await callAi('/categorize', { method: 'POST', body: { transactions } });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/apply', validate(aiApplySchema), async (req, res) => {
  const updates = req.body.updates;
  const errors = [];
  let updated = 0;

  try {
    db.exec('BEGIN');
    try {
      for (const update of updates) {
        const row = db.prepare('SELECT type FROM transactions WHERE id = ?').get(update.id);
        if (!row) {
          errors.push({ id: update.id, error: 'Transaction not found' });
          continue;
        }

        const allowed = categoriesForType(row.type);
        if (!allowed.includes(update.category)) {
          errors.push({
            id: update.id,
            error: `Category "${update.category}" is not valid for an ${row.type} transaction`,
          });
          continue;
        }

        db.prepare('UPDATE transactions SET category = ?, updated_at = ? WHERE id = ?').run(
          update.category,
          new Date().toISOString(),
          update.id
        );
        updated += 1;
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    res.json({ updated, skipped: updates.length - updated, errors });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
