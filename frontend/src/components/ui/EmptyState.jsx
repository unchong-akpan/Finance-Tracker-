export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border dark:border-gray-700 text-center">
      {icon && (
        <div className="mx-auto w-12 h-12 mb-4 text-gray-300 dark:text-gray-600">{icon}</div>
      )}
      {title && <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{title}</h3>}
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
      <p className="text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
