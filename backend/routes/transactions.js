import { Router } from 'express';
import { create, update, remove, db } from '../models/database.js';
import { validate, createTransactionSchema, updateTransactionSchema, transactionQuerySchema } from '../lib/validate.js';

const router = Router();

router.get('/', validate(transactionQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { category, type, start_date, end_date } = req.query;

    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (start_date) {
      sql += ' AND date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND date <= ?';
      params.push(end_date);
    }
    sql += ' ORDER BY date DESC';

    const transactions = db.prepare(sql).all(...params);
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createTransactionSchema), async (req, res, next) => {
  try {
    const { type, amount, category, description, date, recurring_id } = req.body;

    const transaction = await create('transactions', {
      type,
      amount,
      category,
      description,
      date,
      recurring_id: recurring_id || null,
    });

    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(updateTransactionSchema), async (req, res, next) => {
  try {
    const updated = await update('transactions', req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await remove('transactions', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
