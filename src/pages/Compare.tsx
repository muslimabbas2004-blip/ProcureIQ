import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { http } from '../services/api';
import { fmt } from '../services/analyticsService';
import { compactValue, monthLabel, rupees } from '../components/chartFormat';
import RankedBars from '../components/RankedBars';
import { T } from './Tables';

type Item = { itemId: string; itemName: string; category: string };
type Vendor = { vendorId: string; vendorName: string; status: string; totalSpend: number; orderCount: number; share: number };
type ItemDetail = Item & { unitOfMeasurement?: string; vendorComparison: { name: string; avg: number; min: number; max: number; n: number }[]; trend: { name: string; value: number }[] };

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
  const supplierPrices = [...(detail?.vendorComparison ?? [])].sort((a, b) => a.avg - b.avg);
  const priceUnit = detail?.unitOfMeasurement || 'unit';
  return <div className="max-w-7xl mx-auto space-y-5">
    <div className="card space-y-3"><h1 className="text-2xl font-bold">Price intelligence</h1><p className="text-sm text-slate-600">Search the live item catalog and select an item to compare prices from purchase orders.</p>
      <label className="block text-sm font-semibold">Search by item name or ID<input className="block w-full max-w-lg border rounded-lg p-2 mt-1" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items" /></label>
      <label className="block text-sm font-semibold">Item<select className="block w-full max-w-lg border rounded-lg p-2 mt-1" value={items.some(i => i.itemId === id) ? id : ''} onChange={e => setId(e.target.value)}><option value="">Select an item</option>{items.map(i => <option key={i.itemId} value={i.itemId}>{i.itemName} ({i.itemId})</option>)}</select></label>
      <p className="text-xs text-slate-500">Showing up to 50 matches. Refine your search to find another item.</p>
    </div>
    {error && <p role="alert" className="card text-rose-700">Could not load live data: {error}</p>}
    {!id && !error && <p className="card text-slate-500">No items found. Import an item master or refine your search.</p>}
    {detail && <>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card min-w-0">
          <h2 className="font-bold">Average unit price by supplier</h2>
          <p className="mt-1 text-xs text-slate-600">
            PKR per {priceUnit}, lowest average first. Bars show the mean recorded price per order line.
            {supplierPrices.length > 8 && ' Showing the eight lowest averages. The table lists all suppliers.'}
          </p>
          {supplierPrices.length ? <RankedBars label="Suppliers ordered by average unit price" rows={supplierPrices.slice(0, 8).map(v => ({
            name: v.name, value: v.avg, detail: <>{rupees(v.avg)} · {v.n} {v.n === 1 ? 'line' : 'lines'}</>
          }))} /> : <p className="mt-4 text-sm text-slate-500">No live purchase-order lines are available for this item.</p>}
        </div>
        <div className="card min-w-0">
          <h2 className="font-bold">Monthly average unit price</h2>
          <p className="mt-1 text-xs text-slate-600">PKR per {priceUnit}. Only months with recorded purchases appear.</p>
          {detail.trend.length ? <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail.trend} margin={{ right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickFormatter={monthLabel} tick={{ fontSize: 11 }} minTickGap={16} />
                <YAxis width={52} tickFormatter={compactValue} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={monthLabel} formatter={(v: number) => [rupees(v), 'Average unit price']} />
                <Line dataKey="value" stroke="#176b60" strokeWidth={2} dot={detail.trend.length <= 12} />
              </LineChart>
            </ResponsiveContainer>
          </div> : <p className="mt-3 text-sm text-slate-500">No live purchase-order lines are available for this item.</p>}
        </div>
      </div>
      <T title={`Supplier price ranges for ${detail.itemName}`} rows={supplierPrices.map(v => ({
        Supplier: v.name, 'Average unit price': rupees(v.avg), 'Lowest unit price': rupees(v.min), 'Highest unit price': rupees(v.max), 'Order lines': v.n
      }))} />
    </>}
  </div>;
}

