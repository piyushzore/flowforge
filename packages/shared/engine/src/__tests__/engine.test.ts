import { describe, it, expect } from 'vitest';
import {
  topoSort,
  topoSortDetailed,
  executeSort,
  executeDeduplicate,
  executeGroupBy,
  executeChangeType,
  parseBoolean,
  executeJoin,
  executePipelineCore
} from '../index';
import type { EngineNode, EngineEdge } from '../types';

describe('Topological Sort & Cycle Detection', () => {
  it('correctly sorts a linear DAG', () => {
    const nodes: EngineNode[] = [
      { id: 'c', data: {} },
      { id: 'a', data: {} },
      { id: 'b', data: {} }
    ];
    const edges: EngineEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' }
    ];
    const sorted = topoSort(nodes, edges);
    expect(sorted).toEqual(['a', 'b', 'c']);
  });

  it('detects direct and indirect cycles and returns detailed error', () => {
    const nodes: EngineNode[] = [
      { id: 'a', data: {} },
      { id: 'b', data: {} },
      { id: 'c', data: {} }
    ];
    const edges: EngineEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'c', target: 'a' } // cycle
    ];

    const detailed = topoSortDetailed(nodes, edges);
    expect(detailed.hasCycle).toBe(true);
    expect(detailed.errorMessage).toContain('Cycle detected');
    expect(() => topoSort(nodes, edges)).toThrow(/Cycle detected/);
  });

  it('detects two-node cycles and produces exact format ("Cycle detected: b → c → b")', () => {
    const nodes: EngineNode[] = [
      { id: 'a', data: {} },
      { id: 'b', data: {} },
      { id: 'c', data: {} }
    ];
    const edges: EngineEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'c', target: 'b' } // cycle b -> c -> b
    ];

    const detailed = topoSortDetailed(nodes, edges);
    expect(detailed.hasCycle).toBe(true);
    expect(detailed.errorMessage).toBe('Cycle detected: b → c → b');
    expect(detailed.cycleEdgeIds).toContain('e2');
    expect(detailed.cycleEdgeIds).toContain('e3');
    expect(() => topoSort(nodes, edges)).toThrow('Cycle detected: b → c → b');
  });
});

describe('Aggregations (Group By)', () => {
  it('ignores null, undefined, empty string and non-numeric values in sum, avg, min, max', () => {
    // Exact prompt example: [10, null, '', 20] -> avg = 15, min = 10
    const promptExample = [
      { id: 1, val: 10 },
      { id: 2, val: null },
      { id: 3, val: '' },
      { id: 4, val: 20 }
    ];
    const promptRes = executeGroupBy(
      promptExample,
      [],
      [
        { field: 'val', function: 'avg', alias: 'average' },
        { field: 'val', function: 'min', alias: 'minimum' },
        { field: 'val', function: 'count', mode: 'non-null', alias: 'cnt_non_null' },
        { field: 'val', function: 'count', mode: 'rows', alias: 'cnt_rows' }
      ]
    );
    expect(promptRes[0].average).toBe(15);
    expect(promptRes[0].minimum).toBe(10);
    expect(promptRes[0].cnt_non_null).toBe(2);
    expect(promptRes[0].cnt_rows).toBe(4);

    // Mixed data including invalid string, undefined, null
    const data = [
      { dept: 'eng', salary: 10 },
      { dept: 'eng', salary: null },
      { dept: 'eng', salary: '' },
      { dept: 'eng', salary: undefined },
      { dept: 'eng', salary: 'invalid' },
      { dept: 'eng', salary: 20 }
    ];

    const result = executeGroupBy(
      data,
      ['dept'],
      [
        { field: 'salary', function: 'sum', alias: 'total' },
        { field: 'salary', function: 'avg', alias: 'average' },
        { field: 'salary', function: 'min', alias: 'minimum' },
        { field: 'salary', function: 'max', alias: 'maximum' },
        { field: 'salary', function: 'count', mode: 'non-null', alias: 'cnt_non_null' },
        { field: 'salary', function: 'count', mode: 'rows', alias: 'cnt_rows' },
        { field: 'salary', function: 'count-distinct', alias: 'distinct_cnt' }
      ]
    );

    expect(result).toHaveLength(1);
    expect(result[0].dept).toBe('eng');
    expect(result[0].total).toBe(30);
    expect(result[0].average).toBe(15);
    expect(result[0].minimum).toBe(10);
    expect(result[0].maximum).toBe(20);
    expect(result[0].cnt_non_null).toBe(3); // 10, 'invalid', 20
    expect(result[0].cnt_rows).toBe(6);
    expect(result[0].distinct_cnt).toBe(3);
  });

  it('returns null when an entire column has only nulls or non-numeric values', () => {
    const data = [
      { id: 1, val: null },
      { id: 2, val: undefined },
      { id: 3, val: '' },
      { id: 4, val: 'not_a_number' }
    ];

    const res = executeGroupBy(data, [], [
      { field: 'val', function: 'sum', alias: 's' },
      { field: 'val', function: 'avg', alias: 'a' },
      { field: 'val', function: 'min', alias: 'm' },
      { field: 'val', function: 'max', alias: 'mx' }
    ]);

    expect(res[0].s).toBeNull();
    expect(res[0].a).toBeNull();
    expect(res[0].m).toBeNull();
    expect(res[0].mx).toBeNull();
  });
});

