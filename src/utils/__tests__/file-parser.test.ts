import { describe, it, expect } from 'vitest';
import { sanitizeHeaders, parseCsvText, inferFieldType } from '../file-parser';

describe('file-parser', () => {
  describe('sanitizeHeaders', () => {
    it('handles blank headers by providing column_N names', () => {
      const headers = ['', 'age', '  ', 'city'];
      const result = sanitizeHeaders(headers);
      expect(result).toEqual(['column_1', 'age', 'column_3', 'city']);
    });

    it('deduplicates duplicate headers with _2, _3 suffix', () => {
      const headers = ['id', 'name', 'id', 'name', 'id'];
      const result = sanitizeHeaders(headers);
      expect(result).toEqual(['id', 'name', 'id_2', 'name_2', 'id_3']);
    });
  });

  describe('parseCsvText', () => {
    it('handles quoted commas correctly', () => {
      const csv = `id,name,address\n1,"Doe, Jane","123 Main St, Apt 4"\n2,"Smith, John","456 Oak Rd"`;
      const result = parseCsvText(csv);
      expect(result.error).toBeUndefined();
      expect(result.rowCount).toBe(2);
      expect(result.data[0].name).toBe('Doe, Jane');
      expect(result.data[0].address).toBe('123 Main St, Apt 4');
    });

    it('handles empty files gracefully', () => {
      const result = parseCsvText('');
      expect(result.error).toBe('File is empty.');
      expect(result.data).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('handles header-only files without crashing', () => {
      const csv = `id,name,email`;
      const result = parseCsvText(csv);
      expect(result.error).toBeUndefined();
      expect(result.warnings).toContain('File has headers but no data rows.');
      expect(result.rowCount).toBe(0);
      expect(result.fields).toEqual(['id', 'name', 'email']);
    });

    it('handles duplicate headers in CSV', () => {
      const csv = `name,score,name\nAlice,100,Smith\nBob,90,Jones`;
      const result = parseCsvText(csv);
      expect(result.fields).toEqual(['name', 'score', 'name_2']);
      expect(result.data[0]).toEqual({ name: 'Alice', score: 100, name_2: 'Smith' });
    });

    it('handles blank headers in CSV', () => {
      const csv = `,score,\nAlice,100,Yes`;
      const result = parseCsvText(csv);
      expect(result.fields).toEqual(['column_1', 'score', 'column_3']);
      expect(result.data[0]).toEqual({ column_1: 'Alice', score: 100, column_3: 'Yes' });
    });
  });

  describe('inferFieldType', () => {
    it('correctly infers types', () => {
      expect(inferFieldType(123)).toBe('number');
      expect(inferFieldType('45.67')).toBe('number');
      expect(inferFieldType('true')).toBe('boolean');
      expect(inferFieldType('no')).toBe('boolean');
      expect(inferFieldType('2026-05-12')).toBe('date');
      expect(inferFieldType('Hello World')).toBe('string');
      expect(inferFieldType(null)).toBe('string');
    });
  });
});
