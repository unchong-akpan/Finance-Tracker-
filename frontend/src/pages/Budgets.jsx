import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { budgets, stats } from '../api';

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Entertainment',
  'Shopping', 'Healthcare', 'Education', 'Savings', 'Other',
];

export default function Budgets() {
  const [budgetList, setBudgetList] = useState([]);
  const [spent, setSpent] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Food & Dining',
    amount: '',
    month: format(new Date(), 'yyyy-MM'),
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const [budgetRes, spentRes] = await Promise.all([
        budgets.getAll({ month: formData.month }),
        stats.getByCategory({ month: formData.month, type: 'expense' }),
      ]);
      setBudgetList(budgetRes.data);

      const spentMap = {};
      spentRes.data.forEach((item) => {
        spentMap[item.category] = item.total;
      });
      setSpent(spentMap);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await budgets.create({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      setShowForm(false);
      setFormData({ ...formData, amount: '' });
      loadBudgets();
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await budgets.delete(id);
      loadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Budget'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
              <input
                type="month"
                required
                value={formData.month}
                onChange={(e) => {
                  setFormData({ ...formData, month: e.target.value });
                }}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Save Budget
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgetList.map((b) => {
          const used = spent[b.category] || 0;
          const percent = Math.min((used / b.amount) * 100, 100);

          return (
            <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{b.category}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{b.month}</p>
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  ×
                </button>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    ${used.toLocaleString('en-US', { minimumFractionDigits: 2 })} spent
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${b.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(percent)} transition-all`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                {percent.toFixed(0)}% used
              </p>
            </div>
          );
        })}
      </div>

      {budgetList.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">No budgets set for this month. Add one to start tracking!</p>
        </div>
      )}
    </div>
  );
}
