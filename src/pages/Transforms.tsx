import { useState } from 'react';
import { Search, Copy, CheckCircle2, Play, Code, Plus, Layers, Filter, Hash, GitMerge, Wand2 } from 'lucide-react';
import { usePipelineStore } from '../store/pipeline-store';
import { useNavigate } from 'react-router-dom';

interface Transform {
  id: string;
  name: string;
  description: string;
  category: string;
  language: 'javascript' | 'sql' | 'config';
  code: string;
  icon: string;
  tags: string[];
}

const LIBRARY: Transform[] = [
  {
    id: 't1', name: 'Remove Null Rows', category: 'Cleaning', language: 'javascript', icon: '🧹',
    description: 'Filters out rows where any field is null, undefined, or empty string.',
    code: `(rows) => rows.filter(row =>
  Object.values(row).every(v => v !== null && v !== undefined && v !== '')
)`,
    tags: ['null', 'clean', 'filter'],
  },
  {
    id: 't2', name: 'Deduplicate by Key', category: 'Cleaning', language: 'javascript', icon: '🔍',
    description: 'Removes duplicate rows based on a specified key field. Keeps the first occurrence.',
    code: `// Change 'id' to your key column
(rows) => {
  const seen = new Set();
  return rows.filter(row => {
    const key = row['id'];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}`,
    tags: ['deduplicate', 'unique', 'clean'],
  },
  {
    id: 't3', name: 'Normalize Emails', category: 'Standardization', language: 'javascript', icon: '📧',
    description: 'Trims whitespace and lowercases all email fields named "email".',
    code: `(rows) => rows.map(row => ({
  ...row,
  email: typeof row.email === 'string'
    ? row.email.trim().toLowerCase()
    : row.email
}))`,
    tags: ['email', 'normalize', 'lowercase'],
  },
  {
    id: 't4', name: 'Add Created At Timestamp', category: 'Enrichment', language: 'javascript', icon: '⏰',
    description: 'Adds a created_at field with current ISO timestamp to every row.',
    code: `(rows) => rows.map(row => ({
  ...row,
  created_at: new Date().toISOString()
}))`,
    tags: ['timestamp', 'enrich', 'date'],
  },
  {
    id: 't5', name: 'Currency Rounding', category: 'Numeric', language: 'javascript', icon: '💰',
    description: 'Rounds all numeric fields to 2 decimal places (useful for financial data).',
    code: `(rows) => rows.map(row => {
  const result = { ...row };
  Object.keys(result).forEach(k => {
    if (typeof result[k] === 'number') {
      result[k] = Math.round(result[k] * 100) / 100;
    }
  });
  return result;
})`,
    tags: ['currency', 'round', 'numeric'],
  },
  {
    id: 't6', name: 'Flatten JSON Column', category: 'Transformation', language: 'javascript', icon: '📦',
    description: 'Flattens a nested JSON column into top-level fields. Change "metadata" to your column name.',
    code: `(rows) => rows.map(row => {
  const nested = row.metadata || {};
  const { metadata, ...rest } = row;
  return { ...rest, ...nested };
})`,
    tags: ['json', 'flatten', 'nested'],
  },
  {
    id: 't7', name: 'Revenue Tier Segmentation', category: 'Business Logic', language: 'javascript', icon: '📊',
    description: 'Adds a revenue_tier column based on revenue value thresholds.',
    code: `(rows) => rows.map(row => ({
  ...row,
  revenue_tier: row.revenue >= 10000 ? 'enterprise'
    : row.revenue >= 1000 ? 'growth'
    : row.revenue >= 100 ? 'starter'
    : 'free'
}))`,
    tags: ['segment', 'business', 'classification'],
  },
  {
    id: 't8', name: 'Calculate Running Total', category: 'Analytics', language: 'javascript', icon: '📈',
    description: 'Adds a running_total column that accumulates the sum of the amount field.',
    code: `(rows) => {
  let total = 0;
  return rows.map(row => {
    total += Number(row.amount) || 0;
    return { ...row, running_total: Math.round(total * 100) / 100 };
  });
}`,
    tags: ['running total', 'cumulative', 'analytics'],
  },
  {
    id: 't9', name: 'Top N by Group', category: 'Analytics', language: 'javascript', icon: '🏆',
    description: 'Returns the top 3 rows per group (grouped by "category", ordered by "value").',
    code: `(rows) => {
  const groups = {};
  rows.forEach(row => {
    const key = row.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  return Object.values(groups)
    .flatMap(g => g.sort((a, b) => b.value - a.value).slice(0, 3));
}`,
    tags: ['top-n', 'ranking', 'group'],
  },
  {
    id: 't10', name: 'Monthly Revenue', category: 'SQL', language: 'sql', icon: '🗄',
    description: 'Aggregates revenue by month and category from an orders table.',
    code: `SELECT
  DATE_TRUNC('month', created_at) AS month,
  category,
  SUM(amount) AS total_revenue,
  COUNT(*) AS order_count,
  AVG(amount) AS avg_order_value
FROM orders
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC`,
    tags: ['sql', 'aggregation', 'revenue'],
  },
  {
    id: 't11', name: 'Active Users (Last 30 Days)', category: 'SQL', language: 'sql', icon: '👥',
    description: 'Finds users who performed any action in the last 30 days.',
    code: `SELECT DISTINCT
  user_id,
  COUNT(*) AS action_count,
  MAX(created_at) AS last_active
FROM user_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY last_active DESC`,
    tags: ['sql', 'users', 'activity'],
  },
  {
    id: 't12', name: 'Customer Lifetime Value', category: 'SQL', language: 'sql', icon: '💎',
    description: 'Calculates CLV per customer based on total spend and first/last order date.',
    code: `SELECT
  customer_id,
  SUM(amount) AS lifetime_value,
  COUNT(*) AS total_orders,
  MIN(created_at) AS first_order,
  MAX(created_at) AS last_order,
  EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) AS customer_age_days
FROM orders
GROUP BY customer_id
ORDER BY lifetime_value DESC`,
    tags: ['sql', 'clv', 'customer'],
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(LIBRARY.map(t => t.category)))];

