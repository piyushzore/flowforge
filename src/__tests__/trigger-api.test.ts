import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimits,
  hashApiToken,
  executePipelinePayload,
  type TriggerPipelineInput
} from '../../api/trigger';

describe('api/trigger', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  describe('Rate Limiter', () => {
    it('allows requests up to 60 per minute and then blocks', () => {
      const key = 'test-token-key';
      for (let i = 0; i < 60; i++) {
        expect(checkRateLimit(key)).toBe(true);
      }
      // 61st request should be blocked
      expect(checkRateLimit(key)).toBe(false);
    });

    it('isolates different tokens', () => {
      const key1 = 'token-1';
      const key2 = 'token-2';
      for (let i = 0; i < 60; i++) {
        checkRateLimit(key1);
      }
      expect(checkRateLimit(key1)).toBe(false);
      expect(checkRateLimit(key2)).toBe(true);
    });
  });

  describe('Token Hashing', () => {
    it('computes deterministic SHA-256 hash', () => {
      const token = 'ff_live_secret_token_12345';
      const hash1 = hashApiToken(token);
      const hash2 = hashApiToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('executePipelinePayload', () => {
    it('executes a real pipeline DAG on incoming webhook records', async () => {
      const pipeline: TriggerPipelineInput = {
        id: 'test-pipe-1',
        name: 'Filter and Sort Webhook Pipeline',
        nodes: [
          {
            id: 'node-src',
            data: {
              category: 'source',
              subType: 'webhook-trigger',
              label: 'Webhook',
              config: {}
            }
          },
          {
            id: 'node-filter',
            data: {
              category: 'transform',
              subType: 'filter',
              label: 'Filter Active Users',
              filterConfig: {
                conditions: [{ field: 'active', operator: 'equals', value: true }]
              }
            }
          },
          {
            id: 'node-dest',
            data: {
              category: 'destination',
              subType: 'postgres',
              label: 'DB Destination',
              config: {}
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'node-src', target: 'node-filter' },
          { id: 'e2', source: 'node-filter', target: 'node-dest' }
        ]
      };

      const payload = [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
        { id: 3, name: 'Charlie', active: true }
      ];

      const result = await executePipelinePayload(pipeline, payload);

      expect(result.recordsIn).toBe(3);
      expect(result.recordsOut).toBe(2);
      expect(result.data).toEqual([
        { id: 1, name: 'Alice', active: true },
        { id: 3, name: 'Charlie', active: true }
      ]);
      expect(result.executionId).toMatch(/^run_\d+_[a-f0-9-]+$/);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('throws when payload has no valid records', async () => {
      const pipeline: TriggerPipelineInput = {
        id: 'empty-test',
        name: 'Empty Test',
        nodes: [],
        edges: []
      };

      await expect(executePipelinePayload(pipeline, [])).rejects.toThrow('No valid records found');
    });
  });
});
