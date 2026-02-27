'use client'

import React, { useState, useMemo } from 'react'
import { Building2, Calculator, Edit3, Check } from 'lucide-react'
import type { Property } from '@/types'

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

/* ------------------------------------------------------------------ */
/*  Depreciation Tab                                                   */
/* ------------------------------------------------------------------ */

export function DepreciationTab({ properties }: { properties: Property[] }) {
  const now = new Date()

  // Editable land value percentages per property: { [propertyId]: percent }
  const [landPercents, setLandPercents] = useState<Record<string, number>>({})
  const [editingProp, setEditingProp] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  function getLandPercent(propId: string): number {
    return landPercents[propId] ?? 20
  }

  function startEditLandPercent(propId: string) {
    setEditingProp(propId)
    setEditValue(String(getLandPercent(propId)))
  }

  function saveLandPercent(propId: string) {
    const val = parseFloat(editValue)
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setLandPercents((prev) => ({ ...prev, [propId]: val }))
    }
    setEditingProp(null)
    setEditValue('')
  }

  // Calculate depreciation data for each property
  const depreciationData = useMemo(() => {
    return properties.map((prop) => {
      const purchasePrice = prop.purchase_price || 0
      const landPct = getLandPercent(prop.id)
      const landValue = purchasePrice * (landPct / 100)
      const buildingValue = purchasePrice - landValue
      const annualDepreciation = buildingValue > 0 ? buildingValue / 27.5 : 0

      const purchaseDate = prop.purchase_date ? new Date(prop.purchase_date) : null

      let yearsHeld = 0
      let monthsHeld = 0
      if (purchaseDate) {
        const diffMs = now.getTime() - purchaseDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        yearsHeld = Math.max(0, Math.floor(diffDays / 365.25))
        monthsHeld = Math.max(0, Math.floor(diffDays / 30.44))
      }

      // First-year partial: pro-rate based on month placed in service
      let accumulatedDepreciation = 0
      if (purchaseDate && yearsHeld > 0) {
        // First year: mid-month convention
        const firstYearMonths = 12 - purchaseDate.getMonth()
        const firstYearDepr = (annualDepreciation / 12) * (firstYearMonths - 0.5)

        if (yearsHeld === 1) {
          accumulatedDepreciation = firstYearDepr
        } else {
          // Full years in between
          const fullYears = yearsHeld - 1
          accumulatedDepreciation = firstYearDepr + annualDepreciation * fullYears
        }
      }

      // Cap at building value
      accumulatedDepreciation = Math.min(accumulatedDepreciation, buildingValue)
      const remainingBasis = buildingValue - accumulatedDepreciation
      const yearsRemaining = annualDepreciation > 0 ? Math.max(0, 27.5 - yearsHeld) : 0

      // Progress percentage
      const progress =
        buildingValue > 0
          ? Math.min(100, (accumulatedDepreciation / buildingValue) * 100)
          : 0

      return {
        property: prop,
        purchaseDate,
        purchasePrice,
        landPct,
        landValue,
        buildingValue,
        annualDepreciation,
        yearsHeld,
        monthsHeld,
        accumulatedDepreciation,
        remainingBasis,
        yearsRemaining,
        progress,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, landPercents])

  // Summary totals
  const totals = useMemo(() => {
    return {
      totalPurchasePrice: depreciationData.reduce((s, d) => s + d.purchasePrice, 0),
      totalLandValue: depreciationData.reduce((s, d) => s + d.landValue, 0),
      totalBuildingValue: depreciationData.reduce((s, d) => s + d.buildingValue, 0),
      totalAnnualDepreciation: depreciationData.reduce(
        (s, d) => s + d.annualDepreciation,
        0,
      ),
      totalAccumulated: depreciationData.reduce(
        (s, d) => s + d.accumulatedDepreciation,
        0,
      ),
      totalRemaining: depreciationData.reduce((s, d) => s + d.remainingBasis, 0),
    }
  }, [depreciationData])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#0C1018', border: '1px solid #161E2A' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="label">Annual Deduction</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
              <Calculator className="h-4 w-4 text-gold" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gold font-mono">
            {formatCurrency(totals.totalAnnualDepreciation)}
          </p>
          <p className="text-xs text-muted mt-1">Total annual depreciation</p>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#0C1018', border: '1px solid #161E2A' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="label">Total Accumulated</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-400 font-mono">
            {formatCurrency(totals.totalAccumulated)}
          </p>
          <p className="text-xs text-muted mt-1">Depreciation taken to date</p>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#0C1018', border: '1px solid #161E2A' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="label">Remaining Basis</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green/10">
              <Building2 className="h-4 w-4 text-green" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green font-mono">
            {formatCurrency(totals.totalRemaining)}
          </p>
          <p className="text-xs text-muted mt-1">Depreciable basis remaining</p>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#0C1018', border: '1px solid #161E2A' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="label">Building Value</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <Building2 className="h-4 w-4 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-400 font-mono">
            {formatCurrency(totals.totalBuildingValue)}
          </p>
          <p className="text-xs text-muted mt-1">Total depreciable basis</p>
        </div>
      </div>

      {/* Depreciation Table */}
      <div
        className="bg-card border border-border rounded-xl overflow-hidden"
        style={{ background: '#0C1018', border: '1px solid #161E2A' }}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="label text-[11px]">Property Depreciation Schedule</h3>
              <p className="text-xs text-muted mt-1">
                27.5-year straight-line depreciation for residential rental properties
              </p>
            </div>
            <span className="text-xs text-muted/60">
              Click land % to edit per property
            </span>
          </div>
        </div>

        {depreciationData.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-muted/40 mx-auto mb-3" />
            <p className="text-sm text-muted">No properties found</p>
            <p className="text-xs text-muted/60 mt-1">
              Add properties with purchase prices to see depreciation schedules
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Property
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Purchase Date
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Purchase Price
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Land Value
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Building Value
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Annual Depr.
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Accumulated
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Remaining
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {depreciationData.map((dep) => (
                  <tr
                    key={dep.property.id}
                    className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white truncate max-w-[200px]">
                          {dep.property.address}
                        </p>
                        <p className="text-[10px] text-muted mt-0.5">
                          {dep.property.city}, {dep.property.state}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-text font-mono whitespace-nowrap">
                      {dep.purchaseDate
                        ? dep.purchaseDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {dep.purchasePrice > 0 ? formatCurrency(dep.purchasePrice) : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {editingProp === dep.property.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  saveLandPercent(dep.property.id)
                                if (e.key === 'Escape') setEditingProp(null)
                              }}
                              className="w-14 h-6 rounded bg-deep border border-gold/50 px-1 text-xs text-white font-mono text-right focus:outline-none"
                              min="0"
                              max="100"
                              autoFocus
                            />
                            <span className="text-[10px] text-muted">%</span>
                            <button
                              type="button"
                              onClick={() => saveLandPercent(dep.property.id)}
                              className="p-0.5 rounded text-green hover:bg-green/10 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-text font-mono">
                              {dep.landValue > 0
                                ? formatCurrency(dep.landValue)
                                : '--'}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditLandPercent(dep.property.id)}
                              className="group/edit p-0.5 rounded hover:bg-white/5 transition-colors"
                              title="Edit land percentage"
                            >
                              <Edit3 className="w-3 h-3 text-muted/40 group-hover/edit:text-gold transition-colors" />
                            </button>
                            <span className="text-[9px] text-muted/50 font-mono">
                              ({dep.landPct}%)
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {dep.buildingValue > 0
                        ? formatCurrency(dep.buildingValue)
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-gold font-semibold font-mono">
                      {dep.annualDepreciation > 0
                        ? formatCurrency(dep.annualDepreciation)
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400 font-mono">
                      {dep.accumulatedDepreciation > 0
                        ? formatCurrency(dep.accumulatedDepreciation)
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-right text-green font-mono">
                      {dep.remainingBasis > 0
                        ? formatCurrency(dep.remainingBasis)
                        : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-20 h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${dep.progress}%`,
                              background:
                                dep.progress > 90
                                  ? '#DC2626'
                                  : dep.progress > 50
                                    ? '#F59E0B'
                                    : '#059669',
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted font-mono w-10 text-right">
                          {dep.progress.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-[9px] text-muted/50 text-right mt-0.5">
                        {dep.yearsRemaining.toFixed(1)} yrs left
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
              {depreciationData.length > 0 && (
                <tfoot>
                  <tr className="bg-gold/[0.03]">
                    <td className="px-4 py-3 font-bold text-gold">Total</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold text-white font-mono">
                      {formatCurrency(totals.totalPurchasePrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-text font-mono">
                      {formatCurrency(totals.totalLandValue)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white font-mono">
                      {formatCurrency(totals.totalBuildingValue)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gold font-mono">
                      {formatCurrency(totals.totalAnnualDepreciation)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-400 font-mono">
                      {formatCurrency(totals.totalAccumulated)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green font-mono">
                      {formatCurrency(totals.totalRemaining)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div
        className="bg-card border border-border rounded-xl p-5"
        style={{ background: '#0C1018', border: '1px solid #161E2A' }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0 mt-0.5">
            <Calculator className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white mb-1">
              Depreciation Method: 27.5-Year Straight-Line
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Residential rental property is depreciated over 27.5 years using the
              straight-line method. Land is not depreciable -- only the building value
              (purchase price minus estimated land value) qualifies. The default land
              allocation is 20%, but you can adjust this per property by clicking the
              edit icon. Use your tax assessor&apos;s land-to-improvement ratio for more
              accurate calculations. Consult your CPA for mid-month convention
              adjustments in the first and last year of service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
