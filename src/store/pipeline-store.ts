import { create } from 'zustand';
import type { Pipeline, PipelineNode, PipelineEdge, PipelineNodeData, PipelineRun } from '../types/pipeline';
import { mockPipelines } from '../data/mock-pipelines';
import { mockRuns } from '../data/mock-runs';

export type ProcessingMode = 'batch' | 'stream' | 'micro-batch';

interface RunStats {
  totalRows: number;
  processedRows: number;
  failedRows: number;
  throughput: number;     // rows per second
  latency: number;        // ms
  startTime: number;
  elapsedMs: number;
  nodesCompleted: number;
  nodesTotal: number;
  currentNodeId: string | null;
  errorNodeId: string | null;
  errorMessage: string | null;
}

interface PipelineState {
  pipelines: Pipeline[];
  activePipelineId: string | null;
  
  getActivePipeline: () => Pipeline | undefined;
  
  createPipeline: (name: string) => string;
  deletePipeline: (id: string) => void;
  updatePipeline: (id: string, updates: Partial<Pipeline>) => void;
  setActivePipeline: (id: string | null) => void;
  duplicatePipeline: (id: string) => string;
  
  addNode: (pipelineId: string, node: PipelineNode) => void;
  updateNode: (pipelineId: string, nodeId: string, data: Partial<PipelineNodeData>) => void;
  removeNode: (pipelineId: string, nodeId: string) => void;
  setNodes: (pipelineId: string, nodes: PipelineNode[]) => void;
  addEdge: (pipelineId: string, edge: PipelineEdge) => void;
  removeEdge: (pipelineId: string, edgeId: string) => void;
  setEdges: (pipelineId: string, edges: PipelineEdge[]) => void;
  
  undoStack: Map<string, { nodes: PipelineNode[]; edges: PipelineEdge[] }[]>;
  redoStack: Map<string, { nodes: PipelineNode[]; edges: PipelineEdge[] }[]>;
  takeSnapshot: (pipelineId: string) => void;
  undo: (pipelineId: string) => void;
  redo: (pipelineId: string) => void;
  canUndo: (pipelineId: string) => boolean;
  canRedo: (pipelineId: string) => boolean;
  
  activatePipeline: (id: string) => void;
  pausePipeline: (id: string) => void;
  
  // Run state
  isRunning: boolean;
  runningPipelineId: string | null;
  processingMode: ProcessingMode;
  setProcessingMode: (mode: ProcessingMode) => void;
  runStats: RunStats | null;
  startTestRun: (pipelineId: string) => void;
  startRun: (pipelineId: string) => void;
  stopRun: () => void;
  _runTimers: number[];
  
  runs: PipelineRun[];
  addRun: (run: PipelineRun) => void;
  
  saveVersion: (pipelineId: string, name?: string) => void;
  restoreVersion: (pipelineId: string, versionIndex: number) => void;
  
  saveStatus: 'saved' | 'saving' | 'unsaved';
  setSaveStatus: (s: 'saved' | 'saving' | 'unsaved') => void;
}

// ─── Helper: topological sort ───────────────────────────────────────────
function topoSort(nodes: PipelineNode[], edges: PipelineEdge[]): string[] {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  nodes.forEach(n => { adj.set(n.id, []); inDeg.set(n.id, 0); });
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  });
  const queue = nodes.filter(n => (inDeg.get(n.id) || 0) === 0).map(n => n.id);
  const result: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const neighbor of (adj.get(id) || [])) {
      const deg = (inDeg.get(neighbor) || 1) - 1;
      inDeg.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }
  return result;
}

// ─── Helper: set edge data ──────────────────────────────────────────────
function setEdgeStatus(
  edges: PipelineEdge[],
  sourceId: string,
  status: string,
  throughput?: number
): PipelineEdge[] {
  return edges.map(e =>
    e.source === sourceId
      ? { ...e, data: { ...(e.data || {}), status, throughput: throughput || 0 } }
      : e
  );
}

function setAllEdgesStatus(edges: PipelineEdge[], status: string): PipelineEdge[] {
  return edges.map(e => ({ ...e, data: { ...(e.data || {}), status, throughput: 0 } }));
}

