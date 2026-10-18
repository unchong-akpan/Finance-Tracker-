import { useState } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import {
  useRecurringRules,
  useCreateRecurring,
  useDeleteRecurring,
  useGenerateRecurring,
  recurringKeys,
} from '../hooks/useRecurring';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants';
import { PageHeader } from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { logActivity } from '../lib/activity';
import { formatSigned, ordinal } from '../lib/format';

const inputClass =
  'w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const emptyForm = {
  type: 'expense',
  amount: '',
  category: 'Food & Dining',
  description: '',
  day_of_month: '1',
};

export default function Recurring() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: rules = [], isLoading, isError, refetch } = useRecurringRules();
  const createMutation = useCreateRecurring();
  const deleteMutation = useDeleteRecurring();
  const generateMutation = useGenerateRecurring();

  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    try {
      await createMutation.mutateAsync({
        ...formData,
        amount,
        day_of_month: Number(formData.day_of_month),
      });
      logActivity({
        action: 'create',
        entity: 'recurring',
        label: `${formData.type === 'income' ? '+' : '-'}$${amount.toFixed(2)} ${formData.category}`,
        detail: `Day ${formData.day_of_month}`,
      });
      toast.success('Recurring rule saved');
      setShowForm(false);
      setFormData(emptyForm);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save recurring rule.');
    }
  };

  const handleDeleteConfirm = () => {
    const id = confirmDelete;
    const r = rules.find((x) => x.id === id);
    if (!r) return setConfirmDelete(null);
    setConfirmDelete(null);

    const previous = queryClient.getQueriesData({ queryKey: recurringKeys.all });
    queryClient.setQueriesData({ queryKey: recurringKeys.all }, (old) =>
      Array.isArray(old) ? old.filter((x) => x.id !== id) : old
    );

    const label = `${r.type === 'income' ? '+' : '-'}$${r.amount.toFixed(2)} ${r.category}`;
    toast.undo({
      message: `Deleted ${label} rule`,
      duration: 5000,
      onUndo: () => {
        previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
        logActivity({ action: 'undo', entity: 'recurring', label, detail: 'Delete cancelled' });
        toast.success('Delete undone');
      },
      onTimeout: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          logActivity({ action: 'delete', entity: 'recurring', label, detail: r.description });
        } catch {
          previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
          toast.error('Failed to delete recurring rule.');
        }
      },
    });
  };

  const handleGenerate = async () => {
    try {
      const res = await generateMutation.mutateAsync(month);
      const { created } = res;
      if (created > 0) {
        logActivity({
          action: 'generate',
          entity: 'recurring',
          label: `${created} transaction${created === 1 ? '' : 's'}`,
          detail: month,
        });
        toast.success(`Created ${created} transaction${created === 1 ? '' : 's'} for ${month}.`);
      } else {
        toast.info(`Nothing to create for ${month} — already generated.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate transactions.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Recurring">
        <input
          type="month"
          aria-label="Generate month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {generateMutation.isPending ? 'Generating…' : 'Generate for month'}
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Rule'}
        </button>
      </PageHeader>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className={labelClass}>Day of month</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={formData.day_of_month}
                onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
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
              placeholder="e.g. Rent, Netflix, Salary"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving…' : 'Save Rule'}
          </button>
        </form>
      )}

      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <ErrorState message="Failed to load recurring rules." onRetry={refetch} />
      ) : rules.length === 0 ? (
        <EmptyState message="No recurring rules yet. Add one to stop re-typing rent and salary every month." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <caption className="sr-only">Recurring rules</caption>
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                  >
                    Day
                  </th>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {r.description || r.category}
                      <span className="block sm:hidden text-xs text-gray-500 dark:text-gray-400">
                        {r.category} · {ordinal(r.day_of_month)}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {r.category}
                    </td>
                    <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ordinal(r.day_of_month)}
                    </td>
                    <td
                      className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${r.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {formatSigned(r.amount, r.type)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        aria-label={`Delete ${r.description || r.category} rule`}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete recurring rule?"
        message="It will be removed in 5 seconds — click Undo in the toast to cancel."
        confirmLabel="Delete"
      />
    </div>
  );
}
