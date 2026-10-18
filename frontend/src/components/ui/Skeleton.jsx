export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function TransactionListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0"
        >
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-4 px-6">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4" style={{ width: `${60 + (j % 3) * 20}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BudgetCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border dark:border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div>
          <Skeleton className="h-5 w-28 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
      <div className="flex justify-between text-sm mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="w-full h-2 rounded-full" />
    </div>
  );
}

export function CardSkeleton({ lines = 1 }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border dark:border-gray-700">
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${80 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
}
