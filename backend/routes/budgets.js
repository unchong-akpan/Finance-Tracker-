import { Router } from 'express';
import { upsert, remove, query } from '../models/database.js';
import { validate, budgetSchema, budgetQuerySchema } from '../lib/validate.js';

const router = Router();

router.get('/', validate(budgetQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { month } = req.query;
    const budgets = await query('budgets', { month });
    res.json(budgets);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(budgetSchema), async (req, res, next) => {
  try {
    const { category, amount, month } = req.body;

    const { item, created } = await upsert(
      'budgets',
      (b) => b.category === category && b.month === month,
      { category, amount, month }
    );

    res.status(created ? 201 : 200).json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await remove('budgets', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
