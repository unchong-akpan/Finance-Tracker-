import { Skeleton } from '../ui/Skeleton';

export function StatCard({ label, value, color = 'default', loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  const colorClass =
    color === 'green'
      ? 'text-green-600 dark:text-green-400'
      : color === 'red'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-900 dark:text-white';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
  );
}
