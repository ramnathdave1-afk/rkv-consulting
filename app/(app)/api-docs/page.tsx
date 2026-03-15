'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Copy, CheckCircle2, Terminal, Key, Zap, Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/sites',
    description: 'List all sites in your organization',
    params: 'state, vertical, limit, offset',
    response: '{ sites: Site[], meta: { total, limit, offset } }',
  },
  {
    method: 'GET',
    path: '/api/v1/sites/:id',
    description: 'Get a single site with scores',
    params: 'id (path)',
    response: '{ site: Site, scores: SiteScore }',
  },
  {
    method: 'POST',
    path: '/api/v1/sites',
    description: 'Create a new site',
    params: 'name, state, lat, lng, vertical, acreage, target_capacity',
    response: '{ site: Site }',
  },
  {
    method: 'GET',
    path: '/api/v1/scores',
    description: 'Get scoring data across all sites',
    params: 'min_score, vertical, sort_by',
    response: '{ scores: SiteScore[], meta: { total } }',
  },
  {
    method: 'POST',
    path: '/api/v1/feasibility',
    description: 'Run feasibility analysis on a site',
    params: 'site_id',
    response: '{ result: FeasibilityResult }',
  },
  {
    method: 'GET',
    path: '/api/v1/substations',
    description: 'List substations near a location',
    params: 'lat, lng, radius_mi, min_capacity_mw',
    response: '{ substations: Substation[], meta: { total } }',
  },
  {
    method: 'GET',
    path: '/api/v1/market',
    description: 'Get market intelligence for a state',
    params: 'state, metrics',
    response: '{ data: MarketMetric[] }',
  },
];

const codeExamples = {
  curl: `curl -H "Authorization: Bearer mn_live_YOUR_KEY" \\
  "https://meridian-node.vercel.app/api/v1/sites?state=AZ&limit=10"`,
  python: `import requests

API_KEY = "mn_live_YOUR_KEY"
BASE = "https://meridian-node.vercel.app/api/v1"

response = requests.get(
    f"{BASE}/sites",
    headers={"Authorization": f"Bearer {API_KEY}"},
    params={"state": "AZ", "limit": 10}
)

sites = response.json()["sites"]
for site in sites:
    print(f"{site['name']} — Score: {site.get('composite_score', 'N/A')}")`,
  javascript: `const API_KEY = "mn_live_YOUR_KEY";
const BASE = "https://meridian-node.vercel.app/api/v1";

const res = await fetch(\`\${BASE}/sites?state=AZ&limit=10\`, {
  headers: { Authorization: \`Bearer \${API_KEY}\` },
});

const { sites } = await res.json();
sites.forEach(site => {
  console.log(\`\${site.name} — Score: \${site.composite_score ?? "N/A"}\`);
});`,
};

const methodColors: Record<string, string> = {
  GET: '#22C55E',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  DELETE: '#EF4444',
};

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<'curl' | 'python' | 'javascript'>('curl');
  const [copied, setCopied] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">API Documentation</h1>
        <p className="text-sm text-text-secondary">Integrate Meridian Node data into your applications</p>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
            <Globe size={16} className="text-accent" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Base URL</p>
            <p className="text-xs font-mono text-text-primary">/api/v1</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue/10">
            <Key size={16} className="text-blue" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Auth</p>
            <p className="text-xs font-mono text-text-primary">Bearer Token</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10">
            <Zap size={16} className="text-warning" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Rate Limit</p>
            <p className="text-xs font-mono text-text-primary">Per API Key</p>
          </div>
        </div>
      </div>

      {/* Auth Section */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">Authentication</h2>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          All API requests require a Bearer token. Generate API keys from the <a href="/api-keys" className="text-accent hover:underline">API Keys</a> page.
        </p>
        <div className="rounded-lg bg-bg-elevated/50 px-3 py-2 font-mono text-xs text-text-secondary">
          Authorization: Bearer mn_live_YOUR_API_KEY
        </div>
      </div>

      {/* Code Examples */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Code size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Quick Start</h2>
          </div>
          <div className="flex gap-1">
            {(['curl', 'python', 'javascript'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors',
                  activeTab === lang ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary',
                )}
              >
                {lang === 'curl' ? 'cURL' : lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <pre className="p-4 text-xs font-mono text-text-secondary overflow-x-auto leading-relaxed">
            {codeExamples[activeTab]}
          </pre>
          <button
            onClick={() => copyCode(codeExamples[activeTab])}
            className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-bg-elevated px-2 py-1 text-[10px] text-text-muted hover:text-text-primary transition-colors"
          >
            {copied ? <CheckCircle2 size={10} className="text-accent" /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Endpoints */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Terminal size={14} className="text-text-muted" />
          <h2 className="text-sm font-semibold text-text-primary">Endpoints</h2>
        </div>
        <div className="space-y-2">
          {endpoints.map((ep, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                  style={{ color: methodColors[ep.method], backgroundColor: `${methodColors[ep.method]}15` }}
                >
                  {ep.method}
                </span>
                <code className="text-xs font-mono text-text-primary">{ep.path}</code>
              </div>
              <p className="text-xs text-text-secondary mb-2">{ep.description}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-text-muted">Parameters:</span>{' '}
                  <span className="font-mono text-text-secondary">{ep.params}</span>
                </div>
                <div>
                  <span className="text-text-muted">Response:</span>{' '}
                  <span className="font-mono text-text-secondary">{ep.response}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rate Limits */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Rate Limits</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-text-muted font-medium">Plan</th>
                <th className="text-center py-2 text-text-muted font-medium">Calls/Month</th>
                <th className="text-center py-2 text-text-muted font-medium">Rate (RPM)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-text-secondary">Explorer</td>
                <td className="py-2 text-center font-mono text-text-primary">100</td>
                <td className="py-2 text-center font-mono text-text-primary">10</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-text-secondary">Pro</td>
                <td className="py-2 text-center font-mono text-text-primary">10,000</td>
                <td className="py-2 text-center font-mono text-text-primary">60</td>
              </tr>
              <tr>
                <td className="py-2 text-text-secondary">Enterprise</td>
                <td className="py-2 text-center font-mono text-accent">Unlimited</td>
                <td className="py-2 text-center font-mono text-accent">Custom</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
