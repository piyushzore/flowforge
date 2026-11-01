import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParseResult {
  data: Record<string, any>[];
  fields: string[];
  rowCount: number;
  warnings?: string[];
  error?: string;
}

/**
 * Sanitizes an array of header strings:
 * - Empty/whitespace headers -> `column_${index + 1}`
 * - Duplicate headers -> suffixed with `_2`, `_3`, etc.
 */
export function sanitizeHeaders(rawHeaders: (string | undefined | null)[]): string[] {
  const seen = new Map<string, number>();
  return rawHeaders.map((raw, idx) => {
    let clean = (raw !== undefined && raw !== null ? String(raw) : '').trim();
    if (!clean) {
      clean = `column_${idx + 1}`;
    }
    const count = seen.get(clean) || 0;
    seen.set(clean, count + 1);
    if (count > 0) {
      return `${clean}_${count + 1}`;
    }
    return clean;
  });
}

/**
 * Infers basic primitive data type for a cell value
 */
export function inferFieldType(val: any): string {
  if (val === null || val === undefined || val === '') return 'string';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  if (val instanceof Date) return 'date';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!isNaN(Number(trimmed)) && trimmed !== '') return 'number';
    if (/^(true|false|yes|no)$/i.test(trimmed)) return 'boolean';
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !isNaN(Date.parse(trimmed))) return 'date';
  }
  return 'string';
}

/**
 * Parses raw CSV or TSV text with PapaParse
 * Handles quoted commas, automatic delimiter detection, duplicate/blank headers,
 * empty files, and header-only files.
 */
export function parseCsvText(csvText: string): ParseResult {
  if (!csvText || !csvText.trim()) {
    return {
      data: [],
      fields: [],
      rowCount: 0,
      error: 'File is empty.'
    };
  }

  // First check if there are headers
  const parsed = Papa.parse<any[]>(csvText, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: true,
  });

  if (parsed.errors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
    return {
      data: [],
      fields: [],
      rowCount: 0,
      error: `CSV Parse Error: ${parsed.errors[0]?.message || 'Unknown error'}`
    };
  }

  const rawRows = parsed.data;
  if (!rawRows || rawRows.length === 0) {
    return {
      data: [],
      fields: [],
      rowCount: 0,
      error: 'File appears empty or has no data rows.'
    };
  }

  const rawHeaders = rawRows[0] as (string | number | null | undefined)[];
  const sanitizedHeaders = sanitizeHeaders(rawHeaders.map(h => (h !== undefined && h !== null ? String(h) : '')));

  if (rawRows.length === 1) {
    return {
      data: [],
      fields: sanitizedHeaders,
      rowCount: 0,
      warnings: ['File has headers but no data rows.']
    };
  }

  const dataRows = rawRows.slice(1).map(row => {
    const record: Record<string, any> = {};
    sanitizedHeaders.forEach((header, index) => {
      record[header] = row[index] !== undefined ? row[index] : null;
    });
    return record;
  });

  return {
    data: dataRows,
    fields: sanitizedHeaders,
    rowCount: dataRows.length
  };
}

/**
 * Parses an Excel file buffer (.xlsx, .xls)
 */
export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { data: [], fields: [], rowCount: 0, error: 'Excel workbook contains no sheets.' };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      return { data: [], fields: [], rowCount: 0, error: 'Selected sheet is empty.' };
    }

    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false });
    if (!rawRows || rawRows.length === 0) {
      return { data: [], fields: [], rowCount: 0, error: 'Excel sheet has no data.' };
    }

    const rawHeaders = (rawRows[0] || []) as (string | number | null | undefined)[];
    const sanitizedHeaders = sanitizeHeaders(rawHeaders.map(h => (h !== undefined && h !== null ? String(h) : '')));

    if (rawRows.length === 1) {
      return {
        data: [],
        fields: sanitizedHeaders,
        rowCount: 0,
        warnings: ['File has headers but no data rows.']
      };
    }

    const dataRows = rawRows.slice(1).map(row => {
      const record: Record<string, any> = {};
      sanitizedHeaders.forEach((header, index) => {
        record[header] = row[index] !== undefined ? row[index] : null;
      });
      return record;
    });

    return {
      data: dataRows,
      fields: sanitizedHeaders,
      rowCount: dataRows.length
    };
  } catch (err: any) {
    return {
      data: [],
      fields: [],
      rowCount: 0,
      error: `Excel parsing failed: ${err.message}`
    };
  }
}
