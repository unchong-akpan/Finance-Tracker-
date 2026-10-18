export function PageHeader({ title, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}