describe('Type Coercion (Change Type)', () => {
  it('parses booleans accurately (case-insensitive false/true/0/1/yes/no)', () => {
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('False')).toBe(false);
    expect(parseBoolean('FALSE')).toBe(false);
    expect(parseBoolean('0')).toBe(false);
    expect(parseBoolean('no')).toBe(false);

    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('True')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('yes')).toBe(true);

    expect(parseBoolean(null)).toBeNull();
    expect(parseBoolean('')).toBeNull();
  });

  it('cleans currency strings and records warnings for unparseable values', () => {
    const data = [
      { id: 1, amount: '$1,250.50', flag: 'false', date: '2026-10-25T10:00:00Z' },
      { id: 2, amount: '€450.00', flag: 'true', date: 'not-a-date' },
      { id: 3, amount: 'unparseable', flag: 'not-a-bool', date: '' }
    ];

    const warnings: any[] = [];
    const res = executeChangeType(
      data,
      { amount: 'number', flag: 'boolean', date: 'date' },
      { warnings }
    );

    expect(res[0].amount).toBe(1250.5);
    expect(res[0].flag).toBe(false);
    expect(res[0].date).toBe('2026-10-25T10:00:00.000Z');

    expect(res[1].amount).toBe(450.0);
    expect(res[1].flag).toBe(true);
    expect(res[1].date).toBeNull(); // invalid date became null

    expect(res[2].amount).toBeNull();
    expect(res[2].flag).toBeNull();
    expect(res[2].date).toBeNull();

    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('Hash Join', () => {
  it('does NOT match null with null and prefixes non-key collisions', () => {
    const left = [
      { id: '1', name: 'Left Alice', city: 'NYC' },
      { id: null, name: 'Left Anonymous', city: 'LA' },
      { id: '2', name: 'Left Bob', city: 'Chicago' }
    ];
    const right = [
      { id: '1', name: 'Right Alice Dept', country: 'US' },
      { id: null, name: 'Right Ghost Dept', country: 'CA' },
      { id: '3', name: 'Right Charlie Dept', country: 'UK' }
    ];

    const inner = executeJoin(left, right, {
      joinType: 'inner',
      leftField: 'id',
      rightField: 'id',
      leftPrefix: 'l_',
      rightPrefix: 'r_'
    });

    // Only id: '1' matches. id: null must NOT match id: null
    expect(inner).toHaveLength(1);
    expect(inner[0].id).toBe('1');
    expect(inner[0].l_name).toBe('Left Alice');
    expect(inner[0].r_name).toBe('Right Alice Dept');
  });

  it('performs full outer join with prefixing', () => {
    const left = [{ id: '1', val: 'L1' }];
    const right = [{ id: '2', val: 'R2' }];
    const full = executeJoin(left, right, { joinType: 'full', leftField: 'id', rightField: 'id' });
    expect(full).toHaveLength(2);
  });

  it('supports multi-column keys and type-insensitive matching option', () => {
    const left = [
      { org: 'acme', code: 101, dept: 'Sales' },
      { org: 'acme', code: '102', dept: 'Support' }
    ];
    const right = [
      { orgId: 'acme', codeId: '101', budget: 5000 },
      { orgId: 'acme', codeId: '102', budget: 3000 }
    ];

    // By default: strict type matching ('101' string does not match 101 number)
    const strictJoin = executeJoin(left, right, {
      joinType: 'inner',
      leftKeys: ['org', 'code'],
      rightKeys: ['orgId', 'codeId'],
      typeInsensitive: false
    });
    // code: '102' matches codeId: '102', but code: 101 does NOT match codeId: '101'
    expect(strictJoin).toHaveLength(1);
    expect(strictJoin[0].dept).toBe('Support');

    // With typeInsensitive: true, both match
    const looseJoin = executeJoin(left, right, {
      joinType: 'inner',
      leftKeys: ['org', 'code'],
      rightKeys: ['orgId', 'codeId'],
      typeInsensitive: true
    });
    expect(looseJoin).toHaveLength(2);
  });
});

describe('Deduplication', () => {
  it('builds keys safely with JSON arrays so composite separators do not collide', () => {
    const data = [
      { a: 'x|y', b: 'z', val: 1 },
      { a: 'x', b: 'y|z', val: 2 },
      { a: 'x|y', b: 'z', val: 3 } // true duplicate of row 0
    ];

    const deduped = executeDeduplicate(data, { subset: ['a', 'b'], keep: 'first' });
    expect(deduped).toHaveLength(2);
    expect(deduped[0].val).toBe(1);
    expect(deduped[1].val).toBe(2);
  });

  it('supports keep: last', () => {
    const data = [
      { id: 1, version: 1 },
      { id: 1, version: 2 }
    ];
    const deduped = executeDeduplicate(data, { subset: ['id'], keep: 'last' });
    expect(deduped).toHaveLength(1);
    expect(deduped[0].version).toBe(2);
  });
});

describe('Sorting', () => {
  it('performs numeric-aware and null-aware sorting', () => {
    const data = [
      { id: 3, score: '100' },
      { id: 1, score: '20' },
      { id: 2, score: null },
      { id: 4, score: '5' }
    ];

    const asc = executeSort(data, { sortBy: 'score', order: 'asc', nulls: 'last' });
    expect(asc.map(r => r.score)).toEqual(['5', '20', '100', null]);

    const desc = executeSort(data, { sortBy: 'score', order: 'desc', nulls: 'first' });
    expect(desc.map(r => r.score)).toEqual([null, '100', '20', '5']);
  });

  it('supports multi-column sorting and guaranteed stability', () => {
    const data = [
      { dept: 'engineering', salary: 100, name: 'Alice' },
      { dept: 'engineering', salary: 80, name: 'Bob' },
      { dept: 'sales', salary: 90, name: 'Charlie' },
      { dept: 'engineering', salary: 100, name: 'David' }
    ];

    const sorted = executeSort(data, [
      { field: 'dept', order: 'asc' },
      { field: 'salary', order: 'desc' }
    ]);

    expect(sorted[0].name).toBe('Alice'); // 100
    expect(sorted[1].name).toBe('David'); // 100 (stable: Alice came before David in original array)
    expect(sorted[2].name).toBe('Bob');   // 80
    expect(sorted[3].name).toBe('Charlie');
  });

  it('handles boolean and date types in sorting', () => {
    const d1 = new Date('2026-01-01');
    const d2 = new Date('2026-06-01');
    const data = [
      { date: d2, flag: true },
      { date: d1, flag: false }
    ];

    const sortedByDate = executeSort(data, [{ field: 'date', order: 'asc' }]);
    expect(sortedByDate[0].date).toBe(d1);

    const sortedByFlag = executeSort(data, [{ field: 'flag', order: 'asc' }]);
    expect(sortedByFlag[0].flag).toBe(false);
  });
});

describe('End-to-End Pipeline DAG Core Execution', () => {
  it('runs a complete pipeline across 4 nodes cleanly without browser APIs', async () => {
    const nodes: EngineNode[] = [
      {
        id: 'n1',
        data: {
          category: 'source',
          subType: 'csv-upload',
          previewData: [
            { id: 1, email: 'ALICE@EXAMPLE.COM', amount: '$500', status: 'completed' },
            { id: 2, email: 'bob@example.com', amount: '$40', status: 'pending' },
            { id: 1, email: 'ALICE@EXAMPLE.COM', amount: '$500', status: 'completed' } // duplicate
          ]
        }
      },
      {
        id: 'n2',
        data: {
          category: 'transform',
          subType: 'deduplicate',
          config: { subset: ['id'] }
        }
      },
      {
        id: 'n3',
        data: {
          category: 'transform',
          subType: 'change-type',
          config: { typeChanges: { amount: 'number' } }
        }
      },
      {
        id: 'n4',
        data: {
          category: 'destination',
          subType: 'postgres'
        }
      }
    ];

    const edges: EngineEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ];

    const outcomes: string[] = [];
    const results = await executePipelineCore(nodes, edges, outcome => {
      outcomes.push(outcome.nodeId);
    });

    expect(outcomes).toEqual(['n1', 'n2', 'n3', 'n4']);
    const finalData = results.get('n4')!;
    expect(finalData).toHaveLength(2); // duplicate dropped
    expect(typeof finalData[0].amount).toBe('number');
    expect(finalData[0].amount).toBe(500);
  });
});
