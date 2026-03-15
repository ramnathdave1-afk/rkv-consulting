'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, AlertTriangle, Lightbulb, TrendingUp, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insights {
  executive_summary: string;
  key_findings: string[];
  risk_factors: string[];
  recommendations: string[];
  market_outlook: string;
}

interface AIInsightsPanelProps {
  className?: string;
}

const sectionConfig = [
  { key: 'executive_summary', label: 'Executive Summary', icon: FileText, color: '#00D4AA' },
  { key: 'key_findings', label: 'Key Findings', icon: Lightbulb, color: '#3B82F6' },
  { key: 'risk_factors', label: 'Risk Factors', icon: AlertTriangle, color: '#F59E0B' },
  { key: 'recommendations', label: 'Recommendations', icon: TrendingUp, color: '#8A00FF' },
  { key: 'market_outlook', label: 'Market Outlook', icon: TrendingUp, color: '#22C55E' },
];

export function AIInsightsPanel({ className }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [sitesAnalyzed, setSitesAnalyzed] = useState(0);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/insights', { method: 'POST' });
      const data = await response.json();
      setInsights(data.insights);
      setGeneratedAt(data.generated_at);
      setSitesAnalyzed(data.sites_analyzed);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Generate button */}
      {!insights && !loading && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={generateInsights}
          className="w-full glass-card p-8 text-center hover:border-accent/30 transition-colors group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
            <Sparkles size={24} className="text-accent" />
          </div>
          <p className="text-sm font-semibold text-text-primary mb-1">Generate AI Portfolio Insights</p>
          <p className="text-xs text-text-muted">
            Claude AI will analyze your sites, scores, market data, and agent activity to produce an executive report.
          </p>
        </motion.button>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
            <Sparkles size={24} className="text-accent animate-pulse" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">Analyzing portfolio...</p>
          <p className="text-xs text-text-muted">Claude is reviewing your sites, scores, and market data</p>
          <div className="mt-4 mx-auto w-48 h-1 rounded-full bg-bg-elevated overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '90%' }}
              transition={{ duration: 8, ease: 'linear' }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {insights && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-xs font-medium text-text-primary">AI Portfolio Analysis</span>
                {generatedAt && (
                  <span className="text-[10px] text-text-muted">
                    {sitesAnalyzed} sites analyzed
                  </span>
                )}
              </div>
              <button
                onClick={generateInsights}
                className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors"
              >
                <RefreshCw size={10} />
                Regenerate
              </button>
            </div>

            {/* Sections */}
            {sectionConfig.map(({ key, label, icon: Icon, color }, i) => {
              const content = insights[key as keyof Insights];
              if (!content || (Array.isArray(content) && content.length === 0)) return null;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-4"
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} style={{ color }} />
                    <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">{label}</h4>
                  </div>
                  {typeof content === 'string' ? (
                    <p className="text-xs text-text-secondary leading-relaxed">{content}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {content.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-text-secondary">
                          <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
