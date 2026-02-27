'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

/* ================================================================== */
/*  US STATES                                                          */
/* ================================================================== */

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
]

const PROPERTY_TYPES = ['SFR', 'Multi-family', 'Commercial', 'Land']

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

interface FormData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  asking_price: string
  arv: string
  repair_cost: string
  property_type: string
  bedrooms: string
  bathrooms: string
  sqft: string
  description: string
}

interface SubmitResult {
  ai_score: number
  auto_approved: boolean
}

/* ================================================================== */
/*  SUBMIT DEAL PAGE                                                   */
/* ================================================================== */

export default function SubmitDealPage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    asking_price: '',
    arv: '',
    repair_cost: '',
    property_type: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    description: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function set(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function formatDollar(value: string): string {
    const digits = value.replace(/[^0-9]/g, '')
    if (!digits) return ''
    return Number(digits).toLocaleString('en-US')
  }

  function handleDollarChange(key: keyof FormData, value: string) {
    const digits = value.replace(/[^0-9]/g, '')
    set(key, digits)
  }

  function displayDollar(value: string): string {
    if (!value) return ''
    return '$' + formatDollar(value)
  }

  /* ---------------------------------------------------------------- */
  /*  Validation                                                       */
  /* ---------------------------------------------------------------- */

  function validate(): string | null {
    if (!form.name.trim()) return 'Your Name is required.'
    if (!form.email.trim()) return 'Your Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.'
    if (!form.address.trim()) return 'Property Address is required.'
    if (!form.city.trim()) return 'City is required.'
    if (!form.state) return 'State is required.'
    if (!form.zip.trim()) return 'ZIP Code is required.'
    if (!form.asking_price) return 'Asking Price is required.'
    if (!form.property_type) return 'Property Type is required.'
    return null
  }

  /* ---------------------------------------------------------------- */
  /*  Submit                                                           */
  /* ---------------------------------------------------------------- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/deals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          asking_price: Number(form.asking_price),
          arv: form.arv ? Number(form.arv) : null,
          repair_cost: form.repair_cost ? Number(form.repair_cost) : null,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          sqft: form.sqft ? Number(form.sqft) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit deal. Please try again.')
      }

      const data = await res.json()
      setResult({
        ai_score: data.ai_score ?? data.score ?? 7,
        auto_approved: data.auto_approved ?? data.approved ?? false,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  function resetForm() {
    setForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      asking_price: '',
      arv: '',
      repair_cost: '',
      property_type: '',
      bedrooms: '',
      bathrooms: '',
      sqft: '',
      description: '',
    })
    setResult(null)
    setError(null)
  }

  /* ================================================================ */
  /*  SUCCESS STATE                                                    */
  /* ================================================================ */

  if (result) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
          {/* Checkmark */}
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="font-display font-bold text-2xl text-white mb-2">
            Deal Submitted Successfully
          </h2>

          {/* AI Score */}
          <div className="mt-6 mb-6">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted mb-2">AI Score</p>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-black border border-border">
              <span className="text-3xl font-mono font-bold text-gold">{result.ai_score}</span>
              <span className="text-sm font-mono text-muted">/10</span>
            </div>
          </div>

          {/* Status message */}
          <div className={cn(
            'rounded-xl px-4 py-3 text-sm font-body mb-6',
            result.auto_approved
              ? 'bg-gold/10 border border-gold/20 text-gold'
              : 'bg-gold-light/10 border border-gold-light/20 text-gold-light'
          )}>
            {result.auto_approved
              ? 'Your deal is now live in the investor feed!'
              : 'Your deal is under review and will appear in the feed within 24 hours.'}
          </div>

          {/* Submit Another */}
          <button
            onClick={resetForm}
            className="w-full py-3 rounded-xl bg-card border border-border text-white font-display font-semibold text-sm hover:border-muted transition-colors"
          >
            Submit Another Deal
          </button>

          {/* Footer */}
          <p className="text-muted text-xs font-body mt-8">
            Powered by RKV Consulting &middot; Portfolio Intelligence Platform
          </p>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  FORM STATE                                                       */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-black py-8 px-4 sm:py-12">
      <div className="max-w-2xl mx-auto">
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="font-display font-extrabold text-xl text-white tracking-tight">
              RKV
            </span>
            <div className="w-px h-5 bg-border" />
            <span className="font-body font-normal text-sm text-muted uppercase tracking-[0.2em]">
              Consulting
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl text-white mb-2">
            Submit a Deal
          </h1>
          <p className="text-muted text-sm font-body max-w-md mx-auto">
            Submit your wholesale deal to reach verified investors on the RKV platform.
          </p>
        </div>

        {/* ── Form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red/10 border border-red/20 rounded-xl px-4 py-3 text-sm text-red font-body">
              {error}
            </div>
          )}

          {/* ── Your Information ──────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-gold font-semibold mb-4">
              Your Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Your Name"
                required
                value={form.name}
                onChange={(v) => set('name', v)}
                placeholder="Full name"
              />
              <Field
                label="Your Email"
                required
                type="email"
                value={form.email}
                onChange={(v) => set('email', v)}
                placeholder="you@email.com"
              />
              <Field
                label="Your Phone"
                type="tel"
                value={form.phone}
                onChange={(v) => set('phone', v)}
                placeholder="(555) 555-5555"
                wrapperClass="sm:col-span-2"
              />
            </div>
          </div>

          {/* ── Property Details ──────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-gold font-semibold mb-4">
              Property Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Property Address"
                required
                value={form.address}
                onChange={(v) => set('address', v)}
                placeholder="123 Main St"
                wrapperClass="sm:col-span-2"
              />
              <Field
                label="City"
                required
                value={form.city}
                onChange={(v) => set('city', v)}
                placeholder="City"
              />
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="State"
                  required
                  value={form.state}
                  onChange={(v) => set('state', v)}
                  options={US_STATES}
                  placeholder="State"
                />
                <Field
                  label="ZIP Code"
                  required
                  value={form.zip}
                  onChange={(v) => set('zip', v)}
                  placeholder="85001"
                />
              </div>
              <SelectField
                label="Property Type"
                required
                value={form.property_type}
                onChange={(v) => set('property_type', v)}
                options={PROPERTY_TYPES}
                placeholder="Select type"
              />
              <div className="grid grid-cols-3 gap-4">
                <Field
                  label="Bedrooms"
                  type="number"
                  value={form.bedrooms}
                  onChange={(v) => set('bedrooms', v)}
                  placeholder="--"
                />
                <Field
                  label="Bathrooms"
                  type="number"
                  value={form.bathrooms}
                  onChange={(v) => set('bathrooms', v)}
                  placeholder="--"
                />
                <Field
                  label="Sq Ft"
                  type="number"
                  value={form.sqft}
                  onChange={(v) => set('sqft', v)}
                  placeholder="--"
                />
              </div>
            </div>
          </div>

          {/* ── Financials ────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-gold font-semibold mb-4">
              Financials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Asking Price"
                required
                value={displayDollar(form.asking_price)}
                onChange={(v) => handleDollarChange('asking_price', v)}
                placeholder="$0"
              />
              <Field
                label="After Repair Value (ARV)"
                value={displayDollar(form.arv)}
                onChange={(v) => handleDollarChange('arv', v)}
                placeholder="$0"
              />
              <Field
                label="Estimated Repair Cost"
                value={displayDollar(form.repair_cost)}
                onChange={(v) => handleDollarChange('repair_cost', v)}
                placeholder="$0"
              />
            </div>
          </div>

          {/* ── Description ───────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-gold font-semibold mb-4">
              Description
            </h3>
            <TextareaField
              label="Description / Selling Points"
              value={form.description}
              onChange={(v) => set('description', v)}
              placeholder="What makes this deal attractive? Motivated seller, below market, recent rehab, etc."
            />
          </div>

          {/* ── Submit Button ─────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'w-full h-12 rounded-xl font-display font-semibold text-sm tracking-wide',
              'bg-gold text-black',
              'hover:brightness-110 transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            style={{ boxShadow: '0 0 30px rgba(5,150,105,0.2)' }}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Deal for Review'
            )}
          </button>

          {/* ── Footer ────────────────────────────────────────────── */}
          <p className="text-center text-muted text-xs font-body">
            Powered by RKV Consulting &middot; Portfolio Intelligence Platform
          </p>
        </form>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  FIELD COMPONENTS                                                   */
/* ================================================================== */

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  wrapperClass,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  wrapperClass?: string
}) {
  return (
    <div className={wrapperClass}>
      <label className="block text-xs text-muted mb-1.5 font-body">
        {label}
        {required && <span className="text-gold ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-10 px-3 rounded-lg text-sm text-white font-body',
          'bg-black border border-border',
          'placeholder:text-muted-deep',
          'focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20',
          'transition-colors',
        )}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  wrapperClass,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  required?: boolean
  wrapperClass?: string
}) {
  return (
    <div className={wrapperClass}>
      <label className="block text-xs text-muted mb-1.5 font-body">
        {label}
        {required && <span className="text-gold ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-10 px-3 rounded-lg text-sm font-body appearance-none',
          value ? 'text-white' : 'text-muted-deep',
          'bg-black border border-border',
          'focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20',
          'transition-colors cursor-pointer',
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A6080' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
        }}
      >
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5 font-body">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg text-sm text-white resize-y font-body',
          'bg-black border border-border',
          'placeholder:text-muted-deep',
          'focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20',
          'transition-colors',
        )}
      />
    </div>
  )
}
