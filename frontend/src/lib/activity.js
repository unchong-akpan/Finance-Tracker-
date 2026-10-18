const KEY = 'ft_activity_history';
const MAX = 200;

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function write(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    // storage full — drop oldest
  }
}

let nextId = 0;

export function logActivity({ action, entity, label, detail }) {
  const entries = read();
  const entry = {
    id: `a-${Date.now()}-${++nextId}`,
    action, // 'create' | 'update' | 'delete' | 'undo' | 'generate'
    entity, // 'transaction' | 'budget' | 'recurring'
    label,
    detail: detail || '',
    at: new Date().toISOString(),
  };
  entries.unshift(entry);
  write(entries);
  return entry;
}

export function getHistory(limit = MAX) {
  return read().slice(0, limit);
}

export function clearHistory() {
  write([]);
}
