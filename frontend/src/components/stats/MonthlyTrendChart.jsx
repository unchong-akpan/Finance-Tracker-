import { Bar } from 'react-chartjs-2';
import { ChartSkeleton } from '../ui/Skeleton';
import './chartSetup';

export function MonthlyTrendChart({ data = [], loading }) {
  if (loading) return <ChartSkeleton />;

  const chartData = {
    labels: data.map((m) => m.month),
    datasets: [
      {
        label: 'Income',
        data: data.map((m) => m.income),
        backgroundColor: '#22c55e',
      },
      {
        label: 'Expenses',
        data: data.map((m) => m.expenses),
        backgroundColor: '#ef4444',
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Overview</h3>
      {data.length > 0 ? (
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#9CA3AF' } } },
            scales: { x: { ticks: { color: '#9CA3AF' } }, y: { ticks: { color: '#9CA3AF' } } },
          }}
        />
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No data yet</p>
      )}
    </div>
  );
}
