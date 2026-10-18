import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  transactionKeys,
} from '../hooks/useTransactions';
import { PageHeader } from '../components/layout/PageHeader';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { TransactionFilters } from '../components/transactions/TransactionFilters';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { ConfirmModal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { useToast } from '../components/ui/Toast';
import { logActivity } from '../lib/activity';

const emptyForm = {
  type: 'expense',
  amount: '',
  category: 'Food & Dining',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
};

const emptyFilter = { q: '', type: '', category: '', start_date: '', end_date: '' };

export default function Transactions() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [filter, setFilterState] = useState(emptyFilter);
  const [sort, setSortState] = useState({ key: 'date', direction: 'desc' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const setFilter = (updater) => {
    setFilterState(updater);
    setPage(1);
  };

  const setSort = (updater) => {
    setSortState(updater);
    setPage(1);
  };

  // API params (server-side filters)
  const params = {};
  if (filter.category) params.category = filter.category;
  if (filter.type) params.type = filter.type;
  if (filter.start_date) params.start_date = filter.start_date;
  if (filter.end_date) params.end_date = filter.end_date;

  const { data: rawList = [], isLoading, isError, refetch } = useTransactions(params);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  // Client-side: search on description + sort
  const filteredList = useMemo(() => {
    let result = rawList;

    if (filter.q) {
      const q = filter.q.toLowerCase();
      result = result.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }

    if (sort.key) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sort.key === 'amount') {
          cmp = a.amount - b.amount;
        } else if (sort.key === 'date') {
          cmp = new Date(a.date) - new Date(b.date);
        } else {
          cmp = String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''));
        }
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rawList, filter.q, sort]);

  // Pagination
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const list = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, safePage, pageSize]);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, amount: parseFloat(formData.amount) };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        logActivity({
          action: 'update',
          entity: 'transaction',
          label: `${payload.type === 'income' ? '+' : '-'}$${payload.amount.toFixed(2)} ${payload.category}`,
          detail: payload.description,
        });
        toast.success('Transaction updated');
      } else {
        await createMutation.mutateAsync(payload);
        logActivity({
          action: 'create',
          entity: 'transaction',
          label: `${payload.type === 'income' ? '+' : '-'}$${payload.amount.toFixed(2)} ${payload.category}`,
          detail: payload.description,
        });
        toast.success('Transaction added');
      }
      closeForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save transaction.');
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setFormData({
      type: t.type,
      amount: String(t.amount),
      category: t.category,
      description: t.description || '',
      date: t.date,
    });
    setShowForm(true);
  };

  const handleDeleteConfirm = () => {
    const id = confirmDelete;
    const t = rawList.find((x) => x.id === id);
    if (!t) return setConfirmDelete(null);
    setConfirmDelete(null);

    const previous = queryClient.getQueriesData({ queryKey: transactionKeys.all });
    queryClient.setQueriesData({ queryKey: transactionKeys.all }, (old) =>
      Array.isArray(old) ? old.filter((x) => x.id !== id) : old
    );
    if (editingId === id) closeForm();

    const label = `${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)} ${t.category}`;
    toast.undo({
      message: `Deleted ${label}`,
      duration: 5000,
      onUndo: () => {
        previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
        logActivity({ action: 'undo', entity: 'transaction', label, detail: 'Delete cancelled' });
        toast.success('Delete undone');
      },
      onTimeout: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          logActivity({ action: 'delete', entity: 'transaction', label, detail: t.description });
        } catch {
          previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
          toast.error('Failed to delete transaction.');
        }
      },
    });
  };

  const exportCsv = () => {
    if (!filteredList.length) return;
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['date', 'type', 'category', 'description', 'amount'];
    const rows = filteredList.map((t) => [
      t.date,
      t.type,
      t.category,
      t.description,
      t.amount.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions">
        <button
          onClick={exportCsv}
          disabled={!filteredList.length}
          className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
        <button
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Transaction'}
        </button>
      </PageHeader>

      {showForm && (
        <TransactionForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          editingId={editingId}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <TransactionFilters filter={filter} setFilter={setFilter} />

      <TransactionTable
        list={list}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        onEdit={handleEdit}
        onDelete={(id) => setConfirmDelete(id)}
        sort={sort}
        onSort={setSort}
      />

      {!isLoading && !isError && totalItems > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete transaction?"
        message="It will be removed in 5 seconds — click Undo in the toast to cancel."
        confirmLabel="Delete"
      />
    </div>
  );
}
