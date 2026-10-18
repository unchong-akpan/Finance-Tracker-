import { Router } from 'express';
import { create, remove, getAll, newId, db } from '../models/database.js';
import { validate, createRecurringSchema, generateRecurringSchema } from '../lib/validate.js';

const router = Router();

const MONTH_RE = /^\d{4}-\d{2}$/;
const currentMonth = () => new Date().toISOString().slice(0, 7);

function daysInMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year, mon, 0).getDate();
}

router.get('/', async (req, res, next) => {
  try {
    const rules = await getAll('recurring');
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createRecurringSchema), async (req, res, next) => {
  try {
    const { type, amount, category, description, day_of_month, start_month, end_month } = req.body;

    const rule = await create('recurring', {
      type,
      amount,
      category,
      description,
      day_of_month,
      start_month: start_month || currentMonth(),
      end_month: end_month || null,
      active: true,
    });

    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await remove('recurring', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Recurring rule not found' });
    }
    res.json({ message: 'Recurring rule deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/generate', validate(generateRecurringSchema), async (req, res, next) => {
  try {
    const month = req.body.month;

    const rules = await getAll('recurring');
    const generated = [];

    db.exec('BEGIN');
    try {
      const checkStmt = db.prepare('SELECT 1 FROM transactions WHERE recurring_id = ? AND date LIKE ? LIMIT 1');
      const insertStmt = db.prepare('INSERT INTO transactions (id, type, amount, category, description, date, recurring_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

      for (const rule of rules) {
        if (!rule.active) continue;
        if (rule.start_month && month < rule.start_month) continue;
        if (rule.end_month && month > rule.end_month) continue;

        const alreadyExists = checkStmt.get(rule.id, `${month}%`);
        if (alreadyExists) continue;

        const day = Math.min(rule.day_of_month, daysInMonth(month));
        const id = newId();
        const now = new Date().toISOString();
        const date = `${month}-${String(day).padStart(2, '0')}`;

        insertStmt.run(id, rule.type, rule.amount, rule.category, rule.description || '', date, rule.id, now);
        generated.push({ id, type: rule.type, amount: rule.amount, category: rule.category, description: rule.description || '', date, recurring_id: rule.id, created_at: now });
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({ month, created: generated.length, transactions: generated });
  } catch (err) {
    next(err);
  }
});

export default router;
