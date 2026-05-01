'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Send, Mail, MessageSquare, CheckCircle2, MapPin, Phone } from 'lucide-react';
import { StatusBadge } from '@/components/landing/StatusBadge';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSent(true);
    } catch {
      // silent
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0F172A]">
              <span className="text-xs font-bold text-white">R</span>
            </div>
            <span className="font-display text-sm font-bold text-[#0F172A]">RKV Consulting</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Sign In</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display font-bold text-5xl md:text-6xl tracking-tight text-[#020617]">Get in Touch</h1>
            <p className="mt-5 text-xl md:text-2xl text-[#475569]" style={{ lineHeight: 1.7 }}>
              Questions about RKV Consulting? Enterprise pricing? We&apos;d love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact info — left */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#0F172A] mb-3">Contact Information</h2>
              <p className="text-sm text-[#475569]" style={{ lineHeight: 1.7 }}>
                Reach us by email or send a message via the form. We respond within one business day.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0369A1]/10">
                <Mail size={18} className="text-[#0369A1]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Email Us</p>
                <p className="text-sm text-[#475569] mt-0.5">hello@rkvconsulting.com</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0369A1]/10">
                <MessageSquare size={18} className="text-[#0369A1]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Enterprise Sales</p>
                <p className="text-sm text-[#475569] mt-0.5">sales@rkvconsulting.com</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0369A1]/10">
                <Phone size={18} className="text-[#0369A1]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Support</p>
                <p className="text-sm text-[#475569] mt-0.5">support@rkvconsulting.com</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0369A1]/10">
                <MapPin size={18} className="text-[#0369A1]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Headquarters</p>
                <p className="text-sm text-[#475569] mt-0.5">Phoenix, Arizona</p>
              </div>
            </div>
          </div>

          {/* Form — right */}
          <div className="lg:col-span-3">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0369A1]/10 mx-auto mb-4">
                  <CheckCircle2 size={24} className="text-[#0369A1]" />
                </div>
                <h2 className="font-display text-2xl font-bold text-[#0F172A] mb-2">Message Sent</h2>
                <p className="text-base text-[#475569]">We&apos;ll get back to you within 24 hours.</p>
              </motion.div>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onSubmit={handleSubmit}
                className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-[#020617] placeholder:text-slate-400 focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-[#020617] placeholder:text-slate-400 focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Message</label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#020617] placeholder:text-slate-400 focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 resize-none"
                    placeholder="Tell us what you're looking for..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white px-6 h-12 font-semibold disabled:opacity-60 cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
                >
                  <Send size={14} />
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </motion.form>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#475569]">&copy; {new Date().getFullYear()} RKV Consulting by RKV</p>
          <div className="flex items-center gap-4">
            <StatusBadge />
            <Link href="/terms" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Terms</Link>
            <Link href="/privacy" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
