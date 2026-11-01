import { describe, it, expect } from 'vitest';
import { isBlockedHost, isReadOnlySelectQuery } from '../../api/preview-db';

describe('preview-db security validation', () => {
  describe('SSRF Protection (isBlockedHost)', () => {
    it('blocks localhost and 127.0.0.1', async () => {
      expect(await isBlockedHost('localhost')).toBe(true);
      expect(await isBlockedHost('127.0.0.1')).toBe(true);
      expect(await isBlockedHost('::1')).toBe(true);
    });

    it('blocks cloud metadata 169.254.169.254', async () => {
      expect(await isBlockedHost('169.254.169.254')).toBe(true);
      expect(await isBlockedHost('169.254.1.1')).toBe(true);
    });

    it('blocks RFC1918 private IP ranges', async () => {
      expect(await isBlockedHost('10.0.0.1')).toBe(true);
      expect(await isBlockedHost('192.168.1.100')).toBe(true);
      expect(await isBlockedHost('172.16.0.5')).toBe(true);
      expect(await isBlockedHost('172.31.255.254')).toBe(true);
    });

    it('allows public IP addresses', async () => {
      expect(await isBlockedHost('8.8.8.8')).toBe(false);
      expect(await isBlockedHost('1.1.1.1')).toBe(false);
    });
  });

  describe('Read-Only Query Enforcer (isReadOnlySelectQuery)', () => {
    it('accepts safe SELECT queries', () => {
      expect(isReadOnlySelectQuery('SELECT id, name FROM users LIMIT 10;').valid).toBe(true);
      expect(isReadOnlySelectQuery('WITH recent AS (SELECT * FROM orders) SELECT * FROM recent;').valid).toBe(true);
    });

    it('rejects INSERT, UPDATE, DELETE queries', () => {
      expect(isReadOnlySelectQuery('DELETE FROM users WHERE id = 1;').valid).toBe(false);
      expect(isReadOnlySelectQuery('UPDATE orders SET status = "cancelled";').valid).toBe(false);
      expect(isReadOnlySelectQuery('INSERT INTO logs VALUES ("bad");').valid).toBe(false);
    });

    it('rejects DDL and destructive queries', () => {
      expect(isReadOnlySelectQuery('DROP TABLE users;').valid).toBe(false);
      expect(isReadOnlySelectQuery('ALTER TABLE users ADD COLUMN secret text;').valid).toBe(false);
      expect(isReadOnlySelectQuery('TRUNCATE table1;').valid).toBe(false);
    });

    it('rejects query chaining (semicolon multi-statement)', () => {
      expect(isReadOnlySelectQuery('SELECT 1; DROP TABLE users;').valid).toBe(false);
    });
  });
});
