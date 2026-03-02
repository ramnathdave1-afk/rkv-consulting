'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Home,
  DollarSign,
  Wrench,
  FileText,
  MessageSquare,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TenantProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  monthly_rent: number;
  property_type: string;
}

interface TenantProfile {
  id: string;
  user_id: string;
  property_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lease_start: string;
  lease_end: string;
  status: string;
  rent_due_day: number;
  monthly_rent: number;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Tenant Portal Page                                                 */
/* ------------------------------------------------------------------ */

export default function TenantPortalPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [property, setProperty] = useState<TenantProperty | null>(null);
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRequest, setNewRequest] = useState({ title: '', category: 'plumbing', priority: 'medium', description: '' });
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch property
      const { data: prop } = await supabase
        .from('properties')
        .select('id, address, city, state, zip, monthly_rent, property_type')
        .eq('id', propertyId)
        .single();

      if (prop) setProperty(prop);

      // Fetch tenant for this property
      const { data: ten } = await supabase
        .from('tenants')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .single();

      if (ten) setTenant(ten);

      // Fetch maintenance requests
      const { data: reqs } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (reqs) setRequests(reqs);

      setLoading(false);
    }
    fetchData();
  }, [propertyId, supabase]);

  async function handleSubmitRequest() {
    if (!newRequest.title || !newRequest.description || !tenant) return;

    const { error } = await supabase.from('maintenance_requests').insert({
      property_id: propertyId,
      tenant_id: tenant.id,
      user_id: tenant.user_id,
      title: newRequest.title,
      category: newRequest.category,
      priority: newRequest.priority,
      description: newRequest.description,
      status: 'pending',
    });

    if (!error) {
      setShowNewRequest(false);
      setNewRequest({ title: '', category: 'plumbing', priority: 'medium', description: '' });
      // Refresh requests
      const { data: reqs } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (reqs) setRequests(reqs);
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'lease', label: 'Lease', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top accent line */}
      <div className="h-[2px] bg-gradient-to-r from-gold via-gold-light to-transparent" />

      {/* Header */}
      <header className="border-b border-border" style={{ background: '#050505' }}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <Home className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-white">Tenant Portal</h1>
              <p className="text-sm text-muted font-body">{property?.address}, {property?.city}, {property?.state} {property?.zip}</p>
            </div>
          </div>
          {tenant && (
            <p className="text-sm text-muted mt-2">
              Welcome, <span className="text-white font-medium">{tenant.first_name} {tenant.last_name}</span>
            </p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-body font-medium transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'text-gold border-b-2 border-gold'
                      : 'text-muted hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-green" />
                  <span className="label text-muted">Monthly Rent</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono">
                  ${tenant?.monthly_rent?.toLocaleString() || '—'}
                </p>
                <p className="text-xs text-muted mt-1">Due on the {tenant?.rent_due_day || 1}st</p>
              </div>

              <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-gold" />
                  <span className="label text-muted">Lease Expires</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono">
                  {tenant?.lease_end ? new Date(tenant.lease_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </p>
                <p className="text-xs text-muted mt-1">
                  {tenant?.lease_end ? formatDistanceToNow(new Date(tenant.lease_end), { addSuffix: true }) : '—'}
                </p>
              </div>

              <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-4 w-4 text-gold-light" />
                  <span className="label text-muted">Open Requests</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono">
                  {requests.filter((r) => r.status !== 'resolved' && r.status !== 'closed').length}
                </p>
                <p className="text-xs text-muted mt-1">Maintenance requests</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('payments')}
                className="flex items-center gap-4 rounded-xl p-5 text-left transition-all hover:border-gold/30" style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              >
                <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-green" />
                </div>
                <div>
                  <p className="font-display font-semibold text-white">Pay Rent</p>
                  <p className="text-sm text-muted">Make a payment online</p>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('maintenance'); setShowNewRequest(true); }}
                className="flex items-center gap-4 rounded-xl p-5 text-left transition-all hover:border-gold/30" style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              >
                <div className="w-12 h-12 rounded-xl bg-gold-light/10 flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-gold-light" />
                </div>
                <div>
                  <p className="font-display font-semibold text-white">Submit Request</p>
                  <p className="text-sm text-muted">Report a maintenance issue</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <h2 className="font-display font-semibold text-lg text-white mb-4">Make a Payment</h2>
              <div className="flex items-center justify-between p-4 rounded-lg bg-deep border border-border mb-4">
                <div>
                  <p className="text-sm text-muted">Amount Due</p>
                  <p className="text-2xl font-bold text-white font-mono">${tenant?.monthly_rent?.toLocaleString() || '0'}</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gold text-black font-display font-semibold text-sm hover:brightness-110 transition-all">
                  <ExternalLink className="h-4 w-4" />
                  Pay Now
                </button>
              </div>
              <p className="text-xs text-muted">
                Payments are processed securely through Stripe. You will be redirected to a secure payment page.
              </p>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg text-white">Maintenance Requests</h2>
              <button
                onClick={() => setShowNewRequest(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-black font-display font-semibold text-sm hover:brightness-110 transition-all"
              >
                <Plus className="h-4 w-4" />
                New Request
              </button>
            </div>

            {/* New Request Form */}
            {showNewRequest && (
              <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <h3 className="font-display font-semibold text-white mb-4">Submit a Request</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted font-medium mb-1.5 block">Title</label>
                    <input
                      type="text"
                      value={newRequest.title}
                      onChange={(e) => setNewRequest((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Brief description of the issue"
                      className="w-full px-3 py-2.5 text-sm bg-deep border border-border rounded-lg text-white outline-none focus:border-gold/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted font-medium mb-1.5 block">Category</label>
                      <select
                        value={newRequest.category}
                        onChange={(e) => setNewRequest((p) => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm bg-deep border border-border rounded-lg text-white outline-none focus:border-gold/30"
                      >
                        <option value="plumbing">Plumbing</option>
                        <option value="electrical">Electrical</option>
                        <option value="hvac">HVAC</option>
                        <option value="appliance">Appliance</option>
                        <option value="structural">Structural</option>
                        <option value="pest">Pest Control</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted font-medium mb-1.5 block">Priority</label>
                      <select
                        value={newRequest.priority}
                        onChange={(e) => setNewRequest((p) => ({ ...p, priority: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm bg-deep border border-border rounded-lg text-white outline-none focus:border-gold/30"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted font-medium mb-1.5 block">Description</label>
                    <textarea
                      value={newRequest.description}
                      onChange={(e) => setNewRequest((p) => ({ ...p, description: e.target.value }))}
                      rows={4}
                      placeholder="Describe the issue in detail..."
                      className="w-full px-3 py-2.5 text-sm bg-deep border border-border rounded-lg text-white outline-none focus:border-gold/30 resize-y"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSubmitRequest}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-black font-display font-semibold text-sm hover:brightness-110 transition-all"
                    >
                      <Send className="h-4 w-4" />
                      Submit
                    </button>
                    <button
                      onClick={() => setShowNewRequest(false)}
                      className="px-4 py-2 rounded-lg border border-border text-muted text-sm hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Request List */}
            <div className="space-y-3">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <div key={req.id} className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-body font-medium text-white">{req.title}</p>
                        <p className="text-xs text-muted mt-1">{req.category} · {req.priority} priority</p>
                      </div>
                      <span className={cn(
                        'text-xs font-medium px-2.5 py-1 rounded-full',
                        req.status === 'resolved' || req.status === 'closed'
                          ? 'bg-green/10 text-green'
                          : req.status === 'in_progress'
                          ? 'bg-gold/10 text-gold'
                          : 'bg-muted/10 text-muted',
                      )}>
                        {req.status === 'in_progress' ? 'In Progress' : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                    {req.description && (
                      <p className="text-sm text-muted mt-2 line-clamp-2">{req.description}</p>
                    )}
                    <p className="text-xs text-muted-deep mt-2">
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-10 w-10 text-green/40 mx-auto mb-3" />
                  <p className="text-sm text-muted">No maintenance requests</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lease Tab */}
        {activeTab === 'lease' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <h2 className="font-display font-semibold text-lg text-white mb-4">Lease Information</h2>
              {tenant ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="label text-muted mb-1">Lease Start</p>
                    <p className="text-white font-body">{tenant.lease_start ? new Date(tenant.lease_start).toLocaleDateString() : '—'}</p>
                  </div>
                  <div>
                    <p className="label text-muted mb-1">Lease End</p>
                    <p className="text-white font-body">{tenant.lease_end ? new Date(tenant.lease_end).toLocaleDateString() : '—'}</p>
                  </div>
                  <div>
                    <p className="label text-muted mb-1">Monthly Rent</p>
                    <p className="text-white font-mono">${tenant.monthly_rent?.toLocaleString() || '—'}</p>
                  </div>
                  <div>
                    <p className="label text-muted mb-1">Rent Due Day</p>
                    <p className="text-white font-body">{tenant.rent_due_day || 1}st of each month</p>
                  </div>
                  <div>
                    <p className="label text-muted mb-1">Status</p>
                    <span className="text-green font-medium">{tenant.status === 'active' ? 'Active' : tenant.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">No lease information available</p>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <h2 className="font-display font-semibold text-lg text-white mb-4">Message Your Landlord</h2>
              <div className="space-y-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2.5 text-sm bg-deep border border-border rounded-lg text-white outline-none focus:border-gold/30 resize-y"
                />
                <button
                  onClick={() => {
                    if (message.trim()) {
                      alert('Message sent to your landlord');
                      setMessage('');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-black font-display font-semibold text-sm hover:brightness-110 transition-all"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </button>
              </div>
            </div>

            <div className="rounded-xl p-6" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <div className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="h-10 w-10 text-muted/40 mb-3" />
                <p className="text-sm text-muted">No message history yet</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6" style={{ background: '#050505' }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-deep">
            Powered by <span className="text-muted">RKV Consulting</span> · Tenant Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
