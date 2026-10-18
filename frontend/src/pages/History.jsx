import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { getHistory, clearHistory } from '../lib/activity';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/Modal';
import { PageHeader } from '../components/layout/PageHeader';
import { useToast } from '../components/ui/Toast';

const ACTION_META = {
  create: {
    label: 'Created',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    icon: '+',
  },
  update: {
    label: 'Updated',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    icon: '~',
  },
  delete: {
    label: 'Deleted',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    icon: '−',
  },
  undo: {
    label: 'Undone',
    color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300',
    icon: '↩',
  },
  generate: {
    label: 'Generated',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300',
    icon: '⚡',
  },
};

const ENTITY_LABEL = {
  transaction: 'Transaction',
  budget: 'Budget',
  recurring: 'Recurring',
};

export default function History() {
  const toast = useToast();
  const [entries, setEntries] = useState(() => {
    try {
      return getHistory(100);
    } catch {
      return [];
    }
  });
  const [filter, setFilter] = useState({ entity: '', action: '' });
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = () => {
    clearHistory();
    setEntries([]);
    setConfirmClear(false);
    toast.success('History cleared');
  };

  const filtered = entries.filter((e) => {
    if (filter.entity && e.entity !== filter.entity) return false;
    if (filter.action && e.action !== filter.action) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="History">
        <select
          value={filter.entity}
          onChange={(e) => setFilter({ ...filter, entity: e.target.value })}
          aria-label="Filter by entity"
          className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All types</option>
          <option value="transaction">Transactions</option>
          <option value="budget">Budgets</option>
          <option value="recurring">Recurring</option>
        </select>
        <select
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          aria-label="Filter by action"
          className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="undo">Undone</option>
          <option value="generate">Generated</option>
        </select>
        {entries.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Clear
          </button>
        )}
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            entries.length === 0
              ? 'No activity yet. Actions you take will appear here.'
              : 'No entries match the current filters.'
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((e) => {
              const meta = ACTION_META[e.action] || ACTION_META.create;
              return (
                <li
                  key={e.id}
                  className="px-4 sm:px-6 py-4 flex items-start gap-3 sm:gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <span
                    className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${meta.color}`}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {ENTITY_LABEL[e.entity] || e.entity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white truncate">{e.label}</p>
                    {e.detail && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {e.detail}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 sm:hidden">
                      {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="hidden sm:block shrink-0 text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {format(new Date(e.at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ConfirmModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClear}
        title="Clear history?"
        message="This will erase all recorded activity from this browser."
        confirmLabel="Clear"
      />
    </div>
  );
}
