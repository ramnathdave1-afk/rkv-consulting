'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  Receipt,
  Upload,
  ChevronLeft,
  ChevronRight,
  FileText,
  BarChart3,
  Building2,
  Calculator,
  ClipboardList,
  Percent,
  Car,
  ArrowRightLeft,
  Clock,
  Sparkles,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { FeatureGate } from '@/components/paywall/FeatureGate'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { cn } from '@/lib/utils'
import type { Property, Tenant, Transaction } from '@/types'
import { ScheduleETab } from '@/components/accounting/ScheduleETab'
import { DepreciationTab } from '@/components/accounting/DepreciationTab'
import { Exchange1031Tab } from '@/components/accounting/Exchange1031Tab'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const INCOME_CATEGORIES = ['Rent', 'Late Fee', 'Application Fee', 'Laundry', 'Parking', 'Other']
const EXPENSE_CATEGORIES = ['Mortgage', 'Property Tax', 'Insurance', 'Maintenance', 'Management', 'Utilities', 'Legal', 'Advertising', 'HOA', 'Other']

const PIE_COLORS = ['#c9a84c', '#c9a84c', '#c9a84c', '#3B82F6', '#A855F7', '#DC2626', '#F97316', '#EC4899', '#8B5CF6', '#14B8A6']

const DATE_RANGES = [
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
] as const

const ITEMS_PER_PAGE = 25

// IRS Schedule E category mapping
const SCHEDULE_E_CATEGORIES: { label: string; line: string; mapFrom: string[] }[] = [
  { label: 'Advertising', line: '5', mapFrom: ['Advertising'] },
  { label: 'Auto and Travel', line: '6', mapFrom: [] },
  { label: 'Cleaning and Maintenance', line: '7', mapFrom: ['Maintenance'] },
  { label: 'Commissions', line: '8', mapFrom: ['Management'] },
  { label: 'Insurance', line: '9', mapFrom: ['Insurance'] },
  { label: 'Legal and Professional Fees', line: '10', mapFrom: ['Legal'] },
  { label: 'Mortgage Interest', line: '12', mapFrom: ['Mortgage'] },
  { label: 'Taxes', line: '16', mapFrom: ['Property Tax'] },
  { label: 'Utilities', line: '17', mapFrom: ['Utilities'] },
  { label: 'HOA / Other', line: '19', mapFrom: ['HOA', 'Other'] },
]

// Report definitions
const REPORT_CARDS = [
  { id: 'annual_summary', title: 'Annual Summary', description: 'Complete annual overview with income, expenses, and net profit across all properties', icon: FileText },
  { id: 'property_pl', title: 'Property P&L', description: 'Profit & loss statement broken down by individual property', icon: Building2 },
  { id: 'cash_flow', title: 'Cash Flow Statement', description: 'Detailed cash flow analysis showing operating, investing, and financing activities', icon: TrendingUp },
  { id: 'rent_roll', title: 'Rent Roll', description: 'Current tenant roster with lease terms, rent amounts, and payment history', icon: ClipboardList },
  { id: 'owner_statement', title: 'Owner Statement', description: 'Monthly owner statement with distributions, reserves, and management fees', icon: Receipt },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCurrencyShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { start, end }
}

function getQuarterRange(date: Date): { start: Date; end: Date } {
  const quarter = Math.floor(date.getMonth() / 3)
  const start = new Date(date.getFullYear(), quarter * 3, 1)
  const end = new Date(date.getFullYear(), quarter * 3 + 3, 0)
  return { start, end }
}

function getYearRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), 0, 1)
  const end = new Date(date.getFullYear(), 11, 31)
  return { start, end }
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-deep border border-border rounded-lg px-3 py-2 shadow-card">
      <p className="text-xs text-muted mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold font-mono" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { percent: number } }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-deep border border-border rounded-lg px-3 py-2 shadow-card">
      <p className="text-xs text-muted">{payload[0].name}</p>
      <p className="text-sm font-semibold text-white font-mono">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Receipt Dropzone Component                                         */
/* ------------------------------------------------------------------ */

