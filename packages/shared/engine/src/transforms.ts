import type { FilterCondition, AggregateRule, JoinConfig, ValidationRule, SCDConfig, NodeWarning } from './types';

export interface TransformContext {
  warnings?: NodeWarning[];
}

// ─── 1. JOIN (Hash Join O(N + M)) ───────────────────────────────────────
export function executeJoin(
  leftData: Record<string, any>[],
  rightData: Record<string, any>[],
  config: JoinConfig
): Record<string, any>[] {
  const joinType = config.joinType || 'inner';
  const leftKeys = config.leftKeys || (config.leftField ? [config.leftField] : ['id']);
  const rightKeys = config.rightKeys || (config.rightField ? [config.rightField] : ['id']);
  const leftPrefix = config.leftPrefix !== undefined ? config.leftPrefix : '';
  const rightPrefix = config.rightPrefix !== undefined ? config.rightPrefix : '';

  // Helper to extract compound join key; NULL or undefined keys NEVER match
  const getKey = (row: Record<string, any>, keys: string[]): string | null => {
    const vals = keys.map(k => row[k]);
    if (vals.some(v => v === null || v === undefined || v === '')) return null;
    return JSON.stringify(vals);
  };

  // Build hash map on smaller side
  const useLeftAsBuild = leftData.length <= rightData.length && joinType === 'inner';

  if (useLeftAsBuild) {
    const buildMap = new Map<string, Record<string, any>[]>();
    for (const lRow of leftData) {
      const key = getKey(lRow, leftKeys);
      if (key === null) continue;
      const list = buildMap.get(key) || [];
      list.push(lRow);
      buildMap.set(key, list);
    }

    const result: Record<string, any>[] = [];
    for (const rRow of rightData) {
      const key = getKey(rRow, rightKeys);
      if (key === null) continue;
      const matches = buildMap.get(key);
      if (matches) {
        for (const lRow of matches) {
          result.push(mergeJoinRow(lRow, rRow, leftKeys, rightKeys, leftPrefix, rightPrefix));
        }
      }
    }
    return result;
  }

  // Standard build on right side
  const rightMap = new Map<string, Record<string, any>[]>();
  for (const rRow of rightData) {
    const key = getKey(rRow, rightKeys);
    if (key === null) continue;
    const list = rightMap.get(key) || [];
    list.push(rRow);
    rightMap.set(key, list);
  }

  const result: Record<string, any>[] = [];
  const matchedRightKeys = new Set<string>();

  for (const lRow of leftData) {
    const key = getKey(lRow, leftKeys);
    const matches = key !== null ? rightMap.get(key) : undefined;

    if (matches && matches.length > 0) {
      if (key !== null) matchedRightKeys.add(key);
      for (const rRow of matches) {
        result.push(mergeJoinRow(lRow, rRow, leftKeys, rightKeys, leftPrefix, rightPrefix));
      }
    } else if (joinType === 'left' || joinType === 'full') {
      result.push(mergeJoinRow(lRow, {}, leftKeys, rightKeys, leftPrefix, rightPrefix));
    }
  }

  if (joinType === 'right' || joinType === 'full') {
    for (const rRow of rightData) {
      const key = getKey(rRow, rightKeys);
      if (key === null || !matchedRightKeys.has(key)) {
        result.push(mergeJoinRow({}, rRow, leftKeys, rightKeys, leftPrefix, rightPrefix));
      }
    }
  }

  return result;
}

function mergeJoinRow(
  lRow: Record<string, any>,
  rRow: Record<string, any>,
  leftKeys: string[],
  rightKeys: string[],
  leftPrefix: string,
  rightPrefix: string
): Record<string, any> {
  const merged: Record<string, any> = {};
  const allKeys = new Set([...Object.keys(lRow), ...Object.keys(rRow)]);

  for (const k of allKeys) {
    const inLeft = k in lRow;
    const inRight = k in rRow;
    const isLeftKey = leftKeys.includes(k);
    const isRightKey = rightKeys.includes(k);

    if (inLeft && inRight && !isLeftKey && !isRightKey) {
      // Conflict on non-key columns: prefix
      const lp = leftPrefix || 'left_';
      const rp = rightPrefix || 'right_';
      merged[`${lp}${k}`] = lRow[k];
      merged[`${rp}${k}`] = rRow[k];
    } else if (inLeft) {
      merged[k] = lRow[k];
    } else {
      merged[k] = rRow[k];
    }
  }
  return merged;
}

