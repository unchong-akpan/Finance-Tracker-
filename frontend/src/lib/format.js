export function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSigned(amount, type) {
  return `${type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(amount))}`;
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function formatDate(date) {
  return date;
}

export function ordinal(day) {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] || 'th'}`;
}
