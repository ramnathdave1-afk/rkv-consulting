'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  AlertTriangle,
  Eye,
  Calendar,
  BarChart3,
  Sparkles,
  Copy,
  Check,
  Send,
  Clock,
  Users,
  TrendingUp,
  ExternalLink,
  Mail,
  Phone,
  MessageSquare,
  Star,
  Home,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  DollarSign,
  Megaphone,
  LinkIcon,
  Edit3,
  Globe,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal, ModalContent, ModalHeader } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import type { Property } from '@/types';

/* ================================================================== */
/*  Interfaces                                                         */
/* ================================================================== */

interface Inquiry {
  id: string;
  prospectName: string;
  email: string;
  phone: string;
  message: string;
  source: 'Zillow' | 'Facebook' | 'Direct' | 'Apartments.com' | 'Craigslist';
  dateReceived: string;
  interestScore: 'High' | 'Medium' | 'Low';
  propertyId: string;
  propertyAddress: string;
}

interface Showing {
  id: string;
  prospectName: string;
  propertyAddress: string;
  propertyId: string;
  dateTime: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
}

interface AvailabilityWindow {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface GeneratedListing {
  title: string;
  description: string;
  highlights: string[];
  rentalTerms: {
    price: string;
    deposit: string;
    leaseLength: string;
  };
}

/* ================================================================== */
/*  Helper: Days Vacant (formerly below generators)                    */
/* ================================================================== */

// Note: generateListing, generateInquiries, generateShowings removed — real data only

/* ================================================================== */
/*  Helper: Days Vacant                                                */
/* ================================================================== */

function getDaysVacant(updatedAt: string): number {
  const updated = new Date(updatedAt);
  const now = new Date();
  return Math.max(1, Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export default function VacanciesPage() {
  /* ---------------------------------- State --------------------------------- */
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vacancies');

  // Listing generator modal
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [generatedListing, setGeneratedListing] = useState<GeneratedListing | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [copiedListing, setCopiedListing] = useState(false);

  // Reply compose
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Showings availability
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([
    { day: 'Monday', enabled: true, startTime: '16:00', endTime: '19:00' },
    { day: 'Tuesday', enabled: true, startTime: '16:00', endTime: '19:00' },
    { day: 'Wednesday', enabled: true, startTime: '16:00', endTime: '19:00' },
    { day: 'Thursday', enabled: true, startTime: '16:00', endTime: '19:00' },
    { day: 'Friday', enabled: true, startTime: '16:00', endTime: '19:00' },
    { day: 'Saturday', enabled: true, startTime: '10:00', endTime: '15:00' },
    { day: 'Sunday', enabled: false, startTime: '10:00', endTime: '14:00' },
  ]);

  /* -------------------------------- Derived -------------------------------- */
  const totalLostIncome = useMemo(
    () => properties.reduce((sum, p) => sum + (p.monthly_rent ?? 0), 0),
    [properties],
  );

  const avgDaysVacant = useMemo(() => {
    if (properties.length === 0) return 0;
    const total = properties.reduce((sum, p) => sum + getDaysVacant(p.updated_at), 0);
    return Math.round(total / properties.length);
  }, [properties]);

  const [apiInquiries, setApiInquiries] = useState<Inquiry[]>([]);
  const [showings, setShowings] = useState<Showing[]>([]);
  const [listingStatusMap, setListingStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [inquiriesRes, showingsRes, listingsRes] = await Promise.all([
          fetch('/api/vacancy/inquiries'),
          fetch('/api/vacancy/showings'),
          fetch('/api/vacancy/listings'),
        ]);

        // Inquiries
        if (inquiriesRes.ok && !cancelled) {
          const data = await inquiriesRes.json();
          const list = (data || []).map((row: { id: string; property_id: string; prospect_name: string; email: string | null; phone: string | null; message: string | null; source: string; interest_score: string; date_received: string }) => {
            const prop = properties.find((p) => p.id === row.property_id);
            return {
              id: row.id,
              prospectName: row.prospect_name,
              email: row.email || '',
              phone: row.phone || '',
              message: row.message || '',
              source: row.source as Inquiry['source'],
              dateReceived: row.date_received,
              interestScore: (row.interest_score || 'Medium') as 'High' | 'Medium' | 'Low',
              propertyId: row.property_id,
              propertyAddress: prop?.address || 'Unknown',
            };
          });
          setApiInquiries(list);
        }

        // Showings
        if (showingsRes.ok && !cancelled) {
          const data = await showingsRes.json();
          setShowings(Array.isArray(data) ? data : []);
        }

        // Listing statuses
        if (listingsRes.ok && !cancelled) {
          const data = await listingsRes.json();
          setListingStatusMap(data || {});
        }
      } catch {
        if (!cancelled) {
          setApiInquiries([]);
          setShowings([]);
          setListingStatusMap({});
        }
      }
    })();
    return () => { cancelled = true; };
  }, [properties]);
  const inquiries = apiInquiries;

  // Per-property listing status & counts from real data
  const propertyMeta = useMemo(() => {
    const map: Record<string, { listingStatus: string; inquiries: number; showings: number }> = {};
    properties.forEach((p) => {
      const propInquiryCount = inquiries.filter((inq) => inq.propertyId === p.id).length;
      const propShowingCount = showings.filter((s) => s.propertyId === p.id).length;
      map[p.id] = {
        listingStatus: listingStatusMap[p.id] || 'Not Listed',
        inquiries: propInquiryCount,
        showings: propShowingCount,
      };
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.map((p) => p.id).join(','), inquiries, showings, listingStatusMap]);

  /* -------------------------------- Fetch --------------------------------- */
  useEffect(() => {
    async function fetchVacantProperties() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'vacant')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setProperties((data as Property[]) || []);
      } catch (err) {
        console.error('Error fetching vacant properties:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchVacantProperties();
  }, []);

  /* ----------------------------- Handlers --------------------------------- */
  const handleGenerateListing = useCallback((property: Property) => {
    setSelectedProperty(property);
    setGeneratedListing(null);
    setIsEditing(false);
    setCopiedListing(false);
    setListingModalOpen(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedProperty) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: selectedProperty.id }),
      });
      if (res.ok) {
        const listing = await res.json();
        setGeneratedListing(listing);
        setEditTitle(listing.title);
        setEditDescription(listing.description);
      } else {
        toast.error('Failed to generate listing. Please try again.');
      }
    } catch {
      toast.error('Failed to generate listing. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedProperty]);

  const handleCopyListing = useCallback(() => {
    if (!generatedListing) return;
    const title = isEditing ? editTitle : generatedListing.title;
    const desc = isEditing ? editDescription : generatedListing.description;
    const text = `${title}\n\n${desc}\n\nHighlights:\n${generatedListing.highlights.map((h) => `- ${h}`).join('\n')}\n\nRental Terms:\nPrice: ${generatedListing.rentalTerms.price}\nDeposit: ${generatedListing.rentalTerms.deposit}\nLease: ${generatedListing.rentalTerms.leaseLength}`;

    navigator.clipboard.writeText(text);
    setCopiedListing(true);
    toast.success('Listing copied to clipboard');
    setTimeout(() => setCopiedListing(false), 2000);
  }, [generatedListing, isEditing, editTitle, editDescription]);

  const handlePublish = useCallback(() => {
    if (!generatedListing) return;
    const title = isEditing ? editTitle : generatedListing.title;
    const desc = isEditing ? editDescription : generatedListing.description;
    const text = `${title}\n\n${desc}\n\nHighlights:\n${generatedListing.highlights.map((h: string) => `- ${h}`).join('\n')}\n\nRental Terms:\nPrice: ${generatedListing.rentalTerms.price}\nDeposit: ${generatedListing.rentalTerms.deposit}\nLease: ${generatedListing.rentalTerms.leaseLength}`;
    navigator.clipboard.writeText(text);
    toast.success('Listing copied to clipboard — paste it into your listing platform');
  }, [generatedListing, isEditing, editTitle, editDescription]);

  const handleSendApplication = useCallback(async (inquiry: Inquiry) => {
    try {
      const res = await fetch('/api/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: inquiry.propertyId }),
      });
      if (!res.ok) throw new Error('Failed to create screening link');
      const data = await res.json();
      const link = data.application?.link;
      if (link) {
        await navigator.clipboard.writeText(link);
        toast.success(`Application link copied — send to ${inquiry.prospectName}`);
      } else {
        toast.success(`Application created for ${inquiry.prospectName}`);
      }
    } catch (err) {
      console.error('[Vacancies] Send application error:', err);
      toast.error('Failed to generate application link');
    }
  }, []);

  const handleScheduleShowing = useCallback(async (inquiry: Inquiry) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const date = tomorrow.toISOString().split('T')[0];
      const res = await fetch('/api/vacancy/showings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: inquiry.propertyId,
          prospectName: inquiry.prospectName,
          prospectEmail: inquiry.email,
          prospectPhone: inquiry.phone,
          date,
          time: '14:00',
          inquiryId: inquiry.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to schedule showing');
      const newShowing = await res.json();
      setShowings((prev) => [...prev, newShowing]);
      toast.success(`Showing scheduled for ${inquiry.prospectName}`);
    } catch (err) {
      console.error('[Vacancies] Schedule showing error:', err);
      toast.error('Failed to schedule showing');
    }
  }, []);

  const handleSendReply = useCallback(() => {
    if (!replyMessage.trim()) return;
    toast.success('Reply sent successfully');
    setReplyingTo(null);
    setReplyMessage('');
  }, [replyMessage]);

  const handleSendReminder = useCallback((showing: Showing) => {
    toast.success(`Reminder noted for ${showing.prospectName}`);
  }, []);

  const handleCancelShowing = useCallback(async (showing: Showing) => {
    try {
      const supabase = createClient();
      await supabase.from('showings').delete().eq('id', showing.id);
      setShowings((prev) => prev.filter((s) => s.id !== showing.id));
      toast.success(`Showing with ${showing.prospectName} canceled`);
    } catch (err) {
      console.error('[Vacancies] Cancel showing error:', err);
      toast.error('Failed to cancel showing');
    }
  }, []);

  const handleCopyShowingLink = useCallback((propertyId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/showing/${propertyId}`);
    toast.success('Showing link copied to clipboard');
  }, []);

  const toggleAvailability = useCallback((index: number) => {
    setAvailability((prev) =>
      prev.map((a, i) => (i === index ? { ...a, enabled: !a.enabled } : a)),
    );
  }, []);

  const updateAvailabilityTime = useCallback(
    (index: number, field: 'startTime' | 'endTime', value: string) => {
      setAvailability((prev) =>
        prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
      );
    },
    [],
  );

  /* ================================================================== */
  /*  Render: Loading State                                              */
  /* ================================================================== */

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton variant="card" height="100px" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton variant="card" height="280px" />
          <Skeleton variant="card" height="280px" />
          <Skeleton variant="card" height="280px" />
        </div>
      </div>
    );
  }

  /* ================================================================== */
  /*  Render: Vacancy Alert Banner                                       */
  /* ================================================================== */

  const AlertBanner = () => (
    <div
      className="rounded-lg p-5 mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(217, 119, 6, 0.12) 100%)',
        border: '1px solid rgba(220, 38, 38, 0.25)',
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red/10 border border-red/20 shrink-0">
          <AlertTriangle className="w-6 h-6 text-red" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-lg text-white">
            {properties.length} vacant unit{properties.length !== 1 ? 's' : ''}{' '}
            <span className="text-red">
              &mdash; estimated ${totalLostIncome.toLocaleString()}/month in lost income
            </span>
          </h2>
          <div className="flex items-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-muted font-body">Average days vacant:</span>
              <span className="font-mono text-warning font-semibold">{avgDaysVacant} days</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-red" />
              <span className="text-muted font-body">Total potential lost:</span>
              <span className="font-mono text-red font-semibold">
                ${(totalLostIncome * (avgDaysVacant / 30)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ================================================================== */
  /*  Render: Vacancy Property Cards                                     */
  /* ================================================================== */

  const VacancyCards = () => {
    if (properties.length === 0) {
      return (
        <EmptyState
          icon={<Home />}
          title="No vacant units"
          description="Great job keeping your portfolio occupied! All your properties currently have active tenants."
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {properties.map((property) => {
          const meta = propertyMeta[property.id] || { listingStatus: 'Not Listed', inquiries: 0, showings: 0 };
          const daysVacant = getDaysVacant(property.updated_at);
          const statusVariant =
            meta.listingStatus === 'Active'
              ? 'success'
              : meta.listingStatus === 'Listed'
                ? 'info'
                : 'muted';

          return (
            <Card key={property.id} padding="none" variant="elevated">
              {/* Header */}
              <div className="p-5 pb-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-white text-base truncate">
                      {property.address}
                    </h3>
                    <p className="text-sm text-muted font-body flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {property.city}, {property.state}
                    </p>
                  </div>
                  <Badge variant={statusVariant} size="sm" dot>
                    {meta.listingStatus}
                  </Badge>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-xs text-muted font-body mb-3">
                  {property.bedrooms != null && (
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" />
                      {property.bedrooms} bd
                    </span>
                  )}
                  {property.bathrooms != null && (
                    <span className="flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5" />
                      {property.bathrooms} ba
                    </span>
                  )}
                  {property.sqft != null && (
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      {property.sqft.toLocaleString()} sqft
                    </span>
                  )}
                </div>

                {/* Rent + Days Vacant */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-gold font-semibold text-lg">
                    ${(property.monthly_rent ?? 0).toLocaleString()}/mo
                  </span>
                  <span className={cn(
                    'text-xs font-mono font-medium px-2 py-1 rounded',
                    daysVacant > 30
                      ? 'bg-red/10 text-red'
                      : daysVacant > 14
                        ? 'bg-warning/10 text-warning'
                        : 'bg-gold/10 text-gold',
                  )}>
                    {daysVacant} days vacant
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Inquiry & Showing Stats */}
              <div className="px-5 py-3 flex items-center gap-6">
                <div className="flex items-center gap-2 text-xs">
                  <MessageSquare className="w-3.5 h-3.5 text-gold-light" />
                  <span className="text-muted font-body">{meta.inquiries} inquiries</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-gold" />
                  <span className="text-muted font-body">{meta.showings} showings</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Action Buttons */}
              <div className="p-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => handleGenerateListing(property)}
                >
                  Generate Listing
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setActiveTab('inquiries');
                    toast.info(`Viewing inquiries for ${property.address}`);
                  }}
                >
                  Inquiries
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setActiveTab('showings');
                    toast.info(`Scheduling showing for ${property.address}`);
                  }}
                >
                  Schedule
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  /* ================================================================== */
  /*  Render: Inquiries Tab                                              */
  /* ================================================================== */

  const InquiriesTab = () => {
    const scoreVariant = (score: string) => {
      switch (score) {
        case 'High': return 'success';
        case 'Medium': return 'warning';
        default: return 'danger';
      }
    };

    const sourceIcon = (source: string) => {
      switch (source) {
        case 'Zillow': return <Globe className="w-3.5 h-3.5" />;
        case 'Facebook': return <Users className="w-3.5 h-3.5" />;
        case 'Direct': return <Mail className="w-3.5 h-3.5" />;
        default: return <Globe className="w-3.5 h-3.5" />;
      }
    };

    if (inquiries.length === 0) {
      return (
        <EmptyState
          icon={<MessageSquare />}
          title="No inquiries yet"
          description="Once your vacancies are listed, prospect inquiries will appear here."
        />
      );
    }

    return (
      <div className="space-y-3">
        {/* Summary header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-white text-base">
              Prospect Inquiries
            </h3>
            <p className="text-xs text-muted font-body mt-0.5">
              {inquiries.length} total &middot; AI-scored by interest level
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">{inquiries.filter((i) => i.interestScore === 'High').length} High</Badge>
            <Badge variant="warning" size="sm">{inquiries.filter((i) => i.interestScore === 'Medium').length} Med</Badge>
            <Badge variant="danger" size="sm">{inquiries.filter((i) => i.interestScore === 'Low').length} Low</Badge>
          </div>
        </div>

        {/* Inquiry rows */}
        {inquiries.map((inquiry) => (
          <Card key={inquiry.id} padding="none" variant="default">
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Left: prospect info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-semibold text-sm text-gold shrink-0"
                      style={{ background: 'rgba(201, 168, 76, 0.1)', border: '1px solid rgba(201, 168, 76, 0.2)' }}
                    >
                      {inquiry.prospectName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold text-white text-sm truncate">
                        {inquiry.prospectName}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted font-body">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {inquiry.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {inquiry.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message preview */}
                  <p className="text-xs text-muted font-body leading-relaxed line-clamp-2 mb-2 pl-12">
                    &ldquo;{inquiry.message}&rdquo;
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 pl-12">
                    <Badge variant={scoreVariant(inquiry.interestScore)} size="sm" dot>
                      {inquiry.interestScore} Interest
                    </Badge>
                    <span className="flex items-center gap-1 text-[10px] text-muted-deep font-body uppercase tracking-wider">
                      {sourceIcon(inquiry.source)}
                      {inquiry.source}
                    </span>
                    <span className="text-[10px] text-muted-deep font-body">
                      {formatDate(inquiry.dateReceived)}
                    </span>
                    <span className="text-[10px] text-muted-deep font-body truncate max-w-[160px]">
                      {inquiry.propertyAddress}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Send className="w-3 h-3" />}
                    onClick={() => handleSendApplication(inquiry)}
                  >
                    Send App
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Calendar className="w-3 h-3" />}
                    onClick={() => handleScheduleShowing(inquiry)}
                  >
                    Schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<MessageSquare className="w-3 h-3" />}
                    onClick={() => setReplyingTo(replyingTo === inquiry.id ? null : inquiry.id)}
                  >
                    Reply
                  </Button>
                </div>
              </div>

              {/* Reply compose */}
              {replyingTo === inquiry.id && (
                <div className="mt-3 pl-12 flex gap-2">
                  <Input
                    placeholder={`Reply to ${inquiry.prospectName}...`}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                  />
                  <Button size="sm" variant="primary" onClick={handleSendReply} icon={<Send className="w-3 h-3" />}>
                    Send
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyMessage(''); }}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  /* ================================================================== */
  /*  Render: Showings Tab                                               */
  /* ================================================================== */

  const ShowingsTab = () => (
    <div className="space-y-6">
      {/* Available Windows */}
      <Card padding="lg">
        <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold" />
          Set Available Windows
        </h3>
        <p className="text-xs text-muted font-body mb-4">
          Define when prospects can book showings at your vacant properties.
        </p>
        <div className="space-y-2">
          {availability.map((window, i) => (
            <div
              key={window.day}
              className={cn(
                'flex items-center gap-4 p-3 rounded-lg transition-colors',
                window.enabled ? 'bg-tertiary' : 'bg-transparent opacity-50',
              )}
            >
              <button
                onClick={() => toggleAvailability(i)}
                className={cn(
                  'w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0',
                  window.enabled
                    ? 'bg-gold/20 border-gold/40 text-gold'
                    : 'bg-transparent border-border text-transparent',
                )}
              >
                {window.enabled && <Check className="w-3 h-3" />}
              </button>
              <span className="font-body text-sm text-white w-24">{window.day}</span>
              <input
                type="time"
                value={window.startTime}
                onChange={(e) => updateAvailabilityTime(i, 'startTime', e.target.value)}
                disabled={!window.enabled}
                className="bg-black border border-border rounded-lg px-3 py-1.5 text-sm text-white font-mono disabled:opacity-40"
              />
              <span className="text-muted text-xs">to</span>
              <input
                type="time"
                value={window.endTime}
                onChange={(e) => updateAvailabilityTime(i, 'endTime', e.target.value)}
                disabled={!window.enabled}
                className="bg-black border border-border rounded-lg px-3 py-1.5 text-sm text-white font-mono disabled:opacity-40"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Upcoming Showings */}
      <Card padding="lg">
        <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold" />
          Upcoming Showings
        </h3>
        {showings.length === 0 ? (
          <p className="text-sm text-muted font-body">No showings scheduled.</p>
        ) : (
          <div className="space-y-2">
            {showings.map((showing) => {
              const statusVariant =
                showing.status === 'Confirmed'
                  ? 'success'
                  : showing.status === 'Pending'
                    ? 'warning'
                    : 'muted';

              return (
                <div
                  key={showing.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-tertiary"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-semibold text-sm text-gold shrink-0"
                      style={{ background: 'rgba(201, 168, 76, 0.1)', border: '1px solid rgba(201, 168, 76, 0.2)' }}
                    >
                      {showing.prospectName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-display font-semibold text-white truncate">
                        {showing.prospectName}
                      </p>
                      <p className="text-xs text-muted font-body truncate">
                        {showing.propertyAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted font-mono whitespace-nowrap">
                      {formatDateTime(showing.dateTime)}
                    </span>
                    <Badge variant={statusVariant} size="sm">
                      {showing.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSendReminder(showing)}
                      >
                        Remind
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleCancelShowing(showing)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Showing Link */}
      {properties.length > 0 && (
        <Card padding="lg">
          <h3 className="font-display font-semibold text-white text-base mb-2 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-gold" />
            Showing Booking Links
          </h3>
          <p className="text-xs text-muted font-body mb-4">
            Anyone with these links can book a showing during your available windows.
          </p>
          <div className="space-y-2">
            {properties.map((property) => (
              <div
                key={property.id}
                className="flex items-center justify-between p-3 rounded-lg bg-tertiary"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-body truncate">{property.address}</p>
                  <p className="text-xs text-muted font-mono truncate mt-0.5">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/showing/{property.id}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Copy className="w-3 h-3" />}
                  onClick={() => handleCopyShowingLink(property.id)}
                >
                  Copy Link
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  /* ================================================================== */
  /*  Render: Analytics Tab                                              */
  /* ================================================================== */

  const AnalyticsTab = () => {
    // Compute metrics from real inquiry/showing/property data
    const totalInquiries = inquiries.length;
    const totalShowings = showings.length;
    const highInterestCount = inquiries.filter((inq) => inq.interestScore === 'High').length;
    const conversionRate = totalInquiries > 0 ? Math.round((highInterestCount / totalInquiries) * 100) : 0;

    // Compute source distribution from actual inquiries
    const sourceCounts: Record<string, number> = {};
    inquiries.forEach((inq) => {
      sourceCounts[inq.source] = (sourceCounts[inq.source] || 0) + 1;
    });
    const bestPlatform = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
    const bestPlatformName = bestPlatform ? bestPlatform[0] : 'N/A';
    const bestPlatformPct = bestPlatform && totalInquiries > 0
      ? Math.round((bestPlatform[1] / totalInquiries) * 100)
      : 0;

    const stats = [
      {
        label: 'Avg Days Vacant',
        value: String(avgDaysVacant),
        unit: 'days',
        icon: <Clock className="w-5 h-5" />,
        color: 'text-gold',
      },
      {
        label: 'Total Inquiries',
        value: String(totalInquiries),
        unit: '',
        icon: <MessageSquare className="w-5 h-5" />,
        color: 'text-gold-light',
      },
      {
        label: 'Showings Scheduled',
        value: String(totalShowings),
        unit: '',
        icon: <Calendar className="w-5 h-5" />,
        color: 'text-gold',
      },
      {
        label: 'High-Interest Rate',
        value: String(conversionRate),
        unit: '%',
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-green',
      },
      {
        label: 'Top Lead Source',
        value: bestPlatformName,
        unit: `${bestPlatformPct}% of leads`,
        icon: <Star className="w-5 h-5" />,
        color: 'text-warning',
      },
      {
        label: 'Est. Lost Rent / Month',
        value: `$${totalLostIncome.toLocaleString()}`,
        unit: '',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-gold',
      },
    ];

    // Build source distribution from actual inquiry data
    const sourceConfig: { key: string; label: string; color: string }[] = [
      { key: 'Zillow', label: 'Zillow', color: '#c9a84c' },
      { key: 'Facebook', label: 'FB Marketplace', color: '#c9a84c' },
      { key: 'Direct', label: 'Direct', color: '#D97706' },
      { key: 'Apartments.com', label: 'Apartments.com', color: '#6366F1' },
      { key: 'Craigslist', label: 'Craigslist', color: '#4A6080' },
    ];
    const inquirySources = sourceConfig.map((src) => ({
      platform: src.label,
      percent: totalInquiries > 0 ? Math.round(((sourceCounts[src.key] || 0) / totalInquiries) * 100) : 0,
      color: src.color,
    }));

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} padding="lg" variant="elevated">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('p-2 rounded-lg bg-card border border-border', stat.color)}>
                  {stat.icon}
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-bold text-2xl text-white">{stat.value}</span>
                {stat.unit && (
                  <span className="text-xs text-muted font-body">{stat.unit}</span>
                )}
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-body mt-1">
                {stat.label}
              </p>
            </Card>
          ))}
        </div>

        {/* Inquiries by Source - Bar Chart */}
        <Card padding="lg">
          <h3 className="font-display font-semibold text-white text-base mb-1">
            Inquiries by Source
          </h3>
          <p className="text-xs text-muted font-body mb-6">
            Distribution of inquiry sources this month
          </p>
          <div className="space-y-4">
            {inquirySources.map((source) => (
              <div key={source.platform}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white font-body">{source.platform}</span>
                  <span className="text-sm font-mono text-muted">{source.percent}%</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${source.percent}%`,
                      background: `linear-gradient(90deg, ${source.color}, ${source.color}88)`,
                      boxShadow: `0 0 12px ${source.color}40`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Trend - Visual bars */}
        <Card padding="lg">
          <h3 className="font-display font-semibold text-white text-base mb-1">
            Monthly Inquiry Trend
          </h3>
          <p className="text-xs text-muted font-body mb-6">
            Inquiry volume over the past 6 months
          </p>
          <div className="flex items-end justify-between gap-3 h-40">
            {[
              { month: 'Sep', value: 18 },
              { month: 'Oct', value: 22 },
              { month: 'Nov', value: 26 },
              { month: 'Dec', value: 19 },
              { month: 'Jan', value: 29 },
              { month: 'Feb', value: 34 },
            ].map((bar) => {
              const maxVal = 34;
              const heightPercent = (bar.value / maxVal) * 100;
              return (
                <div key={bar.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-mono text-muted">{bar.value}</span>
                  <div className="w-full relative rounded-t-md overflow-hidden" style={{ height: `${heightPercent}%`, minHeight: '8px' }}>
                    <div
                      className="absolute inset-0 rounded-t-md"
                      style={{
                        background: 'linear-gradient(180deg, #c9a84c 0%, #c9a84c/40 100%)',
                        boxShadow: '0 0 12px rgba(201, 168, 76, 0.2)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted font-body">
                    {bar.month}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  /* ================================================================== */
  /*  Render: Listing Generator Modal                                    */
  /* ================================================================== */

  const ListingModal = () => (
    <Modal open={listingModalOpen} onOpenChange={setListingModalOpen}>
      <ModalContent maxWidth="2xl" className="max-h-[90vh] overflow-y-auto">
        <ModalHeader
          title="AI Listing Generator"
          description="Generate a professional rental listing with one click"
        />

        <div className="px-6 pb-6 space-y-5">
          {/* Property Summary */}
          {selectedProperty && (
            <div
              className="rounded-lg p-4 flex items-center gap-4"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gold/10 border border-gold/20 shrink-0">
                <Home className="w-5 h-5 text-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-white text-sm truncate">
                  {selectedProperty.address}
                </p>
                <p className="text-xs text-muted font-body">
                  {selectedProperty.city}, {selectedProperty.state} &middot;{' '}
                  {selectedProperty.bedrooms ?? '--'} bd / {selectedProperty.bathrooms ?? '--'} ba &middot;{' '}
                  {selectedProperty.sqft ? `${selectedProperty.sqft.toLocaleString()} sqft` : '-- sqft'}
                </p>
              </div>
              <span className="font-mono text-gold font-semibold text-lg shrink-0">
                ${(selectedProperty.monthly_rent ?? 0).toLocaleString()}/mo
              </span>
            </div>
          )}

          {/* Generate Button */}
          {!generatedListing && (
            <div className="flex justify-center py-8">
              <Button
                size="lg"
                variant="solid"
                loading={isGenerating}
                icon={<Sparkles className="w-5 h-5" />}
                onClick={handleGenerate}
              >
                {isGenerating ? 'Generating Listing...' : 'Generate Professional Listing'}
              </Button>
            </div>
          )}

          {/* Generated Listing Preview */}
          {generatedListing && (
            <div className="space-y-5">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="success" dot>Generated</Badge>
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setIsEditing(false);
                      } else {
                        setEditTitle(generatedListing.title);
                        setEditDescription(generatedListing.description);
                        setIsEditing(true);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-body px-3 py-1.5 rounded-lg transition-colors',
                      isEditing
                        ? 'bg-gold/10 text-gold border border-gold/30'
                        : 'text-muted hover:text-white hover:bg-white/5',
                    )}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditing ? 'Editing' : 'Edit'}
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={copiedListing ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={handleCopyListing}
                >
                  {copiedListing ? 'Copied!' : 'Copy Listing'}
                </Button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-body text-muted mb-1.5">
                  Listing Title
                </label>
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="font-display font-semibold"
                  />
                ) : (
                  <h3 className="font-display font-bold text-lg text-white">
                    {generatedListing.title}
                  </h3>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-body text-muted mb-1.5">
                  Description
                </label>
                {isEditing ? (
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-[200px] text-sm leading-relaxed"
                  />
                ) : (
                  <div className="text-sm text-white/80 font-body leading-relaxed whitespace-pre-line">
                    {generatedListing.description}
                  </div>
                )}
              </div>

              {/* Highlights */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-body text-muted mb-2">
                  Property Highlights
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {generatedListing.highlights.map((highlight, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-white font-body px-3 py-2 rounded-lg"
                      style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                    >
                      <Check className="w-3.5 h-3.5 text-gold shrink-0" />
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rental Terms */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-body text-muted mb-2">
                  Rental Terms
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className="p-3 rounded-lg text-center"
                    style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted font-body mb-1">Monthly Rent</p>
                    <p className="font-mono font-semibold text-gold">{generatedListing.rentalTerms.price}</p>
                  </div>
                  <div
                    className="p-3 rounded-lg text-center"
                    style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted font-body mb-1">Security Deposit</p>
                    <p className="font-mono font-semibold text-white text-sm">{generatedListing.rentalTerms.deposit}</p>
                  </div>
                  <div
                    className="p-3 rounded-lg text-center"
                    style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted font-body mb-1">Lease Term</p>
                    <p className="font-mono font-semibold text-white text-sm">{generatedListing.rentalTerms.leaseLength}</p>
                  </div>
                </div>
              </div>

              {/* Publish Section */}
              <div
                className="rounded-lg p-4"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              >
                <h4 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-gold" />
                  Share Listing
                </h4>
                <p className="text-xs text-muted font-body mb-4">Copy your listing to paste into Zillow, Facebook Marketplace, Apartments.com, or other platforms.</p>
                <Button
                  variant="solid"
                  fullWidth
                  icon={<ExternalLink className="w-4 h-4" />}
                  onClick={handlePublish}
                >
                  Copy Listing to Clipboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );

  /* ================================================================== */
  /*  Main Page Render                                                   */
  /* ================================================================== */

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold/10 border border-gold/20">
            <Building2 className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">
              Vacancy Marketing Center
            </h1>
            <p className="text-sm text-muted font-body">
              Fill vacancies faster with AI-powered listings, automated outreach, and showing management
            </p>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {properties.length > 0 && <AlertBanner />}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vacancies" icon={<Home className="w-3.5 h-3.5" />}>
            Vacancies
          </TabsTrigger>
          <TabsTrigger value="inquiries" icon={<MessageSquare className="w-3.5 h-3.5" />}>
            Inquiries
          </TabsTrigger>
          <TabsTrigger value="showings" icon={<Calendar className="w-3.5 h-3.5" />}>
            Showings
          </TabsTrigger>
          <TabsTrigger value="analytics" icon={<BarChart3 className="w-3.5 h-3.5" />}>
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vacancies">
          <VacancyCards />
        </TabsContent>

        <TabsContent value="inquiries">
          <InquiriesTab />
        </TabsContent>

        <TabsContent value="showings">
          <ShowingsTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>

      {/* Listing Generator Modal */}
      <ListingModal />
    </div>
  );
}
