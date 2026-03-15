'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Send, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">Meridian Node</span>
          </Link>
          <Link href="/login" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">Get in Touch</h1>
          <p className="text-sm text-text-secondary">Questions about Meridian Node? Enterprise pricing? We&apos;d love to hear from you.</p>
        </motion.div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
              <CheckCircle2 size={24} className="text-accent" />
            </div>
            <h2 className="font-display text-lg font-bold text-text-primary mb-2">Message Sent</h2>
            <p className="text-sm text-text-secondary">We&apos;ll get back to you within 24 hours.</p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="glass-card p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                placeholder="Tell us what you're looking for..."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              <Send size={14} />
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </motion.form>
        )}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
              <Mail size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-primary">Email Us</p>
              <p className="text-xs text-text-muted">hello@meridiannode.io</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue/10">
              <MessageSquare size={16} className="text-blue" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-primary">Enterprise Sales</p>
              <p className="text-xs text-text-muted">sales@meridiannode.io</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} MeridianNode by RKV</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
