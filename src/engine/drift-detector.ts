import type { PipelineNode } from '../types/pipeline';

export interface DriftAnomaly {
  field: string;
  type: 'renamed_column' | 'type_mismatch' | 'currency_symbol' | 'null_spike' | 'missing_required';
  severity: 'warning' | 'critical';
  details: string;
  expectedType?: string;
  receivedType?: string;
  suggestedAlias?: string;
  sampleValue?: any;
}

export interface DriftIncident {
  id: string;
  nodeId: string;
  nodeName: string;
  anomalies: DriftAnomaly[];
  detectedAt: string;
  totalSampled: number;
  affectedRowsCount: number;
  sampleProblemRows: Record<string, any>[];
  suggestedPatchCode?: string;
  diagnosis?: string;
  confidence?: number;
  status: 'pending' | 'healed' | 'quarantined' | 'ignored';
}

// Common semantic aliases for automated schema drift matching
const COMMON_ALIASES: Record<string, string[]> = {
  email: ['contact_email', 'customer_email', 'mail', 'user_email', 'email_address', 'e_mail'],
  amount: ['total', 'price', 'total_price', 'order_total', 'revenue', 'cost', 'charge_amount', 'value'],
  order_id: ['id', 'order_number', 'transaction_id', 'invoice_id', 'order_no'],
  customer_name: ['name', 'full_name', 'client_name', 'buyer_name', 'customer'],
  created_at: ['date', 'order_date', 'timestamp', 'created_date', 'created_time'],
  status: ['order_status', 'state', 'stage', 'fulfillment_status'],
  phone: ['mobile', 'cell', 'phone_number', 'telephone'],
  currency: ['currency_code', 'currency_type']
};

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  return dp[m][n];
}

/**
 * Inspects incoming dataset rows against a node's requirements and detects schema drift
 */
