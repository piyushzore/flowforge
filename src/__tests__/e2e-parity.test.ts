import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { executePipelineCore, type EngineNode, type EngineEdge } from '@flowforge/shared-engine';
import { executePipelinePayload, type TriggerPipelineInput } from '../../api/trigger';
import { parseCsvText } from '../utils/file-parser';

describe('End-to-End Engine & Trigger Parity', () => {
  it('produces identical transformation output in shared engine vs /api/trigger', async () => {
    // 1. Read seeded sample dataset
    const csvPath = path.resolve(process.cwd(), 'public/ecommerce_10000_orders.csv');
    const rawCsv = fs.readFileSync(csvPath, 'utf8');
    const parsedFile = parseCsvText(rawCsv);

    // Take top 500 records for fast, rigorous deterministic end-to-end test
    const testRecords = parsedFile.data.slice(0, 500);

    // 2. Define the exact same visual pipeline DAG
    const nodes: EngineNode[] = [
      {
        id: 'node-source',
        data: {
          category: 'source',
          subType: 'webhook-trigger',
          label: 'E-commerce Inbound Feed',
          fullData: testRecords,
          previewData: testRecords.slice(0, 50)
        }
      },
      {
        id: 'node-filter',
        data: {
          category: 'transform',
          subType: 'filter',
          label: 'Filter Completed Orders',
          conditions: [
            { field: 'status', operator: 'equals', value: 'completed' }
          ]
        }
      },
      {
        id: 'node-dedupe',
        data: {
          category: 'transform',
          subType: 'deduplicate',
          label: 'Deduplicate by Customer Email',
          config: {
            subset: ['email'],
            keep: 'first'
          }
        }
      },
      {
        id: 'node-sort',
        data: {
          category: 'transform',
          subType: 'sort',
          label: 'Sort by Amount Descending',
          config: {
            sortBy: 'amount',
            order: 'desc'
          }
        }
      },
      {
        id: 'node-dest',
        data: {
          category: 'destination',
          subType: 'postgres',
          label: 'Warehouse Sink',
          config: {}
        }
      }
    ];

    const edges: EngineEdge[] = [
      { id: 'e1', source: 'node-source', target: 'node-filter' },
      { id: 'e2', source: 'node-filter', target: 'node-dedupe' },
      { id: 'e3', source: 'node-dedupe', target: 'node-sort' },
      { id: 'e4', source: 'node-sort', target: 'node-dest' }
    ];

    // 3. Execution Path A: Direct Shared Engine (Local / Browser runner)
    const localResultsMap = await executePipelineCore(nodes, edges);
    const localOutput = localResultsMap.get('node-dest') || [];

    // 4. Execution Path B: Serverless Trigger API (/api/trigger runner)
    const pipelineInput: TriggerPipelineInput = {
      id: 'pipe-e2e-parity-1',
      name: 'E2E Parity Pipeline',
      nodes,
      edges
    };
    const apiExecution = await executePipelinePayload(pipelineInput, testRecords);
    const apiOutput = apiExecution.data;

    // 5. Strict Parity Assertions
    expect(localOutput.length).toBeGreaterThan(0);
    expect(apiOutput.length).toBe(localOutput.length);
    expect(apiExecution.recordsIn).toBe(testRecords.length);
    expect(apiExecution.recordsOut).toBe(localOutput.length);

    // Assert every row and column matches 100% identically
    expect(apiOutput).toEqual(localOutput);
  });
});