// ─── 2. UNION ───────────────────────────────────────────────────────────
export function executeUnion(datasets: Record<string, any>[][]): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  for (const data of datasets) {
    if (Array.isArray(data)) {
      for (const r of data) {
        out.push({ ...r });
      }
    }
  }
  return out;
}

// ─── 3. FILTER ───────────────────────────────────────────────────────────
export function executeFilter(
  data: Record<string, any>[],
  conditions: FilterCondition[] = []
): Record<string, any>[] {
  if (!Array.isArray(conditions) || conditions.length === 0) return data;

  return data.filter(row => {
    return conditions.every(cond => {
      const val = row[cond.field];
      const target = cond.value;

      switch (cond.operator) {
        case 'equals':
          return String(val ?? '') === String(target ?? '');
        case 'not-equals':
          return String(val ?? '') !== String(target ?? '');
        case 'contains':
          return String(val ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
        case 'not-contains':
          return !String(val ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
        case 'starts-with':
          return String(val ?? '').startsWith(String(target ?? ''));
        case 'ends-with':
          return String(val ?? '').endsWith(String(target ?? ''));
        case 'greater-than':
          return Number(val) > Number(target);
        case 'less-than':
          return Number(val) < Number(target);
        case 'gte':
          return Number(val) >= Number(target);
        case 'lte':
          return Number(val) <= Number(target);
        case 'is-null':
          return val === null || val === undefined || val === '';
        case 'is-not-null':
          return val !== null && val !== undefined && val !== '';
        case 'in': {
          const list = Array.isArray(target) ? target : String(target).split(',').map(s => s.trim());
          return list.includes(String(val));
        }
        case 'not-in': {
          const list = Array.isArray(target) ? target : String(target).split(',').map(s => s.trim());
          return !list.includes(String(val));
        }
        case 'regex': {
          try {
            return new RegExp(String(target)).test(String(val ?? ''));
          } catch {
            return false;
          }
        }
        default:
          return true;
      }
    });
  });
}

// ─── 4. SORT ─────────────────────────────────────────────────────────────
export interface SortOption {
  field: string;
  order?: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export function executeSort(
  data: Record<string, any>[],
  sortOptions: SortOption[] | { sortBy?: string; order?: 'asc' | 'desc'; nulls?: 'first' | 'last' }
): Record<string, any>[] {
  const options: SortOption[] = Array.isArray(sortOptions)
    ? sortOptions
    : sortOptions.sortBy
    ? [{ field: sortOptions.sortBy, order: sortOptions.order || 'asc', nulls: sortOptions.nulls || 'last' }]
    : [];

  if (options.length === 0) return [...data];

  return [...data].sort((a, b) => {
    for (const opt of options) {
      const va = a[opt.field];
      const vb = b[opt.field];
      const orderFactor = opt.order === 'desc' ? -1 : 1;
      const nullsFirst = opt.nulls === 'first';

      const aNull = va === null || va === undefined;
      const bNull = vb === null || vb === undefined;

      if (aNull && bNull) continue;
      if (aNull) return nullsFirst ? -1 : 1;
      if (bNull) return nullsFirst ? 1 : -1;

      // Numeric comparison
      const numA = typeof va === 'number' ? va : Number(va);
      const numB = typeof vb === 'number' ? vb : Number(vb);
      if (!isNaN(numA) && !isNaN(numB) && typeof va !== 'boolean' && typeof vb !== 'boolean') {
        if (numA !== numB) return (numA < numB ? -1 : 1) * orderFactor;
        continue;
      }

      // String comparison
      const sa = String(va);
      const sb = String(vb);
      const cmp = sa.localeCompare(sb);
      if (cmp !== 0) return cmp * orderFactor;
    }
    return 0;
  });
}

// ─── 5. DEDUPLICATE ──────────────────────────────────────────────────────
export function executeDeduplicate(
  data: Record<string, any>[],
  config: { subset?: string[] | string; fields?: string[]; keep?: 'first' | 'last' } = {}
): Record<string, any>[] {
  const subset = config.subset || config.fields;
  const fields = Array.isArray(subset) ? subset : subset ? [subset] : null;
  const keep = config.keep || 'first';

  const seenMap = new Map<string, Record<string, any>>();

  for (const row of data) {
    const keyVals = fields ? fields.map(f => row[f]) : Object.entries(row).sort(([a], [b]) => a.localeCompare(b));
    const key = JSON.stringify(keyVals);

    if (keep === 'first') {
      if (!seenMap.has(key)) {
        seenMap.set(key, row);
      }
    } else {
      // keep last: always update
      seenMap.set(key, row);
    }
  }

  return Array.from(seenMap.values());
}

// ─── 6. RENAME ───────────────────────────────────────────────────────────
export function executeRename(
  data: Record<string, any>[],
  renames: Array<{ oldName: string; newName: string }> | Record<string, string>
): Record<string, any>[] {
  const map: Array<{ oldName: string; newName: string }> = Array.isArray(renames)
    ? renames
    : Object.entries(renames || {}).map(([oldName, newName]) => ({ oldName, newName }));

  return data.map(row => {
    const updated = { ...row };
    for (const { oldName, newName } of map) {
      if (oldName in updated && newName && oldName !== newName) {
        updated[newName] = updated[oldName];
        delete updated[oldName];
      }
    }
    return updated;
  });
}

// ─── 7. GROUP BY & AGGREGATE ─────────────────────────────────────────────
export function executeGroupBy(
  data: Record<string, any>[],
  groupFields: string[] = [],
  aggregates: AggregateRule[] = []
): Record<string, any>[] {
  if (groupFields.length === 0 && aggregates.length === 0) return data;

  const groups = new Map<string, Record<string, any>[]>();
  for (const row of data) {
    const key = groupFields.map(f => JSON.stringify(row[f] ?? null)).join('___');
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  const result: Record<string, any>[] = [];

  groups.forEach(rowsInGroup => {
    const outRow: Record<string, any> = {};
    groupFields.forEach(f => {
      outRow[f] = rowsInGroup[0]?.[f];
    });

    for (const agg of aggregates) {
      const alias = agg.alias || `${agg.function}_${agg.field}`;
      const f = agg.field;

      // Extract valid numbers, explicitly ignoring null, undefined, '', and non-numeric values
      const numericVals: number[] = [];
      let nonNullCount = 0;

      for (const r of rowsInGroup) {
        const raw = r[f];
        if (raw !== null && raw !== undefined && raw !== '') {
          nonNullCount++;
          const num = typeof raw === 'number' ? raw : Number(String(raw).trim());
          if (!isNaN(num) && isFinite(num)) {
            numericVals.push(num);
          }
        }
      }

      switch (agg.function) {
        case 'sum':
          outRow[alias] = numericVals.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          outRow[alias] = numericVals.length > 0 ? numericVals.reduce((a, b) => a + b, 0) / numericVals.length : null;
          break;
        case 'count':
          // Supports both "count rows" (all rows) and "count non-null" modes
          outRow[alias] = agg.mode === 'rows' || agg.field === '*' ? rowsInGroup.length : nonNullCount;
          break;
        case 'count-rows':
          outRow[alias] = rowsInGroup.length;
          break;
        case 'count-non-null':
          outRow[alias] = nonNullCount;
          break;
        case 'count-distinct': {
          const distinctVals = new Set(
            rowsInGroup.map(r => r[f]).filter(v => v !== null && v !== undefined && v !== '')
          );
          outRow[alias] = distinctVals.size;
          break;
        }
        case 'min':
          outRow[alias] = numericVals.length > 0 ? Math.min(...numericVals) : null;
          break;
        case 'max':
          outRow[alias] = numericVals.length > 0 ? Math.max(...numericVals) : null;
          break;
        default:
          outRow[alias] = rowsInGroup.length;
      }
    }

    result.push(outRow);
  });

  return result;
}

// ─── 8. CHANGE DATA TYPE ─────────────────────────────────────────────────
export function parseBoolean(val: any): boolean | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 't'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'f'].includes(s)) return false;
  return null;
}

export function executeChangeType(
  data: Record<string, any>[],
  typeChanges: Record<string, 'string' | 'number' | 'boolean' | 'date'>,
  ctx?: TransformContext
): Record<string, any>[] {
  const warningCounts: Record<string, { count: number; samples: any[] }> = {};

  const recordWarning = (field: string, val: any) => {
    if (!warningCounts[field]) warningCounts[field] = { count: 0, samples: [] };
    warningCounts[field].count++;
    if (warningCounts[field].samples.length < 5) warningCounts[field].samples.push(val);
  };

  const res = data.map(row => {
    const updated = { ...row };

    for (const [field, targetType] of Object.entries(typeChanges)) {
      if (!(field in updated)) continue;
      const raw = updated[field];

      if (raw === null || raw === undefined || raw === '') {
        updated[field] = null;
        continue;
      }

      switch (targetType) {
        case 'number': {
          if (typeof raw === 'number') {
            updated[field] = raw;
          } else {
            const cleanedStr = String(raw).trim().replace(/[$£€,\s]/g, '');
            const parsed = Number(cleanedStr);
            if (isNaN(parsed) || !isFinite(parsed)) {
              updated[field] = null;
              recordWarning(field, raw);
            } else {
              updated[field] = parsed;
            }
          }
          break;
        }
        case 'boolean': {
          const b = parseBoolean(raw);
          if (b === null) {
            updated[field] = null;
            recordWarning(field, raw);
          } else {
            updated[field] = b;
          }
          break;
        }
        case 'date': {
          try {
            const d = new Date(raw);
            if (isNaN(d.getTime())) {
              updated[field] = null;
              recordWarning(field, raw);
            } else {
              updated[field] = d.toISOString();
            }
          } catch {
            updated[field] = null;
            recordWarning(field, raw);
          }
          break;
        }
        case 'string':
        default:
          updated[field] = String(raw);
          break;
      }
    }
    return updated;
  });

  if (ctx && ctx.warnings) {
    for (const [field, info] of Object.entries(warningCounts)) {
      ctx.warnings.push({
        field,
        message: `Type coercion warning for "${field}": ${info.count} rows could not be parsed and were set to null.`,
        count: info.count,
        sampleFailedValues: info.samples
      });
    }
  }

  return res;
}

// ─── 9. NULL HANDLING ────────────────────────────────────────────────────
export function executeNullHandling(
  data: Record<string, any>[],
  config: { mode?: 'fill' | 'drop'; fillValue?: any; fields?: string[] } = {}
): Record<string, any>[] {
  const mode = config.mode || 'fill';
  const fillValue = config.fillValue ?? '';
  const fields = config.fields && config.fields.length > 0 ? config.fields : null;

  if (mode === 'drop') {
    return data.filter(row => {
      const keysToCheck = fields || Object.keys(row);
      return keysToCheck.every(k => row[k] !== null && row[k] !== undefined && row[k] !== '');
    });
  }

  return data.map(row => {
    const copy = { ...row };
    const keysToFill = fields || Object.keys(copy);
    for (const k of keysToFill) {
      if (copy[k] === null || copy[k] === undefined || copy[k] === '') {
        copy[k] = fillValue;
      }
    }
    return copy;
  });
}

// ─── 10. TEXT CLEAN / TRIM / CASE ────────────────────────────────────────
export function executeTrimCase(
  data: Record<string, any>[],
  config: { field?: string; operation?: 'trim' | 'upper' | 'lower' }
): Record<string, any>[] {
  const { field, operation = 'trim' } = config;
  if (!field) return data;

  return data.map(row => {
    if (!(field in row) || row[field] === null || row[field] === undefined) return row;
    const str = String(row[field]);
    const updated = { ...row };
    if (operation === 'trim') updated[field] = str.trim();
    else if (operation === 'upper') updated[field] = str.toUpperCase();
    else if (operation === 'lower') updated[field] = str.toLowerCase();
    return updated;
  });
}

// ─── 11. CONCAT COLUMNS ──────────────────────────────────────────────────
export function executeConcat(
  data: Record<string, any>[],
  config: { fields?: string[]; separator?: string; outputField?: string }
): Record<string, any>[] {
  const fields = config.fields || [];
  const separator = config.separator ?? ' ';
  const outField = config.outputField || 'concatenated';

  return data.map(row => ({
    ...row,
    [outField]: fields.map(f => row[f] ?? '').join(separator)
  }));
}

// ─── 12. WINDOW FUNCTIONS ────────────────────────────────────────────────
export function executeWindowFunction(
  data: Record<string, any>[],
  config: { function?: 'row_number' | 'running_total' | 'rank'; orderBy?: string; valueField?: string; outputField?: string }
): Record<string, any>[] {
  const fn = config.function || 'row_number';
  const orderField = config.orderBy || 'id';
  const outCol = config.outputField || fn;

  const sorted = executeSort(data, { sortBy: orderField, order: 'asc' });

  let runningSum = 0;
  return sorted.map((row, idx) => {
    const copy = { ...row };
    if (fn === 'row_number' || fn === 'rank') {
      copy[outCol] = idx + 1;
    } else if (fn === 'running_total' && config.valueField) {
      runningSum += Number(row[config.valueField] || 0);
      copy[outCol] = runningSum;
    }
    return copy;
  });
}

// ─── 13. VALIDATION ──────────────────────────────────────────────────────
export function executeValidation(
  data: Record<string, any>[],
  rules: ValidationRule[] = []
): Record<string, any>[] {
  if (!Array.isArray(rules) || rules.length === 0) return data;

  return data.filter(row => {
    return rules.every(rule => {
      const val = row[rule.field];
      const ruleType = rule.rule || rule.type;

      if (ruleType === 'not-null' || ruleType === 'not_null') {
        return val !== null && val !== undefined && val !== '';
      }
      if (ruleType === 'regex') {
        const pattern = rule.pattern || rule.params?.pattern;
        return pattern ? new RegExp(pattern).test(String(val ?? '')) : true;
      }
      if (ruleType === 'range' && rule.params) {
        const num = Number(val);
        if (rule.params.min !== undefined && num < rule.params.min) return false;
        if (rule.params.max !== undefined && num > rule.params.max) return false;
        return true;
      }
      return true;
    });
  });
}

// ─── 14. SCD (Slowly Changing Dimensions Types 0 - 6) ───────────────────
export function executeSCD(
  data: Record<string, any>[],
  scdType: string,
  scdConfig: SCDConfig = {}
): Record<string, any>[] {
  const trackCols = scdConfig.trackColumns || [];

  if (scdType === 'scd-type-2') {
    return data.map(row => ({
      ...row,
      ...(scdConfig.autoColumns?.effectiveDate ? { effective_date: new Date().toISOString() } : {}),
      ...(scdConfig.autoColumns?.endDate ? { end_date: null } : {}),
      ...(scdConfig.autoColumns?.isCurrent ? { is_current: true } : {}),
      ...(scdConfig.autoColumns?.version ? { version: 1 } : {})
    }));
  }

  if (scdType === 'scd-type-3') {
    return data.map(row => {
      const copy = { ...row };
      for (const col of trackCols) {
        copy[`previous_${col}`] = null;
      }
      return copy;
    });
  }

  return [...data];
}
