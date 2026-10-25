import React, { useEffect } from 'react';
import PipelineCanvas from '../components/canvas/PipelineCanvas';
import NodePalette from '../components/canvas/NodePalette';
import ConfigPanel from '../components/canvas/ConfigPanel';
import RunControlPanel from '../components/canvas/RunControlPanel';
import AIChat from '../components/AIChat';
import SelfHealingModal from '../components/canvas/SelfHealingModal';
import WebhookApiModal from '../components/canvas/WebhookApiModal';
import { usePipelineStore } from '../store/pipeline-store';
import { useUIStore } from '../store/ui-store';
import {
  Play, Square, Save, History, Settings, MousePointer2,
  Layers, Cpu, Radio, Code, X, Copy, Sparkles, FileText, FileDown, Upload,
  Stethoscope, Zap, Globe, SlidersHorizontal
} from 'lucide-react';
import { generatePySparkCode } from '../utils/code-generator';
import { exportPipelineToYaml, downloadPipelineYaml, importPipelineFromYaml } from '../utils/pipeline-yaml';
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
    savePipeline,
    activeDriftIncident,
    setActiveDriftIncident,
    autonomousHealing,
    toggleAutonomousHealing,
    simulateDriftOnPipeline
  } = usePipelineStore();

  const {
    selectedNodeId,
    setSelectedNodeId,
    configPanelOpen,
    setConfigPanelOpen
  } = useUIStore();

  const [exportCodeOpen, setExportCodeOpen] = React.useState(false);
  const [aiChatOpen, setAiChatOpen] = React.useState(false);
  const [yamlModalOpen, setYamlModalOpen] = React.useState(false);
  const [yamlMode, setYamlMode] = React.useState<'export' | 'import'>('export');
  const [yamlInput, setYamlInput] = React.useState('');
  const [webhookModalOpen, setWebhookModalOpen] = React.useState(false);
  const [selfHealingModalOpen, setSelfHealingModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (activeDriftIncident) {
      setSelfHealingModalOpen(true);
    }
  }, [activeDriftIncident]);

  // Dynamic & Auto-Adjustable Configuration Panel state
  const [panelWidth, setPanelWidth] = React.useState<number>(() => {
    const saved = localStorage.getItem('flowforge_config_width');
    const parsed = saved ? parseInt(saved, 10) : 380;
    const maxAllowed = Math.min(460, Math.max(320, Math.floor(window.innerWidth * 0.4)));
    return Math.min(Math.max(parsed, 320), maxAllowed);
  });
  const [panelMode, setPanelMode] = React.useState<'docked' | 'overlay'>(() => {
    const saved = localStorage.getItem('flowforge_config_mode') as 'docked' | 'overlay';
    if (saved && (saved === 'docked' || saved === 'overlay')) {
      if (window.innerWidth < 1440 && saved === 'docked') return 'overlay';
      return saved;
    }
    return window.innerWidth < 1440 ? 'overlay' : 'docked';
  });
  const [isResizing, setIsResizing] = React.useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const maxAllowed = Math.min(500, Math.max(340, Math.floor(window.innerWidth * 0.45)));
      const newWidth = Math.min(Math.max(startWidth + delta, 300), maxAllowed);
      setPanelWidth(newWidth);
      localStorage.setItem('flowforge_config_width', String(newWidth));
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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
    <div className="h-full w-full min-w-0 flex flex-col overflow-hidden relative">
      {/* Editor Toolbar */}
      <div className="h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 select-none z-10 shrink-0 w-full min-w-0 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-2.5 shrink-0">
          <h1 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 max-w-[200px] truncate" title={pipeline.name}>
            <span className="truncate">{pipeline.name}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase shrink-0 ${
              pipeline.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
              pipeline.status === 'paused' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {pipeline.status}
            </span>
          </h1>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            {saveStatus === 'saving' && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Saving...</span>}
            {saveStatus === 'saved' && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Saved</span>}
            {saveStatus === 'unsaved' && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Unsaved</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 mr-1 shrink-0">
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold rounded-lg transition-all shrink-0 ${
              aiChatOpen
                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="AI Pipeline Designer (⌘J)"
          >
            <Sparkles size={14} />
            <span className="hidden xl:inline">AI Design</span>
          </button>

          <button onClick={() => setExportCodeOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0" title="Export PySpark Code">
            <Code size={14} />
            <span className="hidden xl:inline">Export Code</span>
          </button>

          <button onClick={() => { setYamlMode('export'); setYamlModalOpen(true); }} className="flex items-center gap-1 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0" title="Export / Import YAML">
            <FileText size={14} />
            <span className="hidden lg:inline">YAML</span>
          </button>

          <button
            onClick={() => setWebhookModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors border border-blue-200/60 dark:border-blue-800/60 shrink-0"
            title="Deploy as live REST API & Webhook endpoint"
          >
            <Globe size={14} />
            <span className="hidden md:inline">API</span>
          </button>

          <button className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0">
            <History size={14} />
            Versions
          </button>

          <button className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0">
            <Settings size={14} />
            Settings
          </button>

          <button
            onClick={() => {
              if (!configPanelOpen) {
                if (!selectedNodeId && pipeline.nodes.length > 0) {
                  setSelectedNodeId(pipeline.nodes[0].id);
                }
                setConfigPanelOpen(true);
              } else {
                setConfigPanelOpen(false);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold rounded-lg transition-colors border shrink-0 ${
              configPanelOpen
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200'
            }`}
            title="Toggle Node Configuration Panel"
          >
            <SlidersHorizontal size={14} className={configPanelOpen ? 'text-blue-500' : ''} />
            <span className="hidden sm:inline">Configure</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {/* Autonomous Healing Toggle */}
          <button
            onClick={toggleAutonomousHealing}
            className={`flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition-all shrink-0 ${
              autonomousHealing
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
            title="Auto-apply AI patches without pausing (Enterprise Zero-Downtime)"
          >
            <Stethoscope size={13} className={autonomousHealing ? 'text-purple-600 animate-pulse' : ''} />
            <span>Auto-Heal: {autonomousHealing ? 'ON' : 'OFF'}</span>
          </button>

          {/* Simulate Drift Button */}
          <button
            onClick={() => {
              simulateDriftOnPipeline(pipeline.id);
              setSelfHealingModalOpen(true);
            }}
            disabled={isRunning || pipeline.nodes.length === 0}
            className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Inject corrupted schema (renamed column + '$' currency string) to test self-healing"
          >
            <Sparkles size={12} className="text-amber-500" />
            <span className="hidden lg:inline">Simulate Drift</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {/* Processing Mode Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 shrink-0">
            {(['batch', 'micro-batch', 'stream'] as ProcessingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setProcessingMode(mode)}
                disabled={isRunning}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                  processingMode === mode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-40'
                }`}
                title={mode === 'batch' ? 'Process all data at once' : mode === 'micro-batch' ? 'Fast small batches' : 'Continuous real-time processing'}
              >
                {modeIcons[mode]}
                <span className="hidden xl:inline">{modeLabels[mode]}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

          {isRunning ? (
            <button
              onClick={stopRun}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-red-50 dark:bg-red-950 text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-all shadow-sm shrink-0"
            >
              <Square size={12} fill="currentColor" />
              Stop
            </button>
          ) : (
            <button 
              onClick={() => startTestRun(pipeline.id)}
              disabled={pipeline.nodes.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm hover:shadow shrink-0"
            >
              <Play size={14} />
              {processingMode === 'stream' ? 'Stream' : 'Run'}
            </button>
          )}

          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-all shadow-sm hover:shadow shrink-0">
            <Save size={14} />
            <span className="hidden sm:inline">Activate</span>
          </button>
        </div>
      </div>

      {/* Self-Healing Drift Alert Banner */}
      {activeDriftIncident && (
        <div className="bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-amber-500/15 border-b border-amber-300 dark:border-amber-700/60 px-4 py-2 flex items-center justify-between text-xs z-20 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <div className="p-1 bg-amber-500 text-white rounded-md animate-pulse">
              <Stethoscope size={13} />
            </div>
            <span>
              <strong>Schema Drift Detected</strong> on node <span className="font-mono underline font-bold">{activeDriftIncident.nodeName}</span> ({activeDriftIncident.anomalies.length} anomal{activeDriftIncident.anomalies.length > 1 ? 'ies' : 'y'}). Pipeline paused safely without crashing.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveDriftIncident(null)}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[11px]"
            >
              Dismiss
            </button>
            <button
              onClick={() => setSelfHealingModalOpen(true)} 
              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-sm text-[11px] cursor-pointer"
            >
              <Zap size={11} className="fill-white" />
              Review & Auto-Heal
            </button>
          </div>
        </div>
      )}

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden relative min-w-0 w-full h-full">
        <NodePalette className="z-10 shrink-0" />
        
        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
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

          {/* Persistent Right Edge Configure Button (When panel is closed) */}
          {!configPanelOpen && (
            <button
              onClick={() => {
                if (!selectedNodeId && pipeline.nodes.length > 0) {
                  setSelectedNodeId(pipeline.nodes[0].id);
                }
                setConfigPanelOpen(true);
              }}
              className="absolute right-0 top-1/3 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 py-3 px-1.5 bg-white dark:bg-slate-900 border-l border-y border-slate-200 dark:border-slate-700 rounded-l-xl shadow-xl hover:bg-blue-50 dark:hover:bg-slate-850 hover:text-blue-600 transition-all cursor-pointer group"
              title="Open Node Configuration Panel"
            >
              <Settings size={15} className="text-blue-500 group-hover:rotate-45 transition-transform" />
              <span className="[writing-mode:vertical-rl] text-[10px] font-bold tracking-wider uppercase text-slate-500 group-hover:text-blue-600">
                Configure
              </span>
            </button>
          )}
        </div>

        {/* Dynamic & Auto-Adjustable Configuration Drawer */}
        {configPanelOpen && (
          <aside
            style={{ width: `${panelWidth}px` }}
            className={`${
              panelMode === 'overlay'
                ? 'absolute right-0 top-0 bottom-0 z-30 shadow-2xl'
                : 'relative flex-shrink-0'
            } h-full max-w-[calc(100vw-80px)] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col transition-all duration-75 select-none overflow-hidden`}
          >
            {/* Left Edge Drag Handle to Resize Width */}
            <div
              onMouseDown={startResizing}
              className={`absolute -left-1 top-0 bottom-0 w-3 cursor-col-resize z-40 flex items-center justify-center hover:bg-blue-500/20 group transition-colors ${
                isResizing ? 'bg-blue-500/30' : ''
              }`}
              title="Drag to resize panel width"
            >
              <div className="w-1 h-8 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500" />
            </div>

            {/* Quick Panel Mode Toolbar */}
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0 gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 min-w-0 truncate">
                <SlidersHorizontal size={12} className="text-blue-500 shrink-0" />
                <span className="truncate">Configure ({panelWidth}px)</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    const next = panelMode === 'docked' ? 'overlay' : 'docked';
                    setPanelMode(next);
                    localStorage.setItem('flowforge_config_mode', next);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-blue-600 transition-colors"
                  title={panelMode === 'docked' ? 'Switch to Float Overlay' : 'Switch to Docked side-by-side'}
                >
                  {panelMode === 'docked' ? 'Float Overlay' : 'Docked'}
                </button>
                <button
                  onClick={() => setConfigPanelOpen(false)}
                  className="p-1 hover:text-slate-800 dark:hover:text-slate-200 rounded"
                  title="Close Panel"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Content: Selected Node or Node Picker */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {selectedNode ? (
                <ConfigPanel
                  nodeId={selectedNode.id}
                  nodeData={selectedNode.data}
                  onUpdate={handleUpdateNode}
                  onDelete={handleDeleteNode}
                  onClose={() => setConfigPanelOpen(false)}
                />
              ) : (
                <div className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto">
                    <SlidersHorizontal size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Select a Node to Configure</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Click any node on the canvas, or pick from this pipeline:
                    </p>
                  </div>
                  <div className="space-y-1.5 text-left max-h-72 overflow-y-auto">
                    {pipeline.nodes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => setSelectedNodeId(n.id)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800 flex items-center justify-between border border-slate-200 dark:border-slate-800 transition-all text-slate-700 dark:text-slate-300"
                      >
                        <span className="font-semibold truncate">{n.data.label}</span>
                        <span className="text-[10px] text-slate-400 capitalize shrink-0 ml-2">{n.data.subType}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
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

      {yamlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-[700px] max-w-[90vw] max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-violet-500" />
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setYamlMode('export')}
                    className={`px-3 py-1 rounded-md transition-all ${yamlMode === 'export' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    Export YAML
                  </button>
                  <button
                    onClick={() => setYamlMode('import')}
                    className={`px-3 py-1 rounded-md transition-all ${yamlMode === 'import' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    Import YAML
                  </button>
                </div>
              </div>
              <button onClick={() => setYamlModalOpen(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950/50">
              {yamlMode === 'export' ? (
                <pre className="text-xs text-slate-800 dark:text-slate-300 font-mono w-full overflow-x-auto whitespace-pre-wrap">
                  {exportPipelineToYaml(pipeline)}
                </pre>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Paste your pipeline YAML below to replace the current canvas:</p>
                  <textarea
                    rows={14}
                    value={yamlInput}
                    onChange={(e) => setYamlInput(e.target.value)}
                    placeholder="name: My Pipeline&#10;nodes:&#10;  - id: n1&#10;    label: Source..."
                    className="w-full text-xs font-mono p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
              <button
                onClick={() => setYamlModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                {yamlMode === 'export' ? (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exportPipelineToYaml(pipeline));
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Copy size={15} /> Copy
                    </button>
                    <button
                      onClick={() => downloadPipelineYaml(pipeline)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm transition-colors"
                    >
                      <FileDown size={15} /> Download YAML
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      if (!yamlInput.trim()) return;
                      try {
                        const parsed = importPipelineFromYaml(yamlInput);
                        usePipelineStore.getState().setNodes(pipeline.id, parsed.nodes);
                        usePipelineStore.getState().setEdges(pipeline.id, parsed.edges);
                        if (parsed.name) usePipelineStore.getState().updatePipeline(pipeline.id, { name: parsed.name });
                        setYamlModalOpen(false);
                      } catch (err: any) {
                        alert('Failed to parse YAML: ' + err.message);
                      }
                    }}
                    disabled={!yamlInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-lg shadow-sm transition-colors"
                  >
                    <Upload size={15} /> Load into Canvas
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      <AIChat open={aiChatOpen} onClose={() => setAiChatOpen(false)} />

      {/* Autonomous Self-Healing Modal */}
      <SelfHealingModal
        open={selfHealingModalOpen && Boolean(activeDriftIncident)}
        onClose={() => setSelfHealingModalOpen(false)}
        incident={activeDriftIncident}
        pipelineId={pipeline.id}
      />

      {/* Pipeline-as-an-API & Webhook Studio */}
      {pipeline && (
        <WebhookApiModal
          open={webhookModalOpen}
          onClose={() => setWebhookModalOpen(false)}
          pipeline={pipeline}
        />
      )}
    </div>
  );
}
