import { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants';
import { ai } from '../../api';

const inputClass =
  'w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export function TransactionForm({ formData, setFormData, onSubmit, onCancel, editingId, saving }) {
  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestError, setSuggestError] = useState('');

  const handleSuggest = async () => {
    if (!(formData.description || '').trim()) {
      setSuggestError('Add a description first so the AI has something to work with.');
      return;
    }

    setSuggesting(true);
    setSuggestError('');
    try {
      const { data } = await ai.suggest({
        type: formData.type,
        amount: Number(formData.amount) || 0,
        description: formData.description,
      });
      if (data.confidence >= 0.45) {
        setFormData((previous) => ({ ...previous, category: data.suggested_category }));
      }
      setSuggestion(data);
    } catch (err) {
      setSuggestError(
        err.response?.data?.error ||
          'AI suggestion unavailable. Is the AI service running? Start it with npm run ai.'
      );
    } finally {
      setSuggesting(false);
    }
  };

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
              setSuggestion(null);
              setSuggestError('');
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
            onChange={(e) => {
              setSuggestion(null);
              setSuggestError('');
              setFormData({ ...formData, amount: e.target.value });
            }}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className={`${labelClass} mb-0`}>Category</label>
            <button
              type="button"
              onClick={handleSuggest}
              disabled={suggesting || !(formData.description || '').trim()}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Suggest a category from the description and amount"
            >
              <span aria-hidden="true">✦</span> {suggesting ? 'Thinking…' : 'AI suggest'}
            </button>
          </div>
          <select
            value={formData.category}
            onChange={(e) => {
              setSuggestion(null);
              setFormData({ ...formData, category: e.target.value });
            }}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {suggestion && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              AI suggested <strong>{suggestion.suggested_category}</strong> (
              {Math.round(suggestion.confidence * 100)}% confidence)
              {suggestion.source === 'rule' ? ' · keyword match' : ''}
              {suggestion.confidence < 0.45
                ? ' · low confidence, please confirm or choose manually'
                : ''}
            </p>
          )}
          {suggestError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{suggestError}</p>
          )}
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
          onChange={(e) => {
            setSuggestion(null);
            setSuggestError('');
            setFormData({ ...formData, description: e.target.value });
          }}
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
