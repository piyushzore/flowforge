import React, { useState, useEffect } from 'react';
import { X, Sparkles, Database, Layers, Play, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem('flowforge_onboarding_dismissed');
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('flowforge_onboarding_dismissed', 'true');
    setOpen(false);
  };

  if (!open) return null;

  const STEPS = [
    {
      step: 1,
      title: '1. Connect Your Data Sources',
      icon: <Database size={24} className="text-emerald-500" />,
      desc: 'FlowForge connects to Google Sheets, Postgres, Snowflake, BigQuery, S3, Stripe, Salesforce, and 30+ other connectors in seconds.',
      actionText: 'Next: Transform',
    },
    {
      step: 2,
      title: '2. Visual Transformations & AI',
      icon: <Layers size={24} className="text-blue-500" />,
      desc: 'Drag & drop 25+ visual transforms (joins, aggregations, SCD history tracking) or use the AI Designer (⌘J) to construct entire DAGs from plain English.',
      actionText: 'Next: Execute & Monitor',
    },
    {
      step: 3,
      title: '3. Real-Time Execution & Monitoring',
      icon: <Play size={24} className="text-violet-500" />,
      desc: 'Run batch, micro-batch, or stream pipelines with real-time log streaming, data profiling, lineage graphs, and SLA breach monitoring.',
      actionText: 'Get Started with FlowForge 🚀',
    },
  ];

  const current = STEPS[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-[540px] max-w-[90vw] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white relative">
          <button onClick={handleDismiss} className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors">
            <X size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <Sparkles size={22} className="text-white" />
          </div>
          <h2 className="text-xl font-bold">Welcome to FlowForge!</h2>
          <p className="text-xs text-blue-100 mt-1">Your all-in-one visual data engineering platform</p>
        </div>

        {/* Step indicators */}
        <div className="flex px-6 pt-5 gap-2">
          {STEPS.map(s => (
            <div
              key={s.step}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s.step === step
                  ? 'bg-blue-600'
                  : s.step < step
                  ? 'bg-emerald-500'
                  : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {current.icon}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                {current.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {current.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
          <button
            onClick={handleDismiss}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Skip Tour
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (step < STEPS.length) {
                  setStep(s => s + 1);
                } else {
                  handleDismiss();
                  navigate('/pipelines');
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all hover:shadow"
            >
              {current.actionText} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
