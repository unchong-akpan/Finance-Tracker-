import { formatSigned } from '../../lib/format';

function ConfidenceBadge({ value }) {
  const percent = Math.round((value || 0) * 100);
  const tone =
    percent >= 80
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : percent >= 60
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>{percent}%</span>
  );
}

export function AiInsights({ result, loading, error, applying, onApply, onDismiss, onRetry }) {
  if (loading) {
    return (
      <section
        aria-live="polite"
        className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5"
      >
        <div className="flex items-center gap-3">
          <span className="inline-block w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Analysing categories and spending patterns…
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-300">AI review failed</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            <p className="text-xs text-red-500 dark:text-red-400/80 mt-2">
              The AI service runs separately. Start it with <code>npm run ai</code> from the
              project root.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-red-700 dark:text-red-300 hover:underline"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                aria-label="Dismiss AI error"
                className="text-sm text-red-700 dark:text-red-300 hover:underline"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (!result) return null;

  const suggestions = result.results.filter(
    (item) => item.differs && item.confidence >= 0.65
  );
  const anomalies = result.results.filter((item) => item.is_anomaly);
  const summary = result.summary || {};

  return (
    <section
      aria-live="polite"
      className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span aria-hidden="true">✦</span> AI Insights
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Reviewed {summary.total ?? result.results.length} transactions ·{' '}
            {suggestions.length} category suggestion{suggestions.length === 1 ? '' : 's'} ·{' '}
            {anomalies.length} unusual transaction{anomalies.length === 1 ? '' : 's'}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss AI insights"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            Category suggestions
          </h4>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No category changes suggested. Your labels look consistent.
            </p>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {suggestions.map((item) => (
                <li
                  key={item.id}
                  className="text-sm border-b last:border-0 border-gray-100 dark:border-gray-700 pb-3 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.date || 'No date'} · {formatSigned(item.amount, item.type)}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        <span className="line-through opacity-70">{item.current_category}</span>
                        <span className="mx-1" aria-hidden="true">
                          →
                        </span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {item.suggested_category}
                        </span>
                      </p>
                    </div>
                    <ConfidenceBadge value={item.confidence} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            Unusual spending
          </h4>
          {anomalies.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No unusual spending detected.
            </p>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {anomalies.map((item) => (
                <li
                  key={item.id}
                  className="text-sm border-b last:border-0 border-gray-100 dark:border-gray-700 pb-3 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.date || 'No date'} · {formatSigned(item.amount, item.type)} ·{' '}
                        {item.current_category}
                      </p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        {item.anomaly_reason || 'This transaction is larger than usual.'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Unusual
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {summary.model || 'Local model'} · {summary.trained_examples || 0} training examples
        </p>
        <div className="flex gap-3">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm text-gray-600 dark:text-gray-300 hover:underline"
            >
              Dismiss
            </button>
          )}
          {suggestions.length > 0 && onApply && (
            <button
              onClick={onApply}
              disabled={applying}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
            >
              {applying ? 'Applying…' : `Apply ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
