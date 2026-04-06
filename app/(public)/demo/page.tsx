'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, CreditCard, Wrench, FileText, Home,
  Bell, Settings, ChevronLeft, ChevronRight, Search, MessageSquare,
  TrendingUp, TrendingDown, ArrowUpRight, MoreHorizontal, Plus,
  CheckCircle2, Clock, AlertTriangle, XCircle, Sparkles, Send
} from 'lucide-react';

// ── Fake data ──
const kpis = [
  { label: 'Total Units', value: '248', trend: '+12', trendUp: true, icon: Building2 },
  { label: 'Occupancy Rate', value: '96.2%', trend: '+1.4%', trendUp: true, icon: Home, highlight: true },
  { label: 'Rent Collected', value: '$412,800', trend: '+$18,200', trendUp: true, icon: CreditCard },
  { label: 'Open Work Orders', value: '7', trend: '-3', trendUp: true, icon: Wrench },
  { label: 'Expiring Leases', value: '4', trend: 'Next 30 days', trendUp: false, icon: FileText },
  { label: 'AI Responses Today', value: '43', trend: '< 90s avg', trendUp: true, icon: MessageSquare },
];

const revenueData = [
  { month: 'Jan', collected: 342, expected: 380 },
  { month: 'Feb', collected: 358, expected: 385 },
  { month: 'Mar', collected: 371, expected: 390 },
  { month: 'Apr', collected: 380, expected: 395 },
  { month: 'May', collected: 388, expected: 398 },
  { month: 'Jun', collected: 395, expected: 400 },
  { month: 'Jul', collected: 398, expected: 405 },
  { month: 'Aug', collected: 402, expected: 408 },
  { month: 'Sep', collected: 405, expected: 410 },
  { month: 'Oct', collected: 408, expected: 412 },
  { month: 'Nov', collected: 410, expected: 415 },
  { month: 'Dec', collected: 413, expected: 418 },
];
const maxRev = Math.max(...revenueData.map(d => d.expected));

const properties = [
  { name: 'Scottsdale Gardens', address: '4821 N Scottsdale Rd', units: 64, occupied: 62, revenue: '$124,800', status: 'active' },
  { name: 'Phoenix Heights', address: '1200 E Washington St', units: 48, occupied: 46, revenue: '$89,400', status: 'active' },
  { name: 'Tempe Lofts', address: '520 S Mill Ave', units: 96, occupied: 92, revenue: '$156,000', status: 'active' },
  { name: 'Mesa Terrace', address: '830 W Main St', units: 24, occupied: 24, revenue: '$38,400', status: 'active' },
  { name: 'Austin Ridge', address: '2401 S Lamar Blvd', units: 36, occupied: 34, revenue: '$72,600', status: 'active' },
];

const tenants = [
  { name: 'Sarah Chen', unit: '204', property: 'Scottsdale Gardens', rent: '$1,850', status: 'current', lastContact: '2h ago' },
  { name: 'Marcus Williams', unit: '112', property: 'Phoenix Heights', rent: '$1,650', status: 'current', lastContact: '1d ago' },
  { name: 'Emily Rodriguez', unit: '308', property: 'Tempe Lofts', rent: '$1,425', status: 'late', lastContact: '3d ago' },
  { name: 'James Park', unit: '415', property: 'Tempe Lofts', rent: '$1,550', status: 'current', lastContact: '5h ago' },
  { name: 'Lisa Thompson', unit: '102', property: 'Mesa Terrace', rent: '$1,600', status: 'current', lastContact: '12h ago' },
  { name: 'David Kim', unit: '201', property: 'Austin Ridge', rent: '$2,100', status: 'current', lastContact: '2d ago' },
];

const workOrders = {
  open: [
    { id: 'WO-1042', title: 'Water leak under kitchen sink', unit: '204', property: 'Scottsdale', priority: 'P1', time: '2h ago' },
    { id: 'WO-1045', title: 'Garbage disposal grinding noise', unit: '308', property: 'Tempe', priority: 'P3', time: '4h ago' },
  ],
  in_progress: [
    { id: 'WO-1039', title: 'HVAC not cooling properly', unit: '112', property: 'Phoenix', priority: 'P2', time: '1d ago' },
    { id: 'WO-1041', title: 'Broken window latch bedroom', unit: '415', property: 'Tempe', priority: 'P3', time: '6h ago' },
  ],
  resolved: [
    { id: 'WO-1035', title: 'Toilet running continuously', unit: '102', property: 'Mesa', priority: 'P2', time: '2d ago' },
    { id: 'WO-1037', title: 'Light fixture replacement', unit: '201', property: 'Austin', priority: 'P4', time: '3d ago' },
    { id: 'WO-1038', title: 'Dryer vent cleaning', unit: '204', property: 'Scottsdale', priority: 'P3', time: '2d ago' },
  ],
};

