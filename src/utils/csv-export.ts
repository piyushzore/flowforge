/**
 * Safe CSV Export Utility
 * 
 * Protects against CSV Injection / Formula Injection by prepending a single quote (')
 * to any cell value starting with dangerous formula characters: =, +, -, @, \t, \r
 * Also properly escapes quotes and handles commas/newlines.
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Check for formula injection triggers at start of cell
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If cell contains commas, double quotes, or newlines, quote the entire field and escape inner quotes
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function exportToCsvString(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(h => sanitizeCsvCell(h)).join(',');

  const dataLines = rows.map(row => {
    return headers.map(h => sanitizeCsvCell(row[h])).join(',');
  });

  return [headerLine, ...dataLines].join('\n');
}

export function downloadCsvFile(filename: string, rows: Record<string, unknown>[]): void {
  const csvContent = exportToCsvString(rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
