import { useState, useEffect, useRef } from 'react';
import { ALL_CATEGORIES } from '../../constants';

export function TransactionFilters({ filter, setFilter }) {
  const [searchInput, setSearchInput] = useState(filter.q || '');
  const debounceRef = useRef(null);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter((prev) => ({ ...prev, q: value }));
    }, 300);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleClearAll = () => {
    setSearchInput('');
    setFilter({ q: '', type: '', category: '', start_date: '', end_date: '' });
  };

  const hasActiveFilters =
    filter.q || filter.type || filter.category || filter.start_date || filter.end_date;

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
          />
        </svg>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search description or category…"
          aria-label="Search transactions"
          className="w-full pl-9 pr-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <select
          value={filter.type}
          onChange={(e) => setFilter((prev) => ({ ...prev, type: e.target.value }))}
          aria-label="Filter by type"
          className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          value={filter.category}
          onChange={(e) => setFilter((prev) => ({ ...prev, category: e.target.value }))}
          aria-label="Filter by category"
          className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filter.start_date || ''}
          onChange={(e) => setFilter((prev) => ({ ...prev, start_date: e.target.value }))}
          aria-label="Start date"
          className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <input
          type="date"
          value={filter.end_date || ''}
          onChange={(e) => setFilter((prev) => ({ ...prev, end_date: e.target.value }))}
          aria-label="End date"
          className="border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-2 justify-self-start"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
