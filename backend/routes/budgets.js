import { Router } from 'express';
import { getAll, create, update, remove, query } from '../models/database.js';

const router = Router();

router.get('/', (req, res) => {
  const { month } = req.query;
  const budgets = query('budgets', { month });
  res.json(budgets);
});

router.post('/', (req, res) => {
  const { category, amount, month } = req.body;

  if (!category || !amount || !month) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const existing = getAll('budgets').find(
    (b) => b.category === category && b.month === month
  );

  if (existing) {
    const updated = update('budgets', existing.id, { amount: parseFloat(amount) });
    return res.json(updated);
  }

  const budget = create('budgets', {
    category,
    amount: parseFloat(amount),
    month,
  });

  res.status(201).json(budget);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = getAll('budgets').find((b) => b.id === parseInt(id));
  if (!existing) {
    return res.status(404).json({ error: 'Budget not found' });
  }

  remove('budgets', parseInt(id));
  res.json({ message: 'Budget deleted' });
});

export default router;
