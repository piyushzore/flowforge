import type { DriftIncident } from '../engine/drift-detector';
import { getGroqApiKey } from './ai-service';

export interface HealedSolution {
  diagnosis: string;
  patchCode: string;
  confidence: number;
  patchType: 'schema_alias' | 'type_coercion' | 'null_sanitization' | 'composite';
  sampleBefore: Record<string, any>[];
  sampleAfter: Record<string, any>[];
}

/**
 * Builds a deterministic heuristic patch without waiting for network calls
 */
function buildHeuristicPatch(incident: DriftIncident, sampleRows: Record<string, any>[]): HealedSolution {
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

  // Execute patch function on sample rows to produce sampleAfter
  let sampleAfter: Record<string, any>[] = [];
  try {
    const fn = new Function('row', `return (${patchCode})(row)`);
    sampleAfter = sampleRows.map(r => fn(r));
  } catch {
    sampleAfter = sampleRows;
  }

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
 * Uses Groq AI (or heuristic fallback) to synthesize an autonomous data repair patch
 */
export async function synthesizeHealingPatch(
  incident: DriftIncident,
  sampleRows: Record<string, any>[]
): Promise<HealedSolution> {
  const heuristic = buildHeuristicPatch(incident, sampleRows);
  const apiKey = getGroqApiKey();

  if (!apiKey) {
    return heuristic;
  }

  const prompt = `You are FlowForge Autonomous Data Pipeline Self-Healing Engine.
A data pipeline node has encountered schema drift or type anomalies during execution.

NODE DETAILS:
- Node Name: "${incident.nodeName}"
- Anomalies Detected: ${JSON.stringify(incident.anomalies, null, 2)}
- Sample Raw Problem Rows: ${JSON.stringify(sampleRows.slice(0, 2), null, 2)}

TASK:
1. Explain the root cause in 1 concise, clear sentence.
2. Generate a clean, resilient JavaScript arrow function of format:
(row) => {
  // fix and normalize fields
  return { ...row, fixedField: ... };
}
It must return the healed row object, safely handle nulls/undefined, and strip currency symbols or re-map renamed fields.
3. Return ONLY a valid JSON object matching this schema:
{
  "diagnosis": "string",
  "patchCode": "string (valid JS arrow function)",
  "confidence": number (between 0.8 and 1.0)
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are FlowForge Autonomous Self-Healing Agent. Always reply with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      return heuristic;
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    if (parsed.patchCode) {
      // Test the generated patch code
      try {
        const fn = new Function('row', `return (${parsed.patchCode})(row)`);
        const sampleAfter = sampleRows.map(r => fn(r));
        return {
          diagnosis: parsed.diagnosis || heuristic.diagnosis,
          patchCode: parsed.patchCode,
          confidence: parsed.confidence || 0.98,
          patchType: 'composite',
          sampleBefore: sampleRows,
          sampleAfter
        };
      } catch (e) {
        console.warn('AI patch execution dry-run failed, using heuristic fallback:', e);
        return heuristic;
      }
    }
    return heuristic;
  } catch (error) {
    console.warn('Groq self-healing synthesis fallback:', error);
    return heuristic;
  }
}
