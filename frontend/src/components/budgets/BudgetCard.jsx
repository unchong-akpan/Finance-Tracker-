import { formatCurrency } from '../../lib/format';

function getProgressColor(percent) {
  if (percent >= 100) return 'bg-red-500';
  if (percent >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function BudgetCard({ budget, spent = 0, onDelete }) {
  const used = spent;
  const percent = budget.amount > 0 ? (used / budget.amount) * 100 : 0;
  const remaining = budget.amount - used;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{budget.category}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{budget.month}</p>
        </div>
        <button
          onClick={() => onDelete(budget.id)}
          aria-label={`Delete ${budget.category} budget`}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          &times;
        </button>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{formatCurrency(used)} spent</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(budget.amount)}
          </span>
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getProgressColor(percent)} transition-all`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(percent)}% used</p>
        {remaining < 0 ? (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            {formatCurrency(Math.abs(remaining))} over budget
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(remaining)} left
          </p>
        )}
      </div>
    </div>
  );
}
