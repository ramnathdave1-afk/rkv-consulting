'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Calculator,
  DollarSign,
  Wrench,
  FileText,
  TrendingDown,
  Search,
  LayoutDashboard,
  Hammer,
  Globe,
  BookOpen,
  Mail,
  Phone,
  MessageSquare,
  Check,
  X,
  Activity,
  PieChart,
  Star,
} from 'lucide-react';

/* ================================================================== */
/*  COUNTER HOOK                                                       */
/* ================================================================== */
function useCountUp(
  target: number,
  isInView: boolean,
  duration: number = 2000,
  decimals: number = 0
) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isInView, target, duration, decimals]);

  return count;
}

/* ================================================================== */
/*  DATA                                                               */
/* ================================================================== */
const problems = [
  {
    icon: Calculator,
    headline: 'Manual Deal Analysis',
    description: 'Takes hours per property',
  },
  {
    icon: DollarSign,
    headline: 'Rent Collection',
    description: 'Chasing tenants every month',
  },
  {
    icon: Wrench,
    headline: 'Contractor Nightmares',
    description: 'Unreliable, overpriced, unresponsive',
  },
  {
    icon: BookOpen,
    headline: 'Scattered Financials',
    description: 'Missed deductions cost thousands',
  },
  {
    icon: TrendingDown,
    headline: 'Market Blind Spots',
    description: 'Missing shifts until it\'s too late',
  },
  {
    icon: FileText,
    headline: 'Paperwork Overload',
    description: 'Drowning in leases and documents',
  },
];

const featureCategories = [
  'Deal Analysis Engine',
  'AI Portfolio Dashboard',
  'Automated Tenant Management',
  'Tenant Screening',
  'Contractor Network',
  'Live Market Intelligence',
  'Accounting & Tax Center',
  'AI Voice & Email Agents',
];

const featureDeepDives = [
  {
    title: 'AI Deal Analyzer',
    subtitle: 'Analyze any deal in 30 seconds',
    bullets: [
      'Instant cash-on-cash, cap rate, and IRR projections',
      'Comparable sales analysis with AI-driven accuracy',
      'Risk scoring with neighborhood-level intelligence',
    ],
  },
  {
    title: 'Live Market Intelligence',
    subtitle: 'Real-time data across all 50 states',
    bullets: [
      'Hyper-local rent trends updated every 24 hours',
      'Emerging market detection before mainstream awareness',
      'Supply and demand forecasting by zip code',
    ],
  },
  {
    title: 'AI Voice Agent',
    subtitle: 'Your AI handles tenant calls 24/7',
    bullets: [
      'Natural language conversations indistinguishable from humans',
      'Automated rent collection calls with payment plan negotiation',
      'Maintenance request intake and contractor dispatch',
    ],
  },
  {
    title: 'Contractor Network',
    subtitle: 'AI-matched, rated, auto-bid',
    bullets: [
      'Vetted contractor database with real-time availability',
      'Automated bid comparison saves 30% on average',
      'Performance tracking with tenant satisfaction scores',
    ],
  },
  {
    title: 'Portfolio Dashboard',
    subtitle: 'Your entire portfolio at a glance',
    bullets: [
      'Real-time NOI, occupancy, and cash flow tracking',
      'Predictive maintenance alerts before issues arise',
      'Automated monthly investor reports',
    ],
  },
  {
    title: 'Accounting Center',
    subtitle: 'Every dollar tracked, every deduction found',
    bullets: [
      'Automatic transaction categorization with 99.2% accuracy',
      'AI-powered deduction finder averages $12,400 in savings',
      'One-click tax package generation for your CPA',
    ],
  },
];

const agentActions = [
  'Voice Agent called Unit 4B re: late rent \u2014 payment plan agreed \u2014 $750 collected',
  'Email Agent sent lease renewal to James T. \u2014 87 days before expiry',
  'SMS Agent responded to Maria L. maintenance request in 4 seconds',
  'Voice Agent confirmed move-in inspection for Unit 12A \u2014 Thursday 2pm',
  'Email Agent sent rent receipt to 14 tenants \u2014 all delivered successfully',
  'SMS Agent notified Robert M. of scheduled HVAC maintenance \u2014 confirmed',
];

