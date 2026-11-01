import { describe, it, expect } from 'vitest';
import { validatePipelinePreFlight } from '../pipeline-validator';
import type { PipelineNode, PipelineEdge } from '../../types/pipeline';

describe('validatePipelinePreFlight', () => {
  it('flags empty pipeline as invalid', () => {
    const res = validatePipelinePreFlight([], []);
    expect(res.valid).toBe(false);
    expect(res.issues[0].message).toContain('Pipeline is empty');
  });

  it('detects missing source node in pipeline', () => {
    const nodes: PipelineNode[] = [
      {
        id: 't1',
        type: 'pipeline-node',
        position: { x: 100, y: 100 },
        data: { label: 'Filter', category: 'transform', subType: 'filter', configured: true }
      }
    ];
    const res = validatePipelinePreFlight(nodes, []);
    expect(res.valid).toBe(false);
    expect(res.issues.some(i => i.message.includes('no source'))).toBe(true);
  });

  it('detects disconnected transform nodes', () => {
    const nodes: PipelineNode[] = [
      {
        id: 's1',
        type: 'pipeline-node',
        position: { x: 100, y: 100 },
        data: { label: 'Source', category: 'source', subType: 'csv-upload', configured: true }
      },
      {
        id: 't1',
        type: 'pipeline-node',
        position: { x: 300, y: 100 },
        data: { label: 'Filter', category: 'transform', subType: 'filter', configured: true }
      }
    ];
    const res = validatePipelinePreFlight(nodes, []);
    expect(res.valid).toBe(false);
    expect(res.errorNodeIds.has('t1')).toBe(true);
    expect(res.issues.some(i => i.message.includes('disconnected'))).toBe(true);
  });

  it('requires join nodes to have at least 2 incoming edges', () => {
    const nodes: PipelineNode[] = [
      {
        id: 's1',
        type: 'pipeline-node',
        position: { x: 100, y: 100 },
        data: { label: 'Source', category: 'source', subType: 'csv-upload', configured: true }
      },
      {
        id: 'j1',
        type: 'pipeline-node',
        position: { x: 300, y: 100 },
        data: { label: 'Join', category: 'transform', subType: 'join', configured: true }
      }
    ];
    const edges: PipelineEdge[] = [{ id: 'e1', source: 's1', target: 'j1' }];
    const res = validatePipelinePreFlight(nodes, edges);
    expect(res.valid).toBe(false);
    expect(res.errorNodeIds.has('j1')).toBe(true);
    expect(res.issues.some(i => i.message.includes('requires 2 incoming'))).toBe(true);
  });

  it('passes on clean connected DAG', () => {
    const nodes: PipelineNode[] = [
      {
        id: 's1',
        type: 'pipeline-node',
        position: { x: 100, y: 100 },
        data: { label: 'Source', category: 'source', subType: 'csv-upload', configured: true, fullData: [{ id: 1 }] }
      },
      {
        id: 'd1',
        type: 'pipeline-node',
        position: { x: 400, y: 100 },
        data: { label: 'Postgres Dest', category: 'destination', subType: 'postgres', configured: true }
      }
    ];
    const edges: PipelineEdge[] = [{ id: 'e1', source: 's1', target: 'd1' }];
    const res = validatePipelinePreFlight(nodes, edges);
    expect(res.valid).toBe(true);
    expect(res.errorNodeIds.size).toBe(0);
  });
});
