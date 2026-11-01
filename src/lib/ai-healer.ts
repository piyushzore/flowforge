import type { DriftIncident } from '../engine/drift-detector';
import { supabase } from './supabase';

export interface HealedSolution {
  diagnosis: string;
  patchCode: string;
  confidence: number;
  patchType: 'schema_alias' | 'type_coercion' | 'null_sanitization' | 'composite';
  sampleBefore: Record<string, any>[];
  sampleAfter: Record<string, any>[];
}

/**
 * Safely evaluates an arrow function row transform with exception handling
 */
export function safeApplyRowPatch(
  patchCode: string,
  rows: Record<string, any>[]
): Record<string, any>[] {
  try {
    // Quick sanitization check against dangerous operations
    if (/(fetch|window|document|localStorage|eval|Function|require|process)\b/.test(patchCode)) {
      console.warn('Rejected potentially unsafe patch code:', patchCode);
      return rows;
    }

    const fn = new Function('row', `return (${patchCode})(row)`);
    return rows.map(r => {
      try {
        return fn({ ...r });
      } catch {
        return { ...r };
      }
    });
  } catch {
    return rows;
  }
}

/**
 * Builds a deterministic heuristic patch without waiting for network calls
 */
export function buildHeuristicPatch(incident: DriftIncident, sampleRows: Record<string, any>[]): HealedSolution {
  const operations: string[] = [];
  const explanations: string[] = [];

  for (const anomaly of incident.anomalies) {
    if (anomaly.type === 'renamed_column' && anomaly.suggestedAlias) {
      operations.push(`  // Map renamed column: ${anomaly.suggestedAlias} -> ${anomaly.field}`);
      operations.push(`  if (row.${anomaly.field} === undefined && row.${anomaly.suggestedAlias} !== undefined) {`);
      operations.push(`    row.${anomaly.field} = row.${anomaly.suggestedAlias};`);
      operations.push(`  }`);
      explanations.push(`Upstream field "${anomaly.suggestedAlias}" was re-aliased to expected "${anomaly.field}".`);
    }

    if (anomaly.type === 'currency_symbol') {
      operations.push(`  // Strip currency symbols and parse numeric: ${anomaly.field}`);
      operations.push(`  if (typeof row.${anomaly.field} === 'string') {`);
      operations.push(`    row.${anomaly.field} = parseFloat(row.${anomaly.field}.replace(/[^0-9.-]/g, '')) || 0;`);
      operations.push(`  }`);
      explanations.push(`Stripped currency symbol from "${anomaly.field}" and coerced to float.`);
    }

    if (anomaly.type === 'type_mismatch' && anomaly.expectedType === 'number') {
      operations.push(`  // Coerce string to number: ${anomaly.field}`);
      operations.push(`  if (typeof row.${anomaly.field} === 'string') {`);
      operations.push(`    row.${anomaly.field} = Number(row.${anomaly.field}) || 0;`);
      operations.push(`  }`);
      explanations.push(`Coerced string values in "${anomaly.field}" to Numbers.`);
    }

    if (anomaly.type === 'null_spike') {
      operations.push(`  // Fallback default for missing values in ${anomaly.field}`);
      operations.push(`  if (row.${anomaly.field} === null || row.${anomaly.field} === undefined) {`);
      operations.push(`    row.${anomaly.field} = '';`);
      operations.push(`  }`);
      explanations.push(`Assigned safe defaults to null values in "${anomaly.field}".`);
    }
  }

  const patchCode = `(row) => {
  const cloned = { ...row };
${operations.join('\n')}
  return cloned;
}`;

  const sampleAfter = safeApplyRowPatch(patchCode, sampleRows);

  return {
    diagnosis: explanations.join(' ') || `Detected schema drift on ${incident.nodeName}.`,
    patchCode,
    confidence: 0.95,
    patchType: 'composite',
    sampleBefore: sampleRows,
    sampleAfter
  };
}

/**
 * Synthesizes an autonomous data repair patch via edge function or heuristic fallback
 */
export async function synthesizeHealingPatch(
  incident: DriftIncident,
  sampleRows: Record<string, any>[]
): Promise<HealedSolution> {
  const heuristic = buildHeuristicPatch(incident, sampleRows);

  try {
    const { data, error } = await supabase.functions.invoke('ai-transform', {
      body: {
        instruction: `Fix schema drift and anomalies: ${incident.anomalies.map(a => a.details).join('; ')}`,
        sampleData: sampleRows.slice(0, 3)
      }
    });

    if (!error && data && data.code) {
      const sampleAfter = safeApplyRowPatch(data.code, sampleRows);
      return {
        diagnosis: data.explanation || heuristic.diagnosis,
        patchCode: data.code,
        confidence: 0.98,
        patchType: 'composite',
        sampleBefore: sampleRows,
        sampleAfter
      };
    }
  } catch {
    // Non-blocking fallback to heuristic patch
  }

  return heuristic;
}
