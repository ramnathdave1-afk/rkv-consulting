'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import type { FeedDeal, BuyBox } from '@/types';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

import {
  RefreshCw,
  Search,
  Home,
  Bed,
  Bath,
  Square,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
  TrendingUp,
  DollarSign,
  MapPin,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Filter,
  LayoutGrid,
} from 'lucide-react';

/* ================================================================== */
/*  CONSTANTS                                                          */
/* ================================================================== */

const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'SFR', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi-family' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
];

const MIN_BEDROOMS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
];

const MIN_CAP_RATE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '4', label: '4%+' },
  { value: '5', label: '5%+' },
  { value: '6', label: '6%+' },
  { value: '7', label: '7%+' },
  { value: '8', label: '8%+' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'mls', label: 'MLS' },
  { value: 'foreclosure', label: 'Foreclosure' },
  { value: 'fsbo', label: 'FSBO' },
  { value: 'auction', label: 'Auction' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'ai_score', label: 'Best AI Score' },
  { value: 'price_asc', label: 'Lowest Price' },
  { value: 'cap_rate_desc', label: 'Highest Cap Rate' },
];

const SOURCE_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  wholesale: { bg: 'bg-[#D97706]/20', text: 'text-[#D97706]', label: 'WHOLESALE' },
  mls: { bg: 'bg-[#c9a84c]/20', text: 'text-[#c9a84c]', label: 'MLS' },
  foreclosure: { bg: 'bg-[#DC2626]/20', text: 'text-[#DC2626]', label: 'FORECLOSURE' },
  fsbo: { bg: 'bg-[#c9a84c]/20', text: 'text-[#c9a84c]', label: 'FSBO' },
  auction: { bg: 'bg-[#8B5CF6]/20', text: 'text-[#8B5CF6]', label: 'AUCTION' },
};

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number | null | undefined): string {
  if (value == null) return '--';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '--';
  return new Intl.NumberFormat('en-US').format(value);
}

function getScoreColor(score: number | null): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  if (score == null || score < 5) {
    return {
      bg: 'bg-[#DC2626]/15',
      text: 'text-[#DC2626]',
      border: 'border-[#DC2626]/30',
      glow: 'shadow-[0_0_12px_rgba(220,38,38,0.3)]',
    };
  }
  if (score < 7) {
    return {
      bg: 'bg-[#D97706]/15',
      text: 'text-[#D97706]',
      border: 'border-[#D97706]/30',
      glow: 'shadow-[0_0_12px_rgba(217,119,6,0.3)]',
    };
  }
  return {
    bg: 'bg-[#c9a84c]/15',
    text: 'text-[#c9a84c]',
    border: 'border-[#c9a84c]/30',
    glow: 'shadow-[0_0_12px_rgba(201,168,76,0.3)]',
  };
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dealMatchesBuyBox(deal: FeedDeal, buyBox: BuyBox | null): boolean {
  if (!buyBox) return false;

  const marketMatch =
    buyBox.markets.length === 0 ||
    buyBox.markets.some(
      (m) =>
        deal.city.toLowerCase().includes(m.toLowerCase()) ||
        deal.state.toLowerCase().includes(m.toLowerCase())
    );

  const typeMatch =
    buyBox.property_types.length === 0 ||
    buyBox.property_types.some((t) => deal.property_type.toLowerCase().includes(t.toLowerCase()));

  const priceMatch =
    deal.asking_price >= (buyBox.price_min || 0) &&
    deal.asking_price <= (buyBox.price_max || Infinity);

  const bedroomMatch =
    !buyBox.min_bedrooms || (deal.bedrooms != null && deal.bedrooms >= buyBox.min_bedrooms);

  const capRateMatch =
    !buyBox.min_cap_rate ||
    (deal.cap_rate_estimate != null && deal.cap_rate_estimate >= buyBox.min_cap_rate);

  return marketMatch && typeMatch && priceMatch && bedroomMatch && capRateMatch;
}

/* ================================================================== */
/*  FILTER STATE TYPE                                                  */
/* ================================================================== */

interface Filters {
  markets: string;
  propertyType: string;
  priceMin: string;
  priceMax: string;
  minBedrooms: string;
  minCapRate: string;
  source: string;
  sort: string;
}

const DEFAULT_FILTERS: Filters = {
  markets: '',
  propertyType: '',
  priceMin: '',
  priceMax: '',
  minBedrooms: '',
  minCapRate: '',
  source: '',
  sort: 'newest',
};

/* ================================================================== */
/*  ANALYSIS RESULT TYPE                                               */
/* ================================================================== */

