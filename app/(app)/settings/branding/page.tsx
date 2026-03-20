'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Palette, CheckCircle2 } from 'lucide-react';

export default function BrandingPage() {
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('#00D4AA');
  const [logoUrl, setLogoUrl] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;
      const { data: org } = await supabase.from('organizations')
        .select('brand_name, brand_color, logo_url, email_from_name, email_from_address, white_label_enabled')
        .eq('id', profile.org_id).single();
      if (org) {
        setBrandName(org.brand_name || '');
        setBrandColor(org.brand_color || '#00D4AA');
        setLogoUrl(org.logo_url || '');
        setEmailFromName(org.email_from_name || '');
        setEmailFromAddress(org.email_from_address || '');
        setWhiteLabel(org.white_label_enabled || false);
      }
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return;

    await supabase.from('organizations').update({
      brand_name: brandName || null,
      brand_color: brandColor,
      logo_url: logoUrl || null,
      email_from_name: emailFromName || null,
      email_from_address: emailFromAddress || null,
      white_label_enabled: whiteLabel,
    }).eq('id', profile.org_id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Branding</h1>
        <p className="text-sm text-text-secondary">Customize the look and feel for your team and tenants.</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Palette size={16} className="text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">White Label</h3>
          <label className="ml-auto flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={whiteLabel} onChange={(e) => setWhiteLabel(e.target.checked)} className="rounded accent-accent" />
            <span className="text-xs text-text-secondary">Enable</span>
          </label>
        </div>

        <div>
          <label className="text-xs text-text-muted block mb-1">Brand Name</label>
          <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Your Company Name" className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none" />
        </div>

        <div>
          <label className="text-xs text-text-muted block mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer" />
            <input type="text" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary font-mono focus:border-accent focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted block mb-1">Logo URL</label>
          <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none" />
        </div>

        <div>
          <label className="text-xs text-text-muted block mb-1">Email From Name</label>
          <input type="text" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} placeholder="Your Company" className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none" />
        </div>

        <div>
          <label className="text-xs text-text-muted block mb-1">Email From Address</label>
          <input type="email" value={emailFromAddress} onChange={(e) => setEmailFromAddress(e.target.value)} placeholder="noreply@yourdomain.com" className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none" />
        </div>

        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50">
          {saved ? <><CheckCircle2 size={14} />Saved</> : saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}
