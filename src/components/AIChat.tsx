import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Sparkles, Loader2, CheckCircle2, AlertCircle, ChevronDown, Wand2 } from 'lucide-react';
import { usePipelineStore } from '../store/pipeline-store';
import { useUIStore } from '../store/ui-store';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'loading' | 'success' | 'error';
  pipelineGenerated?: boolean;
}

const SUGGESTIONS = [
  'Load Salesforce contacts, deduplicate by email, push to BigQuery',
  'Fetch orders from Postgres, filter last 30 days, aggregate by product, export CSV',
  'Sync Stripe payments to Snowflake with SCD Type 2 history tracking',
  'Pull GA4 events, filter by event type, pivot by date, load to Redshift',
  'Read S3 CSV files, validate schema, clean nulls, write to BigQuery',
];

interface AIChatProps {
  open: boolean;
  onClose: () => void;
}

export default function AIChat({ open, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 Hi! I\'m your AI pipeline designer. Describe any data pipeline in plain English and I\'ll build it for you instantly.\n\nTry something like: *"Load Salesforce leads, deduplicate by email, and push to BigQuery"*',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { activePipelineId, pipelines, setNodes, setEdges, addNode, addEdge } = usePipelineStore();
  const { setSelectedNodeId } = useUIStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = useCallback(async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || isLoading) return;

    setInput('');
    const userMsgId = `u-${Date.now()}`;
    const asstMsgId = `a-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: prompt },
      { id: asstMsgId, role: 'assistant', content: '', status: 'loading' },
    ]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-pipeline', {
        body: { prompt },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Failed to generate pipeline');
      }

      const { nodes, edges, message } = data;

      // Add nodes and edges to active pipeline
      if (activePipelineId && nodes?.length) {
        // Replace existing pipeline or add to it
        const pipeline = pipelines.find(p => p.id === activePipelineId);
        if (pipeline && pipeline.nodes.length === 0) {
          // Empty canvas — set directly
          setNodes(activePipelineId, nodes);
          setEdges(activePipelineId, edges);
        } else {
          // Canvas has nodes — offset new nodes and append
          const offsetX = pipeline ? Math.max(...pipeline.nodes.map(n => n.position.x), 0) + 400 : 0;
          const offsetNodes = nodes.map((n: any) => ({
            ...n,
            id: `gen-${Date.now()}-${n.id}`,
            position: { x: n.position.x + offsetX, y: n.position.y },
          }));
          const idMap: Record<string, string> = {};
          nodes.forEach((n: any, i: number) => { idMap[n.id] = offsetNodes[i].id; });
          const offsetEdges = edges.map((e: any, i: number) => ({
            ...e,
            id: `gen-edge-${Date.now()}-${i}`,
            source: idMap[e.source] || e.source,
            target: idMap[e.target] || e.target,
          }));
          offsetNodes.forEach((n: any) => addNode(activePipelineId, n));
          offsetEdges.forEach((e: any) => addEdge(activePipelineId, e));
        }
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === asstMsgId
            ? {
                ...m,
                content: `✅ ${message || 'Pipeline generated!'}\n\n**${nodes.length} nodes created:**\n${nodes.map((n: any) => `• **${n.data.label}** — ${n.data.description || n.data.subType}`).join('\n')}\n\nNodes are now on your canvas. Click any node to configure it.`,
                status: 'success',
                pipelineGenerated: true,
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === asstMsgId
            ? {
                ...m,
                content: `❌ ${err.message || 'Something went wrong. Please try again.'}`,
                status: 'error',
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activePipelineId, pipelines, setNodes, setEdges, addNode, addEdge]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 w-[420px] max-h-[600px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-violet-600 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Pipeline Designer</h3>
            <p className="text-[10px] text-blue-200">Powered by Groq · Llama 3.3 70B</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
        >
          <X size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 max-h-[400px]">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mr-2 mt-1 shrink-0">
                <Bot size={12} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
              }`}
            >
              {msg.status === 'loading' ? (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Designing your pipeline...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">
                  {msg.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <strong key={i} className="block font-semibold">{line.slice(2, -2)}</strong>;
                    }
                    if (line.startsWith('• **') && line.includes('**')) {
                      const boldEnd = line.indexOf('**', 4);
                      const bold = line.slice(4, boldEnd);
                      const rest = line.slice(boldEnd + 2);
                      return <span key={i} className="block">• <strong>{bold}</strong>{rest}</span>;
                    }
                    if (line.startsWith('*') && line.endsWith('*') && line.length > 2) {
                      return <em key={i} className="block text-slate-600 dark:text-slate-400">{line.slice(1, -1)}</em>;
                    }
                    return <span key={i} className="block">{line}</span>;
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Try an example:</p>
          <div className="flex flex-col gap-1">
            {SUGGESTIONS.slice(0, 3).map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-left text-[11px] text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors truncate"
              >
                ✦ {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your data pipeline..."
            rows={2}
            className="flex-1 text-[12px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm"
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">⏎ Enter to send · Shift+⏎ for new line · ⌘J to toggle</p>
      </div>
    </div>
  );
}