export const usePipelineStore = create<PipelineState>()((set, get) => ({
  pipelines: mockPipelines,
  activePipelineId: mockPipelines[0]?.id || null,
  
  getActivePipeline: () => {
    const { pipelines, activePipelineId } = get();
    return pipelines.find(p => p.id === activePipelineId);
  },
  
  createPipeline: (name) => {
    const id = `p-${Date.now()}`;
    const newPipeline: Pipeline = {
      id,
      name,
      description: '',
      status: 'draft',
      workspaceId: 'ws-1',
      createdBy: 'u-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentVersionIndex: 0,
      versions: [],
      nodes: [],
      edges: []
    };
    set(state => ({ pipelines: [...state.pipelines, newPipeline], activePipelineId: id }));
    return id;
  },
  
  deletePipeline: (id) => set(state => ({
    pipelines: state.pipelines.filter(p => p.id !== id),
    activePipelineId: state.activePipelineId === id ? null : state.activePipelineId
  })),
  
  updatePipeline: (id, updates) => set(state => ({
    pipelines: state.pipelines.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
  })),
  
  setActivePipeline: (id) => set({ activePipelineId: id }),
  
  duplicatePipeline: (id) => {
    const pipeline = get().pipelines.find(p => p.id === id);
    if (!pipeline) return '';
    const newId = `p-${Date.now()}`;
    const newPipeline = { ...pipeline, id: newId, name: `${pipeline.name} (Copy)` };
    set(state => ({ pipelines: [...state.pipelines, newPipeline] }));
    return newId;
  },
  
  addNode: (pipelineId, node) => set(state => ({
    pipelines: state.pipelines.map(p => p.id === pipelineId ? { ...p, nodes: [...p.nodes, node] } : p)
  })),
  
  updateNode: (pipelineId, nodeId, data) => set(state => ({
    pipelines: state.pipelines.map(p => p.id === pipelineId ? {
      ...p, nodes: p.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } as PipelineNodeData } : n)
    } : p)
  })),
  
  removeNode: (pipelineId, nodeId) => set(state => ({
    pipelines: state.pipelines.map(p => p.id === pipelineId ? {
      ...p, nodes: p.nodes.filter(n => n.id !== nodeId)
    } : p)
  })),
  
  setNodes: (pipelineId, nodes) => set(state => ({
    pipelines: state.pipelines.map(p => p.id === pipelineId ? { ...p, nodes } : p)
  })),
  
  addEdge: (pipelineId, edge) => set(state => ({
    pipelines: state.pipelines.map(p => p.id === pipelineId ? { ...p, edges: [...p.edges, edge] } : p)
  })),
  
  removeEdge: (pipelineId, edgeId) => set(state => ({
    pipelines: state.pipelines.map(p => p.id === pipelineId ? { ...p, edges: p.edges.filter(e => e.id !== edgeId) } : p)
  })),
  
  setEdges: (pipelineId, edges) => set(state => ({
    pipelines: state.pipelines.map(p => p.id === pipelineId ? { ...p, edges } : p)
  })),
  
  undoStack: new Map(),
  redoStack: new Map(),
  
  takeSnapshot: (pipelineId) => {
    const pipeline = get().pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    
    set(state => {
      const newUndoStack = new Map(state.undoStack);
      const stack = newUndoStack.get(pipelineId) || [];
      newUndoStack.set(pipelineId, [...stack.slice(-49), { nodes: pipeline.nodes, edges: pipeline.edges }]);
      
      const newRedoStack = new Map(state.redoStack);
      newRedoStack.set(pipelineId, []);
      
      return { undoStack: newUndoStack, redoStack: newRedoStack, saveStatus: 'unsaved' };
    });
  },
  
  undo: (pipelineId) => {
    set(state => {
      const pipeline = state.pipelines.find(p => p.id === pipelineId);
      if (!pipeline) return state;
      
      const undoStack = state.undoStack.get(pipelineId) || [];
      if (undoStack.length === 0) return state;
      
      const snapshot = undoStack[undoStack.length - 1];
      const newUndoStack = new Map(state.undoStack);
      newUndoStack.set(pipelineId, undoStack.slice(0, -1));
      
      const redoStack = state.redoStack.get(pipelineId) || [];
      const newRedoStack = new Map(state.redoStack);
      newRedoStack.set(pipelineId, [...redoStack, { nodes: pipeline.nodes, edges: pipeline.edges }]);
      
      return {
        pipelines: state.pipelines.map(p => p.id === pipelineId ? { ...p, nodes: snapshot.nodes, edges: snapshot.edges } : p),
        undoStack: newUndoStack,
        redoStack: newRedoStack
      };
    });
  },
  
  redo: (pipelineId) => {
    set(state => {
      const pipeline = state.pipelines.find(p => p.id === pipelineId);
      if (!pipeline) return state;
      
      const redoStack = state.redoStack.get(pipelineId) || [];
      if (redoStack.length === 0) return state;
      
      const snapshot = redoStack[redoStack.length - 1];
      const newRedoStack = new Map(state.redoStack);
      newRedoStack.set(pipelineId, redoStack.slice(0, -1));
      
      const undoStack = state.undoStack.get(pipelineId) || [];
      const newUndoStack = new Map(state.undoStack);
      newUndoStack.set(pipelineId, [...undoStack, { nodes: pipeline.nodes, edges: pipeline.edges }]);
      
      return {
        pipelines: state.pipelines.map(p => p.id === pipelineId ? { ...p, nodes: snapshot.nodes, edges: snapshot.edges } : p),
        undoStack: newUndoStack,
        redoStack: newRedoStack
      };
    });
  },
  
  canUndo: (pipelineId) => (get().undoStack.get(pipelineId)?.length || 0) > 0,
  canRedo: (pipelineId) => (get().redoStack.get(pipelineId)?.length || 0) > 0,
  
  activatePipeline: (id) => get().updatePipeline(id, { status: 'active' }),
  pausePipeline: (id) => get().updatePipeline(id, { status: 'paused' }),
  
  // ─── Run Engine ────────────────────────────────────────────────────
  isRunning: false,
  runningPipelineId: null,
  processingMode: 'batch',
  runStats: null,
  _runTimers: [],

  setProcessingMode: (mode) => set({ processingMode: mode }),

  stopRun: () => {
    const timers = get()._runTimers;
    timers.forEach(t => clearTimeout(t));

    const pid = get().runningPipelineId;
    if (pid) {
      const pipeline = get().pipelines.find(p => p.id === pid);
      if (pipeline) {
        get().setNodes(pid, pipeline.nodes.map(n => ({
          ...n, data: { ...n.data, runStatus: 'idle', runProgress: undefined, rowsProcessed: undefined } as PipelineNodeData
        })));
        get().setEdges(pid, setAllEdgesStatus(pipeline.edges, 'idle'));
      }
    }
    set({ isRunning: false, runningPipelineId: null, runStats: null, _runTimers: [] });
  },
  
  startTestRun: (pipelineId) => {
    const pipeline = get().pipelines.find(p => p.id === pipelineId);
    if (!pipeline || pipeline.nodes.length === 0) return;
    const mode = get().processingMode;

    // Stop any existing run
    get().stopRun();

    const startTime = Date.now();
    const totalRows = mode === 'stream' ? Infinity : (5000 + Math.floor(Math.random() * 15000));
    const sortedIds = topoSort(pipeline.nodes, pipeline.edges);
    const timers: number[] = [];

    // Initial state — all queued
    set({ isRunning: true, runningPipelineId: pipelineId, _runTimers: timers });
    get().setNodes(pipelineId, pipeline.nodes.map(n => ({
      ...n, data: { ...n.data, runStatus: 'queued', runProgress: 0, rowsProcessed: 0 } as PipelineNodeData
    })));
    get().setEdges(pipelineId, setAllEdgesStatus(pipeline.edges, 'queued'));
    set({
      runStats: {
        totalRows, processedRows: 0, failedRows: 0,
        throughput: 0, latency: 0,
        startTime, elapsedMs: 0,
        nodesCompleted: 0, nodesTotal: sortedIds.length,
        currentNodeId: null, errorNodeId: null, errorMessage: null,
      }
    });

    if (mode === 'batch' || mode === 'micro-batch') {
      // ─── BATCH MODE ───────────────────────────────────────────────
      const nodeDelay = mode === 'micro-batch' ? 900 : 1400;
      const progressInterval = 120;
      const shouldFail = Math.random() < 0.18;  // 18% chance of failure
      const failAtStep = shouldFail ? Math.floor(Math.random() * sortedIds.length) : -1;

      let stepIndex = 0;

      const runNextNode = () => {
        if (!get().isRunning) return;
        if (stepIndex >= sortedIds.length) {
          // ─── All done (success) ───
          const elapsed = Date.now() - startTime;
          set(state => ({
            runStats: state.runStats ? {
              ...state.runStats,
              processedRows: totalRows,
              throughput: Math.round(totalRows / (elapsed / 1000)),
              elapsedMs: elapsed,
              nodesCompleted: sortedIds.length,
              currentNodeId: null,
            } : null
          }));
          get().addRun({
            id: `r-${Date.now()}`, pipelineId, pipelineName: pipeline.name,
            status: 'success', trigger: 'manual',
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            duration: Math.round(elapsed / 1000),
            rowsIn: totalRows, rowsOut: totalRows, nodeResults: []
          });
          // Keep isRunning true briefly so UI shows green, then wind down
          const t = window.setTimeout(() => {
            set({ isRunning: false, runningPipelineId: null });
          }, 3000);
          timers.push(t);
          return;
        }

        const nodeId = sortedIds[stepIndex];

        // Check for simulated failure
        if (stepIndex === failAtStep) {
          get().updateNode(pipelineId, nodeId, { runStatus: 'failed', runError: 'Schema mismatch: column "revenue_q3" not found in target' });
          // Mark downstream edges red
          const updatedPipeline = get().pipelines.find(p => p.id === pipelineId);
          if (updatedPipeline) {
            get().setEdges(pipelineId, setEdgeStatus(updatedPipeline.edges, nodeId, 'failed'));
          }
          const elapsed = Date.now() - startTime;
          set(state => ({
            runStats: state.runStats ? {
              ...state.runStats,
              errorNodeId: nodeId,
              errorMessage: 'Schema mismatch: column "revenue_q3" not found in target',
              elapsedMs: elapsed,
              nodesCompleted: stepIndex,
            } : null
          }));
          get().addRun({
            id: `r-${Date.now()}`, pipelineId, pipelineName: pipeline.name,
            status: 'failed', trigger: 'manual',
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            duration: Math.round(elapsed / 1000),
            rowsIn: totalRows, rowsOut: Math.round(totalRows * (stepIndex / sortedIds.length)),
            error: 'Schema mismatch',
            nodeResults: []
          });
          const t = window.setTimeout(() => {
            set({ isRunning: false, runningPipelineId: null });
          }, 4000);
          timers.push(t);
          return;
        }

        // Start running this node
        get().updateNode(pipelineId, nodeId, { runStatus: 'running', runProgress: 0, rowsProcessed: 0 });
        set(state => ({
          runStats: state.runStats ? { ...state.runStats, currentNodeId: nodeId } : null
        }));

        // Set incoming edges to 'running'
        const currentPipeline = get().pipelines.find(p => p.id === pipelineId);
        if (currentPipeline) {
          const incomingEdges = currentPipeline.edges.filter(e => e.target === nodeId);
          if (incomingEdges.length > 0) {
            const updatedEdges = currentPipeline.edges.map(e =>
              e.target === nodeId
                ? { ...e, data: { ...(e.data || {}), status: 'running', throughput: Math.round(totalRows / (nodeDelay / 1000) * 0.7) } }
                : e
            );
            get().setEdges(pipelineId, updatedEdges);
          }
        }

        // Simulate progress ticks
        const rowsForNode = Math.round(totalRows / sortedIds.length);
        let progressTicks = 0;
        const maxTicks = Math.round(nodeDelay / progressInterval);

        const progressTimer = window.setInterval(() => {
          if (!get().isRunning) { clearInterval(progressTimer); return; }
          progressTicks++;
          const pct = Math.min(Math.round((progressTicks / maxTicks) * 100), 99);
          const rowsDone = Math.round((pct / 100) * rowsForNode);
          get().updateNode(pipelineId, nodeId, {
            runProgress: pct,
            rowsProcessed: rowsDone,
          });
          const elapsed = Date.now() - startTime;
          const processed = Math.round((stepIndex / sortedIds.length + pct / 100 / sortedIds.length) * totalRows);
          set(state => ({
            runStats: state.runStats ? {
              ...state.runStats,
              processedRows: processed,
              throughput: Math.round(processed / (elapsed / 1000)),
              latency: Math.round(20 + Math.random() * 40),
              elapsedMs: elapsed,
            } : null
          }));
        }, progressInterval);
        timers.push(progressTimer as unknown as number);

        // Complete this node
        const completeTimer = window.setTimeout(() => {
          clearInterval(progressTimer);
          if (!get().isRunning) return;

          get().updateNode(pipelineId, nodeId, {
            runStatus: 'success',
            runProgress: 100,
            rowsProcessed: rowsForNode,
          });

          // Set outgoing edges from this node to success (green flowing)
          const p = get().pipelines.find(pp => pp.id === pipelineId);
          if (p) {
            get().setEdges(pipelineId, setEdgeStatus(p.edges, nodeId, 'success', Math.round(totalRows / (nodeDelay / 1000))));
            // Also mark incoming edges as success
            const inEdgesGreen = p.edges.map(e =>
              e.target === nodeId && (e.data as any)?.status === 'running'
                ? { ...e, data: { ...(e.data || {}), status: 'success', throughput: Math.round(totalRows / (nodeDelay / 1000)) } }
                : e
            );
            get().setEdges(pipelineId, setEdgeStatus(inEdgesGreen, nodeId, 'success', Math.round(totalRows / (nodeDelay / 1000))));
          }

          set(state => ({
            runStats: state.runStats ? {
              ...state.runStats,
              nodesCompleted: stepIndex + 1,
            } : null
          }));

          stepIndex++;
          const t = window.setTimeout(runNextNode, 300);
          timers.push(t);
        }, nodeDelay);
        timers.push(completeTimer);
      };

      const startTimer = window.setTimeout(runNextNode, 400);
      timers.push(startTimer);

    } else {
      // ─── STREAM MODE ──────────────────────────────────────────────
      // All nodes go "running" simultaneously, edges show streaming particles
      get().setNodes(pipelineId, pipeline.nodes.map(n => ({
        ...n, data: { ...n.data, runStatus: 'running', runProgress: undefined, rowsProcessed: 0 } as PipelineNodeData
      })));
      get().setEdges(pipelineId, pipeline.edges.map(e => ({
        ...e, data: { ...(e.data || {}), status: 'streaming', throughput: 0 }
      })));

      let streamRows = 0;
      const streamTick = window.setInterval(() => {
        if (!get().isRunning) { clearInterval(streamTick); return; }
        const batchSize = 50 + Math.floor(Math.random() * 200);
        streamRows += batchSize;
        const elapsed = Date.now() - startTime;
        const throughput = Math.round(streamRows / (elapsed / 1000));
        const latency = Math.round(5 + Math.random() * 25);

        // Update all nodes with streaming row count
        const curPipeline = get().pipelines.find(p => p.id === pipelineId);
        if (curPipeline) {
          get().setNodes(pipelineId, curPipeline.nodes.map(n => ({
            ...n, data: { ...n.data, rowsProcessed: streamRows + Math.floor(Math.random() * 50) } as PipelineNodeData
          })));
          get().setEdges(pipelineId, curPipeline.edges.map(e => ({
            ...e, data: { ...(e.data || {}), status: 'streaming', throughput }
          })));
        }

        set(state => ({
          runStats: state.runStats ? {
            ...state.runStats,
            processedRows: streamRows,
            throughput,
            latency,
            elapsedMs: elapsed,
          } : null
        }));
      }, 300);
      timers.push(streamTick as unknown as number);
    }

    set({ _runTimers: timers });
  },
  
  startRun: (pipelineId) => get().startTestRun(pipelineId),
  
  runs: mockRuns,
  addRun: (run) => set(state => ({ runs: [run, ...state.runs] })),
  
  saveVersion: (pipelineId, name) => {
    const pipeline = get().pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;
    const newVersion = {
      id: `v-${Date.now()}`,
      name: name || `Version ${pipeline.versions.length + 1}`,
      timestamp: new Date().toISOString(),
      nodes: pipeline.nodes,
      edges: pipeline.edges,
      autoSave: !name,
    };
    get().updatePipeline(pipelineId, {
      versions: [...pipeline.versions, newVersion],
      currentVersionIndex: pipeline.versions.length
    });
  },
  
  restoreVersion: (pipelineId, versionIndex) => {
    const pipeline = get().pipelines.find(p => p.id === pipelineId);
    if (!pipeline || !pipeline.versions[versionIndex]) return;
    const version = pipeline.versions[versionIndex];
    get().updatePipeline(pipelineId, {
      nodes: version.nodes,
      edges: version.edges,
      currentVersionIndex: versionIndex
    });
  },
  
  saveStatus: 'saved',
  setSaveStatus: (s) => set({ saveStatus: s })
}));
