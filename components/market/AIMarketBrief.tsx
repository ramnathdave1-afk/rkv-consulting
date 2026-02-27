'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MarketDataPayload {
  medianPrice?: number
  pricePerSqft?: number
  medianRent?: number
  daysOnMarket?: number
  activeInventory?: number
  monthsOfSupply?: number
  yoyChange?: number
  populationGrowth?: number
  capRate?: number
  rentToPriceRatio?: number
  jobGrowth?: number | null
  medianIncome?: number | null
  unemploymentRate?: number | null
}

interface AIMarketBriefProps {
  city: string
  state: string
  marketData?: MarketDataPayload
}

/* ------------------------------------------------------------------ */
/*  Section Parser                                                     */
/* ------------------------------------------------------------------ */

interface BriefSection {
  title: string
  content: string
}

function parseBriefSections(text: string): BriefSection[] {
  const sections: BriefSection[] = []
  // Split on ## headings
  const parts = text.split(/^##\s+/m).filter((s) => s.trim())

  for (const part of parts) {
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) {
      sections.push({ title: part.trim(), content: '' })
    } else {
      sections.push({
        title: part.slice(0, newlineIdx).trim(),
        content: part.slice(newlineIdx + 1).trim(),
      })
    }
  }

  return sections
}

/* ------------------------------------------------------------------ */
/*  Section icon/color mapping                                         */
/* ------------------------------------------------------------------ */

const sectionStyles: Record<string, { color: string; border: string }> = {
  'Market Overview': { color: '#059669', border: '#059669' },
  'Investment Thesis': { color: '#0EA5E9', border: '#0EA5E9' },
  'Key Risks': { color: '#DC2626', border: '#DC2626' },
  'Outlook': { color: '#F59E0B', border: '#F59E0B' },
}

function getSectionStyle(title: string) {
  // Try exact match first, then partial match
  if (sectionStyles[title]) return sectionStyles[title]
  const lower = title.toLowerCase()
  if (lower.includes('overview')) return sectionStyles['Market Overview']
  if (lower.includes('thesis') || lower.includes('investment')) return sectionStyles['Investment Thesis']
  if (lower.includes('risk')) return sectionStyles['Key Risks']
  if (lower.includes('outlook')) return sectionStyles['Outlook']
  return { color: '#059669', border: '#059669' }
}

/* ------------------------------------------------------------------ */
/*  Shimmer placeholder                                                */
/* ------------------------------------------------------------------ */

function BriefShimmer() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg p-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <div className="h-4 w-32 rounded bg-[#161E2A] mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-[#161E2A]" />
            <div className="h-3 w-5/6 rounded bg-[#161E2A]" />
            <div className="h-3 w-4/6 rounded bg-[#161E2A]" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AIMarketBrief({ city, state, marketData }: AIMarketBriefProps) {
  const [brief, setBrief] = useState<string | null>(null)
  const [sections, setSections] = useState<BriefSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const generateBrief = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/city-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, state, marketData }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate brief')
      }

      const json = await res.json()
      setBrief(json.brief)
      setSections(parseBriefSections(json.brief))
      setGeneratedAt(json.generated_at)
      setExpanded(true)
    } catch (err) {
      console.error('[AIMarketBrief] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate brief')
    } finally {
      setLoading(false)
    }
  }, [city, state, marketData])

  // Not generated yet — show the button
  if (!brief && !loading && !error) {
    return (
      <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
        {/* Gradient left border */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #059669, #0EA5E9)' }} />

        <h4 className="label text-gold mb-3 flex items-center gap-2" style={{ fontSize: '10px' }}>
          <span className="pulse-dot" />
          AI MARKET BRIEF
        </h4>

        <button
          onClick={generateBrief}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg p-3.5 text-sm font-semibold font-body uppercase tracking-wider transition-all border border-gold/30 text-gold hover:bg-gold/10 hover:border-gold/50"
        >
          <Sparkles className="h-4 w-4" />
          Generate AI Market Brief
        </button>

        <p className="text-[10px] text-muted-deep text-center mt-2 font-mono">
          Powered by Claude AI with live market data
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl relative overflow-hidden" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
      {/* Gradient left border */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'linear-gradient(to bottom, #059669, #0EA5E9)' }} />

      {/* Header — always visible, acts as toggle */}
      <button
        onClick={() => !loading && setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.01] transition-colors"
      >
        <div className="flex items-center gap-2">
          <h4 className="label text-gold flex items-center gap-2" style={{ fontSize: '10px' }}>
            <span className="pulse-dot" />
            AI MARKET BRIEF
          </h4>
          {loading && (
            <Loader2 className="h-3.5 w-3.5 text-gold animate-spin" />
          )}
          {generatedAt && !loading && (
            <span className="text-[9px] font-mono text-muted-deep">
              {new Date(generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {brief && !loading && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                generateBrief()
              }}
              className="text-muted hover:text-gold transition-colors p-1"
              title="Regenerate"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {!loading && (expanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />)}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4">
          {loading && <BriefShimmer />}

          {error && !loading && (
            <div className="flex items-center gap-3 rounded-lg p-4" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
              <AlertCircle className="h-4 w-4 text-red flex-shrink-0" />
              <p className="text-xs text-muted flex-1">{error}</p>
              <button
                onClick={generateBrief}
                className="text-[10px] font-mono font-semibold text-gold hover:text-white transition-colors uppercase tracking-wider border border-gold/30 rounded-md px-2.5 py-1 hover:bg-gold/10"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && sections.length > 0 && (
            <div className="space-y-3">
              {sections.map((section, idx) => {
                const style = getSectionStyle(section.title)
                return (
                  <div
                    key={idx}
                    className="rounded-lg p-3.5 relative overflow-hidden"
                    style={{ background: '#0C1018', border: '1px solid #161E2A' }}
                  >
                    {/* Left accent bar matching section color */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[2px]"
                      style={{ background: style.border }}
                    />

                    <h5
                      className="text-xs font-semibold font-display uppercase tracking-wider mb-2"
                      style={{ color: style.color }}
                    >
                      {section.title}
                    </h5>

                    <div className="text-xs text-muted leading-relaxed whitespace-pre-line">
                      {section.content.split('\n').map((line, lineIdx) => {
                        const trimmed = line.trim()
                        // Render bullet points with styling
                        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                          return (
                            <div key={lineIdx} className="flex gap-2 mb-1.5">
                              <span className="text-gold mt-0.5 flex-shrink-0">--</span>
                              <span>{trimmed.slice(2)}</span>
                            </div>
                          )
                        }
                        if (trimmed === '') return <div key={lineIdx} className="h-1.5" />
                        return <p key={lineIdx} className="mb-1.5">{trimmed}</p>
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
