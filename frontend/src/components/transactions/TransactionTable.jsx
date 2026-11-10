import { TableSkeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/EmptyState';
import { formatSigned } from '../../lib/format';

const COLUMNS = [
  { key: 'date', label: 'Date', align: 'left', className: '' },
  { key: 'type', label: 'Type', align: 'left', className: 'hidden sm:table-cell' },
  { key: 'category', label: 'Category', align: 'left', className: 'hidden md:table-cell' },
  { key: 'description', label: 'Description', align: 'left', className: 'hidden lg:table-cell' },
  { key: 'amount', label: 'Amount', align: 'right', className: '' },
];

function SortIcon({ active, direction }) {
  return (
    <span
      className={`inline-flex ml-1 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}
      aria-hidden="true"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {active && direction === 'desc' ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7M5 10l7 7m0-7v14"
          />
        )}
      </svg>
    </span>
  );
}

export function TransactionTable({
  list,
  loading,
  error,
  onRetry,
  onEdit,
  onDelete,
  sort,
  onSort,
  aiInsights = {},
}) {
  if (loading) return <TableSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message="Failed to load transactions." onRetry={onRetry} />
      </div>
    );
  }

  const handleSort = (key) => {
    if (sort.key === key) {
      onSort({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onSort({ key, direction: key === 'amount' || key === 'date' ? 'desc' : 'asc' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <caption className="sr-only">Transactions list</caption>
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  onClick={() => handleSort(col.key)}
                  className={`px-4 sm:px-6 py-3 text-xs font-medium uppercase cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 ${col.className} ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } text-gray-500 dark:text-gray-300`}
                  aria-sort={
                    sort.key === col.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <span
                    className={`inline-flex items-center ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                  >
                    {col.label}
                    <SortIcon active={sort.key === col.key} direction={sort.direction} />
                  </span>
                </th>
              ))}
              <th
                scope="col"
                className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {list.map((t) => {
              const insight = aiInsights[t.id];
              const hasSuggestion =
                insight && insight.differs && insight.confidence >= 0.65;

              return (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {t.date}
                    <span className="block sm:hidden text-xs text-gray-500 dark:text-gray-400">
                      {t.type} · {t.category}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        t.type === 'income'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {t.category}
                    {hasSuggestion && (
                      <span
                        title={`AI suggests ${insight.suggested_category} (${Math.round(
                          insight.confidence * 100
                        )}% confidence)`}
                        className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      >
                        AI: {insight.suggested_category}
                      </span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {t.description || '-'}
                  </td>
                  <td
                    className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
                      t.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatSigned(t.amount, t.type)}
                    {insight?.is_anomaly && (
                      <span
                        title={insight.anomaly_reason || 'Unusual spending'}
                        className="block text-xs font-normal text-amber-600 dark:text-amber-400"
                      >
                        Unusual
                      </span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                    <button
                      onClick={() => onEdit(t)}
                      aria-label={`Edit transaction ${t.description || t.category}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      aria-label={`Delete transaction ${t.description || t.category}`}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {list.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">No transactions found</p>
      )}
    </div>
  );
}