export function detectNodeDrift(
  node: PipelineNode,
  inputData: Record<string, any>[]
): DriftIncident | null {
  if (!inputData || inputData.length === 0) return null;

  const sampleSize = Math.min(inputData.length, 50);
  const sampleRows = inputData.slice(0, sampleSize);
  const firstRow = sampleRows[0] || {};
  const presentKeys = Object.keys(firstRow);

  const anomalies: DriftAnomaly[] = [];
  const problemRows: Record<string, any>[] = [];

  // Determine which fields this node expects
  const expectedFields: { name: string; expectedType: string }[] = [];
  const subType = node.data.subType;
  const config = (node.data.config as any) || {};

  if (subType === 'filter') {
    const conditions = node.data.conditions || config.conditions || [];
    conditions.forEach((c: any) => {
      if (c.field) {
        expectedFields.push({
          name: c.field,
          expectedType: ['greater-than', 'less-than', 'gte', 'lte'].includes(c.operator) ? 'number' : 'string'
        });
      }
    });
  } else if (subType === 'sort') {
    if (config.sortBy) expectedFields.push({ name: config.sortBy, expectedType: 'any' });
  } else if (subType === 'group-by') {
    (node.data.groupByFields || []).forEach((f: string) => expectedFields.push({ name: f, expectedType: 'any' }));
  } else if (subType === 'ai-transform') {
    // If prompt mentions specific common fields, add them
    const prompt = (config.prompt || '').toLowerCase();
    ['email', 'amount', 'status', 'order_id'].forEach(f => {
      if (prompt.includes(f)) expectedFields.push({ name: f, expectedType: f === 'amount' ? 'number' : 'string' });
    });
  }

  // Also check any outputSchema or required fields if defined
  if (node.data.outputSchema && Array.isArray(node.data.outputSchema)) {
    node.data.outputSchema.forEach((col: any) => {
      if (!expectedFields.find(f => f.name === col.name)) {
        expectedFields.push({ name: col.name, expectedType: col.type || 'string' });
      }
    });
  }

  // 1. Check for Missing / Renamed Columns
  for (const exp of expectedFields) {
    if (!presentKeys.includes(exp.name)) {
      // Find candidate alias
      let candidateAlias: string | undefined;

      // Check common alias list first
      const knownAliases = COMMON_ALIASES[exp.name] || [];
      for (const alias of knownAliases) {
        if (presentKeys.includes(alias)) {
          candidateAlias = alias;
          break;
        }
      }

      // If not in common list, try fuzzy matching (Levenshtein distance <= 3)
      if (!candidateAlias) {
        for (const pk of presentKeys) {
          if (levenshteinDistance(exp.name, pk) <= 3 || pk.includes(exp.name) || exp.name.includes(pk)) {
            candidateAlias = pk;
            break;
          }
        }
      }

      if (candidateAlias) {
        anomalies.push({
          field: exp.name,
          type: 'renamed_column',
          severity: 'critical',
          details: `Field "${exp.name}" is missing from source, but matching candidate "${candidateAlias}" was found.`,
          suggestedAlias: candidateAlias,
          expectedType: exp.expectedType,
          sampleValue: firstRow[candidateAlias]
        });
      } else {
        anomalies.push({
          field: exp.name,
          type: 'missing_required',
          severity: 'critical',
          details: `Required field "${exp.name}" is completely absent from incoming schema.`
        });
      }
    }
  }

  // 2. Check for Type & Formatting Drift (e.g. Currency symbols, string numbers)
  for (const exp of expectedFields) {
    const keyToCheck = anomalies.find(a => a.field === exp.name)?.suggestedAlias || exp.name;
    if (!presentKeys.includes(keyToCheck)) continue;

    let stringNumberCount = 0;
    let currencySymbolCount = 0;
    let nullCount = 0;

    for (const row of sampleRows) {
      const val = row[keyToCheck];
      if (val === null || val === undefined || val === '') {
        nullCount++;
        continue;
      }

      if (exp.expectedType === 'number' && typeof val === 'string') {
        if (/^[\$€£¥₹]/.test(val.trim())) {
          currencySymbolCount++;
        }
        if (!isNaN(Number(val.replace(/[^0-9.-]/g, '')))) {
          stringNumberCount++;
        }
      }
    }

    if (currencySymbolCount > 0) {
      anomalies.push({
        field: keyToCheck,
        type: 'currency_symbol',
        severity: 'warning',
        details: `Field "${keyToCheck}" contains currency formatting (e.g. "${firstRow[keyToCheck]}") instead of raw numeric value.`,
        expectedType: 'number',
        receivedType: 'string',
        sampleValue: firstRow[keyToCheck]
      });
    } else if (stringNumberCount > 0 && exp.expectedType === 'number') {
      anomalies.push({
        field: keyToCheck,
        type: 'type_mismatch',
        severity: 'warning',
        details: `Field "${keyToCheck}" was received as String ("${firstRow[keyToCheck]}"), expected Number.`,
        expectedType: 'number',
        receivedType: 'string',
        sampleValue: firstRow[keyToCheck]
      });
    }

    if (nullCount / sampleSize > 0.4 && sampleSize >= 5) {
      anomalies.push({
        field: keyToCheck,
        type: 'null_spike',
        severity: 'warning',
        details: `High null spike: ${Math.round((nullCount / sampleSize) * 100)}% of sampled rows have null/empty values in "${keyToCheck}".`
      });
    }
  }

  if (anomalies.length === 0) return null;

  // Collect sample problem rows
  for (const row of sampleRows.slice(0, 3)) {
    problemRows.push({ ...row });
  }

  return {
    id: `drift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nodeId: node.id,
    nodeName: node.data.label || node.data.subType,
    anomalies,
    detectedAt: new Date().toISOString(),
    totalSampled: sampleSize,
    affectedRowsCount: inputData.length,
    sampleProblemRows: problemRows,
    status: 'pending'
  };
}