interface AnalysisResult {
  ai_score: number | null;
  recommendation: 'buy' | 'pass' | 'negotiate' | null;
  reasoning: string;
  cap_rate_estimate: number | null;
  rent_estimate: number | null;
  arv_estimate: number | null;
}

/* ================================================================== */
/*  SKELETON CARD COMPONENT                                            */
/* ================================================================== */

function DealCardSkeleton() {
  return (
    <Card variant="default" padding="none">
      <Skeleton variant="card" height="200px" className="rounded-b-none" />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" width="75%" height="16px" />
        <Skeleton variant="text" width="50%" height="12px" />
        <Skeleton variant="text" width="40%" height="24px" />
        <div className="flex gap-4">
          <Skeleton variant="text" width="50px" height="12px" />
          <Skeleton variant="text" width="50px" height="12px" />
          <Skeleton variant="text" width="60px" height="12px" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton variant="text" width="48%" height="32px" />
          <Skeleton variant="text" width="48%" height="32px" />
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  BUY BOX CONFIGURATION SECTION                                      */
/* ================================================================== */

function BuyBoxConfig({
  buyBox,
  onSave,
  isOpen,
  onToggle,
}: {
  buyBox: BuyBox | null;
  onSave: (buyBox: Partial<BuyBox>) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [markets, setMarkets] = useState(buyBox?.markets?.join(', ') || '');
  const [priceMin, setPriceMin] = useState(buyBox?.price_min?.toString() || '');
  const [priceMax, setPriceMax] = useState(buyBox?.price_max?.toString() || '');
  const [minBedrooms, setMinBedrooms] = useState(buyBox?.min_bedrooms?.toString() || '');
  const [minCapRate, setMinCapRate] = useState(buyBox?.min_cap_rate?.toString() || '');
  const [propertyTypes, setPropertyTypes] = useState(buyBox?.property_types?.join(', ') || '');

  useEffect(() => {
    if (buyBox) {
      setMarkets(buyBox.markets?.join(', ') || '');
      setPriceMin(buyBox.price_min?.toString() || '');
      setPriceMax(buyBox.price_max?.toString() || '');
      setMinBedrooms(buyBox.min_bedrooms?.toString() || '');
      setMinCapRate(buyBox.min_cap_rate?.toString() || '');
      setPropertyTypes(buyBox.property_types?.join(', ') || '');
    }
  }, [buyBox]);

  const handleSave = () => {
    onSave({
      markets: markets
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
      property_types: propertyTypes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      price_min: priceMin ? parseFloat(priceMin) : 0,
      price_max: priceMax ? parseFloat(priceMax) : 10_000_000,
      min_bedrooms: minBedrooms ? parseInt(minBedrooms) : 0,
      min_cap_rate: minCapRate ? parseFloat(minCapRate) : 0,
    });
  };

  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-300"
      style={{
        background: '#111111',
        border: '1px solid rgba(201, 168, 76, 0.3)',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(201, 168, 76, 0.1)' }}
          >
            <Target className="w-4.5 h-4.5 text-gold" />
          </div>
          <div className="text-left">
            <p className="font-display font-semibold text-sm text-white">
              {buyBox ? 'Your Buy Box' : 'Set Your Buy Box'}
            </p>
            <p className="text-xs text-muted font-body mt-0.5">
              {buyBox
                ? `${buyBox.markets.length} market${buyBox.markets.length !== 1 ? 's' : ''} tracked`
                : 'Configure criteria to see personalized matches'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!buyBox && (
            <Badge variant="warning" size="sm" dot>
              Setup Required
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid #1e1e1e' }}>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Target Markets"
              placeholder="Phoenix, Dallas, Tampa..."
              value={markets}
              onChange={(e) => setMarkets(e.target.value)}
              icon={<MapPin className="w-4 h-4" />}
            />
            <Input
              label="Property Types"
              placeholder="SFR, Multi-family..."
              value={propertyTypes}
              onChange={(e) => setPropertyTypes(e.target.value)}
              icon={<Home className="w-4 h-4" />}
            />
            <Input
              label="Min Price"
              placeholder="100,000"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value.replace(/[^0-9]/g, ''))}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <Input
              label="Max Price"
              placeholder="500,000"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value.replace(/[^0-9]/g, ''))}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <Select
              label="Min Bedrooms"
              value={minBedrooms}
              onChange={(e) => setMinBedrooms(e.target.value)}
              options={MIN_BEDROOMS_OPTIONS}
            />
            <Select
              label="Min Cap Rate"
              value={minCapRate}
              onChange={(e) => setMinCapRate(e.target.value)}
              options={MIN_CAP_RATE_OPTIONS}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={handleSave}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save Buy Box
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  DEAL CARD COMPONENT                                                */
/* ================================================================== */

function DealCard({
  deal,
  matchesBuyBox,
  isSaved,
  isSaving,
  onQuickAnalysis,
  onSave,
}: {
  deal: FeedDeal;
  matchesBuyBox: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onQuickAnalysis: () => void;
  onSave: () => void;
}) {
  const scoreColors = getScoreColor(deal.ai_score);
  const sourceBadge = SOURCE_BADGE_STYLES[deal.source] || SOURCE_BADGE_STYLES.mls;

  return (
    <Card variant="interactive" padding="none" className="group relative flex flex-col">
      {/* Buy Box Match Banner */}
      {matchesBuyBox && (
        <div
          className="px-3 py-1.5 flex items-center gap-1.5"
          style={{ background: 'rgba(201, 168, 76, 0.12)', borderBottom: '1px solid rgba(201, 168, 76, 0.2)' }}
        >
          <CheckCircle2 className="w-3 h-3 text-gold" />
          <span className="text-[10px] font-mono font-semibold text-gold uppercase tracking-wider">
            Matches Buy Box
          </span>
        </div>
      )}

      {/* Image Area */}
      <div className="relative h-[200px] overflow-hidden" style={{ background: '#080808' }}>
        {deal.image_url ? (
          <Image
            src={deal.image_url}
            alt={deal.address}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Home className="w-10 h-10 text-muted/20" />
            <span className="text-[10px] font-mono text-muted/30 uppercase tracking-wider">
              No Image
            </span>
          </div>
        )}

        {/* Source badge overlay */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider ${sourceBadge.bg} ${sourceBadge.text}`}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            {sourceBadge.label}
          </span>
        </div>

        {/* AI Score overlay */}
        {deal.ai_score != null && (
          <div className="absolute top-3 right-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm ${scoreColors.bg} ${scoreColors.text} ${scoreColors.border} border ${scoreColors.glow}`}
            >
              {deal.ai_score}
            </div>
          </div>
        )}

        {/* Days on market overlay */}
        {deal.days_on_market != null && (
          <div className="absolute bottom-3 right-3">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-white/70 bg-black/60"
              style={{ backdropFilter: 'blur(4px)' }}
            >
              <Clock className="w-3 h-3" />
              {deal.days_on_market}d
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex-1 p-4 space-y-3">
        {/* Address */}
        <div>
          <p className="font-body font-semibold text-white text-sm leading-tight truncate">
            {deal.address}
          </p>
          <p className="text-muted text-xs font-body mt-0.5">
            {deal.city}, {deal.state} {deal.zip}
          </p>
        </div>

        {/* Price */}
        <p className="font-mono font-bold text-gold text-xl">
          {formatCurrency(deal.asking_price)}
        </p>

        {/* Property details grid */}
        <div className="flex items-center gap-4 text-muted text-xs font-body">
          {deal.bedrooms != null && (
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5" />
              {deal.bedrooms} bd
            </span>
          )}
          {deal.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" />
              {deal.bathrooms} ba
            </span>
          )}
          {deal.sqft != null && (
            <span className="flex items-center gap-1">
              <Square className="w-3.5 h-3.5" />
              {formatNumber(deal.sqft)} sqft
            </span>
          )}
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-3 flex-wrap">
          {deal.cap_rate_estimate != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gold/80">
              <TrendingUp className="w-3 h-3" />
              {deal.cap_rate_estimate.toFixed(1)}% Cap
            </span>
          )}
          {deal.rent_estimate != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted">
              <DollarSign className="w-3 h-3" />
              {formatCompact(deal.rent_estimate)}/mo est.
            </span>
          )}
          {deal.arv_estimate != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted">
              ARV {formatCompact(deal.arv_estimate)}
            </span>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid #1e1e1e' }}
      >
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAnalysis();
          }}
        >
          <Zap className="w-3.5 h-3.5" />
          Quick Analysis
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          disabled={isSaved || isSaving}
          loading={isSaving}
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" />
              Save Deal
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  QUICK ANALYSIS MODAL                                               */
/* ================================================================== */

function QuickAnalysisModal({
  deal,
  open,
  onOpenChange,
  analysisResult,
  analyzing,
  onAddToPipeline,
  savingPipeline,
  isSaved,
}: {
  deal: FeedDeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisResult: AnalysisResult | null;
  analyzing: boolean;
  onAddToPipeline: () => void;
  savingPipeline: boolean;
  isSaved: boolean;
}) {
  const router = useRouter();

  if (!deal) return null;

  const scoreColors = getScoreColor(analysisResult?.ai_score ?? deal.ai_score);

  const recommendationConfig: Record<
    string,
    { color: string; bg: string; border: string; icon: React.ReactNode; label: string }
  > = {
    buy: {
      color: 'text-[#c9a84c]',
      bg: 'bg-[#c9a84c]/10',
      border: 'border-[#c9a84c]/30',
      icon: <CheckCircle2 className="w-5 h-5" />,
      label: 'BUY',
    },
    pass: {
      color: 'text-[#DC2626]',
      bg: 'bg-[#DC2626]/10',
      border: 'border-[#DC2626]/30',
      icon: <XCircle className="w-5 h-5" />,
      label: 'PASS',
    },
    negotiate: {
      color: 'text-[#D97706]',
      bg: 'bg-[#D97706]/10',
      border: 'border-[#D97706]/30',
      icon: <AlertTriangle className="w-5 h-5" />,
      label: 'NEGOTIATE',
    },
  };

  const openFullAnalysis = () => {
    const params = new URLSearchParams({
      address: deal.address,
      city: deal.city,
      state: deal.state,
      zip: deal.zip,
      price: deal.asking_price.toString(),
      ...(deal.bedrooms != null && { bedrooms: deal.bedrooms.toString() }),
      ...(deal.bathrooms != null && { bathrooms: deal.bathrooms.toString() }),
      ...(deal.sqft != null && { sqft: deal.sqft.toString() }),
      ...(deal.rent_estimate != null && { rent: deal.rent_estimate.toString() }),
      ...(deal.arv_estimate != null && { arv: deal.arv_estimate.toString() }),
    });
    router.push(`/deals?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidth="2xl">
        <ModalHeader
          title={deal.address}
          description={`${deal.city}, ${deal.state} ${deal.zip}`}
        />

        <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {
                label: 'Asking Price',
                value: formatCurrency(deal.asking_price),
                mono: true,
              },
              {
                label: 'Est. ARV',
                value: formatCurrency(analysisResult?.arv_estimate ?? deal.arv_estimate),
                mono: true,
              },
              {
                label: 'Est. Monthly Rent',
                value: formatCurrency(analysisResult?.rent_estimate ?? deal.rent_estimate),
                mono: true,
              },
              {
                label: 'Est. Cap Rate',
                value:
                  (analysisResult?.cap_rate_estimate ?? deal.cap_rate_estimate) != null
                    ? `${(analysisResult?.cap_rate_estimate ?? deal.cap_rate_estimate)!.toFixed(1)}%`
                    : '--',
                mono: true,
              },
              {
                label: 'Price/Rent Ratio',
                value:
                  deal.rent_estimate && deal.rent_estimate > 0
                    ? (deal.asking_price / (deal.rent_estimate * 12)).toFixed(1)
                    : '--',
                mono: true,
              },
              {
                label: 'AI Score',
                value: (analysisResult?.ai_score ?? deal.ai_score)?.toString() ?? '--',
                isScore: true,
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg p-3"
                style={{ background: '#0F1620', border: '1px solid #1e1e1e' }}
              >
                <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-1">
                  {metric.label}
                </p>
                {metric.isScore ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs ${scoreColors.bg} ${scoreColors.text} ${scoreColors.border} border`}
                    >
                      {metric.value}
                    </div>
                    <span className={`text-xs font-mono ${scoreColors.text}`}>
                      {(analysisResult?.ai_score ?? deal.ai_score ?? 0) >= 7
                        ? 'Good Deal'
                        : (analysisResult?.ai_score ?? deal.ai_score ?? 0) >= 5
                          ? 'Fair'
                          : 'Risky'}
                    </span>
                  </div>
                ) : (
                  <p
                    className={`text-sm font-semibold text-white ${metric.mono ? 'font-mono' : 'font-body'}`}
                  >
                    {metric.value}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* AI Recommendation */}
          <div>
            <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-3">
              AI Recommendation
            </p>
            {analyzing ? (
              <div
                className="rounded-lg p-6 flex flex-col items-center gap-3"
                style={{ background: '#0F1620', border: '1px solid #1e1e1e' }}
              >
                <Loader2 className="w-6 h-6 text-gold animate-spin" />
                <p className="text-sm text-muted font-body">Analyzing deal metrics...</p>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-pulse"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-3">
                {/* Recommendation badge */}
                {(() => {
                  const config =
                    (analysisResult.recommendation ? recommendationConfig[analysisResult.recommendation] : null) ||
                    recommendationConfig.negotiate;
                  return (
                    <div
                      className={`rounded-lg p-4 flex items-center gap-3 border ${config.bg} ${config.border}`}
                    >
                      <div className={config.color}>{config.icon}</div>
                      <div>
                        <p className={`font-display font-bold text-sm ${config.color}`}>
                          {config.label}
                        </p>
                        <p className="text-xs text-muted font-body mt-0.5">
                          AI Recommendation
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Reasoning */}
                <div
                  className="rounded-lg p-4"
                  style={{ background: '#0F1620', border: '1px solid #1e1e1e' }}
                >
                  <p className="text-xs text-white/80 font-body leading-relaxed whitespace-pre-line">
                    {analysisResult.reasoning}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-lg p-4"
                style={{ background: '#0F1620', border: '1px solid #1e1e1e' }}
              >
                <p className="text-xs text-muted font-body">
                  Analysis will begin automatically...
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {deal.description && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-body text-muted mb-2">
                Description
              </p>
              <p className="text-xs text-white/70 font-body leading-relaxed">
                {deal.description}
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" size="sm" onClick={openFullAnalysis}>
            <ExternalLink className="w-3.5 h-3.5" />
            Open Full Analysis
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onAddToPipeline}
            disabled={isSaved || savingPipeline}
            loading={savingPipeline}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5" />
                Saved to Pipeline
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                Add to Pipeline
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */

export default function DealFeedPage() {
  const _router = useRouter();
  const supabase = createClient();
  const { hasFeature: _hasFeature, planName: _planName } = useSubscription();

  /* ---------------------------------------------------------------- */
  /*  State                                                            */
  /* ---------------------------------------------------------------- */

  const [deals, setDeals] = useState<FeedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedDeal, setSelectedDeal] = useState<FeedDeal | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [buyBox, setBuyBox] = useState<BuyBox | null>(null);
  const [buyBoxOpen, setBuyBoxOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasBuyBox = buyBox !== null && buyBox.markets.length > 0;

  /* ---------------------------------------------------------------- */
  /*  Fetch buy box from Supabase                                      */
  /* ---------------------------------------------------------------- */

  const fetchBuyBox = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('buy_boxes')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (data) {
        setBuyBox(data as BuyBox);
      }
    } catch {
      // No buy box set yet, that is okay
    }
  }, [supabase]);

  /* ---------------------------------------------------------------- */
  /*  Save buy box                                                     */
  /* ---------------------------------------------------------------- */

  const saveBuyBox = useCallback(
    async (partial: Partial<BuyBox>) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
          user_id: user.id,
          markets: partial.markets || [],
          property_types: partial.property_types || [],
          price_min: partial.price_min || 0,
          price_max: partial.price_max || 10_000_000,
          min_bedrooms: partial.min_bedrooms || 0,
          min_cap_rate: partial.min_cap_rate || 0,
          sources: partial.sources || [],
          updated_at: new Date().toISOString(),
        };

        if (buyBox?.id) {
          const { data } = await supabase
            .from('buy_boxes')
            .update(payload)
            .eq('id', buyBox.id)
            .select()
            .single();
          if (data) setBuyBox(data as BuyBox);
        } else {
          const { data } = await supabase
            .from('buy_boxes')
            .insert({ ...payload, created_at: new Date().toISOString() })
            .select()
            .single();
          if (data) setBuyBox(data as BuyBox);
        }

        setBuyBoxOpen(false);
      } catch {
        // Silently handle -- user can retry
      }
    },
    [supabase, buyBox]
  );

  /* ---------------------------------------------------------------- */
  /*  Fetch deals from API                                             */
  /* ---------------------------------------------------------------- */

  const fetchDeals = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params = new URLSearchParams();
        if (filters.markets) params.set('markets', filters.markets);
        if (filters.propertyType) params.set('property_type', filters.propertyType);
        if (filters.priceMin) params.set('price_min', filters.priceMin);
        if (filters.priceMax) params.set('price_max', filters.priceMax);
        if (filters.minBedrooms) params.set('min_bedrooms', filters.minBedrooms);
        if (filters.minCapRate) params.set('min_cap_rate', filters.minCapRate);
        if (filters.source) params.set('source', filters.source);
        if (filters.sort) params.set('sort', filters.sort);
        if (isRefresh) params.set('refresh', 'true');

        const res = await fetch(`/api/deals/feed?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch deals');

        const data = await res.json();
        setDeals(data.deals || []);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deal feed');
        setDeals([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters]
  );

  /* ---------------------------------------------------------------- */
  /*  Initial fetch                                                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    fetchBuyBox();
  }, [fetchBuyBox]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  /* ---------------------------------------------------------------- */
  /*  Quick analysis                                                   */
  /* ---------------------------------------------------------------- */

  const runQuickAnalysis = useCallback(async (deal: FeedDeal) => {
    setSelectedDeal(deal);
    setAnalysisResult(null);
    setAnalyzing(true);

    try {
      const res = await fetch('/api/deals/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: deal.address,
          city: deal.city,
          state: deal.state,
          zip: deal.zip,
          asking_price: deal.asking_price,
          bedrooms: deal.bedrooms,
          bathrooms: deal.bathrooms,
          sqft: deal.sqft,
          property_type: deal.property_type,
          rent_estimate: deal.rent_estimate,
          arv_estimate: deal.arv_estimate,
          cap_rate_estimate: deal.cap_rate_estimate,
        }),
      });

      if (!res.ok) throw new Error('Analysis failed');

      const result = await res.json();
      setAnalysisResult(result);
    } catch {
      // Fallback: use existing scores if available, otherwise show what we have
      const score = deal.ai_score ?? null;
      const recommendation: 'buy' | 'pass' | 'negotiate' | null =
        score !== null ? (score >= 7 ? 'buy' : score >= 5 ? 'negotiate' : 'pass') : null;

      setAnalysisResult({
        ai_score: score,
        recommendation,
        reasoning: score !== null
          ? generateLocalReasoning(deal, score, recommendation || 'negotiate')
          : 'AI analysis unavailable. Please try again later.',
        cap_rate_estimate: deal.cap_rate_estimate,
        rent_estimate: deal.rent_estimate,
        arv_estimate: deal.arv_estimate,
      });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Local reasoning fallback                                         */
  /* ---------------------------------------------------------------- */

  function generateLocalReasoning(
    deal: FeedDeal,
    score: number,
    recommendation: string
  ): string {
    const lines: string[] = [];

    if (recommendation === 'buy') {
      lines.push(
        `This ${deal.property_type || 'property'} at ${deal.address} shows strong investment fundamentals.`
      );
    } else if (recommendation === 'negotiate') {
      lines.push(
        `This ${deal.property_type || 'property'} at ${deal.address} has mixed signals requiring further analysis.`
      );
    } else {
      lines.push(
        `This ${deal.property_type || 'property'} at ${deal.address} does not meet current investment thresholds.`
      );
    }

    if (deal.cap_rate_estimate != null) {
      lines.push(
        `Estimated cap rate of ${deal.cap_rate_estimate.toFixed(1)}% ${deal.cap_rate_estimate >= 6 ? 'exceeds' : 'falls below'} the target 6% threshold.`
      );
    }

    if (deal.rent_estimate != null && deal.asking_price > 0) {
      const ratio = (deal.rent_estimate / deal.asking_price) * 100;
      lines.push(
        `Rent-to-price ratio of ${ratio.toFixed(2)}% ${ratio >= 1 ? 'passes' : 'fails'} the 1% rule.`
      );
    }

    if (deal.days_on_market != null) {
      if (deal.days_on_market > 60) {
        lines.push(
          `Listed for ${deal.days_on_market} days -- extended time on market may indicate room for negotiation.`
        );
      } else if (deal.days_on_market < 7) {
        lines.push(
          `Only ${deal.days_on_market} days on market -- act quickly if interested.`
        );
      }
    }

    if (deal.arv_estimate != null && deal.asking_price > 0) {
      const equity = ((deal.arv_estimate - deal.asking_price) / deal.asking_price) * 100;
      if (equity > 15) {
        lines.push(
          `Potential forced equity of ${equity.toFixed(0)}% through value-add strategy.`
        );
      }
    }

    lines.push(
      `\nAI Confidence Score: ${score}/10. ${recommendation === 'buy' ? 'Recommend proceeding with due diligence.' : recommendation === 'negotiate' ? 'Recommend submitting a below-asking offer.' : 'Consider alternative opportunities.'}`
    );

    return lines.join('\n');
  }

  /* ---------------------------------------------------------------- */
  /*  Save deal to pipeline                                            */
  /* ---------------------------------------------------------------- */

  const saveDeal = useCallback(
    async (dealId: string) => {
      if (savedIds.has(dealId) || saving.has(dealId)) return;

      setSaving((prev) => new Set(prev).add(dealId));

      try {
        const res = await fetch('/api/deals/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deal_id: dealId }),
        });

        if (!res.ok) throw new Error('Failed to save deal');

        setSavedIds((prev) => new Set(prev).add(dealId));
      } catch {
        // Allow retry
      } finally {
        setSaving((prev) => {
          const next = new Set(prev);
          next.delete(dealId);
          return next;
        });
      }
    },
    [savedIds, saving]
  );

  /* ---------------------------------------------------------------- */
  /*  Filter & sort deals                                              */
  /* ---------------------------------------------------------------- */

  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Client-side filtering (supplements server-side filtering)
    if (filters.markets) {
      const searchTerms = filters.markets
        .toLowerCase()
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (searchTerms.length > 0) {
        result = result.filter((d) =>
          searchTerms.some(
            (term) =>
              d.city.toLowerCase().includes(term) ||
              d.state.toLowerCase().includes(term) ||
              d.zip.includes(term)
          )
        );
      }
    }

    if (filters.propertyType) {
      result = result.filter(
        (d) => d.property_type.toLowerCase() === filters.propertyType.toLowerCase()
      );
    }

    if (filters.priceMin) {
      const min = parseFloat(filters.priceMin);
      if (!isNaN(min)) result = result.filter((d) => d.asking_price >= min);
    }

    if (filters.priceMax) {
      const max = parseFloat(filters.priceMax);
      if (!isNaN(max)) result = result.filter((d) => d.asking_price <= max);
    }

    if (filters.minBedrooms) {
      const min = parseInt(filters.minBedrooms);
      if (!isNaN(min))
        result = result.filter((d) => d.bedrooms != null && d.bedrooms >= min);
    }

    if (filters.minCapRate) {
      const min = parseFloat(filters.minCapRate);
      if (!isNaN(min))
        result = result.filter(
          (d) => d.cap_rate_estimate != null && d.cap_rate_estimate >= min
        );
    }

    if (filters.source) {
      result = result.filter((d) => d.source === filters.source);
    }

    // Sort
    switch (filters.sort) {
      case 'ai_score':
        result.sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
        break;
      case 'price_asc':
        result.sort((a, b) => a.asking_price - b.asking_price);
        break;
      case 'cap_rate_desc':
        result.sort(
          (a, b) => (b.cap_rate_estimate ?? 0) - (a.cap_rate_estimate ?? 0)
        );
        break;
      case 'newest':
      default:
        result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    return result;
  }, [deals, filters]);

  /* ---------------------------------------------------------------- */
  /*  Match count                                                      */
  /* ---------------------------------------------------------------- */

  const matchCount = useMemo(() => {
    if (!hasBuyBox) return 0;
    return filteredDeals.filter((d) => dealMatchesBuyBox(d, buyBox)).length;
  }, [filteredDeals, buyBox, hasBuyBox]);

  /* ---------------------------------------------------------------- */
  /*  Filter updater                                                   */
  /* ---------------------------------------------------------------- */

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(
      ([key, value]) => key !== 'sort' && value !== '' && value !== DEFAULT_FILTERS[key as keyof Filters]
    );
  }, [filters]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ========================================================== */}
        {/*  HEADER                                                     */}
        {/* ========================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(201, 168, 76, 0.1)', border: '1px solid rgba(201, 168, 76, 0.2)' }}
              >
                <LayoutGrid className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-white">Deal Feed</h1>
                <p className="text-muted font-body text-sm mt-0.5">
                  Off-market and wholesale deals matching your criteria
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Last updated */}
            {lastUpdated && (
              <span className="text-[10px] font-mono text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {timeAgo(lastUpdated)}
              </span>
            )}

            {/* Match count badge */}
            {hasBuyBox && matchCount > 0 && (
              <Badge variant="success" size="sm" dot>
                {matchCount} deal{matchCount !== 1 ? 's' : ''} match your buy box
              </Badge>
            )}

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDeals(true)}
              loading={refreshing}
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ========================================================== */}
        {/*  BUY BOX CONFIGURATION                                      */}
        {/* ========================================================== */}
        <BuyBoxConfig
          buyBox={buyBox}
          onSave={saveBuyBox}
          isOpen={buyBoxOpen || !hasBuyBox}
          onToggle={() => setBuyBoxOpen((prev) => !prev)}
        />

        {/* ========================================================== */}
        {/*  FILTER BAR                                                 */}
        {/* ========================================================== */}
        <Card variant="default" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gold" />
            <span className="text-xs font-display font-semibold text-white uppercase tracking-wider">
              Filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-[10px] font-mono text-gold hover:text-white transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Markets */}
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <Input
                placeholder="City, State, or ZIP..."
                value={filters.markets}
                onChange={(e) => updateFilter('markets', e.target.value)}
                icon={<MapPin className="w-3.5 h-3.5" />}
                className="!h-9 !text-xs"
              />
            </div>

            {/* Property Type */}
            <div className="w-full sm:w-auto sm:min-w-[150px]">
              <Select
                value={filters.propertyType}
                onChange={(e) => updateFilter('propertyType', e.target.value)}
                options={PROPERTY_TYPE_OPTIONS}
                className="!h-9 !text-xs"
              />
            </div>

            {/* Price Range */}
            <div className="flex items-center gap-1.5">
              <Input
                placeholder="Min $"
                value={filters.priceMin}
                onChange={(e) =>
                  updateFilter('priceMin', e.target.value.replace(/[^0-9]/g, ''))
                }
                className="!h-9 !text-xs !w-24"
              />
              <span className="text-muted text-xs">-</span>
              <Input
                placeholder="Max $"
                value={filters.priceMax}
                onChange={(e) =>
                  updateFilter('priceMax', e.target.value.replace(/[^0-9]/g, ''))
                }
                className="!h-9 !text-xs !w-24"
              />
            </div>

            {/* Min Bedrooms */}
            <div className="w-full sm:w-auto sm:min-w-[110px]">
              <Select
                value={filters.minBedrooms}
                onChange={(e) => updateFilter('minBedrooms', e.target.value)}
                options={MIN_BEDROOMS_OPTIONS}
                placeholder="Beds"
                className="!h-9 !text-xs"
              />
            </div>

            {/* Min Cap Rate */}
            <div className="w-full sm:w-auto sm:min-w-[110px]">
              <Select
                value={filters.minCapRate}
                onChange={(e) => updateFilter('minCapRate', e.target.value)}
                options={MIN_CAP_RATE_OPTIONS}
                placeholder="Cap Rate"
                className="!h-9 !text-xs"
              />
            </div>

            {/* Source */}
            <div className="w-full sm:w-auto sm:min-w-[130px]">
              <Select
                value={filters.source}
                onChange={(e) => updateFilter('source', e.target.value)}
                options={SOURCE_OPTIONS}
                className="!h-9 !text-xs"
              />
            </div>

            {/* Sort */}
            <div className="w-full sm:w-auto sm:min-w-[150px] sm:ml-auto">
              <Select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                options={SORT_OPTIONS}
                className="!h-9 !text-xs"
              />
            </div>
          </div>

          {/* Active filter count */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #1e1e1e' }}>
              <SlidersHorizontal className="w-3 h-3 text-muted" />
              <span className="text-[10px] font-mono text-muted">
                {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''} matching
                filters
              </span>
            </div>
          )}
        </Card>

        {/* ========================================================== */}
        {/*  ERROR STATE                                                */}
        {/* ========================================================== */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 flex items-center gap-3"
            style={{
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
            }}
          >
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <p className="text-xs text-[#DC2626] font-body">{error}</p>
            <button
              onClick={() => fetchDeals()}
              className="ml-auto text-xs text-[#DC2626] hover:text-white font-mono underline transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/*  LOADING STATE                                              */}
        {/* ========================================================== */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <DealCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ========================================================== */}
        {/*  EMPTY STATE                                                */}
        {/* ========================================================== */}
        {!loading && !error && filteredDeals.length === 0 && (
          <EmptyState
            icon={<Search />}
            title="No deals match your current filters"
            description="Try expanding your price range, adding more markets, or adjusting your filter criteria to see available deals."
            action={{
              label: 'Clear Filters',
              onClick: clearFilters,
              icon: <RefreshCw />,
            }}
          />
        )}

        {/* ========================================================== */}
        {/*  DEAL CARDS GRID                                            */}
        {/* ========================================================== */}
        {!loading && filteredDeals.length > 0 && (
          <>
            {/* Results summary */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted font-mono">
                Showing {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
                {hasActiveFilters && ' (filtered)'}
              </p>
              {matchCount > 0 && hasBuyBox && (
                <Badge variant="success" size="sm">
                  <Target className="w-3 h-3" />
                  {matchCount} buy box match{matchCount !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDeals.map((deal) => {
                const matches = hasBuyBox && dealMatchesBuyBox(deal, buyBox);

                return (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    matchesBuyBox={matches}
                    isSaved={savedIds.has(deal.id)}
                    isSaving={saving.has(deal.id)}
                    onQuickAnalysis={() => runQuickAnalysis(deal)}
                    onSave={() => saveDeal(deal.id)}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* ========================================================== */}
        {/*  QUICK ANALYSIS MODAL                                       */}
        {/* ========================================================== */}
        <QuickAnalysisModal
          deal={selectedDeal}
          open={selectedDeal !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDeal(null);
              setAnalysisResult(null);
              setAnalyzing(false);
            }
          }}
          analysisResult={analysisResult}
          analyzing={analyzing}
          onAddToPipeline={() => {
            if (selectedDeal) saveDeal(selectedDeal.id);
          }}
          savingPipeline={selectedDeal ? saving.has(selectedDeal.id) : false}
          isSaved={selectedDeal ? savedIds.has(selectedDeal.id) : false}
        />
      </div>
    </div>
  );
}