export default function Transforms() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [language, setLanguage] = useState<'all' | 'javascript' | 'sql'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { createPipeline } = usePipelineStore();

  const filtered = LIBRARY.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
      || t.description.toLowerCase().includes(search.toLowerCase())
      || t.tags.some(tag => tag.includes(search.toLowerCase()));
    const matchCat = category === 'All' || t.category === category;
    const matchLang = language === 'all' || t.language === language;
    return matchSearch && matchCat && matchLang;
  });

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleUseInPipeline = (t: Transform) => {
    const pid = createPipeline(`Pipeline with ${t.name}`);
    navigate(`/pipelines/${pid}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={24} className="text-blue-500" />
            Transform Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ready-to-use JavaScript and SQL transformations. Copy any snippet into a Custom Code node.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Code size={13} /> {LIBRARY.length} transforms
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transforms..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 ml-auto">
          {(['all', 'javascript', 'sql'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                language === lang
                  ? lang === 'javascript' ? 'bg-amber-500 text-white' : lang === 'sql' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {lang === 'all' ? 'All' : lang === 'javascript' ? '⚡ JS' : '🗄 SQL'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wand2 size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No transforms match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        t.language === 'javascript' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {t.language.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">{t.category}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
              </div>

              <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-950 p-3 overflow-x-auto flex-1 leading-relaxed whitespace-pre-wrap">
                {t.code}
              </pre>

              <div className="flex gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={() => handleCopy(t.id, t.code)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 bg-slate-100 dark:bg-slate-900 rounded-lg transition-colors"
                >
                  {copiedId === t.id ? <><CheckCircle2 size={12} className="text-emerald-500" /> Copied!</> : <><Copy size={12} /> Copy Code</>}
                </button>
                <button
                  onClick={() => handleUseInPipeline(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Play size={12} /> Use in Pipeline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
