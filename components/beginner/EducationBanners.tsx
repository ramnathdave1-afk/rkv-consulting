'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Lightbulb,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GlossaryItem {
  term: string;
  definition: string;
}

interface BannerProps {
  onDismiss: () => void;
}

/* ------------------------------------------------------------------ */
/*  Dismiss persistence                                                */
/* ------------------------------------------------------------------ */

const DISMISS_KEY = 'rkv_dismissed_tips';

function isDismissed(bannerId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) return false;
    const dismissed: string[] = JSON.parse(stored);
    return dismissed.includes(bannerId);
  } catch {
    return false;
  }
}

function persistDismiss(bannerId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(DISMISS_KEY);
    const dismissed: string[] = stored ? JSON.parse(stored) : [];
    if (!dismissed.includes(bannerId)) {
      dismissed.push(bannerId);
      localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Base banner component                                              */
/* ------------------------------------------------------------------ */

function EducationBanner({
  bannerId,
  headline,
  glossary,
  onDismiss,
}: {
  bannerId: string;
  headline: string;
  glossary: GlossaryItem[];
  onDismiss: () => void;
}) {
  const [hidden, setHidden] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Check dismiss state on mount
  useEffect(() => {
    setHidden(isDismissed(bannerId));
  }, [bannerId]);

  const handleDismiss = useCallback(() => {
    persistDismiss(bannerId);
    setHidden(true);
    onDismiss();
  }, [bannerId, onDismiss]);

  if (hidden) return null;

  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(5, 150, 105, 0.06)',
        border: '1px solid rgba(5, 150, 105, 0.15)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2.5 text-left flex-1 min-w-0 group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(5, 150, 105, 0.15)' }}
          >
            <Lightbulb className="h-4 w-4 text-gold" />
          </div>
          <span className="text-sm font-medium text-white group-hover:text-gold transition-colors truncate">
            {headline}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted shrink-0" />
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          icon={<X className="h-3.5 w-3.5" />}
          className="shrink-0"
          aria-label="Dismiss"
        >
          Dismiss
        </Button>
      </div>

      {/* Expandable glossary */}
      {expanded && (
        <div
          className="px-4 pb-4 animate-fade-up"
          style={{ borderTop: '1px solid rgba(5, 150, 105, 0.1)' }}
        >
          <div className="pt-3 space-y-3">
            {glossary.map((item, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[10px] font-mono text-gold/60 mt-0.5 shrink-0 w-4 text-right">
                  {i + 1}.
                </span>
                <div>
                  <span className="text-xs font-medium text-white">
                    {item.term}
                  </span>
                  <span className="text-xs text-muted ml-1.5">
                    &mdash; {item.definition}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deal Analyzer Banner                                               */
/* ------------------------------------------------------------------ */

const dealGlossary: GlossaryItem[] = [
  {
    term: 'Cap Rate',
    definition:
      'Net Operating Income divided by property price. A quick measure of return. Higher cap rates mean higher potential returns (and usually higher risk).',
  },
  {
    term: 'Cash-on-Cash Return',
    definition:
      'Annual pre-tax cash flow divided by total cash invested. Shows the actual return on the money you put in, unlike cap rate which ignores financing.',
  },
  {
    term: 'NOI (Net Operating Income)',
    definition:
      'Total income minus all operating expenses (not including mortgage). This is the property\'s profitability before debt service.',
  },
  {
    term: 'DSCR (Debt Service Coverage Ratio)',
    definition:
      'NOI divided by annual mortgage payments. Lenders want 1.25+ which means income covers the mortgage 1.25 times over.',
  },
  {
    term: 'GRM (Gross Rent Multiplier)',
    definition:
      'Property price divided by annual gross rent. A quick screening tool. Lower GRM = better value relative to rental income.',
  },
  {
    term: '1% Rule',
    definition:
      'Monthly rent should be at least 1% of the purchase price. A quick filter for cash flow potential. $200K property should rent for $2,000+/mo.',
  },
  {
    term: 'IRR (Internal Rate of Return)',
    definition:
      'The annualized return accounting for the time value of money across the full hold period. The gold standard for comparing investments.',
  },
  {
    term: 'Deal Score',
    definition:
      'Our proprietary 0-100 rating combining cap rate, cash flow, appreciation potential, and risk factors into a single number.',
  },
];

export function DealAnalyzerBanner({ onDismiss }: BannerProps) {
  return (
    <EducationBanner
      bannerId="deal_analyzer"
      headline="New to deal analysis? Here's what these numbers mean"
      glossary={dealGlossary}
      onDismiss={onDismiss}
    />
  );
}

DealAnalyzerBanner.displayName = 'DealAnalyzerBanner';

/* ------------------------------------------------------------------ */
/*  Market Intel Banner                                                */
/* ------------------------------------------------------------------ */

const marketGlossary: GlossaryItem[] = [
  {
    term: 'Days on Market',
    definition:
      'Average time listings stay active before selling. Lower numbers mean a hotter market with faster sales. Under 30 days is very competitive.',
  },
  {
    term: 'Months of Supply',
    definition:
      'How long current inventory would last at the current sales pace. Under 4 months favors sellers; over 6 months favors buyers.',
  },
  {
    term: 'Price-to-Rent Ratio',
    definition:
      'Median home price divided by annual rent. Under 15 favors buying; 15-20 is neutral; over 20 favors renting (or investing elsewhere).',
  },
  {
    term: 'Population Growth',
    definition:
      'Year-over-year population change. Growing populations drive housing demand, rent growth, and appreciation. Target 1%+ annual growth.',
  },
  {
    term: 'Job Growth',
    definition:
      'Year-over-year employment increase. Strong job markets attract renters, support higher rents, and reduce vacancy risk.',
  },
  {
    term: 'Vacancy Rate',
    definition:
      'Percentage of rental units currently unoccupied. Under 5% is a tight market (good for landlords). Over 8% signals oversupply risk.',
  },
];

export function MarketIntelBanner({ onDismiss }: BannerProps) {
  return (
    <EducationBanner
      bannerId="market_intel"
      headline="How to pick a market for your first investment"
      glossary={marketGlossary}
      onDismiss={onDismiss}
    />
  );
}

MarketIntelBanner.displayName = 'MarketIntelBanner';

/* ------------------------------------------------------------------ */
/*  Accounting Banner                                                  */
/* ------------------------------------------------------------------ */

const accountingGlossary: GlossaryItem[] = [
  {
    term: 'Mortgage Interest',
    definition:
      'The interest portion of your mortgage payment is fully deductible. This is often the largest single deduction for real estate investors.',
  },
  {
    term: 'Depreciation',
    definition:
      'The IRS lets you deduct the cost of your building (not land) over 27.5 years. A $275K building = $10K/year tax deduction, even with no cash spent.',
  },
  {
    term: 'Repairs & Maintenance',
    definition:
      'All costs to maintain the property in rentable condition. Painting, plumbing fixes, appliance repairs, pest control are all immediately deductible.',
  },
  {
    term: 'Insurance',
    definition:
      'Property insurance, liability insurance, flood insurance, and umbrella policies. All fully deductible as a business expense.',
  },
  {
    term: 'Property Management',
    definition:
      'Fees paid to a management company (typically 8-12% of rent). Fully deductible whether you use a company or manage yourself.',
  },
  {
    term: 'Travel',
    definition:
      'Mileage and travel costs for property inspections, tenant meetings, and real estate activities. Track every trip with a mileage log.',
  },
  {
    term: 'Home Office',
    definition:
      'If you manage properties from home, you can deduct a portion of rent, utilities, and internet based on square footage used.',
  },
];

export function AccountingBanner({ onDismiss }: BannerProps) {
  return (
    <EducationBanner
      bannerId="accounting"
      headline="The 7 deductions you can't afford to miss"
      glossary={accountingGlossary}
      onDismiss={onDismiss}
    />
  );
}

AccountingBanner.displayName = 'AccountingBanner';
