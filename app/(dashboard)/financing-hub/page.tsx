'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Landmark,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Calculator,
  Building2,
  ArrowRight,
  Percent,
  RefreshCw,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/paywall/FeatureGate'
import { useSubscription } from '@/hooks/useSubscription'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Property } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MortgageRates {
  thirtyYearFixed: number | null
  fifteenYearFixed: number | null
  fiveOneArm: number | null
  lastWeek: { thirtyYearFixed: number | null; fifteenYearFixed: number | null; fiveOneArm: number | null }
  asOf: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function fmtShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function fmtWhole(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function calcMonthly(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0
  const r = annualRate / 100 / 12
  const n = termYears * 12
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function buildAmortization(principal: number, annualRate: number, termYears: number) {
  const r = annualRate / 100 / 12
  const n = termYears * 12
  const payment = calcMonthly(principal, annualRate, termYears)
  const data: { year: number; principal: number; interest: number; balance: number }[] = []
  let balance = principal
  let yrPrin = 0, yrInt = 0

  for (let m = 1; m <= n; m++) {
    const intPart = balance * r
    const prinPart = payment - intPart
    balance -= prinPart
    yrPrin += prinPart
    yrInt += intPart
    if (m % 12 === 0) {
      data.push({ year: m / 12, principal: Math.round(yrPrin), interest: Math.round(yrInt), balance: Math.max(0, Math.round(balance)) })
      yrPrin = 0; yrInt = 0
    }
  }
  return data
}

/* ------------------------------------------------------------------ */
/*  Amortization Tooltip                                               */
/* ------------------------------------------------------------------ */

function AmortTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 shadow-card" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      <p className="text-xs text-muted mb-1">Year {label}</p>
      {payload.map((e, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: e.color }}>{e.name}: {fmtWhole(e.value)}</p>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Content                                                       */
/* ------------------------------------------------------------------ */

function FinancingHubContent() {
  const supabase = createClient()
  const { planName: _planName } = useSubscription()

  /* ---------- data state ---------- */
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [rates, setRates] = useState<MortgageRates>({
    thirtyYearFixed: 6.85, fifteenYearFixed: 6.10, fiveOneArm: 6.35,
    lastWeek: { thirtyYearFixed: 6.90, fifteenYearFixed: 6.15, fiveOneArm: 6.40 },
    asOf: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  })
  const [ratesLoading, setRatesLoading] = useState(true)

  /* ---------- mortgage calculator state ---------- */
  const [homePrice, setHomePrice] = useState('400000')
  const [downPct, setDownPct] = useState(20)
  const [calcRate, setCalcRate] = useState('6.85')
  const [calcTerm, setCalcTerm] = useState('30')

  /* ---------- refinance state ---------- */
  const [refiPropId, setRefiPropId] = useState('')
  const [refiNewRate, setRefiNewRate] = useState('6.25')
  const [refiNewTerm, setRefiNewTerm] = useState('30')

  /* ---------- pre-qualification state ---------- */
  const [annualIncome, setAnnualIncome] = useState('120000')
  const [monthlyDebts, setMonthlyDebts] = useState('800')
  const [creditRange, setCreditRange] = useState('740-799')
  const [prequalDown, setPrequalDown] = useState('80000')

  /* ---------- data fetching ---------- */
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data } = await supabase.from('properties').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        setProperties((data || []) as Property[])
      } catch (err) { console.error('Financing fetch error:', err) }
      finally { setLoading(false) }
    }
    load()
  }, [supabase])

  useEffect(() => {
    async function fetchRates() {
      try {
        // Use the first property's location, or fall back to a default for the FRED rates call
        const firstProp = properties[0]
        const zip = firstProp?.zip || '10001'
        const city = firstProp?.city || 'New York'
        const state = firstProp?.state || 'NY'
        const res = await fetch(`/api/market?zip=${encodeURIComponent(zip)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`)
        if (res.ok) {
          const json = await res.json()
          const rate30 = json.market?.economics?.mortgage_rate_30yr
          if (rate30) {
            setRates(prev => ({
              ...prev,
              thirtyYearFixed: rate30,
              fifteenYearFixed: Math.round((rate30 - 0.75) * 100) / 100,
              fiveOneArm: Math.round((rate30 - 0.50) * 100) / 100,
              asOf: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            }))
            setCalcRate(rate30.toString())
          }
        }
      } catch (err) { console.error('[Financing Hub] Failed to fetch rates:', err) }
      finally { setRatesLoading(false) }
    }
    fetchRates()
  }, [properties])

  /* ---------- mortgage calculator ---------- */
  const calcResults = useMemo(() => {
    const price = parseFloat(homePrice) || 0
    const downAmt = price * (downPct / 100)
    const loan = price - downAmt
    const rate = parseFloat(calcRate) || 0
    const term = parseInt(calcTerm) || 30
    const monthlyPI = calcMonthly(loan, rate, term)
    const estTaxIns = price * 0.015 / 12 // ~1.5% of home price annually
    const totalMonthly = monthlyPI + estTaxIns
    const totalInterest = monthlyPI * term * 12 - loan
    const totalCost = totalMonthly * term * 12
    return { price, downAmt, loan, rate, term, monthlyPI, estTaxIns, totalMonthly, totalInterest, totalCost }
  }, [homePrice, downPct, calcRate, calcTerm])

  const amortData = useMemo(
    () => buildAmortization(calcResults.loan, calcResults.rate, calcResults.term),
    [calcResults.loan, calcResults.rate, calcResults.term]
  )

  /* ---------- my loans ---------- */
  const loansWithMortgage = useMemo(() => properties.filter(p => (p.mortgage_balance || 0) > 0), [properties])

  const portfolioDebt = useMemo(() => {
    const totalBalance = loansWithMortgage.reduce((s, p) => s + (p.mortgage_balance || 0), 0)
    const totalPayment = loansWithMortgage.reduce((s, p) => s + (p.mortgage_payment || 0), 0)
    const totalValue = loansWithMortgage.reduce((s, p) => s + (p.current_value || 0), 0)
    return { totalBalance, totalPayment, totalValue, totalEquity: totalValue - totalBalance }
  }, [loansWithMortgage])

  /* ---------- refinance analyzer ---------- */
  const selectedProp = properties.find(p => p.id === refiPropId)

  const refiResults = useMemo(() => {
    if (!selectedProp) return null
    const balance = selectedProp.mortgage_balance || 0
    const currentRate = selectedProp.mortgage_rate || 7.0
    const currentPayment = selectedProp.mortgage_payment || 0
    const newRate = parseFloat(refiNewRate) || 0
    const newTerm = parseInt(refiNewTerm) || 30
    const newPayment = calcMonthly(balance, newRate, newTerm)
    const monthlySavings = currentPayment - newPayment
    const closingCosts = balance * 0.02 // estimate 2% closing costs
    const breakEvenMonths = monthlySavings > 0 ? Math.ceil(closingCosts / monthlySavings) : 0

    // estimate remaining current term from rate/balance/payment
    let currentRemaining = 25
    if (currentRate > 0 && balance > 0 && currentPayment > 0) {
      const r = currentRate / 100 / 12
      const rem = -Math.log(1 - (balance * r / currentPayment)) / Math.log(1 + r)
      if (rem > 0 && rem < 600) currentRemaining = Math.ceil(rem / 12)
    }
    const currentTotalCost = currentPayment * currentRemaining * 12
    const newTotalCost = newPayment * newTerm * 12 + closingCosts
    const totalInterestSavings = currentTotalCost - newTotalCost

    return { balance, currentRate, currentPayment, newPayment, monthlySavings, totalInterestSavings, breakEvenMonths, closingCosts }
  }, [selectedProp, refiNewRate, refiNewTerm])

  /* ---------- pre-qualification ---------- */
  const prequalResults = useMemo(() => {
    const income = parseFloat(annualIncome) || 0
    const debts = parseFloat(monthlyDebts) || 0
    const downAvail = parseFloat(prequalDown) || 0
    const monthlyIncome = income / 12

    // DTI: front-end 28%, back-end 36% (conventional), adjust by credit
    let maxDtiBack = 0.36
    if (creditRange === '800+') maxDtiBack = 0.43
    else if (creditRange === '740-799') maxDtiBack = 0.41
    else if (creditRange === '680-739') maxDtiBack = 0.38
    else if (creditRange === '620-679') maxDtiBack = 0.36
    else maxDtiBack = 0.33

    const maxTotalDebt = monthlyIncome * maxDtiBack
    const maxHousingPayment = Math.max(0, maxTotalDebt - debts)
    const dtiRatio = monthlyIncome > 0 ? ((debts + maxHousingPayment) / monthlyIncome) * 100 : 0

    // Back-calculate max loan from max housing payment (subtract estimated tax/ins)
    const estRate = rates.thirtyYearFixed || 6.85
    const r = estRate / 100 / 12
    const n = 360
    const maxLoan = maxHousingPayment > 0
      ? (maxHousingPayment * 0.80) * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n))
      : 0
    const maxPurchase = maxLoan + downAvail

    return { maxPurchase, maxLoan, estimatedPayment: maxHousingPayment, dtiRatio, maxDtiBack: maxDtiBack * 100 }
  }, [annualIncome, monthlyDebts, creditRange, prequalDown, rates.thirtyYearFixed])

  /* ---------- loading skeleton ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-border rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-card border border-border rounded-xl p-6 h-32 animate-pulse" />)}
        </div>
      </div>
    )
  }

  /* ---------- rate trend helper ---------- */
  function trend(current: number | null, lastWeek: number | null) {
    if (current == null || lastWeek == null) return null
    const diff = current - lastWeek
    if (Math.abs(diff) < 0.005) return null
    return diff > 0
      ? <span className="inline-flex items-center gap-0.5 text-red text-xs"><TrendingUp className="h-3 w-3" /> +{diff.toFixed(2)}%</span>
      : <span className="inline-flex items-center gap-0.5 text-green text-xs"><TrendingDown className="h-3 w-3" /> {diff.toFixed(2)}%</span>
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Financing Hub</h1>
        <p className="text-sm text-muted mt-1">Find the best rates and manage your loans</p>
      </div>

      {/* ============================================================ */}
      {/*  1. Current Rates Banner                                      */}
      {/* ============================================================ */}
      <Card variant="default" padding="md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
              <Landmark className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 className="label text-[11px]">Current Mortgage Rates</h2>
              <p className="text-xs text-muted">From FRED / Freddie Mac</p>
            </div>
          </div>
          <Badge variant="default" size="sm">Rates as of {rates.asOf}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: '30-Year Fixed', val: rates.thirtyYearFixed, prev: rates.lastWeek.thirtyYearFixed },
            { label: '15-Year Fixed', val: rates.fifteenYearFixed, prev: rates.lastWeek.fifteenYearFixed },
            { label: '5/1 ARM', val: rates.fiveOneArm, prev: rates.lastWeek.fiveOneArm },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-5 text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <p className="label mb-2">{item.label}</p>
              <p className="text-3xl font-bold text-gold font-mono">
                {ratesLoading ? <span className="inline-block w-16 h-8 bg-border rounded animate-pulse" /> : `${item.val?.toFixed(2) ?? '--'}%`}
              </p>
              <div className="mt-2 h-4">{!ratesLoading && trend(item.val, item.prev)}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  2. Mortgage Calculator                                       */}
      {/* ============================================================ */}
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <Calculator className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="label text-[11px]">Mortgage Calculator</h2>
            <p className="text-xs text-muted">Estimate payments and total cost</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* inputs */}
          <div className="space-y-5">
            <Input label="Home Price" type="number" value={homePrice} onChange={e => setHomePrice(e.target.value)} icon={<DollarSign className="h-4 w-4" />} />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-muted font-body">Down Payment</label>
                <span className="text-sm font-semibold text-gold font-mono">{downPct}% ({fmtWhole(parseFloat(homePrice || '0') * downPct / 100)})</span>
              </div>
              <input
                type="range" min={0} max={50} step={1} value={downPct}
                onChange={e => setDownPct(parseInt(e.target.value))}
                className="w-full h-2 bg-[#080808] rounded-lg appearance-none cursor-pointer accent-gold"
                style={{ background: `linear-gradient(to right, #c9a84c 0%, #c9a84c ${downPct * 2}%, #1e1e1e ${downPct * 2}%, #1e1e1e 100%)` }}
              />
              <div className="flex justify-between text-[10px] text-muted mt-1"><span>0%</span><span>25%</span><span>50%</span></div>
            </div>

            <Input label="Interest Rate (%)" type="number" step="0.05" value={calcRate} onChange={e => setCalcRate(e.target.value)} icon={<Percent className="h-4 w-4" />} />

            <Select
              label="Loan Term"
              value={calcTerm}
              onChange={e => setCalcTerm(e.target.value)}
              options={[{ value: '15', label: '15 Years' }, { value: '20', label: '20 Years' }, { value: '30', label: '30 Years' }]}
            />
          </div>

          {/* results */}
          <div className="space-y-5">
            <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <p className="label mb-1">Monthly Payment (P&I)</p>
              <p className="text-3xl font-bold text-gold font-mono">{fmt(calcResults.monthlyPI)}</p>
              <div className="border-t border-border mt-3 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-muted">With taxes + insurance (est.)</span><span className="text-white font-mono">{fmt(calcResults.totalMonthly)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Total Interest Over Life</span><span className="text-red font-mono">{fmtShort(calcResults.totalInterest)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Total Cost</span><span className="text-white font-mono">{fmtShort(calcResults.totalCost)}</span></div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted mb-3">Amortization (Principal vs Interest by Year)</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={amortData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,37,48,0.6)" vertical={false} />
                  <XAxis dataKey="year" stroke="#4A6080" tick={{ fill: '#4A6080', fontSize: 10 }} axisLine={{ stroke: '#1e1e1e' }} tickLine={false} />
                  <YAxis stroke="#4A6080" tick={{ fill: '#4A6080', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtShort(v)} width={55} />
                  <RechartsTooltip content={<AmortTooltip />} />
                  <Area type="monotone" dataKey="principal" stackId="1" stroke="#c9a84c" fill="#c9a84c" fillOpacity={0.3} name="Principal" />
                  <Area type="monotone" dataKey="interest" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.2} name="Interest" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  3. My Loans                                                  */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <Building2 className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="label text-[11px]">My Loans</h2>
            <p className="text-xs text-muted">{loansWithMortgage.length} active mortgages</p>
          </div>
        </div>

        {loansWithMortgage.length === 0 ? (
          <Card variant="default" padding="lg">
            <p className="text-center text-sm text-muted">No properties with mortgage data found. Add mortgage details to your properties to see them here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loansWithMortgage.map(prop => {
              const ltv = prop.current_value && prop.mortgage_balance ? (prop.mortgage_balance / prop.current_value) * 100 : 0
              let payoffEst = '--'
              if (prop.mortgage_rate && prop.mortgage_balance && prop.mortgage_payment && prop.mortgage_rate > 0) {
                const r = prop.mortgage_rate / 100 / 12
                const rem = -Math.log(1 - (prop.mortgage_balance * r / prop.mortgage_payment)) / Math.log(1 + r)
                if (rem > 0 && rem < 600) {
                  const d = new Date(); d.setMonth(d.getMonth() + Math.ceil(rem))
                  payoffEst = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                }
              }
              return (
                <Card key={prop.id} variant="default" padding="md">
                  <p className="font-display font-semibold text-sm text-white truncate">{prop.address}</p>
                  <p className="text-xs text-muted mt-0.5">{prop.city}, {prop.state} {prop.zip}</p>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 text-sm">
                    <div><span className="text-muted text-xs">Original Amount</span><p className="text-white font-medium font-mono">{prop.purchase_price ? fmtWhole(prop.purchase_price) : '--'}</p></div>
                    <div><span className="text-muted text-xs">Current Balance</span><p className="text-white font-medium font-mono">{prop.mortgage_balance ? fmtWhole(prop.mortgage_balance) : '--'}</p></div>
                    <div><span className="text-muted text-xs">Rate</span><p className="text-gold font-medium font-mono">{prop.mortgage_rate ? `${prop.mortgage_rate}%` : '--'}</p></div>
                    <div><span className="text-muted text-xs">Monthly Payment</span><p className="text-white font-medium font-mono">{prop.mortgage_payment ? fmt(prop.mortgage_payment) : '--'}</p></div>
                    <div><span className="text-muted text-xs">Payoff Date (est.)</span><p className="text-white font-medium font-mono">{payoffEst}</p></div>
                    <div><span className="text-muted text-xs">Lender</span><p className="text-white font-medium">--</p></div>
                  </div>

                  {/* LTV bar */}
                  {ltv > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted">LTV Ratio</span>
                        <span className={cn('font-semibold font-mono', ltv > 80 ? 'text-red' : ltv > 60 ? 'text-gold' : 'text-green')}>{ltv.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-[#080808] rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', ltv > 80 ? 'bg-red' : ltv > 60 ? 'bg-gold' : 'bg-green')}
                          style={{ width: `${Math.min(ltv, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}

            {/* Portfolio Debt Summary */}
            <Card variant="elevated" padding="md" className="border-gold/20">
              <p className="label mb-4">Total Portfolio Debt</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted">Outstanding Balance</span><span className="text-white font-bold font-mono">{fmtWhole(portfolioDebt.totalBalance)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Monthly Payments</span><span className="text-white font-bold font-mono">{fmt(portfolioDebt.totalPayment)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Portfolio Value</span><span className="text-white font-bold font-mono">{fmtWhole(portfolioDebt.totalValue)}</span></div>
                <div className="border-t border-border pt-3 flex justify-between text-sm"><span className="text-muted">Total Equity</span><span className="text-green font-bold font-mono">{fmtWhole(portfolioDebt.totalEquity)}</span></div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  4. Refinance Analyzer                                        */}
      {/* ============================================================ */}
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <RefreshCw className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="label text-[11px]">Refinance Analyzer</h2>
            <p className="text-xs text-muted">Compare current vs. new loan terms</p>
          </div>
        </div>

        <Select
          label="Select Property"
          value={refiPropId}
          onChange={e => setRefiPropId(e.target.value)}
          placeholder="Choose a property..."
          options={properties.filter(p => p.mortgage_balance && p.mortgage_balance > 0).map(p => ({ value: p.id, label: `${p.address} - ${p.city}, ${p.state}` }))}
          wrapperClassName="mb-6"
        />

        {selectedProp && refiResults ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current */}
            <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <h3 className="label mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-muted" />Current Loan</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Balance</span><span className="text-white font-mono">{fmtWhole(refiResults.balance)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Rate</span><span className="text-gold font-mono">{refiResults.currentRate}%</span></div>
                <div className="flex justify-between"><span className="text-muted">Payment</span><span className="text-white font-mono">{fmt(refiResults.currentPayment)}</span></div>
              </div>
            </div>

            {/* New */}
            <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <h3 className="label mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gold" />New Loan</h3>
              <div className="space-y-4">
                <Input label="New Rate (%)" type="number" step="0.05" value={refiNewRate} onChange={e => setRefiNewRate(e.target.value)} />
                <Select label="New Term" value={refiNewTerm} onChange={e => setRefiNewTerm(e.target.value)} options={[{ value: '15', label: '15 Years' }, { value: '20', label: '20 Years' }, { value: '30', label: '30 Years' }]} />
                <div className="flex justify-between text-sm pt-1"><span className="text-muted">New Payment</span><span className="text-gold font-bold font-mono">{fmt(refiResults.newPayment)}</span></div>
              </div>
            </div>

            {/* Results */}
            <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <h3 className="label mb-4">Analysis</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted">Monthly Savings</p>
                  <p className={cn('text-2xl font-bold font-mono', refiResults.monthlySavings > 0 ? 'text-green' : 'text-red')}>
                    {refiResults.monthlySavings > 0 ? '+' : ''}{fmt(refiResults.monthlySavings)}
                  </p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted">Total Interest Savings</p>
                  <p className={cn('text-lg font-bold font-mono', refiResults.totalInterestSavings > 0 ? 'text-green' : 'text-red')}>
                    {refiResults.totalInterestSavings > 0 ? '+' : ''}{fmtShort(refiResults.totalInterestSavings)}
                  </p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted">Break-even Point</p>
                  <p className="text-lg font-bold text-white font-mono">
                    {refiResults.breakEvenMonths > 0 ? `${refiResults.breakEvenMonths} months` : 'N/A'}
                  </p>
                  {refiResults.breakEvenMonths > 0 && <p className="text-[10px] text-muted font-mono">Est. closing costs: {fmtWhole(refiResults.closingCosts)}</p>}
                </div>
                <Button variant="outline" fullWidth icon={<ArrowRight className="h-4 w-4" />}>Contact Lender</Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-8">Select a property above to analyze refinance options.</p>
        )}
      </Card>

      {/* ============================================================ */}
      {/*  5. Pre-Qualification Estimator                               */}
      {/* ============================================================ */}
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <DollarSign className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="label text-[11px]">Pre-Qualification Estimator</h2>
            <p className="text-xs text-muted">Estimate how much home you can afford</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <Input label="Annual Income" type="number" value={annualIncome} onChange={e => setAnnualIncome(e.target.value)} icon={<DollarSign className="h-4 w-4" />} />
            <Input label="Monthly Debts (car, student loans, etc.)" type="number" value={monthlyDebts} onChange={e => setMonthlyDebts(e.target.value)} icon={<DollarSign className="h-4 w-4" />} />
            <Select
              label="Credit Score Range"
              value={creditRange}
              onChange={e => setCreditRange(e.target.value)}
              options={[
                { value: '800+', label: '800+ (Exceptional)' },
                { value: '740-799', label: '740-799 (Very Good)' },
                { value: '680-739', label: '680-739 (Good)' },
                { value: '620-679', label: '620-679 (Fair)' },
                { value: 'below-620', label: 'Below 620 (Poor)' },
              ]}
            />
            <Input label="Down Payment Available" type="number" value={prequalDown} onChange={e => setPrequalDown(e.target.value)} icon={<DollarSign className="h-4 w-4" />} />
          </div>

          <div className="space-y-5">
            <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <p className="label mb-1">Estimated Max Purchase Price</p>
              <p className="text-3xl font-bold text-gold font-mono">{fmtWhole(prequalResults.maxPurchase)}</p>
              <div className="border-t border-border mt-3 pt-3 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted">Max Loan Amount</span><span className="text-white font-medium font-mono">{fmtWhole(prequalResults.maxLoan)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Estimated Monthly Payment</span><span className="text-white font-medium font-mono">{fmt(prequalResults.estimatedPayment)}</span></div>
              </div>
            </div>

            {/* DTI visualization */}
            <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-medium text-muted">Debt-to-Income Ratio</p>
                <span className={cn(
                  'text-sm font-bold font-mono',
                  prequalResults.dtiRatio > 43 ? 'text-red' : prequalResults.dtiRatio > 36 ? 'text-gold' : 'text-green',
                )}>
                  {prequalResults.dtiRatio.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-border rounded-full overflow-hidden relative">
                <div
                  className={cn('h-full rounded-full transition-all duration-500',
                    prequalResults.dtiRatio > 43 ? 'bg-red' : prequalResults.dtiRatio > 36 ? 'bg-gold' : 'bg-green',
                  )}
                  style={{ width: `${Math.min(prequalResults.dtiRatio / 50 * 100, 100)}%` }}
                />
                {/* threshold markers */}
                <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: `${(36 / 50) * 100}%` }} />
                <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: `${(43 / 50) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted mt-1.5">
                <span>0%</span>
                <span>36% (Conv.)</span>
                <span>43% (FHA)</span>
                <span>50%</span>
              </div>
              <p className="text-[10px] text-muted mt-2 font-mono">
                Max allowed DTI for your credit: {prequalResults.maxDtiBack.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page export with FeatureGate                                       */
/* ------------------------------------------------------------------ */

export default function FinancingHubPage() {
  return (
    <FeatureGate feature="financingHub">
      <FinancingHubContent />
    </FeatureGate>
  )
}
