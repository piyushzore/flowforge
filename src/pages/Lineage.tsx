import { useState, useEffect } from 'react';
import { usePipelineStore } from '../store/pipeline-store';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, ArrowRight, Zap, ChevronRight, Network,
  CheckCircle2, XCircle, Clock, AlertTriangle
} from 'lucide-react';

interface LineageNode {
  id: string;
  label: string;
  category: string;
  subType: string;
  x: number;
  y: number;
  pipelineId: string;
  pipelineName: string;
}

interface LineageEdge {
  id: string;
  source: string;
  target: string;
}

export default function Lineage() {
  const { pipelines, runs } = usePipelineStore();
  const navigate = useNavigate();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('all');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [lineageNodes, setLineageNodes] = useState<LineageNode[]>([]);
  const [lineageEdges, setLineageEdges] = useState<LineageEdge[]>([]);

  useEffect(() => {
    const pipelinesScope = selectedPipelineId === 'all'
      ? pipelines
      : pipelines.filter(p => p.id === selectedPipelineId);

    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];

    let pipelineYOffset = 0;

    pipelinesScope.forEach((pipeline) => {
      const categoryOrder: Record<string, number> = { source: 0, transform: 1, destination: 2, control: 1, orchestration: 0 };
      const colMap: Record<number, number> = {};

      pipeline.nodes.forEach((n) => {
        const col = categoryOrder[n.data.category] ?? 1;
        const row = colMap[col] ?? 0;
        colMap[col] = row + 1;

        nodes.push({
          id: `${pipeline.id}::${n.id}`,
          label: n.data.label,
          category: n.data.category,
          subType: String(n.data.subType),
          x: 80 + col * 220,
          y: pipelineYOffset + 60 + row * 100,
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
        });
      });

      pipeline.edges.forEach((e, idx) => {
        edges.push({
          id: `${pipeline.id}::edge-${idx}`,
          source: `${pipeline.id}::${e.source}`,
          target: `${pipeline.id}::${e.target}`,
        });
      });

      const maxRow = Math.max(...Object.values(colMap), 1);
      pipelineYOffset += maxRow * 100 + 60;
    });

    setLineageNodes(nodes);
    setLineageEdges(edges);
  }, [pipelines, selectedPipelineId]);

  const svgHeight = Math.max(400, lineageNodes.reduce((m, n) => Math.max(m, n.y + 100), 400));

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'source': return { fill: '#d1fae5', stroke: '#10b981', text: '#065f46' };
      case 'transform': return { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' };
      case 'destination': return { fill: '#ede9fe', stroke: '#8b5cf6', text: '#4c1d95' };
      default: return { fill: '#f1f5f9', stroke: '#94a3b8', text: '#334155' };
    }
  };

  const getConnectedNodeIds = (nodeId: string): Set<string> => {
    const connected = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      lineageEdges.forEach(e => {
        if (e.source === current && !connected.has(e.target)) {
          connected.add(e.target);
          queue.push(e.target);
        }
        if (e.target === current && !connected.has(e.source)) {
          connected.add(e.source);
          queue.push(e.source);
        }
      });
    }
    connected.add(nodeId);
    return connected;
  };

  const highlightedNodes = hoveredNodeId ? getConnectedNodeIds(hoveredNodeId) : null;

  const recentRuns = runs.slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network size={24} className="text-blue-500" />
            Data Lineage
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualise how data flows through your pipelines from source to destination.
          </p>
        </div>

        <select
          value={selectedPipelineId}
          onChange={e => setSelectedPipelineId(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Pipelines</option>
          {pipelines.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Lineage Canvas */}
      {lineageNodes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center">
          <Network size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No lineage data yet</h3>
          <p className="text-sm text-slate-500 mb-6">Create pipelines with nodes to see data lineage visualised here.</p>
          <button
            onClick={() => navigate('/pipelines')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Pipelines
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50 dark:bg-slate-950">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-500 inline-block" /> Source
            </span>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-200 border border-blue-500 inline-block" /> Transform
            </span>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-violet-200 border border-violet-500 inline-block" /> Destination
            </span>
            <span className="text-xs text-slate-400 ml-auto">Hover a node to trace its lineage</span>
          </div>
          <div className="overflow-auto">
            <svg width="800" height={svgHeight} className="min-w-full">
              {/* Defs */}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-highlight" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
              </defs>

              {/* Edges */}
              {lineageEdges.map(edge => {
                const src = lineageNodes.find(n => n.id === edge.source);
                const tgt = lineageNodes.find(n => n.id === edge.target);
                if (!src || !tgt) return null;
                const isHighlighted = highlightedNodes?.has(edge.source) && highlightedNodes?.has(edge.target);
                const x1 = src.x + 80;
                const y1 = src.y + 20;
                const x2 = tgt.x;
                const y2 = tgt.y + 20;
                const mx = (x1 + x2) / 2;
                return (
                  <path
                    key={edge.id}
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isHighlighted ? '#3b82f6' : '#cbd5e1'}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    markerEnd={isHighlighted ? 'url(#arrow-highlight)' : 'url(#arrow)'}
                    strokeDasharray={isHighlighted ? undefined : '4,3'}
                    opacity={hoveredNodeId && !isHighlighted ? 0.2 : 1}
                    className="transition-all duration-200"
                  />
                );
              })}

              {/* Nodes */}
              {lineageNodes.map(node => {
                const colors = getCategoryColor(node.category);
                const isHighlighted = !highlightedNodes || highlightedNodes.has(node.id);
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => navigate(`/pipelines/${node.pipelineId}`)}
                    className="cursor-pointer"
                    opacity={isHighlighted ? 1 : 0.25}
                  >
                    <rect
                      width={160}
                      height={44}
                      rx={8}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={hoveredNodeId === node.id ? 2.5 : 1.5}
                      className="transition-all duration-150"
                    />
                    <text x={12} y={16} fontSize={9} fill={colors.text} fontWeight={600} className="uppercase tracking-wider">
                      {node.category}
                    </text>
                    <text x={12} y={32} fontSize={12} fill={colors.text} fontWeight={500}>
                      {node.label.length > 18 ? node.label.slice(0, 17) + '…' : node.label}
                    </text>
                    <text x={12} y={44} fontSize={9} fill="#94a3b8">
                      {node.pipelineName.length > 22 ? node.pipelineName.slice(0, 21) + '…' : node.pipelineName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Recent Run Impact Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            Recent Run Impact
          </h3>
          <div className="space-y-2.5">
            {recentRuns.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No runs recorded yet.</p>
            ) : recentRuns.map(run => (
              <div key={run.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  {run.status === 'success' ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                   run.status === 'failed' ? <XCircle size={14} className="text-red-500" /> :
                   <Clock size={14} className="text-amber-500" />}
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{run.pipelineName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{run.rowsOut.toLocaleString()} rows out</span>
                  {run.duration && <span>{run.duration}s</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <GitBranch size={16} className="text-violet-500" />
            Pipeline Summary
          </h3>
          <div className="space-y-2.5">
            {pipelines.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No pipelines yet.</p>
            ) : pipelines.slice(0, 5).map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg transition-colors"
                onClick={() => navigate(`/pipelines/${p.id}`)}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : p.status === 'paused' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{p.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{p.nodes.length} nodes</span>
                  <span>{p.edges.length} edges</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
