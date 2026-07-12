import React, { useEffect } from 'react';
import PipelineCanvas from '../components/canvas/PipelineCanvas';
import NodePalette from '../components/canvas/NodePalette';
import ConfigPanel from '../components/canvas/ConfigPanel';
import RunControlPanel from '../components/canvas/RunControlPanel';
import { usePipelineStore } from '../store/pipeline-store';
import { useUIStore } from '../store/ui-store';
import {
  Play, Square, Save, History, Settings, MousePointer2,
  Layers, Cpu, Radio
} from 'lucide-react';
import type { ProcessingMode } from '../store/pipeline-store';

const modeIcons: Record<ProcessingMode, React.ReactNode> = {
  batch: <Layers size={13} />,
  'micro-batch': <Cpu size={13} />,
  stream: <Radio size={13} />,
};

const modeLabels: Record<ProcessingMode, string> = {
  batch: 'Batch',
  'micro-batch': 'Micro-Batch',
  stream: 'Stream',
};

export default function PipelineEditor() {
  const {
    getActivePipeline,
    takeSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    startTestRun,
    stopRun,
    isRunning,
    processingMode,
    setProcessingMode,
    saveStatus,
    setSaveStatus
  } = usePipelineStore();

  const {
    selectedNodeId,
    setSelectedNodeId,
    configPanelOpen,
    setConfigPanelOpen
  } = useUIStore();

  const pipeline = getActivePipeline();

  // Simulated auto-save
  useEffect(() => {
    if (saveStatus === 'unsaved') {
      const timer = setTimeout(() => {
        setSaveStatus('saving');
        setTimeout(() => setSaveStatus('saved'), 800);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, setSaveStatus]);

  if (!pipeline) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        No pipeline selected.
      </div>
    );
  }

  const selectedNode = pipeline.nodes.find((n) => n.id === selectedNodeId);

  const handleUpdateNode = (data: Partial<any>) => {
    if (!selectedNodeId) return;
    usePipelineStore.getState().updateNode(pipeline.id, selectedNodeId, data);
    usePipelineStore.getState().takeSnapshot(pipeline.id);
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    usePipelineStore.getState().removeNode(pipeline.id, selectedNodeId);
    usePipelineStore.getState().takeSnapshot(pipeline.id);
    setSelectedNodeId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              {pipeline.name}
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                pipeline.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                pipeline.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {pipeline.status}
              </span>
            </h2>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              {saveStatus === 'saved' && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Saved to cloud</>}
              {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
              {saveStatus === 'unsaved' && <><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Unsaved changes</>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 mr-2">
            <button 
              onClick={() => undo(pipeline.id)} 
              disabled={!canUndo(pipeline.id)}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 rounded-md transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
            </button>
            <button 
              onClick={() => redo(pipeline.id)} 
              disabled={!canRedo(pipeline.id)}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 rounded-md transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
            </button>
          </div>

          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <History size={14} />
            Versions
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Settings size={14} />
            Settings
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>

          {/* Processing Mode Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 mr-1">
            {(['batch', 'micro-batch', 'stream'] as ProcessingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setProcessingMode(mode)}
                disabled={isRunning}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  processingMode === mode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-40'
                }`}
                title={mode === 'batch' ? 'Process all data at once' : mode === 'micro-batch' ? 'Fast small batches' : 'Continuous real-time processing'}
              >
                {modeIcons[mode]}
                {modeLabels[mode]}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
          
          {isRunning ? (
            <button
              onClick={stopRun}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold bg-red-50 dark:bg-red-950 text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-all shadow-sm"
            >
              <Square size={12} fill="currentColor" />
              Stop Run
            </button>
          ) : (
            <button 
              onClick={() => startTestRun(pipeline.id)}
              disabled={pipeline.nodes.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm hover:shadow"
            >
              <Play size={14} />
              {processingMode === 'stream' ? 'Start Stream' : 'Run Pipeline'}
            </button>
          )}
          <button className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-all shadow-sm hover:shadow ml-1">
            <Save size={14} />
            Activate
          </button>
        </div>
      </div>

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden relative">
        <NodePalette className="z-10" />
        
        <div className="flex-1 relative">
          <PipelineCanvas
            nodes={pipeline.nodes}
            edges={pipeline.edges}
            onNodesChange={(nodes) => usePipelineStore.getState().setNodes(pipeline.id, nodes)}
            onEdgesChange={(edges) => usePipelineStore.getState().setEdges(pipeline.id, edges)}
            onNodeSelect={(id) => setSelectedNodeId(id)}
            onSnapshot={() => takeSnapshot(pipeline.id)}
            isRunning={isRunning}
          />

          {/* Floating hint */}
          {!selectedNodeId && !isRunning && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 pointer-events-none text-slate-500 text-[12px]">
              <MousePointer2 size={14} />
              Drag nodes from the left to build your pipeline
            </div>
          )}

          {/* Run Control Panel (overlays canvas bottom) */}
          <RunControlPanel />
        </div>

        {configPanelOpen && selectedNode && (
          <ConfigPanel
            nodeId={selectedNode.id}
            nodeData={selectedNode.data}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onClose={() => setConfigPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
