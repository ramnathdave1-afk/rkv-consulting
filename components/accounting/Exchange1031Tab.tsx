'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  ArrowRightLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  FileText,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReplacementProperty {
  id: string
  address: string
  estimatedPrice: string
  notes: string
}

interface ExchangeData {
  saleDate: string
  salePrice: string
  costBasis: string
  gainAmount: string
  relinquishedProperty: string
  qualifiedIntermediary: string
  notes: string
  replacementProperties: ReplacementProperty[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function daysBetween(a: Date, b: Date): number {
  const diff = b.getTime() - a.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/* ------------------------------------------------------------------ */
/*  1031 Exchange Tab                                                  */
/* ------------------------------------------------------------------ */

export function Exchange1031Tab() {
  const [exchange, setExchange] = useState<ExchangeData>({
    saleDate: '',
    salePrice: '',
    costBasis: '',
    gainAmount: '',
    relinquishedProperty: '',
    qualifiedIntermediary: '',
    notes: '',
    replacementProperties: [],
  })

  // Auto-calculate gain
  useEffect(() => {
    const sp = parseFloat(exchange.salePrice) || 0
    const cb = parseFloat(exchange.costBasis) || 0
    if (sp > 0 && cb > 0) {
      setExchange((prev) => ({
        ...prev,
        gainAmount: String(sp - cb),
      }))
    }
  }, [exchange.salePrice, exchange.costBasis])

  // Deadline calculations
  const deadlines = useMemo(() => {
    if (!exchange.saleDate) return null

    const today = new Date()
    const saleDate = new Date(exchange.saleDate)
    if (isNaN(saleDate.getTime())) return null

    const identificationDeadline = addDays(saleDate, 45)
    const completionDeadline = addDays(saleDate, 180)

    const daysToIdentification = daysBetween(today, identificationDeadline)
    const daysToCompletion = daysBetween(today, completionDeadline)

    const identificationExpired = daysToIdentification < 0
    const completionExpired = daysToCompletion < 0

    const identificationProgress = identificationExpired
      ? 100
      : Math.max(0, Math.min(100, ((45 - daysToIdentification) / 45) * 100))
    const completionProgress = completionExpired
      ? 100
      : Math.max(0, Math.min(100, ((180 - daysToCompletion) / 180) * 100))

    return {
      saleDate,
      identificationDeadline,
      completionDeadline,
      daysToIdentification,
      daysToCompletion,
      identificationExpired,
      completionExpired,
      identificationProgress,
      completionProgress,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchange.saleDate])

  function addReplacementProperty() {
    setExchange((prev) => ({
      ...prev,
      replacementProperties: [
        ...prev.replacementProperties,
        {
          id: `rp-${Date.now()}`,
          address: '',
          estimatedPrice: '',
          notes: '',
        },
      ],
    }))
  }

  function removeReplacementProperty(id: string) {
    setExchange((prev) => ({
      ...prev,
      replacementProperties: prev.replacementProperties.filter((p) => p.id !== id),
    }))
  }

  function updateReplacementProperty(
    id: string,
    field: keyof ReplacementProperty,
    value: string,
  ) {
    setExchange((prev) => ({
      ...prev,
      replacementProperties: prev.replacementProperties.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    }))
  }

  const gain = parseFloat(exchange.gainAmount) || 0
  const salePrice = parseFloat(exchange.salePrice) || 0

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">1031 Like-Kind Exchange Tracker</h3>
          <p className="text-xs text-muted mt-0.5">
            Track deadlines and replacement properties for tax-deferred exchanges
          </p>
        </div>
        {deadlines && !deadlines.identificationExpired && !deadlines.completionExpired && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green bg-green/10 border border-green/20 rounded-full px-3 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Exchange Active
          </span>
        )}
        {deadlines && deadlines.completionExpired && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red bg-red/10 border border-red/20 rounded-full px-3 py-1">
            <XCircle className="w-3.5 h-3.5" />
            Exchange Expired
          </span>
        )}
      </div>

      {/* Sale Information */}
      <div
        className="bg-card border border-border rounded-xl p-6"
        style={{ background: '#0C1018', border: '1px solid #161E2A' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
            <DollarSign className="h-4 w-4 text-gold" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Relinquished Property Sale</h4>
            <p className="text-xs text-muted">Enter details of the property being sold</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Relinquished Property
            </label>
            <input
              type="text"
              value={exchange.relinquishedProperty}
              onChange={(e) =>
                setExchange((prev) => ({
                  ...prev,
                  relinquishedProperty: e.target.value,
                }))
              }
              placeholder="Property address..."
              className="w-full h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Sale Date
            </label>
            <input
              type="date"
              value={exchange.saleDate}
              onChange={(e) =>
                setExchange((prev) => ({ ...prev, saleDate: e.target.value }))
              }
              className="w-full h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Sale Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                $
              </span>
              <input
                type="number"
                value={exchange.salePrice}
                onChange={(e) =>
                  setExchange((prev) => ({ ...prev, salePrice: e.target.value }))
                }
                placeholder="0.00"
                className="w-full h-10 rounded-lg bg-deep border border-border pl-7 pr-3 text-sm text-white font-mono focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Adjusted Cost Basis
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                $
              </span>
              <input
                type="number"
                value={exchange.costBasis}
                onChange={(e) =>
                  setExchange((prev) => ({ ...prev, costBasis: e.target.value }))
                }
                placeholder="0.00"
                className="w-full h-10 rounded-lg bg-deep border border-border pl-7 pr-3 text-sm text-white font-mono focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Calculated Gain */}
        {gain !== 0 && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted">Estimated Capital Gain</span>
            <span
              className={cn(
                'text-lg font-bold font-mono',
                gain >= 0 ? 'text-green' : 'text-red',
              )}
            >
              {formatCurrency(gain)}
            </span>
          </div>
        )}

        {/* QI field */}
        <div className="mt-4 pt-4 border-t border-border">
          <label className="block text-xs font-medium text-muted mb-1.5">
            Qualified Intermediary (QI)
          </label>
          <input
            type="text"
            value={exchange.qualifiedIntermediary}
            onChange={(e) =>
              setExchange((prev) => ({
                ...prev,
                qualifiedIntermediary: e.target.value,
              }))
            }
            placeholder="Name of your Qualified Intermediary..."
            className="w-full h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
      </div>

      {/* Deadline Countdown Timers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 45-Day Identification Period */}
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#0C1018', border: '1px solid #161E2A' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  !deadlines
                    ? 'bg-muted/10'
                    : deadlines.identificationExpired
                      ? 'bg-red/10'
                      : deadlines.daysToIdentification <= 7
                        ? 'bg-yellow-500/10'
                        : 'bg-green/10',
                )}
              >
                <Calendar
                  className={cn(
                    'h-5 w-5',
                    !deadlines
                      ? 'text-muted'
                      : deadlines.identificationExpired
                        ? 'text-red'
                        : deadlines.daysToIdentification <= 7
                          ? 'text-yellow-500'
                          : 'text-green',
                  )}
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  45-Day Identification Period
                </h4>
                <p className="text-xs text-muted mt-0.5">
                  Identify replacement properties
                </p>
              </div>
            </div>
            {deadlines && (
              <div>
                {deadlines.identificationExpired ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red">
                    <XCircle className="w-3.5 h-3.5" />
                    Expired
                  </span>
                ) : deadlines.daysToIdentification <= 7 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Urgent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                )}
              </div>
            )}
          </div>

          {deadlines ? (
            <>
              <div className="text-center mb-4">
                <p
                  className={cn(
                    'text-4xl font-bold font-mono',
                    deadlines.identificationExpired
                      ? 'text-red'
                      : deadlines.daysToIdentification <= 7
                        ? 'text-yellow-500'
                        : 'text-green',
                  )}
                >
                  {deadlines.identificationExpired
                    ? `${Math.abs(deadlines.daysToIdentification)}`
                    : deadlines.daysToIdentification}
                </p>
                <p className="text-xs text-muted mt-1">
                  {deadlines.identificationExpired
                    ? 'days past deadline'
                    : 'days remaining'}
                </p>
              </div>
              <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${deadlines.identificationProgress}%`,
                    background: deadlines.identificationExpired
                      ? '#DC2626'
                      : deadlines.daysToIdentification <= 7
                        ? '#F59E0B'
                        : '#059669',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Sale: {formatDate(deadlines.saleDate)}</span>
                <span>Deadline: {formatDate(deadlines.identificationDeadline)}</span>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 text-muted/30 mx-auto mb-2" />
              <p className="text-xs text-muted">Enter a sale date to see countdown</p>
            </div>
          )}
        </div>

        {/* 180-Day Completion Deadline */}
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#0C1018', border: '1px solid #161E2A' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  !deadlines
                    ? 'bg-muted/10'
                    : deadlines.completionExpired
                      ? 'bg-red/10'
                      : deadlines.daysToCompletion <= 14
                        ? 'bg-yellow-500/10'
                        : 'bg-green/10',
                )}
              >
                <Clock
                  className={cn(
                    'h-5 w-5',
                    !deadlines
                      ? 'text-muted'
                      : deadlines.completionExpired
                        ? 'text-red'
                        : deadlines.daysToCompletion <= 14
                          ? 'text-yellow-500'
                          : 'text-green',
                  )}
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  180-Day Completion Deadline
                </h4>
                <p className="text-xs text-muted mt-0.5">
                  Close on replacement property
                </p>
              </div>
            </div>
            {deadlines && (
              <div>
                {deadlines.completionExpired ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red">
                    <XCircle className="w-3.5 h-3.5" />
                    Expired
                  </span>
                ) : deadlines.daysToCompletion <= 14 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Urgent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                )}
              </div>
            )}
          </div>

          {deadlines ? (
            <>
              <div className="text-center mb-4">
                <p
                  className={cn(
                    'text-4xl font-bold font-mono',
                    deadlines.completionExpired
                      ? 'text-red'
                      : deadlines.daysToCompletion <= 14
                        ? 'text-yellow-500'
                        : 'text-green',
                  )}
                >
                  {deadlines.completionExpired
                    ? `${Math.abs(deadlines.daysToCompletion)}`
                    : deadlines.daysToCompletion}
                </p>
                <p className="text-xs text-muted mt-1">
                  {deadlines.completionExpired
                    ? 'days past deadline'
                    : 'days remaining'}
                </p>
              </div>
              <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${deadlines.completionProgress}%`,
                    background: deadlines.completionExpired
                      ? '#DC2626'
                      : deadlines.daysToCompletion <= 14
                        ? '#F59E0B'
                        : '#059669',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Sale: {formatDate(deadlines.saleDate)}</span>
                <span>Deadline: {formatDate(deadlines.completionDeadline)}</span>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 text-muted/30 mx-auto mb-2" />
              <p className="text-xs text-muted">Enter a sale date to see countdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Replacement Properties */}
      <div
        className="bg-card border border-border rounded-xl overflow-hidden"
        style={{ background: '#0C1018', border: '1px solid #161E2A' }}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">
              Identified Replacement Properties
            </h4>
            <p className="text-xs text-muted mt-0.5">
              You may identify up to 3 properties (Three-Property Rule) or any number
              whose total value does not exceed 200% of the sale price
            </p>
          </div>
          <button
            type="button"
            onClick={addReplacementProperty}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold text-black hover:brightness-110 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Property
          </button>
        </div>

        {exchange.replacementProperties.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowRightLeft className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-sm text-muted">No replacement properties identified yet</p>
            <p className="text-xs text-muted/60 mt-1">
              Click &quot;Add Property&quot; to start tracking potential replacement properties
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {exchange.replacementProperties.map((rp, index) => (
              <div key={rp.id} className="p-5 hover:bg-white/[0.01] transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/10 text-[10px] font-bold text-gold">
                      {index + 1}
                    </span>
                    <span className="text-xs text-muted">Replacement Property #{index + 1}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReplacementProperty(rp.id)}
                    className="p-1 rounded text-muted/40 hover:text-red hover:bg-red/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-medium text-muted mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={rp.address}
                      onChange={(e) =>
                        updateReplacementProperty(rp.id, 'address', e.target.value)
                      }
                      placeholder="Property address..."
                      className="w-full h-9 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted mb-1">
                      Estimated Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">
                        $
                      </span>
                      <input
                        type="number"
                        value={rp.estimatedPrice}
                        onChange={(e) =>
                          updateReplacementProperty(
                            rp.id,
                            'estimatedPrice',
                            e.target.value,
                          )
                        }
                        placeholder="0.00"
                        className="w-full h-9 rounded-lg bg-deep border border-border pl-6 pr-3 text-sm text-white font-mono focus:outline-none focus:border-gold/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={rp.notes}
                      onChange={(e) =>
                        updateReplacementProperty(rp.id, 'notes', e.target.value)
                      }
                      placeholder="Status, details..."
                      className="w-full h-9 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Summary row */}
            {exchange.replacementProperties.length > 0 && (
              <div className="px-5 py-3 bg-gold/[0.03]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gold">
                    Total Replacement Value
                  </span>
                  <span className="text-sm font-bold text-gold font-mono">
                    {formatCurrency(
                      exchange.replacementProperties.reduce(
                        (s, rp) => s + (parseFloat(rp.estimatedPrice) || 0),
                        0,
                      ),
                    )}
                  </span>
                </div>
                {salePrice > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted">
                      % of Sale Price (200% rule)
                    </span>
                    <span
                      className={cn(
                        'text-xs font-mono',
                        exchange.replacementProperties.reduce(
                          (s, rp) => s + (parseFloat(rp.estimatedPrice) || 0),
                          0,
                        ) >
                          salePrice * 2
                          ? 'text-red'
                          : 'text-green',
                      )}
                    >
                      {(
                        (exchange.replacementProperties.reduce(
                          (s, rp) => s + (parseFloat(rp.estimatedPrice) || 0),
                          0,
                        ) /
                          salePrice) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div
        className="bg-card border border-border rounded-xl p-6"
        style={{ background: '#0C1018', border: '1px solid #161E2A' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <FileText className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Exchange Notes</h4>
            <p className="text-xs text-muted">
              Track communications, decisions, and important details
            </p>
          </div>
        </div>
        <textarea
          value={exchange.notes}
          onChange={(e) =>
            setExchange((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Add notes about your 1031 exchange here... Key contacts, timeline considerations, tax advisor recommendations, etc."
          rows={5}
          className="w-full rounded-lg bg-deep border border-border px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* IRS Rules Info Box */}
      <div
        className="bg-card border border-border rounded-xl p-5"
        style={{ background: '#0C1018', border: '1px solid #161E2A' }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 flex-shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white mb-1">
              IRS 1031 Exchange Rules
            </h4>
            <div className="text-xs text-muted leading-relaxed space-y-1">
              <p>
                <strong className="text-text">45-Day Rule:</strong> You must identify
                potential replacement properties within 45 calendar days of selling your
                relinquished property.
              </p>
              <p>
                <strong className="text-text">180-Day Rule:</strong> You must close on
                the replacement property within 180 calendar days of the sale (or by
                your tax return due date, whichever is earlier).
              </p>
              <p>
                <strong className="text-text">Three-Property Rule:</strong> You may
                identify up to 3 replacement properties regardless of value, OR any
                number whose combined value does not exceed 200% of the sale price.
              </p>
              <p>
                <strong className="text-text">Equal or Greater Value:</strong> To fully
                defer capital gains, the replacement property must be of equal or
                greater value than the relinquished property.
              </p>
              <p className="text-muted/60 mt-2">
                This tracker is for informational purposes only. Consult a qualified
                tax advisor and use a Qualified Intermediary (QI) for all 1031
                exchanges.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
