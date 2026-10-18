import { useState } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useBudgets, useCreateBudget, useDeleteBudget, budgetKeys } from '../hooks/useBudgets';
import { useStatsByCategory } from '../hooks/useStats';
import { PageHeader } from '../components/layout/PageHeader';
import { BudgetForm } from '../components/budgets/BudgetForm';
import { BudgetCard } from '../components/budgets/BudgetCard';
import { BudgetCardSkeleton } from '../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { logActivity } from '../lib/activity';

export default function Budgets() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [formData, setFormData] = useState({
    category: 'Food & Dining',
    amount: '',
    month: format(new Date(), 'yyyy-MM'),
  });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: budgetList = [], isLoading, isError, refetch } = useBudgets({ month });
  const { data: spentData = [] } = useStatsByCategory({ month, type: 'expense' });
  const createMutation = useCreateBudget();
  const deleteMutation = useDeleteBudget();

  const spent = spentData.reduce((acc, item) => {
    acc[item.category] = item.total;
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    try {
      await createMutation.mutateAsync({ ...formData, amount });
      logActivity({
        action: 'create',
        entity: 'budget',
        label: `${formData.category} $${amount.toFixed(2)}`,
        detail: formData.month,
      });
      toast.success('Budget saved');
      setShowForm(false);
      setFormData({ ...formData, amount: '' });
      if (formData.month !== month) setMonth(formData.month);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save budget.');
    }
  };

  const handleDeleteConfirm = () => {
    const id = confirmDelete;
    const b = budgetList.find((x) => x.id === id);
    if (!b) return setConfirmDelete(null);
    setConfirmDelete(null);

    const previous = queryClient.getQueriesData({ queryKey: budgetKeys.all });
    queryClient.setQueriesData({ queryKey: budgetKeys.all }, (old) =>
      Array.isArray(old) ? old.filter((x) => x.id !== id) : old
    );

    const label = `${b.category} $${b.amount.toFixed(2)}`;
    toast.undo({
      message: `Deleted ${label} budget`,
      duration: 5000,
      onUndo: () => {
        previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
        logActivity({ action: 'undo', entity: 'budget', label, detail: 'Delete cancelled' });
        toast.success('Delete undone');
      },
      onTimeout: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          logActivity({ action: 'delete', entity: 'budget', label, detail: b.month });
        } catch {
          previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
          toast.error('Failed to delete budget.');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Budgets">
        <input
          type="month"
          aria-label="View month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          onClick={() => {
            setFormData({ ...formData, month });
            setShowForm(!showForm);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Budget'}
        </button>
      </PageHeader>

      {showForm && (
        <BudgetForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          saving={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <BudgetCardSkeleton />
          <BudgetCardSkeleton />
          <BudgetCardSkeleton />
        </div>
      ) : isError ? (
        <ErrorState message="Failed to load budgets." onRetry={refetch} />
      ) : budgetList.length === 0 ? (
        <EmptyState message="No budgets set for this month. Add one to start tracking!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetList.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              spent={spent[b.category] || 0}
              onDelete={(id) => setConfirmDelete(id)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete budget?"
        message="It will be removed in 5 seconds — click Undo in the toast to cancel."
        confirmLabel="Delete"
      />
    </div>
  );
}
