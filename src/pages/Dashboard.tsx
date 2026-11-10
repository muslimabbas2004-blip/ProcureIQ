import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  DollarSign,
  ShoppingCart,
  Building2,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchDashboardOverview, DashboardOverviewData, fmt } from '../services/analyticsService';
import { compactValue, monthLabel, rupees } from '../components/chartFormat';

export default function Dashboard() {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [error, setError] = useState('');
  const [chartView, setChartView] = useState<'bar' | 'area'>('area');

  useEffect(() => {
    fetchDashboardOverview().then(setData).catch(() => setError('Unable to load live dashboard data. Check the server connection and refresh.'));
  }, []);

  if (error) return <div role="alert" className="card text-rose-700">{error}</div>;
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-royal border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading executive procurement analytics…</span>
        </div>
      </div>
    );
  }

  const { kpis: k, monthly: m, topVendors: top, frequentItems: fi, recentPOs, pipeline, pareto } = data;
  const l = m[m.length - 1];
  const p = m[m.length - 2] ?? l;
  const ch = p && p.value ? ((l.value - p.value) / p.value) * 100 : 0;

  const statusColors: Record<string, string> = {
    Received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Ordered: 'bg-blue-50 text-blue-700 border-blue-200',
    Approved: 'bg-teal-50 text-teal-700 border-teal-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-navy via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal/20 text-teal border border-teal/30 mb-2">
            <Sparkles size={12} />
            Live Intelligence
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Procurement Executive Overview</h1>
          <p className="text-slate-300 text-sm mt-1">
            Real-time spend analytics, supplier benchmarking, and cost optimization opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/assistant"
            className="btn bg-teal text-navy hover:bg-teal/90 font-semibold shadow-sm"
          >
            <Sparkles size={15} />
            Ask AI Assistant
          </Link>
          <Link
            to="/app/pricing"
            className="btn2 bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Price Intelligence
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <div className="card p-5 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Spend
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-royal">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{fmt(k.spend)}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                ch >= 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {ch >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(ch).toFixed(1)}% MoM
            </span>
            <span className="text-slate-400">vs {p?.name}</span>
          </div>
        </div>

        {/* Purchase Orders */}
        <div className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Purchase Orders
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{k.orders}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <span>Excludes draft and cancelled orders</span>
          </div>
        </div>

        {/* Active Suppliers */}
        <div className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Suppliers
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal">
              <Building2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{k.vendors}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <span>Suppliers marked active</span>
          </div>
        </div>

        {/* Est. Savings Opportunity */}
        <div className="card p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/30 border-emerald-200/60">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Savings Potential
            </span>
            <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700">
              <PiggyBank size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-2">{fmt(k.savings)}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700">
            <span>By shifting to lowest supplier averages</span>
          </div>
        </div>
      </div>

      {/* PO Fulfillment & Lifecycle Pipeline */}
      {pipeline && (
        <div className="card space-y-4 bg-gradient-to-br from-white via-slate-50/60 to-blue-50/20 border-blue-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-royal/10 text-royal">
                  <Clock size={16} />
                </span>
                <h2 className="text-base font-bold text-slate-900">Purchase Order Fulfillment Pipeline</h2>
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {pipeline.fulfillmentRate}% Fulfillment Rate
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking of purchase orders across fulfillment stages from creation to warehouse delivery.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400">Avg PO Size: </span>
                <span className="font-semibold text-slate-800">{fmt(pipeline.avgOrderValue)}</span>
              </div>
              <div>
                <span className="text-slate-400">Cancellation Rate: </span>
                <span className="font-semibold text-rose-600">{pipeline.cancellationRate}%</span>
              </div>
            </div>
          </div>

          {/* Segmented Pipeline Bar */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              {pipeline.pipeline.map(seg => {
                if (seg.count === 0) return null;
                const colors: Record<string, string> = {
                  Received: 'bg-emerald-500 hover:bg-emerald-600',
                  Ordered: 'bg-royal hover:bg-blue-700',
                  Approved: 'bg-teal hover:bg-teal/90',
                  Pending: 'bg-amber-400 hover:bg-amber-500',
                  Draft: 'bg-slate-300 hover:bg-slate-400',
                  Cancelled: 'bg-rose-400 hover:bg-rose-500'
                };
                return (
                  <div
                    key={seg.status}
                    title={`${seg.status}: ${seg.count} POs (${seg.pct.toFixed(1)}%) • ${fmt(seg.spend)}`}
                    style={{ width: `${seg.pct}%` }}
                    className={`${colors[seg.status] || 'bg-slate-300'} h-full transition-all cursor-pointer`}
                  />
                );
              })}
            </div>

            {/* Pipeline Stage Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {pipeline.pipeline.map(seg => {
                const borderColors: Record<string, string> = {
                  Received: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
                  Ordered: 'border-blue-200 bg-blue-50/70 text-blue-800',
                  Approved: 'border-teal/30 bg-teal/10 text-teal-800',
                  Pending: 'border-amber-200 bg-amber-50/70 text-amber-800',
                  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
                  Cancelled: 'border-rose-200 bg-rose-50/70 text-rose-800'
                };
                const dotColors: Record<string, string> = {
                  Received: 'bg-emerald-500',
                  Ordered: 'bg-royal',
                  Approved: 'bg-teal',
                  Pending: 'bg-amber-500',
                  Draft: 'bg-slate-400',
                  Cancelled: 'bg-rose-500'
                };
                return (
                  <div
                    key={seg.status}
                    className={`p-2.5 rounded-xl border ${borderColors[seg.status] || 'border-slate-200'} flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${dotColors[seg.status] || 'bg-slate-400'}`} />
                        {seg.status}
                      </span>
                      <span className="font-mono text-[11px]">{seg.pct.toFixed(0)}%</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-bold">{seg.count}</span>
                      <span className="text-[11px] opacity-80">{fmt(seg.spend)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Spend Trends & Pareto Spend Concentration */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Main Spend Chart */}
        <div className="card min-w-0 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly purchase order spend</h2>
              <p className="text-xs text-slate-500">
                {l ? `PKR · ${monthLabel(m[0].name)} to ${monthLabel(l.name)} · months with recorded orders` : 'PKR · live purchase orders'}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setChartView('area')}
                aria-pressed={chartView === 'area'}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                  chartView === 'area'
                    ? 'bg-white text-royal shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Area View
              </button>
              <button
                onClick={() => setChartView('bar')}
                aria-pressed={chartView === 'bar'}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                  chartView === 'bar'
                    ? 'bg-white text-royal shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bar View
              </button>
            </div>
          </div>

          {m.length ? <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'area' ? (
                <AreaChart data={m} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#356AE6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#356AE6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickFormatter={monthLabel} minTickGap={16} fontSize={11} stroke="#64748B" />
                  <YAxis
                    fontSize={11}
                    stroke="#94A3B8"
                    width={52}
                    tickFormatter={compactValue}
                  />
                  <Tooltip
                    labelFormatter={monthLabel}
                    formatter={(val: number) => [rupees(val), 'Spend']}
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      color: '#fff',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: '#38BDF8' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#356AE6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#spendGradient)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={m} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickFormatter={monthLabel} minTickGap={16} fontSize={11} stroke="#64748B" />
                  <YAxis
                    fontSize={11}
                    stroke="#94A3B8"
                    width={52}
                    tickFormatter={compactValue}
                  />
                  <Tooltip
                    labelFormatter={monthLabel}
                    formatter={(val: number) => [rupees(val), 'Spend']}
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      color: '#fff',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: '#38BDF8' }}
                  />
                  <Bar dataKey="value" fill="#356AE6" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div> : <p className="text-sm text-slate-600">Import purchase orders to see monthly spend.</p>}
        </div>

        {/* Supplier Pareto Curve (80/20 Rule) */}
        <div className="card min-w-0 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">How concentrated is supplier spend?</h2>
                <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                  Spend Concentration
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Top {Math.min(pareto.length, 8)} suppliers by spend (PKR). The line adds their shares of all supplier spend from left to right.
              </p>
            </div>
          </div>

          {pareto.length ? <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={pareto ? pareto.slice(0, 8) : []}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="rank" tickFormatter={rank => `#${rank}`} fontSize={11} stroke="#64748B" />
                <YAxis
                  yAxisId="left"
                  fontSize={11}
                  stroke="#94A3B8"
                  width={48}
                  tickFormatter={compactValue}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  fontSize={11}
                  stroke="#94A3B8"
                  unit="%"
                  width={44}
                  domain={[0, 100]}
                />
                <Tooltip
                  labelFormatter={rank => pareto.find(supplier => supplier.rank === Number(rank))?.name ?? `Supplier #${rank}`}
                  formatter={(val: number, name: string) => [name === 'Spend (PKR)' ? rupees(val) : `${val}%`, name]}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <ReferenceLine yAxisId="right" y={80} stroke="#9A3412" strokeDasharray="4 4" label={{ value: '80% of all spend', fill: '#9A3412', fontSize: 10, position: 'insideTopLeft' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="spend" name="Spend (PKR)" fill="#176b60" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativeShare"
                  name="Cumulative share"
                  stroke="#A86109"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#A86109' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div> : <p className="text-sm text-slate-600">No supplier spend is available yet.</p>}
        </div>
      </div>

      {/* Tables & Deep Dive */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Vendors with Share Progress */}
        <div className="card space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Leading Suppliers</h2>
              <p className="text-xs text-slate-500">Highest procurement volume by total spend</p>
            </div>
            <Link to="/app/vendors" className="text-xs text-royal hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Spend Value</th>
                  <th>POs</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {top.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="font-semibold text-slate-800">{v.name}</td>
                    <td className="font-medium text-slate-700">{fmt(v.value)}</td>
                    <td className="text-slate-500 text-xs">{v.orders}</td>
                    <td className="w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-royal h-full rounded-full"
                            style={{ width: `${Math.min(100, v.share * 3)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 min-w-[38px] text-right">
                          {v.share.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Frequently Purchased Materials */}
        <div className="card space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Key Materials & Items</h2>
              <p className="text-xs text-slate-500">High-frequency items across orders</p>
            </div>
            <Link to="/app/items" className="text-xs text-royal hover:underline flex items-center gap-1">
              View catalog <ArrowRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Category</th>
                  <th>Avg Price</th>
                  <th>Spend</th>
                </tr>
              </thead>
              <tbody>
                {fi.map(i => (
                  <tr key={i.itemId} className="hover:bg-slate-50">
                    <td className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Package size={14} className="text-teal" />
                      {i.itemName}
                    </td>
                    <td>
                      <span className="badge bg-slate-100 text-slate-600 border border-slate-200">
                        {i.category}
                      </span>
                    </td>
                    <td className="text-slate-700 text-xs font-medium">{fmt(i.avg)}</td>
                    <td className="font-semibold text-slate-800 text-xs">{fmt(i.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Purchase Orders</h2>
            <p className="text-xs text-slate-500">Latest orders submitted to suppliers</p>
          </div>
          <Link to="/app/purchase-orders" className="text-xs text-royal hover:underline flex items-center gap-1">
            See all POs <ArrowRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Total Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPOs.map(o => (
                <tr key={o.poId} className="hover:bg-slate-50">
                  <td className="font-mono font-medium text-slate-800 text-xs">{o.poId}</td>
                  <td className="font-semibold text-slate-800">{o.vendorName}</td>
                  <td className="text-slate-500 text-xs">{o.orderDate}</td>
                  <td className="font-semibold text-slate-800">{fmt(o.totalAmount)}</td>
                  <td>
                    <span
                      className={`badge border ${
                        statusColors[o.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
