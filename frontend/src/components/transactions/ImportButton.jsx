import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { transactions } from '../../api';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter((l) => l.trim()).map(parseLine);
  return { headers, rows };
}

function normalizeDate(val) {
  if (!val) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // MM/DD/YYYY or DD/MM/YYYY
  const m1 = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) {
    const [, a, b, y] = m1;
    // Assume MM/DD/YYYY (US format) if first part > 12, otherwise MM/DD
    const month = Number(a) > 12 ? Number(b) : Number(a);
    const day = Number(a) > 12 ? Number(a) : Number(b);
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  // YYYYMMDD
  if (/^\d{8}$/.test(val)) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  }
  return null;
}

function normalizeAmount(val) {
  if (!val) return null;
  let s = val.replace(/[$,\s]/g, '');
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const FIELD_MAP = {
  date: ['date', 'transaction date', 'post date', 'transaction date', 'posted', 'booking date'],
  description: ['description', 'details', 'payee', 'memo', 'narration', 'particulars', 'name'],
  amount: ['amount', 'value', 'debit', 'credit', 'sum'],
  category: ['category', 'type', 'tag', 'label'],
};

function guessColumn(headers, fieldName) {
  const targets = FIELD_MAP[fieldName] || [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    if (targets.some((t) => h === t || h.includes(t))) return i;
  }
  return -1;
}

export function ImportButton({ onImported }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({ date: -1, description: -1, amount: -1, category: -1, type: -1 });
  const [fileName, setFileName] = useState('');

  const importMutation = useMutation({
    mutationFn: (data) => transactions.import(data),
    onSuccess: ({ data }) => {
      toast.success(`Imported ${data.imported} transactions`);
      setOpen(false);
      setParsed(null);
      if (onImported) onImported();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Import failed');
    },
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      setParsed({ headers, rows });

      // Auto-guess columns
      const g = {
        date: guessColumn(headers, 'date'),
        description: guessColumn(headers, 'description'),
        amount: guessColumn(headers, 'amount'),
        category: guessColumn(headers, 'category'),
        type: guessColumn(headers, 'type'),
      };
      setMapping(g);
    };
    reader.readAsText(file);
  };

  const buildTransactions = () => {
    if (!parsed) return [];
    const { headers, rows } = parsed;
    return rows
      .map((row) => {
        const date = normalizeDate(row[mapping.date]);
        const rawAmount = normalizeAmount(row[mapping.amount]);
        const category = mapping.category >= 0 ? row[mapping.category] : '';
        const description = mapping.description >= 0 ? row[mapping.description] : '';

        if (!date || rawAmount === null || !category) return null;

        const absAmount = Math.abs(rawAmount);
        let type;
        if (mapping.type >= 0 && row[mapping.type]) {
          const t = row[mapping.type].toLowerCase();
          type = t.includes('income') || t.includes('credit') || t.includes('in') ? 'income' : 'expense';
        } else {
          type = rawAmount < 0 ? 'expense' : 'income';
        }

        return { type, amount: absAmount, category, description, date };
      })
      .filter(Boolean);
  };

  const validRows = buildTransactions();
  const totalRows = parsed?.rows.length || 0;

  const handleImport = () => {
    if (validRows.length === 0) return;
    importMutation.mutate({ transactions: validRows });
  };

  const reset = () => {
    setOpen(false);
    setParsed(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import CSV
      </button>

      <Modal open={open} onClose={reset} title="Import Transactions from CSV" maxWidth="max-w-2xl">
        <div className="space-y-4">
          {!parsed ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Upload a CSV file with columns: <strong>date</strong>, <strong>description</strong>, <strong>amount</strong>, <strong>category</strong>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                aria-label="Choose CSV file"
                className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50"
              />
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expected format:</p>
                <pre className="text-xs text-gray-600 dark:text-gray-300 overflow-x-auto">
{`date,description,amount,category
2026-10-01,Salary,3000,Income
2026-10-05,Groceries,-80,Food & Dining`}
                </pre>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{fileName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {totalRows} rows found, <strong>{validRows.length} valid</strong>
                    {validRows.length < totalRows && (
                      <span className="text-amber-600 dark:text-amber-400"> ({totalRows - validRows.length} skipped — missing/invalid data)</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Choose different file
                </button>
              </div>

              {/* Column mapping */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                {['date', 'description', 'amount', 'category', 'type'].map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 capitalize">
                      {field} {field !== 'type' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={mapping[field]}
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: Number(e.target.value) }))}
                      aria-label={`Map ${field} column`}
                      className="w-full text-xs border dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={-1}>— none —</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              {validRows.length > 0 && (
                <div className="border dark:border-gray-600 rounded-lg overflow-hidden mb-4">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Type</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Amount</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Category</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.slice(0, 20).map((t, i) => (
                          <tr key={i} className="border-t dark:border-gray-700">
                            <td className="px-3 py-1.5 text-gray-900 dark:text-white">{t.date}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-gray-900 dark:text-white">${t.amount.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300">{t.category}</td>
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-300 max-w-40 truncate">{t.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {validRows.length > 20 && (
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
                      ... and {validRows.length - 20} more
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || importMutation.isPending}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {importMutation.isPending
                  ? 'Importing…'
                  : `Import ${validRows.length} transaction${validRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
