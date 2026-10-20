import React, { useEffect } from 'react';
import PipelineCanvas from '../components/canvas/PipelineCanvas';
import NodePalette from '../components/canvas/NodePalette';
import ConfigPanel from '../components/canvas/ConfigPanel';
import RunControlPanel from '../components/canvas/RunControlPanel';
import AIChat from '../components/AIChat';
import { usePipelineStore } from '../store/pipeline-store';
import { useUIStore } from '../store/ui-store';
import {
  Play, Square, Save, History, Settings, MousePointer2,
  Layers, Cpu, Radio, Code, X, Copy, Sparkles
} from 'lucide-react';
import { generatePySparkCode } from '../utils/code-generator';
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
    setSaveStatus,
    savePipeline
  } = usePipelineStore();

  const {
    selectedNodeId,
    setSelectedNodeId,
    configPanelOpen,
    setConfigPanelOpen
  } = useUIStore();

  const [exportCodeOpen, setExportCodeOpen] = React.useState(false);
  const [aiChatOpen, setAiChatOpen] = React.useState(false);

  const pipeline = getActivePipeline();

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (pipeline && canRedo(pipeline.id)) redo(pipeline.id);
        } else {
          if (pipeline && canUndo(pipeline.id)) undo(pipeline.id);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (pipeline && canRedo(pipeline.id)) redo(pipeline.id);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setAiChatOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pipeline, canUndo, canRedo, undo, redo]);

  // Auto-save
  useEffect(() => {
    if (saveStatus === 'unsaved' && pipeline) {
      const timer = setTimeout(async () => {
        setSaveStatus('saving');
        await savePipeline(pipeline.id);
        setSaveStatus('saved');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, setSaveStatus, savePipeline, pipeline?.id]);

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
  };

  const handleCopyCode = () => {
    const code = generatePySparkCode(pipeline.name, pipeline.nodes, pipeline.edges);
    navigator.clipboard.writeText(code);
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    usePipelineStore.getState().removeNode(pipeline.id, selectedNodeId);
    usePipelineStore.getState().takeSnapshot(pipeline.id);
    setSelectedNodeId(null);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      {/* Editor Toolbar */}
      <div className="h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 select-none z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            {pipeline.name}
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
              pipeline.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
              pipeline.status === 'paused' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {pipeline.status}
            </span>
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {saveStatus === 'saving' && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Saving...</span>}
            {saveStatus === 'saved' && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Saved to cloud</span>}
            {saveStatus === 'unsaved' && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Unsaved changes</span>}
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

          <button
            onClick={() => setAiChatOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              aiChatOpen
                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="AI Pipeline Designer (⌘J)"
          >
            <Sparkles size={14} />
            AI Design
          </button>
          <button onClick={() => setExportCodeOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Code size={14} />
            Export Code
          </button>
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
        
        <div className="flex-1 relative min-w-0">
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
          <div className="border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0 animate-slide-in-right z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] overflow-hidden">
            <ConfigPanel
              nodeId={selectedNode.id}
              nodeData={selectedNode.data}
              onUpdate={handleUpdateNode}
              onDelete={handleDeleteNode}
              onClose={() => setConfigPanelOpen(false)}
            />
          </div>
        )}
      </div>

      {exportCodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-[800px] max-w-[90vw] max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:white flex items-center gap-2">
                <Code size={18} className="text-blue-500" />
                Export PySpark Code
              </h2>
              <button onClick={() => setExportCodeOpen(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950/50">
              <pre className="text-sm text-slate-800 dark:text-slate-300 font-mono w-full overflow-x-auto whitespace-pre-wrap selection:bg-blue-200 dark:selection:bg-blue-900/50">
                {generatePySparkCode(pipeline.name, pipeline.nodes, pipeline.edges)}
              </pre>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
              <button 
                onClick={() => setExportCodeOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
              <button 
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                <Copy size={16} />
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      <AIChat open={aiChatOpen} onClose={() => setAiChatOpen(false)} />
    </div>
  );
}
