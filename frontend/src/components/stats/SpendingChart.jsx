import { Doughnut } from 'react-chartjs-2';
import { ChartSkeleton } from '../ui/Skeleton';
import './chartSetup';

const EXPENSE_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
];

export function SpendingChart({ data = [], loading }) {
  if (loading) return <ChartSkeleton />;

  const chartData = {
    labels: data.map((c) => c.category),
    datasets: [
      {
        data: data.map((c) => c.total),
        backgroundColor: data.map((_, i) => EXPENSE_COLORS[i % EXPENSE_COLORS.length]),
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Spending by Category
      </h3>
      {data.length > 0 ? (
        <div className="max-w-xs mx-auto">
          <Doughnut
            data={chartData}
            options={{ plugins: { legend: { position: 'bottom', labels: { color: '#9CA3AF' } } } }}
          />
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No expenses this month</p>
      )}
    </div>
  );
}
