'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Public Tenant Screening Application Form                           */
/*  This page is accessible WITHOUT authentication.                    */
/*  Route: /apply/[token]                                              */
/* ------------------------------------------------------------------ */

interface ApplicationData {
  id: string;
  property_address: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    ssn_last4: '',
    current_address: '',
    current_employer: '',
    annual_income: '',
    move_in_date: '',
    num_occupants: '1',
    pets: '',
    references: '',
    additional_info: '',
  });

  // Resolve params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Fetch application details
  useEffect(() => {
    if (!token) return;

    async function fetchApplication() {
      try {
        const res = await fetch(`/api/screening/${token}`);
        if (res.status === 410) {
          setError('This application link has expired. Please request a new one from your landlord.');
          return;
        }
        if (res.status === 409) {
          setError('This application has already been submitted.');
          setSubmitted(true);
          return;
        }
        if (!res.ok) {
          setError('Invalid application link.');
          return;
        }
        const data = await res.json();
        setApplication(data);
      } catch {
        setError('Unable to load application. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchApplication();
  }, [token]);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) {
      setError('First name, last name, and email are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/screening/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#059669] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#4A6080]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Loading application...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !application) {
    return (
      <div className="min-h-screen bg-[#080B0F] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#0C1018] border border-[#161E2A] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            {submitted ? 'Already Submitted' : 'Application Unavailable'}
          </h2>
          <p className="text-sm text-[#4A6080]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#080B0F] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#0C1018] border border-[#161E2A] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            Application Submitted
          </h2>
          <p className="text-sm text-[#4A6080]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Thank you for your application. The property manager will review it and get back to you shortly.
          </p>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen bg-[#080B0F] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              RKV
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            <span className="text-lg font-bold text-[#059669]" style={{ fontFamily: 'Syne, sans-serif' }}>
              Consulting
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
            Rental Application
          </h1>
          {application?.property_address && (
            <p className="text-sm text-[#059669]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {application.property_address}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Personal Information */}
          <div className="bg-[#0C1018] border border-[#161E2A] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#059669] uppercase tracking-wider mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="First Name *" value={form.first_name} onChange={(v) => set('first_name', v)} required />
              <FormInput label="Last Name *" value={form.last_name} onChange={(v) => set('last_name', v)} required />
              <FormInput label="Email *" type="email" value={form.email} onChange={(v) => set('email', v)} wrapperClass="col-span-2" required />
              <FormInput label="Phone" type="tel" value={form.phone} onChange={(v) => set('phone', v)} />
              <FormInput label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v) => set('date_of_birth', v)} />
            </div>
          </div>

          {/* Current Residence */}
          <div className="bg-[#0C1018] border border-[#161E2A] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#059669] uppercase tracking-wider mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              Current Residence
            </h3>
            <FormInput label="Current Address" value={form.current_address} onChange={(v) => set('current_address', v)} placeholder="Street, City, State, Zip" />
          </div>

          {/* Employment & Income */}
          <div className="bg-[#0C1018] border border-[#161E2A] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#059669] uppercase tracking-wider mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              Employment & Income
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Current Employer" value={form.current_employer} onChange={(v) => set('current_employer', v)} />
              <FormInput label="Annual Income" type="number" value={form.annual_income} onChange={(v) => set('annual_income', v)} placeholder="0" />
            </div>
          </div>

          {/* Move-in Details */}
          <div className="bg-[#0C1018] border border-[#161E2A] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#059669] uppercase tracking-wider mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              Move-in Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Desired Move-in Date" type="date" value={form.move_in_date} onChange={(v) => set('move_in_date', v)} />
              <FormInput label="Number of Occupants" type="number" value={form.num_occupants} onChange={(v) => set('num_occupants', v)} />
              <FormInput label="Pets" value={form.pets} onChange={(v) => set('pets', v)} placeholder="Type, breed, weight" wrapperClass="col-span-2" />
            </div>
          </div>

          {/* References & Additional */}
          <div className="bg-[#0C1018] border border-[#161E2A] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#059669] uppercase tracking-wider mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              References & Additional Info
            </h3>
            <div className="space-y-4">
              <FormTextarea label="References" value={form.references} onChange={(v) => set('references', v)} placeholder="Name, relationship, phone number for each reference" />
              <FormTextarea label="Additional Information" value={form.additional_info} onChange={(v) => set('additional_info', v)} placeholder="Anything else you'd like us to know" />
            </div>
          </div>

          {/* Consent */}
          <div className="bg-[#0C1018] border border-[#161E2A] rounded-xl p-6">
            <p className="text-xs text-[#4A6080] leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              By submitting this application, you authorize the property manager to verify the information provided,
              including employment, rental history, and references. You understand that this is an application only
              and does not guarantee tenancy.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'w-full h-12 rounded-xl text-sm font-semibold',
              'bg-[#059669] text-black',
              'hover:brightness-110 hover:shadow-[0_0_20px_rgba(201,168,76,0.3)]',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>

          <p className="text-center text-[10px] text-[#4A6080]/60" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Powered by RKV Consulting
          </p>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Form Input Component                                               */
/* ------------------------------------------------------------------ */

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  wrapperClass,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  wrapperClass?: string;
}) {
  return (
    <div className={wrapperClass}>
      <label className="block text-xs text-[#4A6080] mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={cn(
          'w-full h-10 px-3 rounded-lg text-sm text-white',
          'bg-[#080B0F] border border-[#161E2A]',
          'placeholder:text-[#4A6080]/40',
          'focus:outline-none focus:border-[#059669]/50 focus:ring-1 focus:ring-[#059669]/20',
          'transition-colors',
        )}
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#4A6080] mb-1.5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm text-white resize-y',
          'bg-[#080B0F] border border-[#161E2A]',
          'placeholder:text-[#4A6080]/40',
          'focus:outline-none focus:border-[#059669]/50 focus:ring-1 focus:ring-[#059669]/20',
          'transition-colors',
        )}
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      />
    </div>
  );
}
