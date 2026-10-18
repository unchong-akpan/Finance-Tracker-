import { EXPENSE_CATEGORIES } from '../../constants';

const inputClass =
  'w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export function BudgetForm({ formData, setFormData, onSubmit, onCancel, saving }) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className={inputClass}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Budget Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Month</label>
          <input
            type="month"
            required
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Budget'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
