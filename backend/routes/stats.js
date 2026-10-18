import { Router } from 'express';
import { db } from '../models/database.js';
import { validate, statsQuerySchema } from '../lib/validate.js';

const router = Router();

router.get('/summary', validate(statsQuerySchema, 'query'), (req, res, next) => {
  try {
    const { month } = req.query;
    let sql = 'SELECT type, SUM(amount) as total FROM transactions';
    const params = [];

    if (month) {
      sql += ' WHERE date LIKE ?';
      params.push(`${month}%`);
    }
    sql += ' GROUP BY type';

    const rows = db.prepare(sql).all(...params);
    const income = rows.find((r) => r.type === 'income')?.total || 0;
    const expenses = rows.find((r) => r.type === 'expense')?.total || 0;

    res.json({ income, expenses, balance: income - expenses });
  } catch (err) {
    next(err);
  }
});

router.get('/by-category', validate(statsQuerySchema, 'query'), (req, res, next) => {
  try {
    const { month, type } = req.query;
    let sql = 'SELECT category, SUM(amount) as total FROM transactions WHERE 1=1';
    const params = [];

    if (month) {
      sql += ' AND date LIKE ?';
      params.push(`${month}%`);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    sql += ' GROUP BY category ORDER BY total DESC';

    res.json(db.prepare(sql).all(...params));
  } catch (err) {
    next(err);
  }
});

router.get('/monthly', (req, res, next) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT
        substr(date, 1, 7) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      GROUP BY substr(date, 1, 7)
      ORDER BY month DESC
      LIMIT 12
    `
      )
      .all();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/recent', validate(statsQuerySchema, 'query'), (req, res, next) => {
  try {
    const limit = req.query.limit || 5;
    const rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC LIMIT ?').all(limit);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
