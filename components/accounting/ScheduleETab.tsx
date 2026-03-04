'use client'

import React, { useState, useMemo } from 'react'
import { Building2, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Property, Transaction } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScheduleELineItem {
  line: string
  label: string
  autoAmount: number
  manualOverride: number | null
}

interface PropertyScheduleE {
  property: Property
  lines: ScheduleELineItem[]
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

/* ------------------------------------------------------------------ */
/*  Schedule E Tab                                                     */
/* ------------------------------------------------------------------ */

export function ScheduleETab({
  properties,
  transactions,
}: {
  properties: Property[]
  transactions: Transaction[]
}) {
  const currentYear = new Date().getFullYear()

  // Editable overrides: { [propertyId-lineNumber]: value }
  const [overrides, setOverrides] = useState<Record<string, number>>({})

  // Filter transactions to current year
  const ytdTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.date)
      return d.getFullYear() === currentYear
    })
  }, [transactions, currentYear])

  // Build per-property Schedule E data
  const propertyScheduleData: PropertyScheduleE[] = useMemo(() => {
    return properties.map((prop) => {
      const propTx = ytdTransactions.filter((tx) => tx.property_id === prop.id)
      const propExpenses = propTx.filter((tx) => tx.type === 'expense')

      // Sum expenses by category
      const expenseMap = new Map<string, number>()
      propExpenses.forEach((tx) => {
        expenseMap.set(tx.category, (expenseMap.get(tx.category) || 0) + tx.amount)
      })

      // Rental income
      const rentalIncome = propTx
        .filter((tx) => tx.type === 'income' && tx.category === 'Rent')
        .reduce((s, tx) => s + tx.amount, 0)

      // Auto-populated amounts based on property data and transaction history
      const annualRent = rentalIncome > 0 ? rentalIncome : (prop.monthly_rent || 0) * 12
      const annualInsurance = (prop.insurance_annual || 0)
      const annualMortgageInterest = (prop.mortgage_payment || 0) * 12 * 0.7
      const annualTaxes = (prop.tax_annual || 0)

      // Depreciation calculation
      const purchasePrice = prop.purchase_price || 0
      const landValue = purchasePrice * 0.2
      const depreciableBasis = purchasePrice - landValue
      const annualDepreciation = depreciableBasis / 27.5

      const lines: ScheduleELineItem[] = [
        { line: '3', label: 'Rents received', autoAmount: annualRent, manualOverride: null },
        { line: '5', label: 'Advertising', autoAmount: expenseMap.get('Advertising') || 0, manualOverride: null },
        { line: '6', label: 'Auto and travel', autoAmount: 0, manualOverride: null },
        { line: '7', label: 'Cleaning and maintenance', autoAmount: expenseMap.get('Maintenance') || 0, manualOverride: null },
        { line: '8', label: 'Commissions', autoAmount: expenseMap.get('Management') || 0, manualOverride: null },
        { line: '9', label: 'Insurance', autoAmount: annualInsurance > 0 ? annualInsurance : (expenseMap.get('Insurance') || 0), manualOverride: null },
        { line: '10', label: 'Legal and professional fees', autoAmount: expenseMap.get('Legal') || 0, manualOverride: null },
        { line: '12', label: 'Mortgage interest paid', autoAmount: annualMortgageInterest > 0 ? annualMortgageInterest : (expenseMap.get('Mortgage') || 0) * 0.7, manualOverride: null },
        { line: '16', label: 'Taxes', autoAmount: annualTaxes > 0 ? annualTaxes : (expenseMap.get('Property Tax') || 0), manualOverride: null },
        { line: '17', label: 'Utilities', autoAmount: expenseMap.get('Utilities') || 0, manualOverride: null },
        { line: '18', label: 'Depreciation expense or depletion', autoAmount: annualDepreciation, manualOverride: null },
        { line: '19', label: 'Other (HOA, etc.)', autoAmount: (expenseMap.get('HOA') || 0) + (expenseMap.get('Other') || 0), manualOverride: null },
      ]

      return { property: prop, lines }
    })
  }, [properties, ytdTransactions])

  // Get effective value for a line (override or auto)
  function getLineValue(propId: string, line: string, autoAmount: number): number {
    const key = `${propId}-${line}`
    return overrides[key] !== undefined ? overrides[key] : autoAmount
  }

  function setLineOverride(propId: string, line: string, value: string) {
    const key = `${propId}-${line}`
    const num = parseFloat(value)
    if (value === '' || isNaN(num)) {
      const newOverrides = { ...overrides }
      delete newOverrides[key]
      setOverrides(newOverrides)
    } else {
      setOverrides((prev) => ({ ...prev, [key]: num }))
    }
  }

  // Calculate totals per property
  function getPropertyTotals(propData: PropertyScheduleE) {
    const propId = propData.property.id
    const rentLine = propData.lines.find((l) => l.line === '3')!
    const totalRent = getLineValue(propId, '3', rentLine.autoAmount)

    const expenseLines = propData.lines.filter((l) => l.line !== '3')
    const totalExpenses = expenseLines.reduce(
      (sum, l) => sum + getLineValue(propId, l.line, l.autoAmount),
      0,
    )

    return {
      totalRent,
      totalExpenses,
      netIncome: totalRent - totalExpenses,
    }
  }

  // Grand totals across all properties
  const grandTotals = useMemo(() => {
    let totalRent = 0
    let totalExpenses = 0

    propertyScheduleData.forEach((propData) => {
      const totals = getPropertyTotals(propData)
      totalRent += totals.totalRent
      totalExpenses += totals.totalExpenses
    })

    return {
      totalRent,
      totalExpenses,
      netIncome: totalRent - totalExpenses,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyScheduleData, overrides])

  async function handlePrint() {
    const { generateScheduleEPDF } = await import('@/lib/pdf/schedule-e')
    await generateScheduleEPDF({ properties, transactions, year: currentYear })
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#111111', border: '1px solid #1e1e1e' }}
        >
          <p className="label mb-2">Total Rental Income</p>
          <p className="text-2xl font-bold text-green font-mono">
            {formatCurrency(grandTotals.totalRent)}
          </p>
          <p className="text-xs text-muted mt-1">Line 3 across all properties</p>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#111111', border: '1px solid #1e1e1e' }}
        >
          <p className="label mb-2">Total Expenses</p>
          <p className="text-2xl font-bold text-red font-mono">
            {formatCurrency(grandTotals.totalExpenses)}
          </p>
          <p className="text-xs text-muted mt-1">Lines 5-19 across all properties</p>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-6"
          style={{ background: '#111111', border: '1px solid #1e1e1e' }}
        >
          <p className="label mb-2">Net Rental Income (Loss)</p>
          <p
            className={cn(
              'text-2xl font-bold font-mono',
              grandTotals.netIncome >= 0 ? 'text-gold' : 'text-red',
            )}
          >
            {formatCurrency(grandTotals.netIncome)}
          </p>
          <p className="text-xs text-muted mt-1">Line 21 total</p>
        </div>
      </div>

      {/* Export Button Row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Schedule E (Form 1040) - Part I: Income or Loss From Rental Real Estate
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Tax Year {currentYear} | {properties.length} propert{properties.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gold border border-gold/30 hover:bg-gold/10 transition-all print:hidden"
        >
          <Printer className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      {/* Per-Property Schedule E Worksheets */}
      {propertyScheduleData.length === 0 ? (
        <div
          className="bg-card border border-border rounded-xl p-12 text-center"
          style={{ background: '#111111', border: '1px solid #1e1e1e' }}
        >
          <Building2 className="w-10 h-10 text-muted/40 mx-auto mb-3" />
          <p className="text-sm text-muted">No properties found</p>
          <p className="text-xs text-muted/60 mt-1">
            Add properties to auto-populate your Schedule E worksheet
          </p>
        </div>
      ) : (
        propertyScheduleData.map((propData) => {
          const propId = propData.property.id
          const totals = getPropertyTotals(propData)

          return (
            <div
              key={propId}
              className="bg-card border border-border rounded-xl overflow-hidden print:break-inside-avoid"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
            >
              {/* Property Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
                    <Building2 className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {propData.property.address}
                    </h4>
                    <p className="text-xs text-muted">
                      {propData.property.city}, {propData.property.state}{' '}
                      {propData.property.zip} | {propData.property.property_type?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule E Lines */}
              <div className="p-6">
                {/* Line 3: Rents Received */}
                {propData.lines
                  .filter((l) => l.line === '3')
                  .map((line) => (
                    <div
                      key={line.line}
                      className="flex items-center justify-between py-3 border-b border-border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gold w-12 font-mono font-semibold">
                          Line {line.line}
                        </span>
                        <span className="text-sm font-medium text-white">{line.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {line.autoAmount > 0 && (
                          <span className="text-[10px] text-muted/60 font-mono">
                            auto: {formatCurrency(line.autoAmount)}
                          </span>
                        )}
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">
                            $
                          </span>
                          <input
                            type="number"
                            value={
                              overrides[`${propId}-${line.line}`] !== undefined
                                ? overrides[`${propId}-${line.line}`]
                                : line.autoAmount || ''
                            }
                            onChange={(e) =>
                              setLineOverride(propId, line.line, e.target.value)
                            }
                            className="w-36 h-9 rounded-lg bg-deep border border-border pl-6 pr-3 text-sm text-green font-mono text-right focus:outline-none focus:border-gold/50 transition-colors"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Expenses Header */}
                <div className="mt-5 mb-3">
                  <p className="label text-[10px]">Expenses</p>
                </div>

                {/* Expense Lines */}
                <div className="space-y-0.5">
                  {propData.lines
                    .filter((l) => l.line !== '3')
                    .map((line) => {
                      const isAutoPopulated = line.autoAmount > 0
                      return (
                        <div
                          key={line.line}
                          className="flex items-center justify-between py-2 hover:bg-white/[0.02] px-2 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-muted w-12 font-mono">
                              Line {line.line}
                            </span>
                            <span className="text-sm text-text">{line.label}</span>
                            {isAutoPopulated && (
                              <span className="text-[9px] text-green/60 bg-green/5 border border-green/10 rounded-full px-1.5 py-0.5">
                                auto
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">
                              $
                            </span>
                            <input
                              type="number"
                              value={
                                overrides[`${propId}-${line.line}`] !== undefined
                                  ? overrides[`${propId}-${line.line}`]
                                  : line.autoAmount || ''
                              }
                              onChange={(e) =>
                                setLineOverride(propId, line.line, e.target.value)
                              }
                              className={cn(
                                'w-36 h-8 rounded-lg bg-deep border border-border pl-6 pr-3 text-sm font-mono text-right focus:outline-none focus:border-gold/50 transition-colors',
                                isAutoPopulated ? 'text-white' : 'text-muted',
                              )}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>

                {/* Property Totals */}
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-red w-12 font-mono font-semibold">
                        Line 20
                      </span>
                      <span className="text-sm font-semibold text-red">Total expenses</span>
                    </div>
                    <span className="text-base font-bold text-red font-mono">
                      {formatCurrency(totals.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gold/5 -mx-6 px-8 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gold w-12 font-mono font-semibold">
                        Line 21
                      </span>
                      <span className="text-sm font-bold text-gold">
                        Net rental income (loss)
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-lg font-bold font-mono',
                        totals.netIncome >= 0 ? 'text-gold' : 'text-red',
                      )}
                    >
                      {formatCurrency(totals.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* Print-friendly styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .space-y-6,
          .space-y-6 * {
            visibility: visible;
          }
          .space-y-6 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
          [style*="background: #111111"] {
            background: white !important;
            border-color: #e5e7eb !important;
            color: black !important;
          }
          .text-white,
          .text-gold,
          .text-green,
          .text-red,
          .text-text,
          .text-muted {
            color: #1a1a1a !important;
          }
          input {
            border: 1px solid #d1d5db !important;
            background: #f9fafb !important;
            color: #1a1a1a !important;
          }
        }
      `}</style>
    </div>
  )
}
