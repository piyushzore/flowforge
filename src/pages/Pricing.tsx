import React, { useState } from 'react';
import { Check, Zap, Sparkles, Shield, ArrowRight, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const TIERS = [
  {
    name: 'Starter',
    id: 'starter',
    priceMonthly: 0,
    priceAnnual: 0,
    desc: 'For individual data engineers and hobbyists getting started.',
    badge: 'Free Forever',
    features: [
      'Up to 3 Active Pipelines',
      '1,000 Rows processed / run',
      'AI Pipeline Designer (50 prompts/mo)',
      'Community Connectors (Sheets, Postgres, CSV)',
      'Basic Email Alerts',
      'Community Support',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    name: 'Pro',
    id: 'pro',
    priceMonthly: 79,
    priceAnnual: 59,
    desc: 'For fast-moving data teams who need production scale and AI superpowers.',
    badge: 'Most Popular',
    features: [
      'Unlimited Active Pipelines',
      '10 Million Rows / month',
      'Unlimited AI Pipeline Prompts (Llama 3.3 & GPT-OSS)',
      '35+ Enterprise Connectors (Snowflake, BigQuery, Salesforce, S3)',
      'Data Lineage & Column Profiling',
      'SLA Breach Alerts (Slack & Webhooks)',
      'Automated Cron Schedules (pg_cron)',
      'Priority Email & Chat Support',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    priceMonthly: 299,
    priceAnnual: 249,
    desc: 'For organizations with strict security, custom connectors, and dedicated SLAs.',
    badge: 'Custom & Scalable',
    features: [
      'Everything in Pro, plus:',
      'Unlimited Row Volume & Concurrency',
      'Self-Hosted / Hybrid Edge Executors',
      'Custom Connectors & SSO / SAML',
      '99.99% Uptime SLA Guarantee',
      'Audit Logs & Role-Based Access Control (RBAC)',
      'Dedicated Solutions Engineer',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [upgradedTier, setUpgradedTier] = useState<string | null>(null);

  const handleSelectTier = (tierId: string) => {
    setUpgradedTier(tierId);
    setTimeout(() => {
      alert(`Success! You have selected the ${tierId.toUpperCase()} plan. Checkout simulation completed.`);
      setUpgradedTier(null);
    }, 400);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
          <Sparkles size={13} /> Transparent, Value-Driven Pricing
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Replace 4 Tools with One Unified Platform
        </h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          FlowForge replaces Airflow ($300/mo), Fivetran ($1,200/mo), dbt Cloud ($200/mo), and Great Expectations. Start free, upgrade when you scale.
        </p>

        {/* Monthly / Annual toggle */}
        <div className="mt-6 inline-flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setAnnual(false)}
            className={`px-3 py-1.5 rounded-lg transition-all ${!annual ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${annual ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded-full">Save 25%</span>
          </button>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
        {TIERS.map(tier => {
          const price = annual ? tier.priceAnnual : tier.priceMonthly;
          return (
            <div
              key={tier.id}
              className={`rounded-2xl p-7 flex flex-col relative transition-all duration-200 ${
                tier.highlighted
                  ? 'bg-white dark:bg-slate-900 border-2 border-blue-600 shadow-xl shadow-blue-500/10'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                  {tier.badge}
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{tier.desc}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${price}</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>
                {annual && price > 0 && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">Billed annually (${price * 12}/yr)</p>
                )}
              </div>

              {/* Feature checklist */}
              <ul className="space-y-3 flex-1 mb-6 text-xs text-slate-600 dark:text-slate-300">
                {tier.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectTier(tier.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  tier.highlighted
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {upgradedTier === tier.id ? 'Processing...' : tier.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 text-center">
          Compare Traditional Data Stack vs FlowForge
        </h2>
        <p className="text-xs text-slate-500 text-center mb-6">See why teams switch from multi-vendor fragmentation to FlowForge</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-3 font-semibold">Capability</th>
                <th className="pb-3 font-semibold">Traditional Stack</th>
                <th className="pb-3 font-semibold text-blue-600">FlowForge Platform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 font-medium">Orchestration & Scheduling</td>
                <td className="py-3 text-slate-400">Apache Airflow ($300+/mo)</td>
                <td className="py-3 font-semibold text-emerald-600 flex items-center gap-1.5"><Check size={13} /> Built-in Visual DAG + pg_cron</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Data Ingestion (35+ Sources)</td>
                <td className="py-3 text-slate-400">Fivetran ($1,000+/mo)</td>
                <td className="py-3 font-semibold text-emerald-600 flex items-center gap-1.5"><Check size={13} /> Included with Live Schema Sync</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Transformations & Modeling</td>
                <td className="py-3 text-slate-400">dbt Cloud ($200+/mo)</td>
                <td className="py-3 font-semibold text-emerald-600 flex items-center gap-1.5"><Check size={13} /> Visual Transforms + AI Prompts (⌘J)</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Data Quality & Profiling</td>
                <td className="py-3 text-slate-400">Great Expectations / Monte Carlo</td>
                <td className="py-3 font-semibold text-emerald-600 flex items-center gap-1.5"><Check size={13} /> Built-in 0–100 Column Quality Scores</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Data Lineage Tracing</td>
                <td className="py-3 text-slate-400">DataHub / Atlan ($$$)</td>
                <td className="py-3 font-semibold text-emerald-600 flex items-center gap-1.5"><Check size={13} /> Interactive Cross-Pipeline Lineage Graph</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
