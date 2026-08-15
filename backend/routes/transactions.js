import { Router } from 'express';
import { getAll, create, update, remove, query } from '../models/database.js';

const router = Router();

router.get('/', (req, res) => {
  const { category, type, start_date, end_date } = req.query;

  let transactions = query('transactions', { category, type });

  if (start_date) {
    transactions = transactions.filter((t) => t.date >= start_date);
  }
  if (end_date) {
    transactions = transactions.filter((t) => t.date <= end_date);
  }

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(transactions);
});

router.post('/', (req, res) => {
  const { type, amount, category, description, date } = req.body;

  if (!type || !amount || !category || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const transaction = create('transactions', {
    type,
    amount: parseFloat(amount),
    category,
    description: description || '',
    date,
  });

  res.status(201).json(transaction);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { type, amount, category, description, date } = req.body;

  const existing = getAll('transactions').find((t) => t.id === parseInt(id));
  if (!existing) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const updated = update('transactions', parseInt(id), {
    type: type || existing.type,
    amount: amount ? parseFloat(amount) : existing.amount,
    category: category || existing.category,
    description: description ?? existing.description,
    date: date || existing.date,
  });

  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = getAll('transactions').find((t) => t.id === parseInt(id));
  if (!existing) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  remove('transactions', parseInt(id));
  res.json({ message: 'Transaction deleted' });
});

export default router;