const activity = [
  { icon: CreditCard, text: 'Rent payment received — Unit 112 — $1,650', time: '2m ago', color: 'text-emerald-400' },
  { icon: MessageSquare, text: 'AI responded to prospect inquiry — 43s response', time: '8m ago', color: 'text-blue-400' },
  { icon: Wrench, text: 'Maintenance dispatched — HVAC Unit 204 — P2', time: '22m ago', color: 'text-orange-400' },
  { icon: FileText, text: 'Lease renewal sent — Unit 308 — 60-day notice', time: '1h ago', color: 'text-purple-400' },
  { icon: CheckCircle2, text: 'Work order resolved — WO-1035 — toilet repair', time: '2h ago', color: 'text-emerald-400' },
  { icon: Users, text: 'New lead — Sarah M. interested in 2BR Scottsdale', time: '3h ago', color: 'text-blue-400' },
  { icon: CreditCard, text: 'Late fee applied — Unit 308 — $75', time: '4h ago', color: 'text-red-400' },
  { icon: Building2, text: 'Owner report generated — Q4 Scottsdale portfolio', time: '5h ago', color: 'text-white/40' },
];

const priorityColors: Record<string, string> = {
  P1: 'bg-red-500/20 text-red-400 border-red-500/20',
  P2: 'bg-orange-500/20 text-orange-400 border-orange-500/20',
  P3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
  P4: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
};

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'financials', label: 'Financials', icon: CreditCard },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'leases', label: 'Leases', icon: FileText },
  { id: 'vacancies', label: 'Vacancies', icon: Home },
];

export default function DemoPage() {
  const [page, setPage] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "Welcome to the RKV Consulting demo! I'm your AI assistant. Ask me about your portfolio, maintenance, or tenants." },
  ]);

  const [chatLoading, setChatLoading] = useState(false);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/demo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: chatMessages }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'ai', text: data.response || "I couldn't process that. Try again." }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Connection issue. Try again in a moment." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="h-screen bg-black text-white flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2 }}
        className="h-full border-r border-white/5 bg-neutral-950 flex flex-col shrink-0"
      >
        <div className="p-4 flex items-center gap-3 border-b border-white/5 h-14">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-black">M</span>
          </div>
          {!collapsed && <span className="text-sm font-semibold tracking-tight truncate">RKV Consulting</span>}
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                page === item.id ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-white/5">
          <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03] transition-colors">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" />{!collapsed && <span className="text-xs">Collapse</span>}</>}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-neutral-950">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold capitalize">{page}</h1>
            <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/5 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-neutral-500" />
              <input className="bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none w-48" placeholder="Search properties, tenants..." />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">DEMO MODE</span>
            <button className="relative p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <Bell className="w-4 h-4 text-neutral-400" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black"></div>
            </button>
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">DR</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            {page === 'overview' && <OverviewPage key="overview" />}
            {page === 'properties' && <PropertiesPage key="properties" />}
            {page === 'tenants' && <TenantsPage key="tenants" />}
            {page === 'financials' && <FinancialsPage key="financials" />}
            {page === 'maintenance' && <MaintenancePage key="maintenance" />}
            {page === 'leases' && <LeasesPage key="leases" />}
            {page === 'vacancies' && <VacanciesPage key="vacancies" />}
          </AnimatePresence>
        </main>
      </div>

      {/* AI Chat */}
      <button onClick={() => setChatOpen(!chatOpen)} className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all hover:scale-105">
        <Sparkles className="w-5 h-5 text-emerald-400" />
      </button>
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="fixed bottom-20 right-6 z-50 w-96 h-[480px] bg-neutral-950/95 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-emerald-400" /></div>
                <div><div className="text-xs font-semibold">RKV Consulting AI</div><div className="text-[10px] text-emerald-400">Online</div></div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-neutral-500 hover:text-white"><XCircle className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((m, i) => (
                <div key={i} className={`max-w-[80%] text-xs p-3 rounded-xl leading-relaxed ${m.role === 'ai' ? 'bg-white/[0.06] text-neutral-300 self-start rounded-bl-sm' : 'bg-emerald-600 text-white ml-auto rounded-br-sm'}`}>
                  {m.text}
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-1 p-3 self-start">
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-white/5 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                className="flex-1 bg-white/[0.04] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none" placeholder="Ask about your portfolio..." />
              <button onClick={sendChat} className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors"><Send className="w-3.5 h-3.5 text-white" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PAGE COMPONENTS ──

