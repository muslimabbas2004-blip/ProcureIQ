import { useState, ReactNode } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertCircle,
  Building2,
  Package,
  ArrowRight
} from 'lucide-react';
import { vendors } from '../data/mock';
import * as A from '../services/analyticsService';
import { fmt } from '../services/analyticsService';
import { T } from './Tables';

const C = {
  blue: '#356AE6',
  teal: '#12B8A6',
  coral: '#EF6B5B',
  amber: '#F59E0B',
  violet: '#8B5CF6',
  grid: '#E2E8F0'
};
const PAL = [C.blue, C.teal, C.amber, C.violet, C.coral, '#0EA5E9', '#64748B', '#84CC16'];

const Stat = ({
  l,
  v,
  sub,
  c,
  icon
}: {
  l: string;
  v: ReactNode;
  sub?: string;
  c: string;
  icon?: ReactNode;
}) => (
  <div className="card p-5 hover:shadow-md transition-shadow relative overflow-hidden" style={{ borderTop: `4px solid ${c}` }}>
    <div className="flex justify-between items-start">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{l}</span>
      {icon && <div className="text-slate-400">{icon}</div>}
    </div>
    <div className="text-2xl font-bold text-slate-900 mt-2">{v}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
  </div>
);

const Panel = ({
  t,
  sub,
  children
}: {
  t: string;
  sub?: string;
  children: ReactNode;
}) => (
  <div className="card space-y-3">
    <div>
      <h2 className="text-base font-bold text-slate-900">{t}</h2>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
    {children}
  </div>
);

const tip = {
  contentStyle: {
    backgroundColor: '#1E293B',
    color: '#fff',
    borderRadius: '8px',
    border: 'none',
    fontSize: '12px'
  },
  itemStyle: { color: '#38BDF8' }
};

