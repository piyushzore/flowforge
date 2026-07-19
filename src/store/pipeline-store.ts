import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { executePipelineLocal } from '../engine/executor';
import type { Pipeline, PipelineNode, PipelineEdge, PipelineNodeData, PipelineRun } from '../types/pipeline';
// Import types and utilities

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
  
  savePipeline: (id: string) => Promise<void>;
  loadAllPipelines: () => Promise<void>;
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
  pipelines: [],
  activePipelineId: null,
  
  getActivePipeline: () => {
    const { pipelines, activePipelineId } = get();
    return pipelines.find(p => p.id === activePipelineId);
  },
  
  createPipeline: (name) => {
    const id = crypto.randomUUID();
    const newPipeline: Pipeline = {
      id,
      name,
      description: '',
      status: 'draft',
      workspaceId: '',
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentVersionIndex: 0,
      versions: [],
      nodes: [],
      edges: []
    };
    set(state => ({ pipelines: [...state.pipelines, newPipeline], activePipelineId: id, saveStatus: 'unsaved' }));
    return id;
  },
  
  deletePipeline: async (id) => {
    set(state => ({
      pipelines: state.pipelines.filter(p => p.id !== id),
      activePipelineId: state.activePipelineId === id ? null : state.activePipelineId
    }));
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.from('pipelines').delete().eq('id', id);
    } catch (e) {
      console.error('Failed to delete pipeline', e);
    }
  },
  
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
  
  startTestRun: async (pipelineId) => {
    const pipeline = get().pipelines.find(p => p.id === pipelineId);
    if (!pipeline || pipeline.nodes.length === 0) return;
    
    get().stopRun();
    
    const startTime = Date.now();
    
    set({ isRunning: true, runningPipelineId: pipelineId, _runTimers: [] });
    get().setNodes(pipelineId, pipeline.nodes.map(n => ({
      ...n, data: { ...n.data, runStatus: 'queued', runProgress: 0, rowsProcessed: 0 } as PipelineNodeData
    })));
    get().setEdges(pipelineId, setAllEdgesStatus(pipeline.edges, 'queued'));
    
    // Set initial stats
    set({
      runStats: {
        totalRows: 0, processedRows: 0, failedRows: 0,
        throughput: 0, latency: 0,
        startTime, elapsedMs: 0,
        nodesCompleted: 0, nodesTotal: pipeline.nodes.length,
        currentNodeId: null, errorNodeId: null, errorMessage: null,
      }
    });

    let processedRows = 0;
    let completedNodes = 0;

    await executePipelineLocal(pipeline.nodes, pipeline.edges, (nodeId, outputData, error) => {
      const p = get().pipelines.find(pp => pp.id === pipelineId);
      if (!p) return;
      if (error) {
        get().updateNode(pipelineId, nodeId, { runStatus: 'failed' });
      } else {
        processedRows += outputData.length;
        completedNodes++;
        const elapsed = Date.now() - startTime;
        
        get().updateNode(pipelineId, nodeId, { 
          runStatus: 'success', 
          runProgress: 100,
          rowsProcessed: outputData.length,
          previewData: outputData 
        });
        
        get().setEdges(pipelineId, setEdgeStatus(p.edges, nodeId, 'success', Math.round(outputData.length / 0.4)));

        set(state => ({
          runStats: state.runStats ? {
            ...state.runStats,
            processedRows,
            totalRows: Math.max(state.runStats.totalRows, outputData.length),
            throughput: elapsed > 0 ? Math.round(processedRows / (elapsed / 1000)) : 0,
            elapsedMs: elapsed,
            nodesCompleted: completedNodes,
            currentNodeId: nodeId
          } : null
        }));
      }
    });

    const elapsed = Date.now() - startTime;
    get().addRun({
      id: `r-${Date.now()}`, pipelineId, pipelineName: pipeline.name,
      status: 'success', trigger: 'manual',
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      duration: Math.round(elapsed / 1000),
      rowsIn: processedRows, rowsOut: processedRows, nodeResults: []
    });

    setTimeout(() => {
      set({ isRunning: false, runningPipelineId: null });
    }, 1500);
  },
  
  startRun: (pipelineId) => get().startTestRun(pipelineId),
  
  runs: [],
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
  setSaveStatus: (s) => set({ saveStatus: s }),

  savePipeline: async (id) => {
    const pipeline = get().pipelines.find(p => p.id === id);
    if (!pipeline) return;
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Not authenticated');

      // We need to fetch the org_id if not present
      let orgId = pipeline.org_id;
      if (!orgId) {
        const { data } = await supabase.from('users').select('org_id').eq('id', userData.user.id).single();
        if (data) orgId = data.org_id;
      }

      if (!orgId) throw new Error('No org_id found');

      const payload = {
        id: pipeline.id,
        org_id: orgId,
        name: pipeline.name,
        nodes: pipeline.nodes,
        edges: pipeline.edges,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('pipelines')
        .upsert(payload, { onConflict: 'id' });
        
      if (error) throw error;
      set({ saveStatus: 'saved' });
    } catch (e) {
      console.error('Failed to save pipeline to Supabase', e);
      set({ saveStatus: 'unsaved' });
    }
  },
  
  loadAllPipelines: async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return;
      
      const loadedPipelines: Pipeline[] = data.map((row: any) => ({
        id: row.id,
        org_id: row.org_id,
        name: row.name,
        description: '', // Can add to DB schema later if needed
        status: 'draft',
        workspaceId: row.org_id,
        createdBy: row.created_by || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        currentVersionIndex: 0,
        versions: [],
        nodes: row.nodes || [],
        edges: row.edges || []
      }));
      
      set({ 
        pipelines: loadedPipelines, 
        activePipelineId: loadedPipelines.length > 0 ? loadedPipelines[0].id : null 
      });
    } catch (e) {
      console.error('Failed to load pipelines from Supabase', e);
    }
  }
}));