function ReceiptDropzone({ onFile }: { onFile: (file: File | null) => void }) {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDrop: (files) => {
      if (files.length > 0) onFile(files[0])
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/40',
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-5 w-5 text-muted mx-auto mb-2" />
      {acceptedFiles.length > 0 ? (
        <p className="text-sm text-white">{acceptedFiles[0].name}</p>
      ) : (
        <p className="text-xs text-muted">
          {isDragActive ? 'Drop receipt here' : 'Drag & drop receipt, or click to browse'}
        </p>
      )}
      <p className="text-[10px] text-muted/60 mt-1">PNG, JPG, PDF up to 5MB</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Transaction Modal                                              */
/* ------------------------------------------------------------------ */

interface TransactionFormData {
  type: 'income' | 'expense'
  property_id: string
  tenant_id: string
  category: string
  amount: string
  date: string
  description: string
  tax_deductible: boolean
  receipt: File | null
  notes: string
}

function AddTransactionModal({
  open,
  onClose,
  onSaved,
  properties,
  tenants,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  properties: Property[]
  tenants: Tenant[]
}) {
  const supabase = createClient()
  const [form, setForm] = useState<TransactionFormData>({
    type: 'income',
    property_id: '',
    tenant_id: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    tax_deductible: false,
    notes: '',
    receipt: null,
  })

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const filteredTenants = form.property_id
    ? tenants.filter((t) => t.property_id === form.property_id)
    : tenants

  // Default tax_deductible for expenses
  useEffect(() => {
    if (form.type === 'expense') {
      setForm((prev) => ({ ...prev, tax_deductible: true }))
    } else {
      setForm((prev) => ({ ...prev, tax_deductible: false }))
    }
  }, [form.type])

  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.category || !form.amount || !form.date) {
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        property_id: form.property_id || null,
        tenant_id: form.tenant_id || null,
        type: form.type,
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || null,
        date: form.date,
        tax_deductible: form.tax_deductible,
        notes: form.notes || null,
      })

      if (error) {
        console.error('Transaction save error:', error)
        return
      }

      onSaved()
      onClose()
    } catch (err) {
      console.error('Transaction save error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-glow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-display font-bold text-lg text-white">Add Transaction</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Type toggle */}
          <div className="flex bg-deep rounded-lg p-1">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, type: 'income', category: '' }))}
              className={cn(
                'flex-1 py-2 rounded-md text-sm font-semibold transition-all',
                form.type === 'income'
                  ? 'bg-green/15 text-green'
                  : 'text-muted hover:text-white',
              )}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, type: 'expense', category: '' }))}
              className={cn(
                'flex-1 py-2 rounded-md text-sm font-semibold transition-all',
                form.type === 'expense'
                  ? 'bg-red/15 text-red'
                  : 'text-muted hover:text-white',
              )}
            >
              Expense
            </button>
          </div>

          {/* Property selector */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Property</label>
            <select
              value={form.property_id}
              onChange={(e) => setForm((prev) => ({ ...prev, property_id: e.target.value, tenant_id: '' }))}
              className="w-full h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </div>

          {/* Tenant selector (income only) */}
          {form.type === 'income' && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Tenant</label>
              <select
                value={form.tenant_id}
                onChange={(e) => setForm((prev) => ({ ...prev, tenant_id: e.target.value }))}
                className="w-full h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value="">Select Tenant</option>
                {filteredTenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full h-10 rounded-lg bg-deep border border-border pl-7 pr-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description..."
              className="w-full h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {/* Tax Deductible toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-white">Tax Deductible</label>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, tax_deductible: !prev.tax_deductible }))}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                form.tax_deductible ? 'bg-gold' : 'bg-border',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                  form.tax_deductible && 'translate-x-5',
                )}
              />
            </button>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Receipt</label>
            <ReceiptDropzone onFile={(file) => setForm((prev) => ({ ...prev, receipt: file }))} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={3}
              className="w-full rounded-lg bg-deep border border-border px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-semibold bg-gold text-black hover:brightness-110 hover:shadow-glow transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Accounting Page (inner content)                                    */
/* ------------------------------------------------------------------ */