function PageWrap({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>{children}</motion.div>;
}

function OverviewPage() {
  return (
    <PageWrap>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="w-3.5 h-3.5 text-neutral-500" />
              {kpi.trendUp ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-neutral-500" />}
            </div>
            <div className={`text-xl font-bold ${kpi.highlight ? 'text-emerald-400' : 'text-white'}`}>{kpi.value}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">{kpi.label}</div>
            <div className="text-[10px] text-emerald-500 mt-1">{kpi.trend}</div>
          </motion.div>
        ))}
      </div>
      {/* Revenue chart */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-medium text-neutral-400">Revenue — Last 12 Months</div>
            <div className="flex gap-3 text-[10px] text-neutral-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Collected</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/40"></span>Expected</span>
            </div>
          </div>
          <div className="flex items-end gap-[5px] h-40">
            {revenueData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-[2px]">
                <div className="w-full rounded-t bg-blue-500/15 border-t border-blue-500/30" style={{ height: `${(d.expected / maxRev) * 100}%` }}></div>
                <div className="w-full rounded-t bg-emerald-500/30 border-t border-emerald-500/50 -mt-[2px]" style={{ height: `${(d.collected / maxRev) * 100}%`, position: 'relative', top: `-${(d.expected / maxRev) * 100}%` }}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-neutral-600">{revenueData.map(d => <span key={d.month}>{d.month}</span>)}</div>
        </div>
        {/* Activity feed */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-400 mb-3">Recent Activity</div>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
            {activity.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}
                className="flex items-start gap-2.5 text-[11px]">
                <a.icon className={`w-3.5 h-3.5 ${a.color} mt-0.5 shrink-0`} />
                <span className="text-neutral-400 flex-1 leading-relaxed">{a.text}</span>
                <span className="text-neutral-600 shrink-0 text-[10px]">{a.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageWrap>
  );
}

function PropertiesPage() {
  return (
    <PageWrap>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-neutral-500">{properties.length} properties</div>
        <button className="flex items-center gap-1.5 text-xs font-medium bg-white text-black px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"><Plus className="w-3 h-3" /> Add Property</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {properties.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white/[0.02] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{p.name}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">{p.address}</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div><div className="text-[10px] text-neutral-500">Units</div><div className="text-sm font-semibold">{p.units}</div></div>
              <div><div className="text-[10px] text-neutral-500">Occupied</div><div className="text-sm font-semibold text-emerald-400">{p.occupied}</div></div>
              <div><div className="text-[10px] text-neutral-500">Revenue</div><div className="text-sm font-semibold">{p.revenue}</div></div>
            </div>
            <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${(p.occupied / p.units) * 100}%` }}></div>
            </div>
          </motion.div>
        ))}
      </div>
    </PageWrap>
  );
}

function TenantsPage() {
  return (
    <PageWrap>
      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-5 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-white/5">
          <div>Tenant</div><div>Unit</div><div>Property</div><div>Rent</div><div>Status</div><div>Last Contact</div>
        </div>
        {tenants.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
            className="grid grid-cols-6 gap-4 px-5 py-3.5 text-xs border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer">
            <div className="font-medium text-white">{t.name}</div>
            <div className="text-neutral-400">{t.unit}</div>
            <div className="text-neutral-400">{t.property}</div>
            <div className="text-neutral-300 font-mono">{t.rent}</div>
            <div><span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${t.status === 'current' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {t.status === 'current' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}{t.status}
            </span></div>
            <div className="text-neutral-500">{t.lastContact}</div>
          </motion.div>
        ))}
      </div>
    </PageWrap>
  );
}

function FinancialsPage() {
  return (
    <PageWrap>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{ l: 'Collected This Month', v: '$412,800', c: 'text-emerald-400' }, { l: 'Expected', v: '$418,000', c: 'text-white' }, { l: 'Outstanding', v: '$5,200', c: 'text-red-400' }].map((s, i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white/[0.02] border border-white/5 rounded-xl p-5 text-center">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{s.l}</div>
            <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
          </motion.div>
        ))}
      </div>
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
        <div className="text-xs font-medium text-neutral-400 mb-4">Payment History</div>
        <div className="space-y-2">
          {tenants.map((t, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0 text-xs">
              <div className="text-white font-medium">{t.name}</div>
              <div className="text-neutral-500">Unit {t.unit}</div>
              <div className="font-mono text-neutral-300">{t.rent}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.status === 'current' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {t.status === 'current' ? 'Paid' : 'Late'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageWrap>
  );
}

function MaintenancePage() {
  const columns = [
    { title: 'Open', items: workOrders.open, color: 'border-red-500/30' },
    { title: 'In Progress', items: workOrders.in_progress, color: 'border-blue-500/30' },
    { title: 'Resolved', items: workOrders.resolved, color: 'border-emerald-500/30' },
  ];
  return (
    <PageWrap>
      <div className="grid md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.title}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-neutral-400">{col.title}</div>
              <span className="text-[10px] text-neutral-600 bg-white/5 px-2 py-0.5 rounded-full">{col.items.length}</span>
            </div>
            <div className="space-y-2">
              {col.items.map((wo, i) => (
                <motion.div key={wo.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className={`bg-white/[0.02] border-l-2 ${col.color} border border-white/5 rounded-lg p-3 hover:bg-white/[0.04] transition-colors cursor-pointer`}>
                  <div className="flex items-start justify-between">
                    <div className="text-[11px] font-medium text-white">{wo.title}</div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priorityColors[wo.priority]}`}>{wo.priority}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-500">
                    <span>{wo.id}</span><span>·</span><span>Unit {wo.unit}</span><span>·</span><span>{wo.property}</span><span>·</span><span>{wo.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrap>
  );
}

function LeasesPage() {
  const leases = [
    { tenant: 'Sarah Chen', unit: '204', property: 'Scottsdale', start: '2025-06-01', end: '2026-05-31', rent: '$1,850', status: 'active' },
    { tenant: 'Marcus Williams', unit: '112', property: 'Phoenix', start: '2025-03-01', end: '2026-02-28', rent: '$1,650', status: 'expiring' },
    { tenant: 'Emily Rodriguez', unit: '308', property: 'Tempe', start: '2025-01-15', end: '2026-01-14', rent: '$1,425', status: 'renewal_sent' },
    { tenant: 'James Park', unit: '415', property: 'Tempe', start: '2025-09-01', end: '2026-08-31', rent: '$1,550', status: 'active' },
    { tenant: 'Lisa Thompson', unit: '102', property: 'Mesa', start: '2025-04-01', end: '2026-03-31', rent: '$1,600', status: 'expiring' },
  ];
  const statusStyle: Record<string, string> = { active: 'bg-emerald-500/10 text-emerald-400', expiring: 'bg-yellow-500/10 text-yellow-400', renewal_sent: 'bg-blue-500/10 text-blue-400' };
  return (
    <PageWrap>
      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 gap-4 px-5 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-white/5">
          <div>Tenant</div><div>Unit</div><div>Property</div><div>Start</div><div>End</div><div>Rent</div><div>Status</div>
        </div>
        {leases.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
            className="grid grid-cols-7 gap-4 px-5 py-3 text-xs border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
            <div className="text-white font-medium">{l.tenant}</div><div className="text-neutral-400">{l.unit}</div><div className="text-neutral-400">{l.property}</div>
            <div className="text-neutral-500 font-mono">{l.start}</div><div className="text-neutral-500 font-mono">{l.end}</div>
            <div className="text-neutral-300 font-mono">{l.rent}</div>
            <div><span className={`text-[10px] px-2 py-0.5 rounded-full ${statusStyle[l.status]}`}>{l.status.replace('_', ' ')}</span></div>
          </motion.div>
        ))}
      </div>
    </PageWrap>
  );
}

function VacanciesPage() {
  const vacancies = [
    { unit: '305', property: 'Tempe Lofts', type: '2BR / 1BA', rent: '$1,450', daysVacant: 12 },
    { unit: '118', property: 'Phoenix Heights', type: '1BR / 1BA', rent: '$1,200', daysVacant: 8 },
    { unit: '401', property: 'Austin Ridge', type: '2BR / 2BA', rent: '$2,000', daysVacant: 3 },
    { unit: '206', property: 'Scottsdale Gardens', type: '1BR / 1BA', rent: '$1,350', daysVacant: 21 },
  ];
  return (
    <PageWrap>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{vacancies.length}</div><div className="text-[10px] text-neutral-500">Vacant Units</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{Math.round(vacancies.reduce((s,v)=>s+v.daysVacant,0)/vacancies.length)}</div><div className="text-[10px] text-neutral-500">Avg Days Vacant</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">${vacancies.reduce((s,v)=>s+parseInt(v.rent.replace(/[$,]/g,''))/30*v.daysVacant,0).toLocaleString(undefined,{maximumFractionDigits:0})}</div><div className="text-[10px] text-neutral-500">Revenue Lost</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {vacancies.map((v, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div><div className="text-sm font-semibold text-white">Unit {v.unit}</div><div className="text-[11px] text-neutral-500">{v.property} · {v.type}</div></div>
              <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">{v.daysVacant}d vacant</span>
            </div>
            <div className="text-xs text-neutral-400">Asking: <span className="text-white font-mono">{v.rent}/mo</span></div>
          </motion.div>
        ))}
      </div>
    </PageWrap>
  );
}
