import { format } from 'date-fns';
import {
  useStatsSummary,
  useStatsByCategory,
  useStatsMonthly,
  useStatsRecent,
} from '../hooks/useStats';
import { StatCard } from '../components/stats/StatCard';
import { SpendingChart } from '../components/stats/SpendingChart';
import { MonthlyTrendChart } from '../components/stats/MonthlyTrendChart';
import { TransactionListSkeleton } from '../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatSigned } from '../lib/format';

export default function Dashboard() {
  const currentMonth = format(new Date(), 'yyyy-MM');

  const {
    data: summary = { income: 0, expenses: 0, balance: 0 },
    isLoading: summaryLoading,
    isError,
    refetch,
  } = useStatsSummary({ month: currentMonth });

  const { data: categoryData = [], isLoading: categoryLoading } = useStatsByCategory({
    month: currentMonth,
    type: 'expense',
  });

  const { data: monthlyData = [], isLoading: monthlyLoading } = useStatsMonthly();

  const { data: recentTransactions = [], isLoading: recentLoading } = useStatsRecent({ limit: 5 });

  const loading = summaryLoading || categoryLoading || monthlyLoading || recentLoading;

  if (isError) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <ErrorState message="Failed to load dashboard data. Please try again." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Income"
          value={formatCurrency(summary.income)}
          color="green"
          loading={loading}
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(summary.expenses)}
          color="red"
          loading={loading}
        />
        <StatCard
          label="Balance"
          value={formatCurrency(summary.balance)}
          color={summary.balance >= 0 ? 'green' : 'red'}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyTrendChart data={monthlyData} loading={loading} />
        <SpendingChart data={categoryData} loading={loading} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Transactions
        </h3>
        {loading ? (
          <TransactionListSkeleton />
        ) : recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t.description || t.category}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t.category} &middot; {t.date}
                  </p>
                </div>
                <p
                  className={`font-semibold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {formatSigned(t.amount, t.type)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No transactions yet" />
        )}
      </div>
    </div>
  );
}
