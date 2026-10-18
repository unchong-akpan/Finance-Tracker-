import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((toast) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, ...toast }]);
    return id;
  }, []);

  const toast = {
    error: (msg) => push({ message: msg, type: 'error', duration: 5000 }),
    success: (msg) => push({ message: msg, type: 'success', duration: 4000 }),
    info: (msg) => push({ message: msg, type: 'info', duration: 4000 }),
    undo: ({ message, onUndo, onTimeout, duration = 5000 }) =>
      push({ message, type: 'undo', duration, onUndo, onTimeout }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TYPE_STYLES = {
  error:
    'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  success:
    'bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  info: 'bg-blue-50 dark:bg-blue-900/90 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  undo: 'bg-gray-50 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
};

const TYPE_ICONS = {
  error: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  undo: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  ),
};

function UndoToast({ toast, onDismiss }) {
  const [remaining, setRemaining] = useState(Math.ceil((toast.duration || 5000) / 1000));
  const doneRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          if (!doneRef.current) {
            doneRef.current = true;
            toast.onTimeout?.();
            onDismiss(toast.id);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [toast, onDismiss]);

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-center gap-3 border rounded-lg p-4 shadow-lg ${TYPE_STYLES.undo}`}
    >
      {TYPE_ICONS.undo}
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => {
          if (doneRef.current) return;
          doneRef.current = true;
          toast.onUndo?.();
          onDismiss(toast.id);
        }}
        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
      >
        Undo
      </button>
      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-4 text-right">
        {remaining}
      </span>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) =>
        t.type === 'undo' ? (
          <UndoToast key={t.id} toast={t} onDismiss={onDismiss} />
        ) : (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 border rounded-lg p-4 shadow-lg ${TYPE_STYLES[t.type]}`}
          >
            {TYPE_ICONS[t.type]}
            <p className="text-sm flex-1">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-60 hover:opacity-100 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )
      )}
    </div>
  );
}
