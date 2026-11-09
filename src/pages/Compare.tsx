import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { http } from '../services/api';
import { fmt } from '../services/analyticsService';
import { T } from './Tables';

type Item = { itemId: string; itemName: string; category: string };
type Vendor = { vendorId: string; vendorName: string; status: string; totalSpend: number; orderCount: number; share: number };
type ItemDetail = Item & { vendorComparison: { name: string; avg: number; min: number; max: number; n: number }[]; trend: { name: string; value: number }[] };
const COLORS = ['#176b60', '#b89968', '#70a58c', '#7893a0', '#b98173', '#8882a5', '#c1ab78', '#55827a'];

type Expenditure = { total: number; monthly: { name: string; value: number }[]; categorySpend: { name: string; value: number }[]; topVendors: { id: string; name: string; value: number; orders: number; share: number }[] };

export function PricePage() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [id, setId] = useState('');
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      http<{data: Item[]}>('/api/items?pageSize=50&q=' + encodeURIComponent(search), { signal: controller.signal })
        .then(result => { setItems(result.data); setId(current => current || result.data[0]?.itemId || ''); setError(''); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);
  useEffect(() => {
    if (!id) { setDetail(null); return; }
    const controller = new AbortController();
    setDetail(null);
    http<ItemDetail>('/api/items/' + encodeURIComponent(id), { signal: controller.signal })
      .then(result => { setDetail(result); setError(''); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [id]);
  return <div className="max-w-7xl mx-auto space-y-5">
    <div className="card space-y-3"><h1 className="text-2xl font-bold">Price intelligence</h1><p className="text-sm text-slate-600">Search the live item catalog and select an item to compare prices from purchase orders.</p>
      <label className="block text-sm font-semibold">Search by item name or ID<input className="block w-full max-w-lg border rounded-lg p-2 mt-1" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items" /></label>
      <label className="block text-sm font-semibold">Item<select className="block w-full max-w-lg border rounded-lg p-2 mt-1" value={items.some(i => i.itemId === id) ? id : ''} onChange={e => setId(e.target.value)}><option value="">Select an item</option>{items.map(i => <option key={i.itemId} value={i.itemId}>{i.itemName} ({i.itemId})</option>)}</select></label>
      <p className="text-xs text-slate-500">Showing up to 50 matches. Refine your search to find another item.</p>
    </div>
    {error && <p role="alert" className="card text-rose-700">Could not load live data: {error}</p>}
    {!id && !error && <p className="card text-slate-500">No items found. Import an item master or refine your search.</p>}
    {detail && <><div className="grid lg:grid-cols-2 gap-5"><div className="card"><h2 className="font-bold">Average price by supplier</h2><p className="text-xs text-slate-500 mt-1">Average of recorded unit prices in live purchase-order lines.</p>{detail.vendorComparison.length ? <div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={detail.vendorComparison} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="name" width={110} tick={{fontSize:10}}/><Tooltip formatter={(v: number) => fmt(v)}/><Bar dataKey="avg" name="Average price" fill="#176b60"/></BarChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500 mt-4">No live purchase-order lines are available for this item.</p>}</div>
      <div className="card"><h2 className="font-bold">Supplier price range</h2><p className="text-xs text-slate-500 mt-1">Lowest and highest recorded unit prices, shown by supplier.</p>{detail.vendorComparison.length ? <div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={detail.vendorComparison} margin={{bottom:15}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis width={70}/><Tooltip formatter={(v: number) => fmt(v)}/><Legend/><Bar dataKey="min" name="Lowest" fill="#70a58c"/><Bar dataKey="max" name="Highest" fill="#b89968"/></BarChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500 mt-4">Import matching purchase orders and line items to see price ranges.</p>}</div></div><T title={`Supplier prices for ${detail.itemName}`} rows={detail.vendorComparison.map(v => ({ Supplier: v.name, 'Average price': fmt(v.avg), Lowest: fmt(v.min), Highest: fmt(v.max), 'Order lines': v.n }))}/>
      <div className="card"><h2 className="font-bold">Monthly average unit price</h2>{detail.trend.length ? <div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={detail.trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis width={70}/><Tooltip/><Area dataKey="value" stroke="#176b60" fill="#b7ddc8"/></AreaChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500 mt-3">No live purchase-order lines are available for this item.</p>}</div></>}
  </div>;
}

export function AnalyticsPage() {
  const [data, setData] = useState<Expenditure | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { http<Expenditure>('/api/analytics/expenditure').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <p role="alert" className="card text-rose-700">Could not load live analytics: {error}</p>;
  if (!data) return <p role="status">Loading live analytics…</p>;
  return <div className="max-w-7xl mx-auto space-y-5"><div className="card"><h1 className="text-2xl font-bold">Spend analytics</h1><p className="text-sm text-slate-600 mt-2">Live purchase orders, excluding draft and cancelled orders.</p><p className="text-2xl font-bold mt-4">{fmt(data.total)}</p><p className="text-xs text-slate-500">Total spend</p></div>
    <div className="grid lg:grid-cols-2 gap-5"><div className="card"><h2 className="font-bold">Monthly spend</h2>{data.monthly.length ? <div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis width={70} tick={{fontSize:10}}/><Tooltip formatter={(v: number) => fmt(v)}/><Bar dataKey="value" name="Spend" fill="#176b60"/></BarChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500 mt-3">No live purchase orders yet. Import purchase orders to see monthly spend.</p>}</div>
    <div className="card"><h2 className="font-bold">Spend by category</h2>{data.categorySpend.some(c => c.value > 0) ? <div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.categorySpend.filter(c => c.value > 0)} dataKey="value" nameKey="name" outerRadius="72%">{data.categorySpend.filter(c => c.value > 0).map((c,i) => <Cell key={c.name} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip formatter={(v: number) => fmt(v)}/><Legend/></PieChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500 mt-3">Import item records and matching purchase-order lines to see category spend.</p>}</div></div>
    <div className="card"><h2 className="font-bold">Top suppliers by spend</h2><p className="text-xs text-slate-500 mt-1">Top 10 suppliers from live purchase orders.</p>{data.topVendors.length ? <div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.topVendors} layout="vertical" margin={{right:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="name" width={120} tick={{fontSize:10}}/><Tooltip formatter={(v: number) => fmt(v)}/><Bar dataKey="value" name="Spend" fill="#176b60"/></BarChart></ResponsiveContainer></div> : <p className="text-sm text-slate-500 mt-3">No supplier spend is available yet.</p>}</div><T title="Spend by category" rows={data.categorySpend.map(c => ({ Category: c.name, Spend: fmt(c.value) }))}/></div>;
}

export function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [comparison, setComparison] = useState<{ vendorA: { profile: { spend: number; orders: number; variety: number; idx: number; cv: number } }; vendorB: { profile: { spend: number; orders: number; variety: number; idx: number; cv: number } }; radar: { k: string; A: number; B: number }[] } | null>(null);
  useEffect(() => { if (!a || !b) { setComparison(null); return; } setComparison(null); const c = new AbortController(); http<typeof comparison>('/api/analytics/vendor-comparison?v1=' + encodeURIComponent(a) + '&v2=' + encodeURIComponent(b), { signal: c.signal }).then(setComparison).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => c.abort(); }, [a, b]);
  useEffect(() => { http<{ data: Vendor[] }>('/api/vendors?pageSize=500').then(r => setVendors(r.data)).catch(e => setError(e.message)); }, []);
  if (error) return <p role="alert" className="card text-rose-700">Could not load live suppliers: {error}</p>;
  return <T title="Suppliers" rows={vendors.map(v => ({ ID: v.vendorId, Supplier: v.vendorName, Status: v.status, 'Total spend': fmt(v.totalSpend), Orders: v.orderCount, 'Spend share': v.share.toFixed(1) + '%' }))}><div className="card space-y-3"><h2 className="font-semibold">Compare suppliers</h2><p className="text-xs text-slate-500">Showing up to 500 suppliers from the live catalog. Select two to compare live purchase-order activity.</p><div className="flex flex-wrap gap-3">{[[a, setA, 'Supplier A'], [b, setB, 'Supplier B']].map(([value, setter, label]) => <label key={label as string} className="text-sm">{label as string}<select className="block border rounded p-2 mt-1 max-w-full" value={value as string} onChange={e => (setter as (value: string) => void)(e.target.value)}><option value="">Select supplier</option>{vendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.vendorName}</option>)}</select></label>)}</div>{comparison && <>{comparison.vendorA.profile.orders + comparison.vendorB.profile.orders > 0 ? <><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart data={comparison.radar}><PolarGrid/><PolarAngleAxis dataKey="k" tick={{fontSize:10}}/><PolarRadiusAxis domain={[0,100]} tick={{fontSize:9}}/><Radar dataKey="A" name={vendors.find(v => v.vendorId === a)?.vendorName || "Supplier A"} stroke="#176b60" fill="#176b60" fillOpacity={0.3}/><Radar dataKey="B" name={vendors.find(v => v.vendorId === b)?.vendorName || "Supplier B"} stroke="#b89968" fill="#b89968" fillOpacity={0.3}/><Legend/><Tooltip/></RadarChart></ResponsiveContainer></div><p className="text-xs text-slate-500">Scores are normalized for comparison; see raw values below.</p></> : <p className="text-sm text-slate-500">No live purchase-order lines are available for these suppliers.</p>}<div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Metric</th><th>{vendors.find(v => v.vendorId === a)?.vendorName}</th><th>{vendors.find(v => v.vendorId === b)?.vendorName}</th></tr></thead><tbody>{(['spend','orders','variety','idx','cv'] as const).map(key => <tr key={key}><td>{{spend:'Spend',orders:'Orders',variety:'Item variety',idx:'Price index',cv:'Price volatility'}[key]}</td><td>{key === 'spend' ? fmt(comparison.vendorA.profile[key]) : comparison.vendorA.profile[key].toFixed(2)}</td><td>{key === 'spend' ? fmt(comparison.vendorB.profile[key]) : comparison.vendorB.profile[key].toFixed(2)}</td></tr>)}</tbody></table></div></>}</div></T>;
}
