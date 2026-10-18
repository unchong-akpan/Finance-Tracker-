import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants';

const inputClass =
  'w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export function TransactionForm({ formData, setFormData, onSubmit, onCancel, editingId, saving }) {
  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingId ? 'Edit Transaction' : 'Add Transaction'}
        </h3>
        {editingId && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Editing transaction from {formData.date}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Type</label>
          <select
            value={formData.type}
            onChange={(e) => {
              const newType = e.target.value;
              setFormData({
                ...formData,
                type: newType,
                category: newType === 'income' ? 'Income' : 'Food & Dining',
              });
            }}
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Amount</label>
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
          <label className={labelClass}>Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={inputClass}
          placeholder="Optional description"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Transaction'}
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
