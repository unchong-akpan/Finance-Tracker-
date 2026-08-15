import { Router } from 'express';
import { getAll } from '../models/database.js';

const router = Router();

router.get('/summary', (req, res) => {
  const { month } = req.query;
  let transactions = getAll('transactions');

  if (month) {
    transactions = transactions.filter((t) => t.date.startsWith(month));
  }

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  res.json({
    income,
    expenses,
    balance: income - expenses,
  });
});

router.get('/by-category', (req, res) => {
  const { month, type } = req.query;
  let transactions = getAll('transactions');

  if (month) {
    transactions = transactions.filter((t) => t.date.startsWith(month));
  }
  if (type) {
    transactions = transactions.filter((t) => t.type === type);
  }

  const categoryMap = {};
  transactions.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const categories = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  res.json(categories);
});

router.get('/monthly', (req, res) => {
  const transactions = getAll('transactions');
  const monthMap = {};

  transactions.forEach((t) => {
    const month = t.date.substring(0, 7);
    if (!monthMap[month]) {
      monthMap[month] = { month, income: 0, expenses: 0 };
    }
    if (t.type === 'income') {
      monthMap[month].income += t.amount;
    } else {
      monthMap[month].expenses += t.amount;
    }
  });

  const monthly = Object.values(monthMap)
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);

  res.json(monthly);
});

router.get('/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const transactions = getAll('transactions');

  const recent = transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);

  res.json(recent);
});

export default router;
