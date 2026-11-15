import { describe, it, expect } from 'vitest';
import { exportDbtModels } from '../../utils/dbt-export';
import type { Pipeline } from '../../types/pipeline';

/** Minimal pipeline fixture builder — fields must match the real Pipeline interface */
function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 'p1',
    name: 'Test Pipeline',
    description: '',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user',
    workspaceId: 'ws-test',
    status: 'draft',
    versions: [],
    currentVersionIndex: 0,
    ...overrides,
  };
}

function makeNode(id: string, label: string, category: 'source' | 'transform' | 'destination', subType: string) {
  return {
    id,
    type: 'pipeline-node',
    position: { x: 0, y: 0 },
    data: {
      label,
      category,
      subType,
      configured: true,
      connector: 'raw',
      table: 'orders',
      status: 'idle' as const,
    },
  };
}

describe('dbt-export', () => {
  it('returns empty array when no nodes', () => {
    const files = exportDbtModels(makePipeline());
    expect(files).toEqual([]);
  });

  it('single source → destination produces one model file', () => {
    const pipeline = makePipeline({
      nodes: [
        makeNode('src', 'Orders Source', 'source', 'csv-upload'),
        makeNode('dst', 'Output', 'destination', 'postgres'),
      ] as unknown as Pipeline['nodes'],
      edges: [{ id: 'e1', source: 'src', target: 'dst' }],
    });
    const files = exportDbtModels(pipeline);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toMatch(/output\.sql$/);
    expect(files[0].content).toContain('WITH');
    expect(files[0].content).toContain('source(');
  });

  it('filter node generates WHERE clause', () => {
    const pipeline = makePipeline({
      nodes: [
        makeNode('src', 'Source', 'source', 'csv-upload'),
        {
          ...makeNode('flt', 'Filter', 'transform', 'filter'),
          data: {
            label: 'Filter',
            category: 'transform',
            subType: 'filter',
            configured: true,
            status: 'idle' as const,
            filterConfig: {
              conditions: [{ field: 'amount', operator: '>', value: 100 }],
            },
          },
        },
        makeNode('dst', 'Dest', 'destination', 'postgres'),
      ] as unknown as Pipeline['nodes'],
      edges: [
        { id: 'e1', source: 'src', target: 'flt' },
        { id: 'e2', source: 'flt', target: 'dst' },
      ],
    });
    const files = exportDbtModels(pipeline);
    expect(files[0].content).toContain('WHERE');
    expect(files[0].content).toContain('amount');
  });

  it('two separate sinks produce two model files', () => {
    const pipeline = makePipeline({
      nodes: [
        makeNode('src', 'Source', 'source', 'csv-upload'),
        makeNode('dst1', 'Output1', 'destination', 'postgres'),
        makeNode('dst2', 'Output2', 'destination', 'snowflake'),
      ] as unknown as Pipeline['nodes'],
      edges: [
        { id: 'e1', source: 'src', target: 'dst1' },
        { id: 'e2', source: 'src', target: 'dst2' },
      ],
    });
    const files = exportDbtModels(pipeline);
    expect(files).toHaveLength(2);
  });
});
