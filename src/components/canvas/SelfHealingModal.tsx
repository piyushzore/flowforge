import React, { useState, useEffect } from 'react';
import {
  Stethoscope, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, Code2, Sparkles, RefreshCw, X, Play,
  Zap, Copy, Check, Eye
} from 'lucide-react';
import type { DriftIncident } from '../../engine/drift-detector';
import { synthesizeHealingPatch, type HealedSolution } from '../../lib/ai-healer';
import { usePipelineStore } from '../../store/pipeline-store';

interface SelfHealingModalProps {
  open: boolean;
  onClose: () => void;
  incident: DriftIncident | null;
  pipelineId: string;
}

export default function SelfHealingModal({
  open,
  onClose,
  incident,
  pipelineId
}: SelfHealingModalProps) {
  const [solution, setSolution] = useState<HealedSolution | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editedCode, setEditedCode] = useState<string>('');
  
  const { applyHealedPatch, autonomousHealing, toggleAutonomousHealing } = usePipelineStore();

  useEffect(() => {
    if (open && incident) {
      setIsSynthesizing(true);
      synthesizeHealingPatch(incident, incident.sampleProblemRows || [])
        .then(sol => {
          setSolution(sol);
          setEditedCode(sol.patchCode);
        })
        .finally(() => setIsSynthesizing(false));
    } else {
      setSolution(null);
    }
  }, [open, incident]);

  if (!open || !incident) return null;

  const handleApply = () => {
    if (!solution) return;
    const patch = editedCode || solution.patchCode;
    applyHealedPatch(pipelineId, incident.nodeId, patch);
    onClose();
  };

  const handleCopyCode = () => {
    const code = editedCode || solution?.patchCode || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/20 overflow-hidden">
        
        {/* Header with Glowing Medical/AI Aura */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 via-white to-amber-50 dark:from-purple-950/40 dark:via-slate-900 dark:to-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-purple-600 rounded-xl text-white shadow-md shadow-purple-500/20 animate-pulse">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Autonomous Self-Healing Inspector
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <Sparkles size={10} />
                  AI Auto-Remediation
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drift caught on node: <span className="font-semibold text-slate-700 dark:text-slate-200">{incident.nodeName}</span> &bull; {incident.anomalies.length} anomal{incident.anomalies.length > 1 ? 'ies' : 'y'} detected
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* AI Root Cause Diagnosis Card */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Root Cause Diagnosis
                  </span>
                  {solution && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={12} />
                      {Math.round((solution.confidence || 0.95) * 100)}% Confidence Match
                    </span>
                  )}
                </div>
                {isSynthesizing ? (
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <RefreshCw size={13} className="animate-spin text-purple-500" />
                    <span>Synthesizing Groq AI remediation patch...</span>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {solution?.diagnosis || 'Schema drift detected in upstream records.'}
                  </p>
                )}
                
                {/* Anomalies List */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {incident.anomalies.map((a, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 rounded-md text-[11px] bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/80 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="font-semibold">{a.field}:</span>
                      <span className="text-slate-500 dark:text-slate-400">{a.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Visual Diff: Raw Problem Data vs Healed Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Eye size={14} className="text-purple-500" />
                Live In-Flight Visual Diff
              </h3>
              <span className="text-[11px] text-slate-400">
                Preview of first {solution?.sampleBefore?.length || 2} affected rows
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Raw Drift Data */}
              <div className="border border-red-200 dark:border-red-900/40 rounded-xl overflow-hidden bg-red-50/20 dark:bg-red-950/10">
                <div className="px-3.5 py-2 bg-red-100/60 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Incoming Raw Data (Broken)
                  </span>
                  <span className="text-[10px] text-red-600 dark:text-red-400 font-mono">Contract Violation</span>
                </div>
                <div className="p-3 text-[11px] font-mono overflow-x-auto space-y-2">
                  {(solution?.sampleBefore || incident.sampleProblemRows || []).slice(0, 2).map((row, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
                      {Object.entries(row).map(([k, v]) => {
                        const isProblemField = incident.anomalies.some(a => a.field === k || a.suggestedAlias === k);
                        return (
                          <div key={k} className={`flex justify-between gap-4 py-0.5 ${isProblemField ? 'text-red-600 dark:text-red-400 font-semibold bg-red-50/80 dark:bg-red-950/30 px-1 rounded' : 'text-slate-600 dark:text-slate-400'}`}>
                            <span className="shrink-0">{k}:</span>
                            <span className="truncate">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Auto-Healed Data */}
              <div className="border border-emerald-200 dark:border-emerald-900/40 rounded-xl overflow-hidden bg-emerald-50/20 dark:bg-emerald-950/10">
                <div className="px-3.5 py-2 bg-emerald-100/60 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Simulated Healed Data (Ready)
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.2 rounded">
                    Contract Satisfied
                  </span>
                </div>
                <div className="p-3 text-[11px] font-mono overflow-x-auto space-y-2">
                  {(solution?.sampleAfter || []).slice(0, 2).map((row, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-850 border border-emerald-200/60 dark:border-emerald-900/30 space-y-1 shadow-sm">
                      {Object.entries(row).map(([k, v]) => {
                        const isHealedField = incident.anomalies.some(a => a.field === k);
                        return (
                          <div key={k} className={`flex justify-between gap-4 py-0.5 ${isHealedField ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded' : 'text-slate-600 dark:text-slate-400'}`}>
                            <span className="shrink-0 flex items-center gap-1">
                              {isHealedField && <span className="text-[9px] text-emerald-500">✓</span>}
                              {k}:
                            </span>
                            <span className="truncate">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Code Inspection Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCode(!showCode)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code2 size={14} className="text-purple-500" />
                <span>View Generated In-Flight JavaScript Shim</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {showCode ? 'Hide Code ▲' : 'Show Code ▼'}
              </span>
            </button>
            
            {showCode && (
              <div className="p-4 bg-slate-900 text-slate-200 text-xs font-mono relative">
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors border border-slate-700"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Shim'}</span>
                  </button>
                </div>
                <textarea
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                  rows={8}
                  className="w-full bg-transparent font-mono text-xs text-purple-300 focus:outline-none resize-none"
                  spellCheck={false}
                />
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autonomousHealing}
              onChange={toggleAutonomousHealing}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-700"
            />
            <span>Enable <strong>Autonomous Mode</strong> for this workspace (zero-touch auto-patch)</span>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleApply}
              disabled={isSynthesizing || !solution}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Zap size={14} className="fill-white" />
              <span>Approve & Heal Pipeline</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