export function PricePage() {
  const [id, setId] = useState('I001');
  const its = A.itemStats();
  const vs = A.itemByVendor(id).sort((a, b) => a.avg - b.avg);
  const t = A.itemTrend(id);
  const it = its.find(i => i.itemId === id);

  const best = vs[0];
  const worst = vs[vs.length - 1];
  const gap = vs.length > 1 ? worst.avg - best.avg : 0;
  const gapPct = vs.length > 1 && best.avg ? ((gap / best.avg) * 100).toFixed(1) : '0';
  const est = A.savings().find(s => s.item === it?.itemName)?.est;

  const rows = vs.map(v => ({
    Vendor: v.name,
    'Avg Price': fmt(v.avg),
    Lowest: fmt(v.min),
    Highest: fmt(v.max),
    Orders: v.n
  }));
  const rng = vs.map(v => ({
    name: v.name.split(' ')[0],
    base: v.min,
    range: v.max - v.min
  }));

  const vendorVolumes = vs.map(v => ({
    name: v.name.split(' ')[0],
    value: v.n
  }));

  const priceVariances = vs.map(v => ({
    name: v.name.split(' ')[0],
    avg: Math.round(v.avg),
    variancePct: best?.avg ? Number((((v.avg - best.avg) / best.avg) * 100).toFixed(1)) : 0
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900">Price Intelligence & Benchmarking</h1>
            <span className="badge bg-teal/10 text-teal border border-teal/20">Market Rates</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Compare unit rates across suppliers and detect cost-saving opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Material:
          </label>
          <select
            className="border rounded-lg p-2 text-sm font-semibold text-slate-800 bg-slate-50 border-slate-300 focus:outline-none focus:border-royal"
            value={id}
            onChange={e => setId(e.target.value)}
          >
            {its.map(i => (
              <option key={i.itemId} value={i.itemId}>
                {i.itemName} ({i.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {vs.length < 2 ? (
        <div className="card text-center py-12 text-slate-500 space-y-2">
          <AlertCircle size={32} className="mx-auto text-amber-500" />
          <h3 className="text-base font-semibold text-slate-800">Single Supplier Record</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Only one vendor has supplied {it?.itemName}. Benchmark comparisons require at least two distinct suppliers.
          </p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              c={C.teal}
              l="Lowest Average"
              v={fmt(best.avg)}
              sub={`Best Rate: ${best.name}`}
              icon={<TrendingDown size={18} className="text-teal" />}
            />
            <Stat
              c={C.coral}
              l="Highest Average"
              v={fmt(worst.avg)}
              sub={`Highest: ${worst.name}`}
              icon={<TrendingUp size={18} className="text-rose-500" />}
            />
            <Stat
              c={C.amber}
              l="Price Gap"
              v={fmt(gap)}
              sub={`${gapPct}% premium paid to highest`}
              icon={<Percent size={18} className="text-amber-500" />}
            />
            <Stat
              c={C.blue}
              l="Potential Savings"
              v={est ? fmt(est) : 'N/A'}
              sub="If shifted to lowest average"
              icon={<CheckCircle size={18} className="text-royal" />}
            />
          </div>

          {/* Charts Row 1: Average Rate & Historical Span */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel
              t="Average Unit Price by Supplier"
              sub="Green represents lowest rate; Coral indicates highest premium"
            >
              <div className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vs.map(v => ({ name: v.name.split(' ')[0], value: Math.round(v.avg) }))}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} stroke="#94A3B8" />
                    <YAxis fontSize={12} stroke="#94A3B8" domain={['auto', 'auto']} />
                    <Tooltip {...tip} formatter={(v: number) => [fmt(Number(v)), 'Avg Unit Price']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {vs.map((_v, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? C.teal : i === vs.length - 1 ? C.coral : C.blue}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              t="Historical Price Range Per Vendor"
              sub="Bar span indicates min to max price paid to each vendor"
            >
              <div className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rng}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} stroke="#94A3B8" />
                    <YAxis fontSize={12} stroke="#94A3B8" domain={['auto', 'auto']} />
                    <Tooltip {...tip} formatter={(v: number, n: string) => [n === 'base' ? '' : fmt(Number(v)), 'Range']} />
                    <Bar dataKey="base" stackId="a" fill="transparent" />
                    <Bar dataKey="range" stackId="a" fill={C.violet} radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          {/* Charts Row 2: Supplier Order Allocation & Rate Variance */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel
              t="Supplier Order Allocation"
              sub={`PO distribution for ${it?.itemName || 'item'} across suppliers`}
            >
              <div className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendorVolumes}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {vendorVolumes.map((_, i) => (
                        <Cell key={i} fill={PAL[i % PAL.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tip} formatter={(v: number) => [`${v} Orders`, 'PO Volume']} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              t="Price Premium vs Lowest Benchmark"
              sub="% price premium above lowest available supplier rate"
            >
              <div className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceVariances}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} stroke="#94A3B8" />
                    <YAxis fontSize={12} stroke="#94A3B8" unit="%" />
                    <Tooltip {...tip} formatter={(v: number) => [`+${v}%`, 'Premium over Best']} />
                    <Bar dataKey="variancePct" radius={[6, 6, 0, 0]}>
                      {priceVariances.map((v, i) => (
                        <Cell
                          key={i}
                          fill={v.variancePct === 0 ? C.teal : v.variancePct > 10 ? C.coral : C.amber}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </>
      )}

      {/* Historical Monthly Price Trend */}
      <Panel
        t="Monthly Average Price Trend"
        sub={`Historical monthly pricing movements for ${it?.itemName || 'item'}`}
      >
        <div className="w-full h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={t}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} stroke="#94A3B8" />
              <YAxis fontSize={12} stroke="#94A3B8" domain={['auto', 'auto']} />
              <Tooltip {...tip} formatter={(v: number) => [fmt(Number(v)), 'Monthly Avg Price']} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={C.blue}
                strokeWidth={2.5}
                fill="url(#trendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {rows.length > 0 && <T title="Supplier Price Comparison Breakdown" rows={rows} />}
    </div>
  );
}

export function AnalyticsPage() {
  const m = A.monthly().map((x, i, a) => ({
    ...x,
    mom: i ? +(((x.value - a[i - 1].value) / a[i - 1].value) * 100).toFixed(1) : 0
  }));
  const cat = A.categorySpend();
  const tv = A.vendorSpend().slice(0, 8).map(v => ({
    name: v.name.split(' ').slice(0, 2).join(' '),
    value: Math.round(v.value)
  }));
  const matrix = A.savingsOpportunityMatrix();
  const volatility = A.itemVolatilityRankings();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Procurement Analytics & Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">
          Detailed breakdown of spend trends, categories, supplier concentration, and price volatility risks.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel
          t="Monthly Spend & MoM Growth"
          sub="Bars represent volume; line indicates % change from previous month"
        >
          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={m}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                <YAxis
                  yAxisId="l"
                  fontSize={11}
                  stroke="#94A3B8"
                  tickFormatter={v => (v / 1e6).toFixed(0) + 'M'}
                />
                <YAxis yAxisId="r" orientation="right" fontSize={11} stroke="#94A3B8" unit="%" />
                <Tooltip {...tip} />
                <Bar yAxisId="l" dataKey="value" name="Spend" fill={C.blue} radius={[6, 6, 0, 0]} />
                <Line yAxisId="r" dataKey="mom" name="MoM %" stroke={C.amber} strokeWidth={2.5} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel t="Spend Distribution by Category" sub="Relative spend share across material categories">
          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cat}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {cat.map((_, i) => (
                    <Cell key={i} fill={PAL[i % PAL.length]} />
                  ))}
                </Pie>
                <Tooltip {...tip} formatter={(v: number) => [fmt(Number(v)), 'Spend']} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel t="Top Suppliers Ranked by Expenditure" sub="Total procurement value awarded">
          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tv} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  fontSize={11}
                  stroke="#94A3B8"
                  tickFormatter={v => (v / 1e6).toFixed(0) + 'M'}
                />
                <YAxis type="category" dataKey="name" width={140} fontSize={12} stroke="#64748B" />
                <Tooltip {...tip} formatter={(v: number) => [fmt(Number(v)), 'Spend']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {tv.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.teal : C.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Material Volatility Index */}
        <Panel
          t="Material Price Volatility Index (CV %)"
          sub="Coefficient of Variation — higher % indicates erratic supplier pricing"
        >
          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={volatility.slice(0, 6).map(v => ({
                  name: v.itemName.length > 18 ? v.itemName.slice(0, 18) + '…' : v.itemName,
                  cv: v.cv,
                  level: v.volatilityLevel
                }))}
                layout="vertical"
                margin={{ left: 30, right: 20 }}
              >
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={11} stroke="#94A3B8" unit="%" />
                <YAxis type="category" dataKey="name" width={140} fontSize={11} stroke="#64748B" />
                <Tooltip {...tip} formatter={(v: number) => [`${v}%`, 'Price Volatility (CV)']} />
                <Bar dataKey="cv" radius={[0, 6, 6, 0]}>
                  {volatility.slice(0, 6).map((item, idx) => (
                    <Cell
                      key={idx}
                      fill={item.volatilityLevel === 'High' ? C.coral : item.volatilityLevel === 'Moderate' ? C.amber : C.teal}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Procurement Savings Opportunity Matrix */}
      <Panel
        t="Strategic Sourcing & Savings Opportunity Matrix"
        sub="Materials categorized by annual spend volume and addressable cost savings"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase">
                <th className="py-2.5 px-3 text-left">Material Item</th>
                <th className="py-2.5 px-3 text-left">Category</th>
                <th className="py-2.5 px-3 text-right">Total Spend</th>
                <th className="py-2.5 px-3 text-right">Potential Savings</th>
                <th className="py-2.5 px-3 text-right">Savings %</th>
                <th className="py-2.5 px-3 text-right">Price Spread</th>
                <th className="py-2.5 px-3 text-center">Sourcing Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.slice(0, 8).map(m => {
                const badgeStyles: Record<string, string> = {
                  'Priority / Quick Win': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  'Strategic Volume': 'bg-blue-50 text-blue-700 border-blue-200',
                  'Spot Renegotiation': 'bg-amber-50 text-amber-700 border-amber-200',
                  'Low Impact': 'bg-slate-100 text-slate-600 border-slate-200'
                };
                return (
                  <tr key={m.itemId} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-semibold text-slate-800">{m.itemName}</td>
                    <td className="py-2 px-3 text-slate-500">{m.category}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-700">{fmt(m.spend)}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{fmt(m.estSavings)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-700">{m.savingsPct}%</td>
                    <td className="py-2 px-3 text-right text-slate-500 font-mono">+{fmt(m.spread)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`badge border text-[11px] font-semibold ${badgeStyles[m.quadrant] || 'bg-slate-100'}`}>
                        {m.quadrant}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function Vendors() {
  const sp = A.vendorSpend();
  const [a, setA] = useState(vendors[0].vendorId);
  const [b, setB] = useState(vendors[1].vendorId);
  const pa = A.vendorProfile(a);
  const pb = A.vendorProfile(b);
  const mx = (x: number, y: number) => Math.max(x, y) || 1;

  const n = (x: number, y: number, k: 'spend' | 'orders' | 'variety') =>
    [(pa[k] / mx(pa[k], pb[k])) * 100, (pb[k] / mx(pa[k], pb[k])) * 100] as const;
  const comp = (i: number) => Math.max(0, Math.min(100, 50 + (1 - i) * 500));
  const cons = (c: number) => Math.max(0, Math.min(100, 100 - c * 600));

  const radar = [
    ['Spend', ...n(0, 0, 'spend')],
    ['Orders', ...n(0, 0, 'orders')],
    ['Item variety', ...n(0, 0, 'variety')],
    ['Price competitiveness', comp(pa.idx), comp(pb.idx)],
    ['Price consistency', cons(pa.cv), cons(pb.cv)]
  ].map(([k, x, y]) => ({ k, A: Math.round(x as number), B: Math.round(y as number) }));

  const nm = (id: string) => vendors.find(v => v.vendorId === id)!.vendorName;

  const sel = (v: string, f: (s: string) => void) => (
    <select
      className="border rounded-lg p-2 bg-slate-50 text-slate-800 text-sm font-semibold border-slate-300 focus:outline-none focus:border-royal"
      value={v}
      onChange={e => f(e.target.value)}
    >
      {vendors.map(x => (
        <option key={x.vendorId} value={x.vendorId}>
          {x.vendorName}
        </option>
      ))}
    </select>
  );

  return (
    <T
      title="Vendors Master"
      rows={vendors.map(v => {
        const s = sp.find(x => x.id === v.vendorId);
        return {
          ID: v.vendorId,
          Vendor: v.vendorName,
          Contact: v.contactPerson,
          Email: v.email,
          Phone: v.phone,
          'Total Value': fmt(s?.value ?? 0),
          POs: s?.orders ?? 0,
          Status: v.status
        };
      })}
    >
      <Panel
        t="Head-to-Head Supplier Benchmarking"
        sub="Relative performance metrics derived from PO prices, variety, and volatility."
      >
        <div className="flex flex-wrap gap-4 mb-4 items-center p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full" style={{ background: C.blue }} />
            <span className="text-xs font-semibold text-slate-600">Vendor A:</span>
            {sel(a, setA)}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full" style={{ background: C.teal }} />
            <span className="text-xs font-semibold text-slate-600">Vendor B:</span>
            {sel(b, setB)}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-center">
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke={C.grid} />
                <PolarAngleAxis dataKey="k" fontSize={11} stroke="#64748B" />
                <Radar
                  name={nm(a)}
                  dataKey="A"
                  stroke={C.blue}
                  fill={C.blue}
                  fillOpacity={0.25}
                />
                <Radar
                  name={nm(b)}
                  dataKey="B"
                  stroke={C.teal}
                  fill={C.teal}
                  fillOpacity={0.25}
                />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="font-semibold text-slate-600">Comparison Metric</th>
                  <th className="font-bold text-royal">{nm(a).split(' ')[0]}</th>
                  <th className="font-bold text-teal">{nm(b).split(' ')[0]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Total spend', fmt(pa.spend), fmt(pb.spend)],
                  ['Purchase orders', pa.orders, pb.orders],
                  ['Materials supplied', pa.variety, pb.variety],
                  [
                    'Price vs Market average',
                    (pa.idx * 100 - 100).toFixed(1) + '%',
                    (pb.idx * 100 - 100).toFixed(1) + '%'
                  ],
                  [
                    'Price volatility (CV)',
                    (pa.cv * 100).toFixed(1) + '%',
                    (pb.cv * 100).toFixed(1) + '%'
                  ]
                ].map(r => (
                  <tr key={r[0]}>
                    <td className="font-medium text-slate-700">{r[0]}</td>
                    <td className="font-semibold text-slate-900">{r[1]}</td>
                    <td className="font-semibold text-slate-900">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </T>
  );
}
