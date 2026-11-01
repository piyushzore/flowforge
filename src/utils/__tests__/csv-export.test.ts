import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell, exportToCsvString } from '../csv-export';

describe('CSV Injection Prevention & Safe Export', () => {
  describe('sanitizeCsvCell', () => {
    it('escapes cells starting with = + - @', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe(`'=SUM(A1:A10)`);
      expect(sanitizeCsvCell('+12345')).toBe(`'+12345`);
      expect(sanitizeCsvCell('-cmd|calc!A0')).toBe(`'-cmd|calc!A0`);
      expect(sanitizeCsvCell('@IMPORTXML')).toBe(`'@IMPORTXML`);
    });

    it('escapes quotes by doubling them', () => {
      expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    });

    it('wraps fields with commas in quotes', () => {
      expect(sanitizeCsvCell('New York, NY')).toBe('"New York, NY"');
    });

    it('handles null, undefined, and numbers safely', () => {
      expect(sanitizeCsvCell(null)).toBe('');
      expect(sanitizeCsvCell(undefined)).toBe('');
      expect(sanitizeCsvCell(42)).toBe('42');
    });
  });

  describe('exportToCsvString', () => {
    it('generates properly formatted CSV with sanitization', () => {
      const rows = [
        { id: 1, name: 'Alice', formula: '=cmd' },
        { id: 2, name: 'Bob, Jr.', formula: 'safe' }
      ];

      const csv = exportToCsvString(rows);
      expect(csv).toContain('id,name,formula');
      expect(csv).toContain("1,Alice,'=cmd");
      expect(csv).toContain('2,"Bob, Jr.",safe');
    });
  });
});