export function AnalyticsPage() {
  const [data, setData] = useState<Expenditure | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { http<Expenditure>('/api/analytics/expenditure').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <p role="alert" className="card text-rose-700">Could not load live analytics: {error}</p>;
  if (!data) return <p role="status">Loading live analytics…</p>;
  const categories = [...data.categorySpend].sort((a, b) => b.value - a.value);
  const categoryTotal = categories.reduce((sum, category) => sum + category.value, 0);
  const showCategoryShare = categoryTotal > 0 && categories.every(category => category.value >= 0);
  const categoryShare = (value: number) => `${(value / categoryTotal * 100).toFixed(1)}%`;
  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="card">
        <h1 className="text-2xl font-bold">Spend analytics</h1>
        <p className="mt-2 text-sm text-slate-600">Live purchase orders, excluding draft and cancelled orders.</p>
        <p className="mt-4 text-2xl font-bold">{fmt(data.total)}</p>
        <p className="text-xs text-slate-600">Total spend</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card min-w-0">
          <h2 className="font-bold">Monthly purchase order spend</h2>
          <p className="mt-1 text-xs text-slate-600">PKR. Only months with recorded orders appear.</p>
          {data.monthly.length ? <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickFormatter={monthLabel} tick={{ fontSize: 11 }} minTickGap={16} />
                <YAxis width={52} tickFormatter={compactValue} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={monthLabel} formatter={(v: number) => [rupees(v), 'Spend']} />
                <Bar dataKey="value" name="Spend" fill="#176b60" maxBarSize={46} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <p className="mt-3 text-sm text-slate-500">No live purchase orders yet. Import purchase orders to see monthly spend.</p>}
        </div>
        <div className="card min-w-0">
          <h2 className="font-bold">Spend by item category</h2>
          <p className="mt-1 text-xs text-slate-600">
            Based on purchase-order lines matched to the item catalog.
            {showCategoryShare && ' Shares are of categorized spend.'}
            {categories.length > 8 && ' Showing the top eight categories. The table lists all categories.'}
          </p>
          {categories.length ? <RankedBars label="Item categories ranked by spend" rows={categories.slice(0, 8).map(c => ({
            name: c.name, value: c.value, detail: showCategoryShare ? `${rupees(c.value)} · ${categoryShare(c.value)}` : rupees(c.value)
          }))} /> : <p className="mt-3 text-sm text-slate-500">Import item records and matching purchase-order lines to see category spend.</p>}
        </div>
      </div>
      <div className="card">
        <h2 className="font-bold">Top suppliers by spend</h2>
        <p className="mt-1 text-xs text-slate-600">Top 10 suppliers from live purchase orders, with share of total spend.</p>
        {data.topVendors.length ? <RankedBars label="Suppliers ranked by spend" rows={data.topVendors.map(v => ({
          ...v, detail: `${rupees(v.value)} · ${v.share.toFixed(1)}% · ${v.orders} ${v.orders === 1 ? 'order' : 'orders'}`
        }))} /> : <p className="mt-3 text-sm text-slate-500">No supplier spend is available yet.</p>}
      </div>
      <T title="Spend by category" rows={categories.map(c => ({
        Category: c.name, Spend: rupees(c.value), ...(showCategoryShare ? { 'Share of categorized spend': categoryShare(c.value) } : {})
      }))} />
    </div>
  );
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
  return <T title="Suppliers" rows={vendors.map(v => ({ ID: v.vendorId, Supplier: v.vendorName, Status: v.status, 'Total spend': fmt(v.totalSpend), Orders: v.orderCount, 'Spend share': v.share.toFixed(1) + '%' }))}><div className="card space-y-3"><h2 className="font-semibold">Compare suppliers</h2><p className="text-xs text-slate-500">Showing up to 500 suppliers from the live catalog. Select two to compare live purchase-order activity.</p><div className="flex flex-wrap gap-3">{[[a, setA, 'Supplier A'], [b, setB, 'Supplier B']].map(([value, setter, label]) => <label key={label as string} className="text-sm">{label as string}<select className="block border rounded p-2 mt-1 max-w-full" value={value as string} onChange={e => (setter as (value: string) => void)(e.target.value)}><option value="">Select supplier</option>{vendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.vendorName}</option>)}</select></label>)}</div>{comparison && <>{comparison.vendorA.profile.orders + comparison.vendorB.profile.orders > 0 ? <><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison.radar} layout="vertical" margin={{ right: 12 }}>
  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
  <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11 }} />
  <YAxis type="category" dataKey="k" width={105} tick={{ fontSize: 10 }} />
  <Bar dataKey="A" name={vendors.find(v => v.vendorId === a)?.vendorName || 'Supplier A'} fill="#176b60" maxBarSize={14} />
  <Bar dataKey="B" name={vendors.find(v => v.vendorId === b)?.vendorName || 'Supplier B'} fill="#a36b2c" maxBarSize={14} />
  <Legend wrapperStyle={{ fontSize: 11 }} />
  <Tooltip formatter={(value: number) => `${value} / 100`} />
</BarChart></ResponsiveContainer></div><p className="text-xs text-slate-500">Each row uses a 0–100 scale. For spend, orders, and item variety, the larger value sets 100. Price scores summarize competitiveness and consistency. Use the table below for the original measures.</p></> : <p className="text-sm text-slate-500">No live purchase-order lines are available for these suppliers.</p>}<div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Metric</th><th>{vendors.find(v => v.vendorId === a)?.vendorName}</th><th>{vendors.find(v => v.vendorId === b)?.vendorName}</th></tr></thead><tbody>{(['spend','orders','variety','idx','cv'] as const).map(key => <tr key={key}><td>{{spend:'Spend',orders:'Orders',variety:'Item variety',idx:'Price index',cv:'Price volatility'}[key]}</td><td>{key === 'spend' ? fmt(comparison.vendorA.profile[key]) : comparison.vendorA.profile[key].toFixed(2)}</td><td>{key === 'spend' ? fmt(comparison.vendorB.profile[key]) : comparison.vendorB.profile[key].toFixed(2)}</td></tr>)}</tbody></table></div></>}</div></T>;
}
