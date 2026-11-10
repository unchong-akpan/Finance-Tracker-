// Keep these lists in sync with frontend/src/constants.js and
// ai_service/categorizer.py. They are duplicated because the three runtimes
// (Node, browser, Python) are separate processes.
export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Education',
  'Savings',
  'Other',
];

export const INCOME_CATEGORIES = ['Income', 'Savings', 'Other'];

export const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

export function categoriesForType(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