function AccountingContent() {
  const supabase = createClient()

  // Data state
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Filter state (transactions tab)
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('year')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | 'income' | 'expense'>('')

  // Sort state
  const [sortColumn, setSortColumn] = useState<'date' | 'property' | 'category' | 'type' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Modal
  const [showAddModal, setShowAddModal] = useState(false)

  // By Property tab
  const [selectedPropertyId, setSelectedPropertyId] = useState('')

  // Reports tab
  const [reportDateRange, setReportDateRange] = useState<{ start: string; end: string }>({
    start: `${new Date().getFullYear()}-01-01`,
    end: `${new Date().getFullYear()}-12-31`,
  })

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [propertiesRes, tenantsRes] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('tenants')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      const propsData = (propertiesRes.data || []) as Property[]
      const tenantsData = (tenantsRes.data || []) as Tenant[]

      setProperties(propsData)
      setTenants(tenantsData)

      // Fetch real transactions from database
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
      setTransactions((txData || []) as Transaction[])

      // Default selected property
      if (propsData.length > 0) {
        setSelectedPropertyId(propsData[0].id)
      }
    } catch (err) {
      console.error('Accounting data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ---------------------------------------------------------------- */
  /*  Date range filtering                                             */
  /* ---------------------------------------------------------------- */

  const now = new Date()
  const dateFilter = useMemo(() => {
    switch (dateRange) {
      case 'month': return getMonthRange(now)
      case 'quarter': return getQuarterRange(now)
      case 'year': return getYearRange(now)
      case 'custom': return getYearRange(now)
    }
  }, [dateRange])

  /* ---------------------------------------------------------------- */
  /*  Filtered + sorted transactions                                   */
  /* ---------------------------------------------------------------- */

  const filteredTransactions = useMemo(() => {
    const result = transactions.filter((tx) => {
      const txDate = new Date(tx.date)
      if (txDate < dateFilter.start || txDate > dateFilter.end) return false
      if (propertyFilter && tx.property_id !== propertyFilter) return false
      if (categoryFilter && tx.category !== categoryFilter) return false
      if (typeFilter && tx.type !== typeFilter) return false
      return true
    })

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'category':
          comparison = a.category.localeCompare(b.category)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'property': {
          const propA = properties.find((p) => p.id === a.property_id)?.address || ''
          const propB = properties.find((p) => p.id === b.property_id)?.address || ''
          comparison = propA.localeCompare(propB)
          break
        }
      }
      return sortDir === 'desc' ? -comparison : comparison
    })

    return result
  }, [transactions, dateFilter, propertyFilter, categoryFilter, typeFilter, sortColumn, sortDir, properties])

  // Paginated
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  /* ---------------------------------------------------------------- */
  /*  Summary calculations                                             */
  /* ---------------------------------------------------------------- */

  const totalIncome = filteredTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalExpenses = filteredTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const _netProfit = totalIncome - totalExpenses

  // YTD calculations
  const ytdRange = getYearRange(now)
  const ytdTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date)
    return txDate >= ytdRange.start && txDate <= ytdRange.end
  })
  const ytdIncome = ytdTransactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0)
  const ytdExpenses = ytdTransactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0)
  const ytdProfit = ytdIncome - ytdExpenses

  // Prior year comparison (mock: 90% of current)
  const priorYearIncome = ytdIncome * 0.88
  const priorYearExpenses = ytdExpenses * 0.92
  const priorYearProfit = priorYearIncome - priorYearExpenses

  /* ---------------------------------------------------------------- */
  /*  Chart data                                                       */
  /* ---------------------------------------------------------------- */

  const monthlyChartData = useMemo(() => {
    return MONTHS.map((month, i) => {
      const monthTx = transactions.filter((tx) => {
        const d = new Date(tx.date)
        return d.getMonth() === i && d.getFullYear() === now.getFullYear()
      })
      const income = monthTx.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
      const expenses = monthTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
      return { month, Income: income, Expenses: expenses }
    })
  }, [transactions])

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        map.set(tx.category, (map.get(tx.category) || 0) + tx.amount)
      })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredTransactions])

  /* ---------------------------------------------------------------- */
  /*  P&L data                                                         */
  /* ---------------------------------------------------------------- */

  const _plData = useMemo(() => {
    const incomeByCategory: Record<string, number[]> = {}
    const expenseByCategory: Record<string, number[]> = {}

    INCOME_CATEGORIES.forEach((c) => { incomeByCategory[c] = Array(12).fill(0) })
    EXPENSE_CATEGORIES.forEach((c) => { expenseByCategory[c] = Array(12).fill(0) })

    transactions.forEach((tx) => {
      const month = new Date(tx.date).getMonth()
      if (new Date(tx.date).getFullYear() !== now.getFullYear()) return
      if (tx.type === 'income') {
        if (!incomeByCategory[tx.category]) incomeByCategory[tx.category] = Array(12).fill(0)
        incomeByCategory[tx.category][month] += tx.amount
      } else {
        if (!expenseByCategory[tx.category]) expenseByCategory[tx.category] = Array(12).fill(0)
        expenseByCategory[tx.category][month] += tx.amount
      }
    })

    return { incomeByCategory, expenseByCategory }
  }, [transactions])

  /* ---------------------------------------------------------------- */
  /*  Tax summary                                                      */
  /* ---------------------------------------------------------------- */

  const TAX_RATE = 0.30
  const deductibleExpenses = ytdTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const _estimatedTaxSavings = deductibleExpenses * TAX_RATE

  const _deductibleByCategory = useMemo(() => {
    const map = new Map<string, number>()
    ytdTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        map.set(tx.category, (map.get(tx.category) || 0) + tx.amount)
      })
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [ytdTransactions])

  /* ---------------------------------------------------------------- */
  /*  By Property calculations                                         */
  /* ---------------------------------------------------------------- */

  const propertyMetrics = useMemo(() => {
    if (!selectedPropertyId) return null

    const propTx = transactions.filter((tx) => tx.property_id === selectedPropertyId)
    const ytdPropTx = propTx.filter((tx) => {
      const txDate = new Date(tx.date)
      return txDate >= ytdRange.start && txDate <= ytdRange.end
    })

    const propIncome = ytdPropTx.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
    const propExpenses = ytdPropTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
    const propNOI = propIncome - propExpenses
    const prop = properties.find((p) => p.id === selectedPropertyId)
    const capRate = prop?.current_value && prop.current_value > 0 ? (propNOI / prop.current_value) * 100 : 0

    // Monthly breakdown
    const monthlyBreakdown = MONTHS.map((month, i) => {
      const mTx = ytdPropTx.filter((tx) => new Date(tx.date).getMonth() === i)
      const income = mTx.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
      const expense = mTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
      return { month, income, expense, net: income - expense }
    })

    // Income breakdown
    const incomeBreakdown = new Map<string, number>()
    ytdPropTx.filter((tx) => tx.type === 'income').forEach((tx) => {
      incomeBreakdown.set(tx.category, (incomeBreakdown.get(tx.category) || 0) + tx.amount)
    })

    // Expense breakdown
    const expBreakdown = new Map<string, number>()
    ytdPropTx.filter((tx) => tx.type === 'expense').forEach((tx) => {
      expBreakdown.set(tx.category, (expBreakdown.get(tx.category) || 0) + tx.amount)
    })

    return {
      property: prop,
      income: propIncome,
      expenses: propExpenses,
      noi: propNOI,
      capRate,
      monthlyBreakdown,
      incomeBreakdown: Array.from(incomeBreakdown.entries()).map(([cat, amt]) => ({ category: cat, amount: amt })),
      expenseBreakdown: Array.from(expBreakdown.entries()).map(([cat, amt]) => ({ category: cat, amount: amt })),
    }
  }, [selectedPropertyId, transactions, properties, ytdRange])

  /* ---------------------------------------------------------------- */
  /*  Schedule E data                                                   */
  /* ---------------------------------------------------------------- */

  const scheduleEData = useMemo(() => {
    const grossRentalIncome = ytdTransactions
      .filter((tx) => tx.type === 'income' && tx.category === 'Rent')
      .reduce((s, tx) => s + tx.amount, 0)

    const expenseMap = new Map<string, number>()
    ytdTransactions.filter((tx) => tx.type === 'expense').forEach((tx) => {
      expenseMap.set(tx.category, (expenseMap.get(tx.category) || 0) + tx.amount)
    })

    const lines = SCHEDULE_E_CATEGORIES.map((cat) => {
      const amount = cat.mapFrom.reduce((s, key) => s + (expenseMap.get(key) || 0), 0)
      return { ...cat, amount }
    })

    const totalExpensesScheduleE = lines.reduce((s, l) => s + l.amount, 0)

    return {
      grossRentalIncome,
      lines,
      totalExpenses: totalExpensesScheduleE,
      netIncome: grossRentalIncome - totalExpensesScheduleE,
    }
  }, [ytdTransactions])

  /* ---------------------------------------------------------------- */
  /*  Depreciation data (placeholder)                                   */
  /* ---------------------------------------------------------------- */

  const depreciationData = useMemo(() => {
    return properties.map((prop) => {
      const purchasePrice = prop.purchase_price || 0
      const landValue = purchasePrice * 0.2 // estimate 20% land
      const depreciableBasis = purchasePrice - landValue
      const annualDepreciation = depreciableBasis / 27.5
      const purchaseDate = prop.purchase_date ? new Date(prop.purchase_date) : new Date()
      const yearsHeld = Math.max(0, (now.getFullYear() - purchaseDate.getFullYear()))
      const accumulatedDepreciation = Math.min(annualDepreciation * yearsHeld, depreciableBasis)
      const remainingBasis = depreciableBasis - accumulatedDepreciation
      const yearsRemaining = Math.max(0, 27.5 - yearsHeld)

      return {
        property: prop,
        purchasePrice,
        landValue,
        depreciableBasis,
        annualDepreciation,
        accumulatedDepreciation,
        remainingBasis,
        yearsRemaining,
      }
    })
  }, [properties])

  /* ---------------------------------------------------------------- */
  /*  Sort handler                                                     */
  /* ---------------------------------------------------------------- */

  function handleSort(column: typeof sortColumn) {
    if (sortColumn === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDir('desc')
    }
    setCurrentPage(1)
  }

  function SortIcon({ column }: { column: typeof sortColumn }) {
    if (sortColumn !== column) return <ChevronDown className="h-3 w-3 text-muted/40" />
    return sortDir === 'desc'
      ? <ChevronDown className="h-3 w-3 text-gold" />
      : <ChevronUp className="h-3 w-3 text-gold" />
  }

  /* ---------------------------------------------------------------- */
  /*  Export handler                                                    */
  /* ---------------------------------------------------------------- */

  function handleExport() {
    const csvHeaders = ['Date', 'Property', 'Category', 'Description', 'Type', 'Amount', 'Tax Deductible']
    const csvRows = filteredTransactions.map((tx) => [
      tx.date,
      properties.find((p) => p.id === tx.property_id)?.address || 'N/A',
      tx.category,
      tx.description || '',
      tx.type,
      tx.amount.toFixed(2),
      tx.type === 'expense' ? 'Yes' : 'No',
    ])

    const csv = [csvHeaders, ...csvRows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounting-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportCPA() {
    // Placeholder: generate CPA package
    alert('CPA Package export coming soon. This will generate a comprehensive PDF with Schedule E, depreciation schedules, and supporting documentation.')
  }

  function handleGenerateReport(reportId: string) {
    // Placeholder: generate report PDF
    alert(`Generating ${reportId.replace(/_/g, ' ')} report... PDF generation coming soon.`)
  }

  /* ---------------------------------------------------------------- */
  /*  Loading skeleton                                                 */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="h-4 bg-border rounded w-24 mb-3" />
              <div className="h-8 bg-border rounded w-32" />
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-6 animate-pulse rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="h-64 bg-border/50 rounded-lg" />
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-white">Accounting Center</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white border border-border hover:border-gold/30 hover:bg-white/5 transition-all"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-black hover:brightness-110 hover:shadow-glow transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Tabs                                                         */}
      {/* ============================================================ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" icon={<BarChart3 className="w-4 h-4" />}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" icon={<Receipt className="w-4 h-4" />}>
            Transactions
          </TabsTrigger>
          <TabsTrigger value="by_property" icon={<Building2 className="w-4 h-4" />}>
            By Property
          </TabsTrigger>
          <TabsTrigger value="tax_center" icon={<Calculator className="w-4 h-4" />}>
            Tax Center
          </TabsTrigger>
          <TabsTrigger value="reports" icon={<FileText className="w-4 h-4" />}>
            Reports
          </TabsTrigger>
          <TabsTrigger value="schedule_e" icon={<ClipboardList className="w-4 h-4" />}>
            Schedule E
          </TabsTrigger>
          <TabsTrigger value="depreciation" icon={<Calculator className="w-4 h-4" />}>
            Depreciation
          </TabsTrigger>
          <TabsTrigger value="exchange_1031" icon={<ArrowRightLeft className="w-4 h-4" />}>
            1031 Exchange
          </TabsTrigger>
        </TabsList>

        {/* ========================================================== */}
        {/*  TAB 1: OVERVIEW                                            */}
        {/* ========================================================== */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="label">Total Revenue</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green/10">
                    <TrendingUp className="h-4 w-4 text-green" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green font-mono">{formatCurrency(ytdIncome)}</p>
                <p className="text-xs text-muted mt-1">Year to date</p>
              </div>

              {/* Total Expenses */}
              <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="label">Total Expenses</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red/10">
                    <TrendingDown className="h-4 w-4 text-red" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red font-mono">{formatCurrency(ytdExpenses)}</p>
                <p className="text-xs text-muted mt-1">Year to date</p>
              </div>

              {/* Net Income */}
              <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="label">Net Income</span>
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    ytdProfit >= 0 ? 'bg-green/10' : 'bg-red/10',
                  )}>
                    <DollarSign className={cn('h-4 w-4', ytdProfit >= 0 ? 'text-green' : 'text-red')} />
                  </div>
                </div>
                <p className={cn('text-2xl font-bold font-mono', ytdProfit >= 0 ? 'text-green' : 'text-red')}>
                  {formatCurrency(ytdProfit)}
                </p>
                <p className="text-xs text-muted mt-1">Year to date</p>
              </div>

              {/* Effective Tax Rate */}
              <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="label">Effective Tax Rate</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
                    <Percent className="h-4 w-4 text-gold" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gold font-mono">~{(TAX_RATE * 100).toFixed(0)}%</p>
                <p className="text-xs text-muted mt-1">Estimated rate</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income vs Expenses Bar Chart */}
              <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="label">Monthly Income vs Expenses</h3>
                  <span className="text-xs text-muted">{now.getFullYear()}</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 37, 48, 0.6)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#4A6080"
                      tick={{ fill: '#4A6080', fontSize: 11 }}
                      axisLine={{ stroke: '#1e1e1e' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#4A6080"
                      tick={{ fill: '#4A6080', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val: number) => formatCurrencyShort(val)}
                      width={60}
                    />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="Income" fill="#c9a84c" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#DC2626" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Expense Breakdown Donut */}
              <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="label">Expense Categories</h3>
                  <span className="text-xs text-muted">Year to date</span>
                </div>
                {expenseBreakdown.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {expenseBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full grid grid-cols-2 gap-2 mt-2">
                      {expenseBreakdown.slice(0, 8).map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-xs text-muted truncate">{item.name}</span>
                          <span className="text-xs text-white ml-auto font-mono">{formatCurrencyShort(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-sm text-muted">
                    No expense data available
                  </div>
                )}
              </div>
            </div>

            {/* YoY Comparison */}
            <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="label text-[11px]">Year-over-Year Comparison</h3>
                <span className="text-xs text-muted">{now.getFullYear()} vs {now.getFullYear() - 1}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-deep border border-border rounded-lg p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-2">Revenue</p>
                  <p className="text-xl font-bold text-green font-mono">{formatCurrency(ytdIncome)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green" />
                    <span className="text-xs text-green">
                      +{((ytdIncome / priorYearIncome - 1) * 100).toFixed(1)}% vs prior year
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">Prior: <span className="font-mono">{formatCurrency(priorYearIncome)}</span></p>
                </div>
                <div className="bg-deep border border-border rounded-lg p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-2">Expenses</p>
                  <p className="text-xl font-bold text-red font-mono">{formatCurrency(ytdExpenses)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-red" />
                    <span className="text-xs text-red">
                      +{((ytdExpenses / priorYearExpenses - 1) * 100).toFixed(1)}% vs prior year
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">Prior: <span className="font-mono">{formatCurrency(priorYearExpenses)}</span></p>
                </div>
                <div className="bg-deep border border-border rounded-lg p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-2">Net Income</p>
                  <p className={cn('text-xl font-bold font-mono', ytdProfit >= 0 ? 'text-gold' : 'text-red')}>
                    {formatCurrency(ytdProfit)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {ytdProfit >= priorYearProfit ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green" />
                        <span className="text-xs text-green">
                          +{((ytdProfit / priorYearProfit - 1) * 100).toFixed(1)}% vs prior year
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red" />
                        <span className="text-xs text-red">
                          {((ytdProfit / priorYearProfit - 1) * 100).toFixed(1)}% vs prior year
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">Prior: <span className="font-mono">{formatCurrency(priorYearProfit)}</span></p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 2: TRANSACTIONS                                        */}
        {/* ========================================================== */}
        <TabsContent value="transactions">
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-card border border-border rounded-xl p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="flex flex-wrap items-center gap-3">
                {/* Date range */}
                <div className="flex bg-deep rounded-lg p-0.5">
                  {DATE_RANGES.map((dr) => (
                    <button
                      key={dr.value}
                      type="button"
                      onClick={() => { setDateRange(dr.value); setCurrentPage(1) }}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                        dateRange === dr.value
                          ? 'bg-gold/15 text-gold'
                          : 'text-muted hover:text-white',
                      )}
                    >
                      {dr.label}
                    </button>
                  ))}
                </div>

                {/* Type filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value as '' | 'income' | 'expense'); setCurrentPage(1) }}
                  className="h-8 rounded-lg bg-deep border border-border px-3 text-xs text-white focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                {/* Property filter */}
                <select
                  value={propertyFilter}
                  onChange={(e) => { setPropertyFilter(e.target.value); setCurrentPage(1) }}
                  className="h-8 rounded-lg bg-deep border border-border px-3 text-xs text-white focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>

                {/* Category filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
                  className="h-8 rounded-lg bg-deep border border-border px-3 text-xs text-white focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="">All Categories</option>
                  <optgroup label="Income">
                    {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Expenses">
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>

                {/* Buttons */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted border border-border hover:border-gold/30 hover:text-white transition-all"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Bulk CSV Import
                  </button>
                  <span className="text-xs text-muted">
                    {filteredTransactions.length} transactions
                  </span>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        { key: 'date' as const, label: 'Date' },
                        { key: null, label: 'Description' },
                        { key: 'category' as const, label: 'Category' },
                        { key: 'property' as const, label: 'Property' },
                        { key: 'amount' as const, label: 'Amount' },
                        { key: null, label: 'Reconciled' },
                        { key: null, label: 'AI Category' },
                      ].map((col, i) => (
                        <th
                          key={i}
                          className={cn(
                            'px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted',
                            col.key && 'cursor-pointer hover:text-white transition-colors select-none',
                          )}
                          onClick={col.key ? () => handleSort(col.key!) : undefined}
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.key && <SortIcon column={col.key} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                          No transactions found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((tx) => {
                        const prop = properties.find((p) => p.id === tx.property_id)
                        return (
                          <tr key={tx.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-sm text-white whitespace-nowrap font-mono">
                              {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted truncate max-w-[200px]">
                              {tx.description || '--'}
                            </td>
                            <td className="px-4 py-3 text-sm text-text">{tx.category}</td>
                            <td className="px-4 py-3 text-sm text-text truncate max-w-[200px]">
                              {prop?.address || 'General'}
                            </td>
                            <td className={cn(
                              'px-4 py-3 text-sm font-semibold whitespace-nowrap font-mono',
                              tx.type === 'income' ? 'text-green' : 'text-red',
                            )}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </td>
                            <td className="px-4 py-3">
                              {tx.type === 'expense' ? (
                                <CheckCircle2 className="h-4 w-4 text-green" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted/30" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium font-mono text-purple-400 bg-purple-400/10 border border-purple-400/20 rounded-full px-2 py-0.5">
                                <Sparkles className="w-3 h-3" />
                                {tx.category}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const page = i + 1
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                            page === currentPage
                              ? 'bg-gold/15 text-gold'
                              : 'text-muted hover:text-white hover:bg-white/5',
                          )}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 3: BY PROPERTY                                         */}
        {/* ========================================================== */}
        <TabsContent value="by_property">
          <div className="space-y-6">
            {/* Property Selector */}
            <div className="bg-card border border-border rounded-xl p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="flex items-center gap-4">
                <label className="label whitespace-nowrap">Select Property:</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="flex-1 h-10 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>
              </div>
            </div>

            {propertyMetrics && (
              <>
                {/* Key Property Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <p className="label mb-2">Gross Income</p>
                    <p className="text-2xl font-bold text-green font-mono">{formatCurrency(propertyMetrics.income)}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <p className="label mb-2">Total Expenses</p>
                    <p className="text-2xl font-bold text-red font-mono">{formatCurrency(propertyMetrics.expenses)}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <p className="label mb-2">NOI</p>
                    <p className={cn('text-2xl font-bold font-mono', propertyMetrics.noi >= 0 ? 'text-gold' : 'text-red')}>
                      {formatCurrency(propertyMetrics.noi)}
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <p className="label mb-2">Cap Rate</p>
                    <p className="text-2xl font-bold text-gold font-mono">{propertyMetrics.capRate.toFixed(2)}%</p>
                    {propertyMetrics.property?.current_value && (
                      <p className="text-xs text-muted mt-1">
                        Value: {formatCurrency(propertyMetrics.property.current_value)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Income / Expense Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <h3 className="label mb-4">Income Breakdown</h3>
                    <div className="space-y-3">
                      {propertyMetrics.incomeBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center justify-between">
                          <span className="text-sm text-text">{item.category}</span>
                          <span className="text-sm font-semibold text-green font-mono">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Total Income</span>
                        <span className="text-sm font-bold text-green font-mono">{formatCurrency(propertyMetrics.income)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <h3 className="label mb-4">Expense Breakdown</h3>
                    <div className="space-y-3">
                      {propertyMetrics.expenseBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center justify-between">
                          <span className="text-sm text-text">{item.category}</span>
                          <span className="text-sm font-semibold text-red font-mono">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Total Expenses</span>
                        <span className="text-sm font-bold text-red font-mono">{formatCurrency(propertyMetrics.expenses)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Breakdown Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <div className="p-6 border-b border-border">
                    <h3 className="label text-[11px]">Monthly Breakdown</h3>
                    <p className="text-xs text-muted mt-1">
                      {propertyMetrics.property?.address || 'Selected Property'} - {now.getFullYear()}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">Month</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">Income</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">Expenses</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyMetrics.monthlyBreakdown.map((row) => (
                          <tr key={row.month} className="border-b border-border/50 hover:bg-white/[0.02]">
                            <td className="px-4 py-3 text-white">{row.month}</td>
                            <td className="px-4 py-3 text-right text-green font-mono">
                              {row.income > 0 ? formatCurrency(row.income) : '--'}
                            </td>
                            <td className="px-4 py-3 text-right text-red font-mono">
                              {row.expense > 0 ? formatCurrency(row.expense) : '--'}
                            </td>
                            <td className={cn('px-4 py-3 text-right font-semibold font-mono', row.net >= 0 ? 'text-green' : 'text-red')}>
                              {row.income > 0 || row.expense > 0 ? formatCurrency(row.net) : '--'}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gold/[0.03]">
                          <td className="px-4 py-3 font-bold text-gold">Total</td>
                          <td className="px-4 py-3 text-right font-bold text-green font-mono">{formatCurrency(propertyMetrics.income)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red font-mono">{formatCurrency(propertyMetrics.expenses)}</td>
                          <td className={cn('px-4 py-3 text-right font-bold font-mono', propertyMetrics.noi >= 0 ? 'text-green' : 'text-red')}>
                            {formatCurrency(propertyMetrics.noi)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 4: TAX CENTER                                          */}
        {/* ========================================================== */}
        <TabsContent value="tax_center">
          <div className="space-y-6">
            {/* Schedule E */}
            <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="label text-[11px]">Schedule E (Form 1040)</h3>
                  <p className="text-xs text-muted mt-1">Supplemental Income and Loss - Rental Real Estate | {now.getFullYear()}</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCPA}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-gold border border-gold/30 hover:bg-gold/10 transition-all"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Export CPA Package
                </button>
              </div>
              <div className="p-6">
                {/* Gross Rental Income */}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium text-white">Line 3 - Rents Received</p>
                    <p className="text-xs text-muted">Gross rental income from all properties</p>
                  </div>
                  <p className="text-lg font-bold text-green font-mono">{formatCurrency(scheduleEData.grossRentalIncome)}</p>
                </div>

                {/* Expense Lines */}
                <div className="mt-4">
                  <p className="label mb-3">Expenses</p>
                  <div className="space-y-1">
                    {scheduleEData.lines.map((line) => (
                      <div key={line.line} className="flex items-center justify-between py-2 hover:bg-white/[0.02] px-2 rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted w-10 font-mono">Line {line.line}</span>
                          <span className="text-sm text-text">{line.label}</span>
                        </div>
                        <span className="text-sm font-medium text-white tabular-nums font-mono">
                          {line.amount > 0 ? formatCurrency(line.amount) : '--'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-red">Line 20 - Total Expenses</p>
                    <p className="text-lg font-bold text-red font-mono">{formatCurrency(scheduleEData.totalExpenses)}</p>
                  </div>
                  <div className="flex items-center justify-between bg-gold/5 -mx-6 px-6 py-4 rounded-none">
                    <p className="text-sm font-bold text-gold">Line 21 - Net Rental Income (Loss)</p>
                    <p className={cn('text-xl font-bold font-mono', scheduleEData.netIncome >= 0 ? 'text-gold' : 'text-red')}>
                      {formatCurrency(scheduleEData.netIncome)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Depreciation Tracker */}
            <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="p-6 border-b border-border">
                <h3 className="label text-[11px]">Depreciation Tracker</h3>
                <p className="text-xs text-muted mt-1">27.5-year straight-line schedule for residential rental properties</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">Property</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">Basis</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">Annual Deduction</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">Accumulated</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">Remaining</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted">Years Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depreciationData.map((dep) => (
                      <tr key={dep.property.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white truncate max-w-[200px]">{dep.property.address}</td>
                        <td className="px-4 py-3 text-right text-text tabular-nums font-mono">{formatCurrency(dep.depreciableBasis)}</td>
                        <td className="px-4 py-3 text-right text-gold font-medium tabular-nums font-mono">{formatCurrency(dep.annualDepreciation)}</td>
                        <td className="px-4 py-3 text-right text-muted tabular-nums font-mono">{formatCurrency(dep.accumulatedDepreciation)}</td>
                        <td className="px-4 py-3 text-right text-white tabular-nums font-mono">{formatCurrency(dep.remainingBasis)}</td>
                        <td className="px-4 py-3 text-right text-muted tabular-nums font-mono">{dep.yearsRemaining.toFixed(1)}</td>
                      </tr>
                    ))}
                    {depreciationData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                          Add properties with purchase prices to see depreciation schedules
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {depreciationData.length > 0 && (
                    <tfoot>
                      <tr className="bg-gold/[0.03]">
                        <td className="px-4 py-3 font-bold text-gold">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-gold tabular-nums font-mono">
                          {formatCurrency(depreciationData.reduce((s, d) => s + d.depreciableBasis, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gold tabular-nums font-mono">
                          {formatCurrency(depreciationData.reduce((s, d) => s + d.annualDepreciation, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-muted tabular-nums font-mono">
                          {formatCurrency(depreciationData.reduce((s, d) => s + d.accumulatedDepreciation, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gold tabular-nums font-mono">
                          {formatCurrency(depreciationData.reduce((s, d) => s + d.remainingBasis, 0))}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Mileage Log + 1031 Exchange Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mileage Log */}
              <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="label text-[11px]">Mileage Log</h3>
                    <p className="text-xs text-muted mt-0.5">Track business miles for tax deduction</p>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gold text-black hover:brightness-110 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Entry
                  </button>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Car className="w-8 h-8 text-muted/40 mx-auto mb-3" />
                  <p className="text-sm text-muted">No mileage entries yet</p>
                  <p className="text-xs text-muted/60 mt-1">
                    IRS rate: $0.67/mile (2024). Log trips to properties for tax deductions.
                  </p>
                </div>
              </div>

              {/* 1031 Exchange Timer */}
              <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="label text-[11px]">1031 Exchange Tracker</h3>
                    <p className="text-xs text-muted mt-0.5">Like-kind exchange deadlines</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-2 py-0.5">
                    <ArrowRightLeft className="w-3 h-3" />
                    Placeholder
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="bg-deep border border-border rounded-lg p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted">45-Day Identification Period</span>
                      <span className="text-xs font-semibold text-gold font-mono">-- days remaining</span>
                    </div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-gold/40 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                  <div className="bg-deep border border-border rounded-lg p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted">180-Day Completion Deadline</span>
                      <span className="text-xs font-semibold text-gold font-mono">-- days remaining</span>
                    </div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-gold/40 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted/60 text-center">
                    Start a 1031 exchange when you sell a property to track deadlines
                  </p>
                </div>
              </div>
            </div>

            {/* Quarterly Tax Estimator */}
            <div className="bg-card border border-border rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="label text-[11px]">Quarterly Tax Estimator</h3>
                  <p className="text-xs text-muted mt-0.5">Estimated quarterly payments based on rental income</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-2 py-0.5">
                  <Calculator className="w-3 h-3" />
                  Placeholder
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {['Q1 (Apr 15)', 'Q2 (Jun 15)', 'Q3 (Sep 15)', 'Q4 (Jan 15)'].map((q, i) => {
                  const quarterlyEstimate = (ytdProfit * TAX_RATE) / 4
                  return (
                    <div key={q} className="bg-deep border border-border rounded-lg p-4 text-center" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                      <p className="text-xs text-muted mb-2 font-mono">{q}</p>
                      <p className="text-lg font-bold text-gold font-mono">{formatCurrency(quarterlyEstimate > 0 ? quarterlyEstimate : 0)}</p>
                      <div className="mt-2">
                        {i <= Math.floor(now.getMonth() / 3) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-green">
                            <CheckCircle2 className="w-3 h-3" /> Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                            <Clock className="w-3 h-3" /> Upcoming
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 5: REPORTS                                             */}
        {/* ========================================================== */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="bg-card border border-border rounded-xl p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="flex items-center gap-4">
                <label className="label whitespace-nowrap">Report Period:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={reportDateRange.start}
                    onChange={(e) => setReportDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="h-9 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                  />
                  <span className="text-xs text-muted">to</span>
                  <input
                    type="date"
                    value={reportDateRange.end}
                    onChange={(e) => setReportDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="h-9 rounded-lg bg-deep border border-border px-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORT_CARDS.map((report) => {
                const Icon = report.icon
                return (
                  <div key={report.id} className="bg-card border border-border rounded-xl p-6 hover:border-gold/20 hover:shadow-glow-sm transition-all group rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 group-hover:bg-gold/15 transition-colors flex-shrink-0">
                        <Icon className="h-5 w-5 text-gold" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-white font-display">{report.title}</h4>
                        <p className="text-xs text-muted font-body mt-1 leading-relaxed">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateReport(report.id)}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gold border border-gold/30 hover:bg-gold/10 transition-all"
                    >
                      <FileText className="h-4 w-4" />
                      Generate PDF
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 6: SCHEDULE E                                          */}
        {/* ========================================================== */}
        <TabsContent value="schedule_e">
          <ScheduleETab properties={properties} transactions={transactions} />
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 7: DEPRECIATION                                        */}
        {/* ========================================================== */}
        <TabsContent value="depreciation">
          <DepreciationTab properties={properties} />
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 8: 1031 EXCHANGE                                       */}
        {/* ========================================================== */}
        <TabsContent value="exchange_1031">
          <Exchange1031Tab />
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/*  Add Transaction Modal                                        */}
      {/* ============================================================ */}
      <AddTransactionModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={fetchData}
        properties={properties}
        tenants={tenants}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exported page with FeatureGate                                     */
/* ------------------------------------------------------------------ */

export default function AccountingPage() {
  return (
    <FeatureGate feature="accounting">
      <AccountingContent />
    </FeatureGate>
  )
}