const pricingPlans = [
  {
    name: 'Basic',
    price: 20,
    borderColor: 'border-border',
    badge: null,
    features: [
      'Up to 10 units',
      'Deal analyzer (5/mo)',
      'Basic tenant portal',
      'Expense tracking',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: 99,
    borderColor: 'border-gold',
    badge: 'Most Popular',
    features: [
      'Up to 50 units',
      'Unlimited deal analysis',
      'AI Voice & Email agents',
      'Market intelligence',
      'Priority support',
    ],
  },
  {
    name: 'Elite',
    price: 199,
    borderColor: 'border-green',
    badge: null,
    features: [
      'Unlimited units',
      'All Pro features',
      'Dedicated account manager',
      'Custom integrations',
      'White-glove onboarding',
    ],
  },
];

const testimonials = [
  {
    quote:
      'I used to spend 3 hours every Monday on rent follow-ups. RKV handles all of it. My VA called confused about why there was nothing to do.',
    author: 'Marcus T.',
    units: '14 units',
  },
  {
    quote:
      'Our vacancy rate dropped from 18% to 4% in 60 days. The AI agent filled units while I was on vacation.',
    author: 'Jennifer L.',
    units: '31 units',
  },
  {
    quote:
      'I found $23,000 in missed deductions my CPA didn\'t catch. The accounting center paid for itself 10 times over.',
    author: 'David K.',
    units: '8 units',
  },
];

/* ================================================================== */
/*  MOCK UI PREVIEWS FOR SOLUTION SECTION                              */
/* ================================================================== */
function DealAnalysisPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[11px] font-body uppercase tracking-wider text-muted">Deal #1847</span>
        <span className="text-[10px] font-body uppercase tracking-wider bg-green/20 text-green px-2 py-1 rounded-full">Strong Buy</span>
      </div>
      <div className="bg-deep rounded-lg p-4 border border-border">
        <div className="text-[10px] font-body uppercase tracking-wider text-muted mb-1">Property</div>
        <div className="font-display font-bold text-white">1247 Oak Street, Unit 4B</div>
        <div className="text-sm text-muted font-body">Austin, TX 78702</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cap Rate', value: '8.4%', color: 'text-green' },
          { label: 'CoC Return', value: '12.1%', color: 'text-gold' },
          { label: 'IRR (5yr)', value: '18.7%', color: 'text-green' },
        ].map((m) => (
          <div key={m.label} className="bg-deep rounded-lg p-3 border border-border text-center">
            <div className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</div>
            <div className="text-[10px] font-body uppercase tracking-wider text-muted mt-1">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {['Risk: Low', 'Neighborhood: A-', 'Schools: 8/10'].map((tag) => (
          <span key={tag} className="text-[10px] font-body bg-deep border border-border px-2 py-1 rounded text-muted">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function PortfolioDashboardPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display font-bold text-white">Portfolio Overview</span>
        <span className="text-[10px] font-body uppercase tracking-wider text-gold">Live</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total NOI', value: '$47,200', trend: '+12%' },
          { label: 'Occupancy', value: '96.4%', trend: '+2.1%' },
          { label: 'Units', value: '34', trend: '' },
          { label: 'Cash Flow', value: '$18,400', trend: '+8%' },
        ].map((m) => (
          <div key={m.label} className="bg-deep rounded-lg p-3 border border-border">
            <div className="text-[10px] font-body uppercase tracking-wider text-muted">{m.label}</div>
            <div className="text-lg font-bold font-mono text-white">{m.value}</div>
            {m.trend && <span className="text-xs font-mono text-green">{m.trend}</span>}
          </div>
        ))}
      </div>
      <div className="bg-deep rounded-lg p-4 border border-border">
        <div className="text-[10px] font-body uppercase tracking-wider text-muted mb-3">Monthly Revenue</div>
        <div className="flex items-end gap-1 h-16">
          {[40, 55, 48, 62, 58, 72, 68, 78, 85, 80, 92, 88].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${h}%`,
                backgroundColor: i === 11 ? '#c9a84c' : '#1e1e1e',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TenantManagementPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display font-bold text-white">Tenant Activity</span>
        <span className="text-[10px] font-body uppercase tracking-wider bg-green/20 text-green px-2 py-1 rounded-full">All Current</span>
      </div>
      {[
        { name: 'Sarah M.', unit: '4B', status: 'Paid', date: 'Feb 1', color: 'text-green' },
        { name: 'James T.', unit: '7A', status: 'Paid', date: 'Feb 1', color: 'text-green' },
        { name: 'Maria L.', unit: '2C', status: 'Due Today', date: 'Feb 3', color: 'text-gold' },
        { name: 'Robert K.', unit: '9D', status: 'Paid', date: 'Feb 1', color: 'text-green' },
      ].map((t) => (
        <div key={t.unit} className="flex items-center justify-between bg-deep rounded-lg p-3 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-body text-muted">
              {t.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-body text-white">{t.name}</div>
              <div className="text-[10px] font-body text-muted">Unit {t.unit}</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-mono ${t.color}`}>{t.status}</div>
            <div className="text-[10px] font-mono text-muted">{t.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TenantScreeningPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display font-bold text-white">Applicant Review</span>
        <span className="text-[10px] font-body uppercase tracking-wider text-muted">3 pending</span>
      </div>
      <div className="bg-deep rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="font-body font-medium text-white">Angela W.</span>
          <span className="text-[10px] font-mono bg-green/20 text-green px-2 py-1 rounded-full">Score: 94</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: 'Credit', value: '742', ok: true },
            { label: 'Income', value: '3.4x Rent', ok: true },
            { label: 'Evictions', value: 'None', ok: true },
            { label: 'Criminal', value: 'Clear', ok: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between bg-card rounded p-2">
              <span className="text-[10px] font-body uppercase tracking-wider text-muted">{item.label}</span>
              <span className="text-xs font-mono text-green">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 bg-green/20 text-green text-sm py-2 rounded-lg font-body text-[11px] uppercase tracking-wider">Approve</button>
        <button className="flex-1 bg-red/20 text-red text-sm py-2 rounded-lg font-body text-[11px] uppercase tracking-wider">Decline</button>
      </div>
    </div>
  );
}

function ContractorNetworkPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display font-bold text-white">Matched Contractors</span>
        <span className="text-[10px] font-body uppercase tracking-wider text-muted">Plumbing</span>
      </div>
      {[
        { name: 'Rivera Plumbing', rating: 4.9, bids: '$340', time: '2hr response' },
        { name: 'QuickFix Pro', rating: 4.7, bids: '$385', time: '4hr response' },
        { name: 'Atlas Services', rating: 4.5, bids: '$420', time: 'Next day' },
      ].map((c) => (
        <div key={c.name} className="flex items-center justify-between bg-deep rounded-lg p-3 border border-border">
          <div>
            <div className="text-sm font-body font-medium text-white">{c.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-3 h-3 text-gold fill-gold" />
              <span className="text-xs font-mono text-gold">{c.rating}</span>
              <span className="text-[10px] font-body text-muted">{c.time}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-gold">{c.bids}</div>
            <div className="text-[10px] font-body text-muted">Est. bid</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketIntelligencePreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display font-bold text-white">Market Pulse</span>
        <span className="text-[10px] font-body uppercase tracking-wider bg-gold/20 text-gold px-2 py-1 rounded-full">Live</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { city: 'Austin', trend: '+4.2%', signal: 'Hot' },
          { city: 'Tampa', trend: '+3.8%', signal: 'Rising' },
          { city: 'Boise', trend: '-1.2%', signal: 'Cooling' },
        ].map((m) => (
          <div key={m.city} className="bg-deep rounded-lg p-3 border border-border text-center">
            <div className="text-[10px] font-body uppercase tracking-wider text-muted">{m.city}</div>
            <div className={`text-sm font-bold font-mono ${m.trend.startsWith('+') ? 'text-green' : 'text-red'}`}>
              {m.trend}
            </div>
            <div className="text-[10px] font-body text-muted mt-1">{m.signal}</div>
          </div>
        ))}
      </div>
      <div className="bg-deep rounded-lg p-4 border border-border">
        <div className="text-[10px] font-body uppercase tracking-wider text-muted mb-3">Rent Growth by Region</div>
        <div className="space-y-2">
          {[
            { region: 'Southeast', width: '78%' },
            { region: 'Southwest', width: '65%' },
            { region: 'Midwest', width: '42%' },
            { region: 'Northeast', width: '38%' },
          ].map((r) => (
            <div key={r.region} className="flex items-center gap-2">
              <span className="text-[10px] font-body text-muted w-20">{r.region}</span>
              <div className="flex-1 bg-card rounded-full h-2">
                <div className="bg-gold rounded-full h-2" style={{ width: r.width }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountingPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display font-bold text-white">Tax Center</span>
        <span className="text-[10px] font-body uppercase tracking-wider text-muted">FY 2025</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-deep rounded-lg p-3 border border-border">
          <div className="text-[10px] font-body uppercase tracking-wider text-muted">Revenue</div>
          <div className="text-lg font-bold font-mono text-green">$284,200</div>
        </div>
        <div className="bg-deep rounded-lg p-3 border border-border">
          <div className="text-[10px] font-body uppercase tracking-wider text-muted">Deductions Found</div>
          <div className="text-lg font-bold font-mono text-gold">$18,400</div>
        </div>
      </div>
      <div className="bg-deep rounded-lg p-3 border border-border space-y-2">
        <div className="text-[10px] font-body uppercase tracking-wider text-muted mb-2">Recent Transactions</div>
        {[
          { desc: 'Roof repair - Unit 7A', amount: '-$2,340', cat: 'Maintenance' },
          { desc: 'Rent - Sarah M.', amount: '+$1,800', cat: 'Income' },
          { desc: 'Insurance premium', amount: '-$420', cat: 'Insurance' },
        ].map((tx) => (
          <div key={tx.desc} className="flex items-center justify-between text-sm">
            <div>
              <div className="font-body text-white">{tx.desc}</div>
              <div className="text-[10px] font-body text-muted">{tx.cat}</div>
            </div>
            <span className={`font-mono font-bold ${tx.amount.startsWith('+') ? 'text-green' : 'text-red'}`}>
              {tx.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceEmailAgentsPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display font-bold text-white">Agent Activity</span>
        <span className="flex items-center gap-1.5 text-[10px] font-body uppercase tracking-wider text-green">
          <span className="pulse-dot bg-green" />
          3 agents active
        </span>
      </div>
      {[
        { agent: 'Voice Agent', action: 'Called Unit 4B — rent collected', time: '2m ago', icon: Phone },
        { agent: 'Email Agent', action: 'Sent lease renewal to James T.', time: '14m ago', icon: Mail },
        { agent: 'SMS Agent', action: 'Responded to maintenance req.', time: '28m ago', icon: MessageSquare },
      ].map((a) => (
        <div key={a.agent} className="flex items-start gap-3 bg-deep rounded-lg p-3 border border-border">
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
            <a.icon className="w-4 h-4 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-body font-medium text-white">{a.agent}</span>
              <span className="text-[10px] font-mono text-muted">{a.time}</span>
            </div>
            <div className="text-xs text-muted font-body mt-0.5">{a.action}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const featurePreviews = [
  DealAnalysisPreview,
  PortfolioDashboardPreview,
  TenantManagementPreview,
  TenantScreeningPreview,
  ContractorNetworkPreview,
  MarketIntelligencePreview,
  AccountingPreview,
  VoiceEmailAgentsPreview,
];

/* ================================================================== */
/*  DEEP DIVE MOCK UIs                                                 */
/* ================================================================== */
function DeepDiveDealAnalyzer() {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gold" />
          <span className="text-sm font-display font-bold text-white">Deal Analyzer</span>
        </div>
        <span className="text-[10px] font-body uppercase tracking-wider bg-green/20 text-green px-2 py-0.5 rounded-full">Analysis Complete</span>
      </div>
      <div className="bg-deep rounded-lg p-4 border border-border">
        <div className="text-sm font-body text-muted mb-1">1247 Oak Street, Austin TX</div>
        <div className="text-lg font-mono font-bold text-white">$385,000</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Cap Rate', val: '8.4%' },
          { label: 'CoC', val: '12.1%' },
          { label: 'DSCR', val: '1.38' },
          { label: 'IRR', val: '18.7%' },
        ].map((m) => (
          <div key={m.label} className="text-center bg-deep rounded p-2 border border-border">
            <div className="text-sm font-bold font-mono text-gold">{m.val}</div>
            <div className="text-[10px] font-body uppercase tracking-wider text-muted">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 h-10">
        {[35, 50, 42, 58, 65, 70, 68, 80, 75, 82, 88, 92].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${h}%`,
              backgroundColor: i >= 8 ? '#c9a84c' : '#1e1e1e',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DeepDiveMarketIntel() {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gold" />
          <span className="text-sm font-display font-bold text-white">Market Intelligence</span>
        </div>
        <span className="text-[10px] font-body uppercase tracking-wider bg-gold/20 text-gold px-2 py-0.5 rounded-full">Live Feed</span>
      </div>
      <div className="grid grid-cols-5 grid-rows-3 gap-1 h-28">
        {Array.from({ length: 15 }).map((_, i) => {
          const colors = ['bg-green/30', 'bg-green/50', 'bg-gold/30', 'bg-gold/50', 'bg-red/20', 'bg-deep'];
          return (
            <div key={i} className={`rounded ${colors[i % colors.length]} border border-border/50`} />
          );
        })}
      </div>
      <div className="space-y-2">
        {[
          { market: 'Austin, TX', val: '+4.2%', tag: 'Trending Up' },
          { market: 'Tampa, FL', val: '+3.8%', tag: 'High Demand' },
          { market: 'Boise, ID', val: '-1.2%', tag: 'Cooling' },
        ].map((m) => (
          <div key={m.market} className="flex items-center justify-between text-sm bg-deep rounded p-2 border border-border">
            <span className="font-body text-white">{m.market}</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${m.val.startsWith('+') ? 'text-green' : 'text-red'}`}>{m.val}</span>
              <span className="text-[10px] font-body text-muted">{m.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeepDiveVoiceAgent() {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gold" />
          <span className="text-sm font-display font-bold text-white">Voice Agent</span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-body uppercase tracking-wider text-green">
          <span className="pulse-dot bg-green" />
          Active
        </span>
      </div>
      {[
        { caller: 'Unit 4B - Late Rent', outcome: 'Payment plan agreed', amount: '$750', time: '3:42 PM' },
        { caller: 'Unit 12A - Inquiry', outcome: 'Showing scheduled', amount: '', time: '2:15 PM' },
        { caller: 'Unit 7C - Maintenance', outcome: 'Plumber dispatched', amount: '', time: '11:30 AM' },
        { caller: 'Unit 2D - Renewal', outcome: 'Lease extended 12mo', amount: '$1,450/mo', time: '9:05 AM' },
      ].map((call) => (
        <div key={call.caller} className="flex items-center justify-between bg-deep rounded-lg p-3 border border-border">
          <div>
            <div className="text-sm font-body text-white">{call.caller}</div>
            <div className="text-xs font-body text-green">{call.outcome}</div>
          </div>
          <div className="text-right">
            {call.amount && <div className="text-sm font-mono font-bold text-gold">{call.amount}</div>}
            <div className="text-[10px] font-mono text-muted">{call.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DeepDiveContractor() {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 space-y-3 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hammer className="w-4 h-4 text-gold" />
          <span className="text-sm font-display font-bold text-white">Contractor Match</span>
        </div>
        <span className="text-[10px] font-body uppercase tracking-wider text-muted">Plumbing &middot; Urgent</span>
      </div>
      {[
        { name: 'Rivera Plumbing Co.', score: 97, bid: '$340', eta: '2 hours' },
        { name: 'QuickFix Professional', score: 91, bid: '$385', eta: '4 hours' },
        { name: 'Atlas Maintenance', score: 86, bid: '$420', eta: 'Next day' },
      ].map((c, i) => (
        <div key={c.name} className={`flex items-center justify-between bg-deep rounded-lg p-3 border ${i === 0 ? 'border-gold/50' : 'border-border'}`}>
          <div>
            <div className="text-sm font-body font-medium text-white">{c.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-gold">Score: {c.score}</span>
              <span className="text-[10px] font-mono text-muted">ETA: {c.eta}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-white">{c.bid}</div>
            {i === 0 && <span className="text-[10px] font-body text-gold">Best Match</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeepDivePortfolio() {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-gold" />
          <span className="text-sm font-display font-bold text-white">Portfolio</span>
        </div>
        <span className="text-[10px] font-body uppercase tracking-wider text-muted">34 units</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'NOI', value: '$47.2K', color: 'text-green' },
          { label: 'Occupancy', value: '96.4%', color: 'text-gold' },
          { label: 'Cash Flow', value: '$18.4K', color: 'text-green' },
        ].map((m) => (
          <div key={m.label} className="bg-deep rounded p-3 border border-border text-center">
            <div className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</div>
            <div className="text-[10px] font-body uppercase tracking-wider text-muted">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-deep rounded-lg p-4 border border-border">
        <div className="text-[10px] font-body uppercase tracking-wider text-muted mb-2">12-Month Performance</div>
        <svg viewBox="0 0 300 60" className="w-full h-12">
          <polyline
            points="0,50 25,42 50,45 75,35 100,38 125,30 150,28 175,22 200,25 225,18 250,15 275,10 300,8"
            fill="none"
            stroke="#c9a84c"
            strokeWidth="2"
          />
          <polyline
            points="0,50 25,42 50,45 75,35 100,38 125,30 150,28 175,22 200,25 225,18 250,15 275,10 300,8"
            fill="url(#goldGrad)"
            stroke="none"
          />
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function DeepDiveAccounting() {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-gold" />
          <span className="text-sm font-display font-bold text-white">Accounting</span>
        </div>
        <span className="text-[10px] font-body uppercase tracking-wider text-muted">FY 2025</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-deep rounded p-3 border border-border">
          <div className="text-[10px] font-body uppercase tracking-wider text-muted">Revenue</div>
          <div className="text-lg font-bold font-mono text-green">$284,200</div>
        </div>
        <div className="bg-deep rounded p-3 border border-border">
          <div className="text-[10px] font-body uppercase tracking-wider text-muted">Deductions</div>
          <div className="text-lg font-bold font-mono text-gold">$18,400</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { cat: 'Maintenance', pct: '34%', w: '34%' },
          { cat: 'Insurance', pct: '22%', w: '22%' },
          { cat: 'Property Tax', pct: '28%', w: '28%' },
          { cat: 'Utilities', pct: '16%', w: '16%' },
        ].map((c) => (
          <div key={c.cat} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-muted font-body text-[10px]">{c.cat}</span>
            <div className="flex-1 bg-deep rounded-full h-1.5">
              <div className="bg-gold rounded-full h-1.5" style={{ width: c.w }} />
            </div>
            <span className="text-muted font-mono text-[10px] w-8 text-right">{c.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const deepDiveMocks = [
  DeepDiveDealAnalyzer,
  DeepDiveMarketIntel,
  DeepDiveVoiceAgent,
  DeepDiveContractor,
  DeepDivePortfolio,
  DeepDiveAccounting,
];

/* ================================================================== */
/*  METRIC COUNTER COMPONENT                                           */
/* ================================================================== */
function MetricCounter({
  target,
  prefix,
  suffix,
  label,
  decimals = 0,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  label: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const count = useCountUp(target, isInView, 2000, decimals);

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-4xl md:text-5xl font-bold font-mono text-gold mb-2">
        {prefix}
        {decimals > 0 ? count.toFixed(decimals) : Math.round(count)}
        {suffix}
      </div>
      <div className="text-[10px] font-body uppercase tracking-wider text-muted">{label}</div>
    </motion.div>
  );
}

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */
export default function MarketingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [agentActionIndex, setAgentActionIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'features' | 'pricing' | 'about'>('features');

  const heroStatsRef = useRef<HTMLDivElement>(null);
  const heroStatsInView = useInView(heroStatsRef, { once: true, margin: '-80px' });
  const heroHoursSaved = useCountUp(47, heroStatsInView, 1600, 0);
  const heroTaxSavings = useCountUp(12400, heroStatsInView, 1800, 0);
  const heroRetention = useCountUp(94, heroStatsInView, 1500, 0);

  /* -- Scroll listener for navbar ---------------------------------- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* -- Active section highlight ------------------------------------ */
  useEffect(() => {
    const ids: Array<'features' | 'pricing' | 'about'> = ['features', 'pricing', 'about'];
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (visible?.target?.id === 'features' || visible?.target?.id === 'pricing' || visible?.target?.id === 'about') {
          setActiveSection(visible.target.id as 'features' | 'pricing' | 'about');
        }
      },
      { threshold: [0.25, 0.4, 0.55] }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* -- Agent action ticker ----------------------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentActionIndex((prev) => (prev + 1) % agentActions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* -- Smooth scroll handler --------------------------------------- */
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  }, []);

  const ActivePreview = featurePreviews[activeFeature];

  return (
    <div className="min-h-screen bg-[#080808] font-body text-white overflow-x-hidden">
      {/* ============================================================ */}
      {/* SECTION 1 -- NAVBAR                                          */}
      {/* ============================================================ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#080808cc] backdrop-blur-[20px] border-b border-[#1e1e1e]'
            : 'bg-transparent'
        }`}
      >
        <div className="relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-gold/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-sm bg-gold" />
            </div>
            <span className="font-display font-bold text-[15px] tracking-tight text-gold">
              RKV CONSULTING
            </span>
          </a>

          {/* Center nav -- desktop */}
          <div className="hidden md:flex items-center gap-8">
            {(['Features', 'Pricing', 'About'] as const).map((link) => (
              <button
                key={link}
                onClick={() => scrollTo(link.toLowerCase())}
                className={`text-[13px] font-body font-medium transition-colors relative group ${
                  activeSection === link.toLowerCase()
                    ? 'text-white'
                    : 'text-muted hover:text-[#94A3B8]'
                }`}
                aria-current={activeSection === link.toLowerCase() ? 'page' : undefined}
              >
                {link}
                <span
                  className={`absolute -bottom-1 left-0 h-px bg-gold transition-all duration-300 ${
                    activeSection === link.toLowerCase() ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="/login"
              className="text-[14px] text-muted hover:text-white transition-colors font-body border border-transparent hover:border-border px-4 py-1.5 rounded-lg"
            >
              Login
            </a>
            <a
              href="/signup"
              className="bg-[#c9a84c] text-black text-[13px] font-body font-semibold px-5 py-2 rounded-[6px] hover:bg-[#b8943f] active:scale-[0.97] transition-all duration-150"
            >
              Get Started
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-px bg-[#f5f5f5] transition-transform duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} />
            <span className={`block w-5 h-px bg-[#f5f5f5] transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-[#f5f5f5] transition-transform duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-[rgba(8,8,8,0.8)] backdrop-blur-sm md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.22 }}
                className="fixed top-0 right-0 bottom-0 z-[70] w-[min(360px,100%)] md:hidden bg-[#080808] border-l border-[#1e1e1e]"
              >
                <div className="h-16 px-6 flex items-center justify-between border-b border-border">
                  <span className="font-display font-bold text-[15px] tracking-tight text-white">Menu</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-9 h-9 rounded-[6px] border border-border text-muted hover:text-white hover:border-border-hover transition-colors"
                    aria-label="Close menu"
                  >
                    <span className="sr-only">Close</span>
                    <span className="block mx-auto w-4 h-4">
                      <X className="w-4 h-4 mx-auto" />
                    </span>
                  </button>
                </div>

                <div className="px-6 py-6 space-y-2">
                  {(['Features', 'Pricing', 'About'] as const).map((link) => (
                    <button
                      key={link}
                      onClick={() => scrollTo(link.toLowerCase())}
                      className={`w-full text-left px-4 py-3 rounded-[6px] border transition-colors font-body text-[13px] ${
                        activeSection === link.toLowerCase()
                          ? 'border-[#c9a84c] text-white bg-[rgba(201,168,76,0.05)]'
                          : 'border-border text-muted hover:text-white hover:border-border-hover'
                      }`}
                    >
                      {link}
                    </button>
                  ))}

                  <div className="pt-4 grid grid-cols-1 gap-3">
                    <a
                      href="/login"
                      className="w-full text-center px-5 py-2 rounded-[6px] border border-border text-muted hover:text-white hover:border-border-hover transition-colors font-body text-[13px] font-semibold"
                    >
                      Login
                    </a>
                    <a
                      href="/signup"
                      className="w-full text-center bg-[#c9a84c] text-black px-5 py-2 rounded-[6px] hover:bg-[#b8943f] active:scale-[0.97] transition-all duration-150 font-body text-[13px] font-semibold"
                    >
                      Get Started
                    </a>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* ============================================================ */}
      {/* SECTION 2 -- HERO                                            */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center px-6 overflow-hidden pt-32">
        <div className="relative z-10 max-w-5xl mx-auto w-full">
          {/* Uppercase label */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse" />
            <span className="font-body font-medium text-[11px] text-[#c9a84c] uppercase tracking-[0.2em]">
              Portfolio Intelligence Platform
            </span>
          </motion.div>

          {/* Main serif headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-6xl lg:text-7xl font-display leading-[1.1] mb-8 text-white"
          >
            Your Real Estate
            <br />
            Portfolio, on
            <br />
            <span className="text-[#c9a84c]">Autopilot.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[#888] font-body text-lg leading-[1.7] max-w-[600px] mb-10"
          >
            AI-powered deal analysis, automated tenant management, and institutional-grade
            portfolio intelligence. Built for investors who refuse to settle.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-start gap-4 mb-20"
          >
            <a
              href="/signup"
              className="bg-[#c9a84c] text-black font-body font-semibold text-[13px] px-8 py-3.5 rounded-[6px] hover:bg-[#b8943f] active:scale-[0.97] transition-all duration-150 w-full sm:w-auto"
            >
              Start Free Trial
            </a>
            <button
              onClick={() => scrollTo('features')}
              className="border border-[#333] text-[#888] font-body font-semibold text-[13px] px-8 py-3.5 rounded-[6px] hover:border-[#c9a84c] hover:text-white active:scale-[0.97] transition-all duration-150 w-full sm:w-auto"
            >
              Learn More
            </button>
          </motion.div>

          {/* Trust metrics */}
          <motion.div
            ref={heroStatsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-start gap-8 sm:gap-0"
          >
            {[
              { value: heroHoursSaved.toLocaleString(), label: 'Hrs Saved Monthly' },
              { value: `$${Math.round(heroTaxSavings).toLocaleString()}`, label: 'Tax Savings Found' },
              { value: `${Math.round(heroRetention)}%`, label: 'Tenant Retention' },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center">
                {i > 0 && <div className="hidden sm:block w-px h-10 bg-[#1e1e1e] mx-10" />}
                <div>
                  <div className="text-2xl font-mono font-semibold text-white">{stat.value}</div>
                  <div className="text-[11px] font-body font-medium uppercase tracking-[0.08em] text-[#555] mt-1">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3 -- PROBLEM STATEMENT                               */}
      {/* ============================================================ */}
      <section className="py-[120px] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] font-body font-medium uppercase tracking-[0.15em] text-gold mb-3">
              THE PROBLEM
            </div>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-display font-bold text-center mb-16 text-white"
          >
            Real estate investing is broken.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((problem, i) => (
              <motion.div
                key={problem.headline}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-[#111111] border border-[#1e1e1e] border-l-2 border-l-red rounded-xl p-6"
              >
                <problem.icon className="w-5 h-5 text-red mb-4" />
                <h3 className="font-display font-bold text-lg mb-1 text-white">{problem.headline}</h3>
                <p className="text-sm text-muted font-body">{problem.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 4 -- SOLUTION OVERVIEW (Feature Showcase)            */}
      {/* ============================================================ */}
      <section id="features" className="py-[120px] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-4">
            <div className="text-[11px] font-body font-medium uppercase tracking-[0.15em] text-gold">
              PORTFOLIO INTELLIGENCE
            </div>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-display font-bold text-center mb-4 text-white"
          >
            RKV Consulting handles all of it.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-muted text-center font-body mb-16"
          >
            Automatically.
          </motion.p>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left -- category list */}
            <div className="lg:w-1/3 space-y-1">
              {featureCategories.map((cat, i) => (
                <button
                  key={cat}
                  onClick={() => setActiveFeature(i)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 flex items-center gap-3 group ${
                    activeFeature === i
                      ? 'border-l-2 border-l-gold bg-gold/[0.08] text-white'
                      : 'border-l-2 border-l-transparent text-muted hover:text-white hover:bg-card/50'
                  }`}
                >
                  {activeFeature === i && (
                    <span className="pulse-dot bg-gold flex-shrink-0" />
                  )}
                  <span className="font-body text-[11px] uppercase tracking-wider">{cat}</span>
                </button>
              ))}
            </div>

            {/* Right -- preview panel */}
            <div className="lg:w-2/3">
              <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 md:p-8 min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ActivePreview />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 5 -- METRICS                                         */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 px-6 relative">
        {/* Top border gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #c9a84c 50%, transparent 100%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #c9a84c 50%, transparent 100%)',
          }}
        />

        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8">
          <MetricCounter target={47} suffix=" Hrs" label="Hours Saved Monthly" />
          <MetricCounter target={12400} prefix="$" label="Avg Tax Savings Found" />
          <MetricCounter target={94} suffix="%" label="Tenant Retention Rate" />
          <MetricCounter target={3.2} suffix="x" label="Average Returns" decimals={1} />
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 6 -- FEATURE DEEP DIVES                              */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto space-y-24 md:space-y-32">
          {featureDeepDives.map((feature, i) => {
            const MockComponent = deepDiveMocks[i];
            const isReversed = i % 2 !== 0;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7 }}
                className={`flex flex-col ${
                  isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'
                } gap-12 lg:gap-16 items-center`}
              >
                {/* Mock UI */}
                <div className="w-full lg:w-1/2">
                  <MockComponent />
                </div>

                {/* Text */}
                <div className="w-full lg:w-1/2 space-y-6">
                  <div>
                    <span className="text-[10px] font-body uppercase tracking-wider text-gold mb-3 block">
                      {feature.subtitle}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white">
                      {feature.title}
                    </h3>
                  </div>
                  <ul className="space-y-4">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                        <span className="text-white/90 font-body">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 7 -- AI AGENTS SPOTLIGHT                             */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 px-6 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-display font-bold text-center mb-16 text-white"
          >
            Meet your AI property management team.
          </motion.h2>

          {/* Agent cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                name: 'Email Agent',
                icon: Mail,
                description:
                  'Handles all tenant email communication, from lease renewals to maintenance confirmations.',
                capabilities: [
                  'Automated lease renewal reminders',
                  'Rent receipt generation & delivery',
                  'Maintenance status updates',
                ],
              },
              {
                name: 'Voice Agent',
                icon: Phone,
                description:
                  'Makes and receives calls on your behalf with natural, human-like conversation.',
                capabilities: [
                  'Rent collection calls with negotiation',
                  'Showing scheduling & confirmations',
                  'Maintenance intake & dispatch',
                ],
              },
              {
                name: 'SMS Agent',
                icon: MessageSquare,
                description:
                  'Instant text responses to tenant inquiries, available 24/7 with sub-5-second response times.',
                capabilities: [
                  'Instant maintenance request responses',
                  'Payment reminders & confirmations',
                  'Move-in/move-out coordination',
                ],
              },
            ].map((agent, i) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <agent.icon className="w-5 h-5 text-gold" />
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-body uppercase tracking-wider text-green">
                    <span className="pulse-dot bg-green" />
                    Active
                  </span>
                </div>
                <span className="text-[10px] font-body uppercase tracking-wider text-muted mb-2 block">AI Agent</span>
                <h3 className="text-xl font-display font-bold mb-2 text-white">{agent.name}</h3>
                <p className="text-sm text-muted font-body mb-6">{agent.description}</p>
                <ul className="space-y-2">
                  {agent.capabilities.map((cap) => (
                    <li key={cap} className="flex items-center gap-2 text-sm font-body text-white/90">
                      <Check className="w-4 h-4 text-gold flex-shrink-0" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Live feed ticker */}
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-gold" />
              <span className="text-sm font-display font-bold text-white">Live Agent Feed</span>
              <span className="flex items-center gap-1.5 text-[10px] font-body uppercase tracking-wider text-green ml-auto">
                <span className="pulse-dot bg-green" />
                Real-time
              </span>
            </div>
            <div className="h-10 flex items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={agentActionIndex}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4 }}
                  className="text-sm text-white/90 font-body"
                >
                  {agentActions[agentActionIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 8 -- PRICING PREVIEW                                 */}
      {/* ============================================================ */}
      <section id="pricing" className="py-[120px] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-4">
            <div className="text-[11px] font-body font-medium uppercase tracking-[0.15em] text-gold">
              PRICING
            </div>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-display font-bold text-center mb-16 text-white"
          >
            Simple, transparent pricing.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className={`relative bg-[#111111] border ${plan.borderColor} rounded-xl p-8 ${
                  plan.badge ? 'ring-1 ring-gold/30' : ''
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-white text-[10px] font-body font-semibold px-4 py-1 rounded-full uppercase tracking-wider">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-display font-bold mb-2 text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-mono font-bold text-white">${plan.price}</span>
                    <span className="text-sm text-muted font-mono">/mo</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm font-body text-white/90">
                      <Check className="w-4 h-4 text-green flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="/pricing"
                  className={`block text-center py-3 rounded-lg text-sm font-body font-medium transition-all duration-300 ${
                    plan.badge
                      ? 'bg-[#c9a84c] text-black hover:bg-[#b8943f] active:scale-[0.97] transition-all duration-150'
                      : 'border border-[#1e1e1e] text-white hover:border-[#333] active:scale-[0.97] transition-all duration-150'
                  }`}
                >
                  Get Started
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 9 -- TESTIMONIALS                                    */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-display font-bold text-center mb-16 text-white"
          >
            Trusted by serious investors.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-8 relative"
              >
                <svg
                  className="absolute top-6 left-6 w-10 h-10 text-[#c9a84c] opacity-15"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-white/90 font-body italic mb-6 mt-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <div className="font-body font-bold text-sm text-white">{testimonial.author}</div>
                  <div className="text-[10px] font-body uppercase tracking-wider text-muted">{testimonial.units}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 10 -- COMPETITOR COMPARISON                           */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 px-6" style={{ background: '#050505' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Why investors switch to RKV.
            </h2>
            <p className="text-muted font-body max-w-2xl mx-auto">
              One platform replaces your entire tech stack. Compare the capabilities.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="overflow-auto max-h-[520px] rounded-lg border border-border"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-[#1e1e1e] bg-[#1a1a1a]">
                  <th className="py-4 px-4 text-[11px] text-muted font-body font-semibold uppercase tracking-[0.08em]">
                    Feature
                  </th>
                  <th className="py-4 px-4 text-center bg-[rgba(201,168,76,0.08)]">
                    <span className="text-gold font-display font-bold text-sm">RKV</span>
                  </th>
                  <th className="py-4 px-4 text-center text-[11px] text-muted font-body font-semibold uppercase tracking-[0.08em]">Yardi</th>
                  <th className="py-4 px-4 text-center text-[11px] text-muted font-body font-semibold uppercase tracking-[0.08em]">AppFolio</th>
                  <th className="py-4 px-4 text-center text-[11px] text-muted font-body font-semibold uppercase tracking-[0.08em]">Buildium</th>
                  <th className="py-4 px-4 text-center text-[11px] text-muted font-body font-semibold uppercase tracking-[0.08em]">Stessa</th>
                </tr>
              </thead>
              <tbody className="text-sm font-body">
                {[
                  { feature: 'Price', rkv: '$99/mo', yardi: '$300+/mo', appfolio: '$250+/mo', buildium: '$200+/mo', stessa: '$100+/mo' },
                  { feature: 'AI Deal Analysis', rkv: true, yardi: false, appfolio: false, buildium: false, stessa: false },
                  { feature: 'AI Tenant Communication', rkv: true, yardi: false, appfolio: false, buildium: false, stessa: false },
                  { feature: 'Voice & SMS Agents', rkv: true, yardi: false, appfolio: false, buildium: false, stessa: false },
                  { feature: 'Market Intelligence', rkv: true, yardi: false, appfolio: false, buildium: false, stessa: false },
                  { feature: 'Property Management', rkv: true, yardi: true, appfolio: true, buildium: true, stessa: false },
                  { feature: 'Tenant Screening', rkv: true, yardi: true, appfolio: true, buildium: true, stessa: false },
                  { feature: 'Maintenance Tracking', rkv: true, yardi: true, appfolio: true, buildium: true, stessa: false },
                  { feature: 'Accounting & Tax', rkv: true, yardi: true, appfolio: true, buildium: true, stessa: true },
                  { feature: 'Rent Collection', rkv: true, yardi: true, appfolio: true, buildium: true, stessa: false },
                  { feature: 'Portfolio Analytics', rkv: true, yardi: false, appfolio: false, buildium: false, stessa: true },
                  { feature: 'Contractor Matching', rkv: true, yardi: false, appfolio: false, buildium: false, stessa: false },
                  { feature: 'Auto-Pilot Mode', rkv: true, yardi: false, appfolio: false, buildium: false, stessa: false },
                ].map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-[#1e1e1e] transition-colors hover:bg-[#1a1a1a] ${
                      i % 2 === 0 ? 'bg-[#111111]' : 'bg-[#080808]'
                    }`}
                  >
                    <td className="py-3 px-4 text-white/80">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.rkv === 'string' ? (
                        <span className="font-mono text-white">{row.rkv}</span>
                      ) : row.rkv ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold/15">
                          <svg className="w-3 h-3 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                      ) : <span className="text-muted-deep">—</span>}
                    </td>
                    {[row.yardi, row.appfolio, row.buildium, row.stessa].map((has, j) => (
                      <td key={j} className="py-3 px-4 text-center">
                        {typeof has === 'string' ? (
                          <span className="font-mono text-muted">{has}</span>
                        ) : has ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[rgba(201,168,76,0.05)] border border-[#1e1e1e]">
                            <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        ) : <span className="text-muted-deep">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {[
              { value: '11+', label: 'Tools replaced by RKV' },
              { value: '$2,400+', label: 'Annual savings vs. competitors' },
              { value: '40hrs', label: 'Saved per month with AI automation' },
            ].map((stat) => (
              <div key={stat.label} className="text-center py-4 rounded-lg bg-[#111111] border border-[#1e1e1e]">
                <p className="text-2xl font-bold text-gold font-mono">{stat.value}</p>
                <p className="text-xs text-muted font-body mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 11 -- FINAL CTA                                      */}
      {/* ============================================================ */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-display font-bold mb-8 text-white"
          >
            Stop managing your portfolio manually.
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <a
              href="/signup"
              className="inline-block bg-[#c9a84c] text-black font-body font-semibold px-10 py-4 rounded-[6px] text-[13px] hover:bg-[#b8943f] active:scale-[0.97] transition-all duration-150 mb-4"
            >
              Get Started Today &mdash; 14 Day Free Trial
            </a>
            <p className="text-sm text-muted font-body">
              No credit card required to start. Cancel anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 11 -- FOOTER                                         */}
      {/* ============================================================ */}
      <footer id="about" className="bg-[#050505] border-t border-[#1e1e1e] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-6 rounded-md bg-gold/20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gold" />
                </div>
                <span className="font-display font-bold text-[15px] text-gold">RKV CONSULTING</span>
              </div>
              <p className="text-sm text-muted-deep font-body leading-relaxed">
                The intelligent operating system for serious real estate investors. AI-powered.
                Institutional-grade.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[10px] font-body uppercase tracking-wider text-muted mb-4">Product</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Features', href: '/#features' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Demo', href: '/#features' },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-deep hover:text-white transition-colors font-body"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-[10px] font-body uppercase tracking-wider text-muted mb-4">Company</h4>
              <ul className="space-y-2">
                {[
                  { label: 'About', href: '/#about' },
                  { label: 'Careers', href: '/careers' },
                  { label: 'Contact', href: '/contact' },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-deep hover:text-white transition-colors font-body"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[10px] font-body uppercase tracking-wider text-muted mb-4">Legal</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Privacy', href: '/privacy' },
                  { label: 'Terms', href: '/terms' },
                  { label: 'Security', href: '/security' },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-deep hover:text-white transition-colors font-body"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-8 text-center">
            <p className="text-[10px] font-body uppercase tracking-wider text-muted-deep">
              &copy; 2025 RKV Consulting. Built for serious investors.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
