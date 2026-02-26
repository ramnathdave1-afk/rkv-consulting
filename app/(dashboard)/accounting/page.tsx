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
import { cn } from '@/lib/utils'
import type { Property, Tenant, Transaction } from '@/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const INCOME_CATEGORIES = ['Rent', 'Late Fee', 'Application Fee', 'Laundry', 'Parking', 'Other']
const EXPENSE_CATEGORIES = ['Mortgage', 'Property Tax', 'Insurance', 'Maintenance', 'Management', 'Utilities', 'Legal', 'Advertising', 'HOA', 'Other']

const PIE_COLORS = ['#C9A84C', '#E8C97A', '#22C55E', '#3B82F6', '#A855F7', '#EF4444', '#F97316', '#EC4899', '#8B5CF6', '#14B8A6']

const DATE_RANGES = [
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
] as const

const ITEMS_PER_PAGE = 25

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
/*  Mock Data Generation                                               */
/* ------------------------------------------------------------------ */

function generateMockTransactions(properties: Property[], tenants: Tenant[]): Transaction[] {
  const transactions: Transaction[] = []
  const now = new Date()
  const year = now.getFullYear()

  // Generate 12 months of transactions
  for (let m = 0; m < 12; m++) {
    const month = new Date(year, m, 1)

    // Rent income per property
    properties.forEach((prop) => {
      if (prop.monthly_rent && prop.monthly_rent > 0) {
        const propTenants = tenants.filter((t) => t.property_id === prop.id)
        transactions.push({
          id: `rent-${prop.id}-${m}`,
          user_id: prop.user_id,
          property_id: prop.id,
          tenant_id: propTenants[0]?.id || null,
          type: 'income',
          category: 'Rent',
          amount: prop.monthly_rent,
          description: `Monthly rent - ${prop.address}`,
          date: new Date(year, m, 1).toISOString().split('T')[0],
          recurring: true,
          recurring_frequency: 'monthly',
          created_at: month.toISOString(),
          updated_at: month.toISOString(),
        })
      }

      // Expense: Mortgage
      if (prop.mortgage_payment && prop.mortgage_payment > 0) {
        transactions.push({
          id: `mortgage-${prop.id}-${m}`,
          user_id: prop.user_id,
          property_id: prop.id,
          tenant_id: null,
          type: 'expense',
          category: 'Mortgage',
          amount: prop.mortgage_payment,
          description: `Mortgage payment - ${prop.address}`,
          date: new Date(year, m, 1).toISOString().split('T')[0],
          recurring: true,
          recurring_frequency: 'monthly',
          created_at: month.toISOString(),
          updated_at: month.toISOString(),
        })
      }

      // Expense: Property Tax (quarterly)
      if (prop.property_tax && prop.property_tax > 0 && m % 3 === 0) {
        transactions.push({
          id: `tax-${prop.id}-${m}`,
          user_id: prop.user_id,
          property_id: prop.id,
          tenant_id: null,
          type: 'expense',
          category: 'Property Tax',
          amount: prop.property_tax / 4,
          description: `Property tax Q${Math.floor(m / 3) + 1} - ${prop.address}`,
          date: new Date(year, m, 15).toISOString().split('T')[0],
          recurring: true,
          recurring_frequency: 'quarterly',
          created_at: month.toISOString(),
          updated_at: month.toISOString(),
        })
      }

      // Expense: Insurance (monthly portion)
      if (prop.insurance && prop.insurance > 0) {
        transactions.push({
          id: `ins-${prop.id}-${m}`,
          user_id: prop.user_id,
          property_id: prop.id,
          tenant_id: null,
          type: 'expense',
          category: 'Insurance',
          amount: prop.insurance / 12,
          description: `Insurance - ${prop.address}`,
          date: new Date(year, m, 5).toISOString().split('T')[0],
          recurring: true,
          recurring_frequency: 'monthly',
          created_at: month.toISOString(),
          updated_at: month.toISOString(),
        })
      }

      // Random maintenance (30% chance each month)
      if (Math.random() < 0.3) {
        const cost = Math.round(150 + Math.random() * 800)
        transactions.push({
          id: `maint-${prop.id}-${m}`,
          user_id: prop.user_id,
          property_id: prop.id,
          tenant_id: null,
          type: 'expense',
          category: 'Maintenance',
          amount: cost,
          description: `Maintenance repair - ${prop.address}`,
          date: new Date(year, m, 10 + Math.floor(Math.random() * 15)).toISOString().split('T')[0],
          recurring: false,
          recurring_frequency: null,
          created_at: month.toISOString(),
          updated_at: month.toISOString(),
        })
      }

      // HOA fees
      if (prop.hoa_fees && prop.hoa_fees > 0) {
        transactions.push({
          id: `hoa-${prop.id}-${m}`,
          user_id: prop.user_id,
          property_id: prop.id,
          tenant_id: null,
          type: 'expense',
          category: 'HOA',
          amount: prop.hoa_fees,
          description: `HOA fee - ${prop.address}`,
          date: new Date(year, m, 1).toISOString().split('T')[0],
          recurring: true,
          recurring_frequency: 'monthly',
          created_at: month.toISOString(),
          updated_at: month.toISOString(),
        })
      }
    })

    // Random late fees
    if (Math.random() < 0.2 && properties.length > 0) {
      const randomProp = properties[Math.floor(Math.random() * properties.length)]
      transactions.push({
        id: `late-${m}`,
        user_id: randomProp.user_id,
        property_id: randomProp.id,
        tenant_id: null,
        type: 'income',
        category: 'Late Fee',
        amount: 50 + Math.round(Math.random() * 100),
        description: `Late fee collected - ${randomProp.address}`,
        date: new Date(year, m, 8).toISOString().split('T')[0],
        recurring: false,
        recurring_frequency: null,
        created_at: month.toISOString(),
        updated_at: month.toISOString(),
      })
    }

    // Management fees (10% of rent)
    if (properties.length > 0) {
      const totalRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0)
      if (totalRent > 0) {
        transactions.push({
          id: `mgmt-${m}`,
          user_id: properties[0].user_id,
          property_id: null,
          tenant_id: null,
          type: 'expense',
          category: 'Management',
          amount: Math.round(totalRent * 0.08),
          description: 'Property management fee',
          date: new Date(year, m, 28).toISOString().split('T')[0],
          recurring: true,
          recurring_frequency: 'monthly',
          created_at: month.toISOString(),
          updated_at: month.toISOString(),
        })
      }
    }
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
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
      <p className="text-sm font-semibold text-white">{formatCurrency(payload[0].value)}</p>
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
  properties,
  tenants,
}: {
  open: boolean
  onClose: () => void
  properties: Property[]
  tenants: Tenant[]
}) {
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

  function handleSave() {
    // TODO: Save to Supabase transactions table
    onClose()
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
            className="px-6 py-2 rounded-lg text-sm font-semibold bg-gold text-black hover:brightness-110 hover:shadow-glow transition-all"
          >
            Save Transaction
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

  // Filter state
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Sort state
  const [sortColumn, setSortColumn] = useState<'date' | 'property' | 'category' | 'type' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Modal
  const [showAddModal, setShowAddModal] = useState(false)

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

      // Generate mock transactions based on actual properties
      const mockTx = generateMockTransactions(propsData, tenantsData)
      setTransactions(mockTx)
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
      case 'custom': return getYearRange(now) // fallback to year for custom
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
  }, [transactions, dateFilter, propertyFilter, categoryFilter, sortColumn, sortDir, properties])

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

  const netProfit = totalIncome - totalExpenses

  // YTD calculations
  const ytdRange = getYearRange(now)
  const ytdTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date)
    return txDate >= ytdRange.start && txDate <= ytdRange.end
  })
  const ytdIncome = ytdTransactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0)
  const ytdExpenses = ytdTransactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0)
  const ytdProfit = ytdIncome - ytdExpenses

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
  /*  Tax summary                                                      */
  /* ---------------------------------------------------------------- */

  const TAX_RATE = 0.30
  const deductibleExpenses = ytdTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const estimatedTaxSavings = deductibleExpenses * TAX_RATE

  const deductibleByCategory = useMemo(() => {
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
  /*  P&L data                                                         */
  /* ---------------------------------------------------------------- */

  const plData = useMemo(() => {
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

  /* ---------------------------------------------------------------- */
  /*  Loading skeleton                                                 */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-border rounded w-24 mb-3" />
              <div className="h-8 bg-border rounded w-32" />
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
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
      {/*  Summary Cards                                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Total Income</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green/10">
              <TrendingUp className="h-4 w-4 text-green" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green">{formatCurrency(totalIncome)}</p>
          <p className="text-xs text-muted mt-1">
            {dateRange === 'month' ? 'This month' : dateRange === 'quarter' ? 'This quarter' : 'This year'}
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Total Expenses</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red/10">
              <TrendingDown className="h-4 w-4 text-red" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-muted mt-1">
            {dateRange === 'month' ? 'This month' : dateRange === 'quarter' ? 'This quarter' : 'This year'}
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Net Profit</span>
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              netProfit >= 0 ? 'bg-green/10' : 'bg-red/10',
            )}>
              <DollarSign className={cn('h-4 w-4', netProfit >= 0 ? 'text-green' : 'text-red')} />
            </div>
          </div>
          <p className={cn('text-2xl font-bold', netProfit >= 0 ? 'text-green' : 'text-red')}>
            {formatCurrency(netProfit)}
          </p>
          <p className="text-xs text-muted mt-1">
            {dateRange === 'month' ? 'This month' : dateRange === 'quarter' ? 'This quarter' : 'This year'}
          </p>
        </div>

        {/* YTD Profit */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">YTD Profit</span>
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              ytdProfit >= 0 ? 'bg-gold/10' : 'bg-red/10',
            )}>
              <Receipt className={cn('h-4 w-4', ytdProfit >= 0 ? 'text-gold' : 'text-red')} />
            </div>
          </div>
          <p className={cn('text-2xl font-bold', ytdProfit >= 0 ? 'text-gold' : 'text-red')}>
            {formatCurrency(ytdProfit)}
          </p>
          <p className="text-xs text-muted mt-1">Year to date</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Filter Bar                                                   */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-4">
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

          {/* Result count */}
          <span className="ml-auto text-xs text-muted">
            {filteredTransactions.length} transactions
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Transactions Table                                           */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { key: 'date' as const, label: 'Date' },
                  { key: 'property' as const, label: 'Property' },
                  { key: 'category' as const, label: 'Category' },
                  { key: null, label: 'Description' },
                  { key: 'type' as const, label: 'Type' },
                  { key: 'amount' as const, label: 'Amount' },
                  { key: null, label: 'Tax Ded.' },
                  { key: null, label: 'Actions' },
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
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const prop = properties.find((p) => p.id === tx.property_id)
                  return (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm text-white whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-text truncate max-w-[200px]">
                        {prop?.address || 'General'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text">{tx.category}</td>
                      <td className="px-4 py-3 text-sm text-muted truncate max-w-[200px]">
                        {tx.description || '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase',
                          tx.type === 'income'
                            ? 'bg-green/15 text-green'
                            : 'bg-red/15 text-red',
                        )}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-sm font-semibold whitespace-nowrap',
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
                        <button
                          type="button"
                          className="text-xs text-gold hover:text-gold-light transition-colors"
                        >
                          Edit
                        </button>
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

      {/* ============================================================ */}
      {/*  Charts Section                                               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-white">Income vs Expenses</h3>
            <span className="text-xs text-muted">Last 12 months</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 37, 48, 0.6)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#1E2530' }}
                tickLine={false}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val: number) => formatCurrencyShort(val)}
                width={60}
              />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="Income" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Expenses" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Donut */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-white">Expense Breakdown</h3>
            <span className="text-xs text-muted">By category</span>
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
                    <span className="text-xs text-white ml-auto">{formatCurrencyShort(item.value)}</span>
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

      {/* ============================================================ */}
      {/*  Tax Summary Section                                          */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-semibold text-lg text-white">Tax Summary</h3>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-gold border border-gold/30 hover:bg-gold/10 transition-all"
          >
            <FileText className="h-3.5 w-3.5" />
            Export Tax Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-deep border border-border rounded-lg p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Tax Deductible Expenses</p>
            <p className="text-xl font-bold text-white">{formatCurrency(deductibleExpenses)}</p>
          </div>
          <div className="bg-deep border border-border rounded-lg p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Estimated Tax Savings</p>
            <p className="text-xl font-bold text-green">{formatCurrency(estimatedTaxSavings)}</p>
            <p className="text-[10px] text-muted mt-1">Based on 30% estimated rate</p>
          </div>
          <div className="bg-deep border border-border rounded-lg p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Deductible Categories</p>
            <p className="text-xl font-bold text-gold">{deductibleByCategory.length}</p>
          </div>
        </div>

        {/* Categories breakdown */}
        <div className="space-y-2">
          {deductibleByCategory.map((item) => {
            const pct = deductibleExpenses > 0 ? (item.amount / deductibleExpenses) * 100 : 0
            return (
              <div key={item.category} className="flex items-center gap-3">
                <span className="text-sm text-text w-32 flex-shrink-0">{item.category}</span>
                <div className="flex-1 h-2 bg-deep rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold/60 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-white w-24 text-right">{formatCurrency(item.amount)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Profit & Loss Statement                                      */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-display font-semibold text-lg text-white">Profit & Loss Statement</h3>
          <p className="text-xs text-muted mt-1">{now.getFullYear()} Year-to-Date</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted sticky left-0 bg-card z-10">
                  Category
                </th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted min-w-[80px]">
                    {m}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gold min-w-[90px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Income header */}
              <tr className="bg-green/[0.03]">
                <td colSpan={14} className="px-4 py-2 text-xs font-semibold text-green uppercase tracking-wider">
                  Income
                </td>
              </tr>
              {Object.entries(plData.incomeByCategory)
                .filter(([, values]) => values.some((v) => v > 0))
                .map(([category, values]) => (
                  <tr key={`inc-${category}`} className="border-b border-border/30 hover:bg-white/[0.01]">
                    <td className="px-4 py-2 text-sm text-text sticky left-0 bg-card">{category}</td>
                    {values.map((val, i) => (
                      <td key={i} className="px-3 py-2 text-right text-sm text-white">
                        {val > 0 ? formatCurrencyShort(val) : '--'}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right text-sm font-semibold text-green">
                      {formatCurrencyShort(values.reduce((s, v) => s + v, 0))}
                    </td>
                  </tr>
                ))}
              {/* Income total */}
              <tr className="border-b border-border bg-green/[0.03]">
                <td className="px-4 py-2 text-sm font-semibold text-green sticky left-0 bg-card">Total Income</td>
                {MONTHS.map((_, i) => {
                  const total = Object.values(plData.incomeByCategory).reduce((s, vals) => s + vals[i], 0)
                  return (
                    <td key={i} className="px-3 py-2 text-right text-sm font-semibold text-green">
                      {total > 0 ? formatCurrencyShort(total) : '--'}
                    </td>
                  )
                })}
                <td className="px-4 py-2 text-right text-sm font-bold text-green">
                  {formatCurrencyShort(ytdIncome)}
                </td>
              </tr>

              {/* Expense header */}
              <tr className="bg-red/[0.03]">
                <td colSpan={14} className="px-4 py-2 text-xs font-semibold text-red uppercase tracking-wider">
                  Expenses
                </td>
              </tr>
              {Object.entries(plData.expenseByCategory)
                .filter(([, values]) => values.some((v) => v > 0))
                .map(([category, values]) => (
                  <tr key={`exp-${category}`} className="border-b border-border/30 hover:bg-white/[0.01]">
                    <td className="px-4 py-2 text-sm text-text sticky left-0 bg-card">{category}</td>
                    {values.map((val, i) => (
                      <td key={i} className="px-3 py-2 text-right text-sm text-white">
                        {val > 0 ? formatCurrencyShort(val) : '--'}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right text-sm font-semibold text-red">
                      {formatCurrencyShort(values.reduce((s, v) => s + v, 0))}
                    </td>
                  </tr>
                ))}
              {/* Expense total */}
              <tr className="border-b border-border bg-red/[0.03]">
                <td className="px-4 py-2 text-sm font-semibold text-red sticky left-0 bg-card">Total Expenses</td>
                {MONTHS.map((_, i) => {
                  const total = Object.values(plData.expenseByCategory).reduce((s, vals) => s + vals[i], 0)
                  return (
                    <td key={i} className="px-3 py-2 text-right text-sm font-semibold text-red">
                      {total > 0 ? formatCurrencyShort(total) : '--'}
                    </td>
                  )
                })}
                <td className="px-4 py-2 text-right text-sm font-bold text-red">
                  {formatCurrencyShort(ytdExpenses)}
                </td>
              </tr>

              {/* Net P&L */}
              <tr className="bg-gold/[0.03]">
                <td className="px-4 py-3 text-sm font-bold text-gold sticky left-0 bg-card">Net Profit / Loss</td>
                {MONTHS.map((_, i) => {
                  const income = Object.values(plData.incomeByCategory).reduce((s, vals) => s + vals[i], 0)
                  const expense = Object.values(plData.expenseByCategory).reduce((s, vals) => s + vals[i], 0)
                  const net = income - expense
                  return (
                    <td key={i} className={cn('px-3 py-3 text-right text-sm font-bold', net >= 0 ? 'text-green' : 'text-red')}>
                      {income > 0 || expense > 0 ? formatCurrencyShort(net) : '--'}
                    </td>
                  )
                })}
                <td className={cn('px-4 py-3 text-right text-sm font-bold', ytdProfit >= 0 ? 'text-green' : 'text-red')}>
                  {formatCurrencyShort(ytdProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Add Transaction Modal                                        */}
      {/* ============================================================ */}
      <AddTransactionModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
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
