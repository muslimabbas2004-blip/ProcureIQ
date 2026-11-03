import { vendors, items, pos, lines } from '../data/mock';
import { API, http } from './api';
import type { Vendor, Item, PurchaseOrder } from '../types';

const live = pos.filter(p => p.status !== 'Cancelled' && p.status !== 'Draft');
const ids = new Set(live.map(p => p.poId));
const L = lines.filter(l => ids.has(l.poId));
const po = (id: string) => pos.find(p => p.poId === id)!;

export const vName = (id: string) => vendors.find(v => v.vendorId === id)?.vendorName ?? id;
export const fmt = (n: number) => 'Rs. ' + Math.round(n).toLocaleString('en-PK');
export const total = () => live.reduce((a, p) => a + p.totalAmount, 0);

export function monthly() {
  const m: Record<string, number> = {};
  live.forEach(p => {
    const k = p.orderDate.slice(0, 7);
    m[k] = (m[k] ?? 0) + p.totalAmount;
  });
  return Object.entries(m)
    .sort()
    .map(([name, value]) => ({ name, value }));
}

export function vendorSpend() {
  const m: Record<string, { v: number; n: number }> = {};
  live.forEach(p => {
    const e = (m[p.vendorId] ??= { v: 0, n: 0 });
    e.v += p.totalAmount;
    e.n++;
  });
  const t = total();
  return Object.entries(m)
    .map(([id, e]) => ({ id, name: vName(id), value: e.v, orders: e.n, share: (e.v / t) * 100 }))
    .sort((a, b) => b.value - a.value);
}

export function itemStats() {
  return items
    .map(i => {
      const ls = L.filter(l => l.itemId === i.itemId);
      const q = ls.reduce((a, l) => a + l.quantity, 0),
        sp = ls.reduce((a, l) => a + l.lineTotal, 0);
      return {
        ...i,
        qty: q,
        spend: sp,
        avg: q ? sp / q : 0,
        min: Math.min(...ls.map(l => l.unitPrice)),
        max: Math.max(...ls.map(l => l.unitPrice)),
        vendors: new Set(ls.map(l => po(l.poId).vendorId)).size,
        lines: ls.length
      };
    })
    .filter(i => i.lines > 0);
}

export function findItem(q: string) {
  const s = q.toLowerCase();
  return (
    items.find(i => s.includes(i.itemName.toLowerCase())) ??
    items.find(i =>
      i.itemName
        .toLowerCase()
        .split(' ')
        .some(w => w.length > 3 && s.includes(w))
    )
  );
}

export function itemByVendor(itemId: string) {
  const m: Record<string, number[]> = {};
  L.filter(l => l.itemId === itemId).forEach(l =>
    (m[po(l.poId).vendorId] ??= []).push(l.unitPrice)
  );
  return Object.entries(m).map(([id, p]) => ({
    id,
    name: vName(id),
    avg: p.reduce((a, b) => a + b, 0) / p.length,
    min: Math.min(...p),
    max: Math.max(...p),
    n: p.length
  }));
}

export function itemTrend(itemId: string) {
  const m: Record<string, number[]> = {};
  L.filter(l => l.itemId === itemId).forEach(l =>
    (m[po(l.poId).orderDate.slice(0, 7)] ??= []).push(l.unitPrice)
  );
  return Object.entries(m)
    .sort()
    .map(([name, p]) => ({
      name,
      value: Math.round(p.reduce((a, b) => a + b, 0) / p.length)
    }));
}

export function savings() {
  return itemStats()
    .map(i => {
      const bv = itemByVendor(i.itemId)
        .filter(v => v.n >= 2)
        .sort((a, b) => a.avg - b.avg);
      if (bv.length < 2) return null;
      const best = bv[0];
      const ls = L.filter(l => l.itemId === i.itemId);
      const est = ls.reduce((a, l) => a + Math.max(0, l.unitPrice - best.avg) * l.quantity, 0);
      return { item: i.itemName, best: best.name, bestAvg: best.avg, est };
    })
    .filter(Boolean)
    .sort((a, b) => b!.est - a!.est) as {
    item: string;
    best: string;
    bestAvg: number;
    est: number;
  }[];
}

export function priceChanges() {
  return itemStats()
    .map(i => {
      const t = itemTrend(i.itemId);
      if (t.length < 4) return null;
      const a = t.slice(0, 2).reduce((x, y) => x + y.value, 0) / 2,
        b = t.slice(-2).reduce((x, y) => x + y.value, 0) / 2;
      return { item: i.itemName, pct: ((b - a) / a) * 100 };
    })
    .filter(Boolean)
    .sort((a, b) => b!.pct - a!.pct) as { item: string; pct: number }[];
}

export const kpis = () => ({
  spend: total(),
  orders: live.length,
  vendors: vendors.filter(v => v.status === 'Active').length,
  savings: savings().reduce((a, s) => a + s.est, 0)
});

export function categorySpend() {
  const m: Record<string, number> = {};
  L.forEach(l => {
    const c = items.find(i => i.itemId === l.itemId)!.category;
    m[c] = (m[c] ?? 0) + l.lineTotal;
  });
  return Object.entries(m)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function vendorProfile(vid: string) {
  const ls = L.filter(l => po(l.poId).vendorId === vid);
  const avg = Object.fromEntries(itemStats().map(i => [i.itemId, i.avg]));
  const by: Record<string, number[]> = {};
  ls.forEach(l => (by[l.itemId] ??= []).push(l.unitPrice));
  const idx = ls.length ? ls.reduce((a, l) => a + l.unitPrice / avg[l.itemId], 0) / ls.length : 1;
  const cvs = Object.values(by)
    .filter(p => p.length > 1)
    .map(p => {
      const m = p.reduce((a, b) => a + b, 0) / p.length;
      return Math.sqrt(p.reduce((a, b) => a + (b - m) ** 2, 0) / p.length) / m;
    });
  const cv = cvs.length ? cvs.reduce((a, b) => a + b, 0) / cvs.length : 0;
  return {
    spend: ls.reduce((a, l) => a + l.lineTotal, 0),
    orders: new Set(ls.map(l => l.poId)).size,
    variety: Object.keys(by).length,
    idx,
    cv
  };
}

export function poStatusPipeline() {
  const allPos = pos;
  const counts: Record<string, { count: number; spend: number }> = {
    Received: { count: 0, spend: 0 },
    Ordered: { count: 0, spend: 0 },
    Approved: { count: 0, spend: 0 },
    Pending: { count: 0, spend: 0 },
    Draft: { count: 0, spend: 0 },
    Cancelled: { count: 0, spend: 0 }
  };

  allPos.forEach(p => {
    const st = p.status || 'Draft';
    if (!counts[st]) counts[st] = { count: 0, spend: 0 };
    counts[st].count++;
    counts[st].spend += p.totalAmount;
  });

  const totalCount = allPos.length || 1;
  const totalValue = allPos.reduce((a, b) => a + b.totalAmount, 0);
  const receivedCount = counts['Received']?.count || 0;
  const cancelledCount = counts['Cancelled']?.count || 0;
  const liveCount = allPos.filter(p => p.status !== 'Draft' && p.status !== 'Cancelled').length || 1;

  const pipeline = Object.entries(counts).map(([status, d]) => ({
    status,
    count: d.count,
    spend: d.spend,
    pct: (d.count / totalCount) * 100,
    avgSpend: d.count ? d.spend / d.count : 0
  }));

  return {
    totalCount: allPos.length,
    totalValue,
    fulfillmentRate: Number(((receivedCount / liveCount) * 100).toFixed(1)),
    cancellationRate: Number(((cancelledCount / totalCount) * 100).toFixed(1)),
    avgOrderValue: totalCount ? Math.round(totalValue / totalCount) : 0,
    pipeline
  };
}

export function supplierParetoCurve() {
  const vs = vendorSpend();
  const totalSpend = vs.reduce((acc, v) => acc + v.value, 0) || 1;
  let running = 0;

  return vs.map((v, idx) => {
    running += v.value;
    const cumPct = Number(((running / totalSpend) * 100).toFixed(1));
    return {
      rank: idx + 1,
      id: v.id,
      name: v.name,
      shortName: v.name.split(' ').slice(0, 2).join(' '),
      spend: v.value,
      share: Number(v.share.toFixed(1)),
      cumulativeShare: cumPct,
      isTop80: cumPct <= 80 || (idx > 0 && running - v.value < totalSpend * 0.8)
    };
  });
}

export function savingsOpportunityMatrix() {
  const savs = savings();
  const savMap = new Map(savs.map(s => [s.item, s.est]));
  const stats = itemStats();

  return stats
    .map(i => {
      const est = savMap.get(i.itemName) ?? 0;
      const savPct = i.spend ? Number(((est / i.spend) * 100).toFixed(1)) : 0;
      const spread = i.max - i.min;
      const spreadPct = i.min ? Number(((spread / i.min) * 100).toFixed(1)) : 0;

      let quadrant = 'Low Impact';
      if (i.spend >= 300000 && savPct >= 5) {
        quadrant = 'Priority / Quick Win';
      } else if (i.spend >= 300000 && savPct < 5) {
        quadrant = 'Strategic Volume';
      } else if (i.spend < 300000 && savPct >= 5) {
        quadrant = 'Spot Renegotiation';
      }

      return {
        itemId: i.itemId,
        itemName: i.itemName,
        category: i.category,
        spend: i.spend,
        estSavings: est,
        savingsPct: savPct,
        avgPrice: i.avg,
        minPrice: i.min,
        maxPrice: i.max,
        spread,
        spreadPct,
        vendorsCount: i.vendors,
        quadrant
      };
    })
    .sort((a, b) => b.estSavings - a.estSavings);
}

export function itemVolatilityRankings() {
  return items
    .map(item => {
      const itemLines = L.filter(l => l.itemId === item.itemId);
      if (itemLines.length < 2) return null;
      const prices = itemLines.map(l => l.unitPrice);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean ? (stdDev / mean) * 100 : 0;
      const min = Math.min(...prices);
      const max = Math.max(...prices);

      return {
        itemId: item.itemId,
        itemName: item.itemName,
        category: item.category,
        linesCount: itemLines.length,
        avgPrice: Math.round(mean),
        minPrice: min,
        maxPrice: max,
        spread: max - min,
        cv: Number(cv.toFixed(1)),
        volatilityLevel: (cv >= 15 ? 'High' : cv >= 8 ? 'Moderate' : 'Stable') as 'High' | 'Moderate' | 'Stable'
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.cv - a!.cv) as {
    itemId: string;
    itemName: string;
    category: string;
    linesCount: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    spread: number;
    cv: number;
    volatilityLevel: 'High' | 'Moderate' | 'Stable';
  }[];
}

// --- Asynchronous Backend API Endpoints ---

export interface DashboardOverviewData {
  kpis: { spend: number; orders: number; vendors: number; savings: number };
  monthly: { name: string; value: number }[];
  topVendors: { id: string; name: string; value: number; orders: number; share: number }[];
  frequentItems: (Item & { qty: number; spend: number; avg: number; min: number; max: number; vendors: number; lines: number })[];
  recentPOs: (PurchaseOrder & { vendorName: string })[];
  pipeline: ReturnType<typeof poStatusPipeline>;
  pareto: ReturnType<typeof supplierParetoCurve>;
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewData> {
  const localPipeline = poStatusPipeline();
  const localPareto = supplierParetoCurve();

  if (!API.mock) {
    try {
      const res = await http<DashboardOverviewData>('/api/dashboard/overview');
      return {
        ...res,
        pipeline: res.pipeline || localPipeline,
        pareto: res.pareto || localPareto
      };
    } catch (err) {
      console.warn('Backend overview fetch failed, using local simulation:', err);
    }
  }

  const m = monthly();
  return {
    kpis: kpis(),
    monthly: m,
    topVendors: vendorSpend().slice(0, 5),
    frequentItems: itemStats()
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 5),
    recentPOs: [...pos]
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
      .slice(0, 6)
      .map(o => ({ ...o, vendorName: vName(o.vendorId) })),
    pipeline: localPipeline,
    pareto: localPareto
  };
}

export async function fetchVendorsList(): Promise<Vendor[]> {
  if (!API.mock) {
    try {
      return await http<Vendor[]>('/api/vendors');
    } catch (err) {
      console.warn('Backend vendors fetch failed, using local:', err);
    }
  }
  return vendors;
}

export async function fetchItemsList(): Promise<Item[]> {
  if (!API.mock) {
    try {
      return await http<Item[]>('/api/items');
    } catch (err) {
      console.warn('Backend items fetch failed, using local:', err);
    }
  }
  return items;
}

export async function fetchPurchaseOrdersList(): Promise<(PurchaseOrder & { vendorName?: string })[]> {
  if (!API.mock) {
    try {
      return await http<(PurchaseOrder & { vendorName?: string })[]>('/api/purchase-orders');
    } catch (err) {
      console.warn('Backend POs fetch failed, using local:', err);
    }
  }
  return pos.map(p => ({ ...p, vendorName: vName(p.vendorId) }));
}

export async function fetchExpenditureData() {
  if (!API.mock) {
    try {
      return await http<{
        total: number;
        monthly: { name: string; value: number; mom: number }[];
        categorySpend: { name: string; value: number }[];
        topVendors: { id: string; name: string; value: number; orders: number; share: number }[];
      }>('/api/analytics/expenditure');
    } catch (err) {
      console.warn('Backend expenditure fetch failed, using local:', err);
    }
  }

  const m = monthly().map((x, i, a) => ({
    ...x,
    mom: i ? +(((x.value - a[i - 1].value) / a[i - 1].value) * 100).toFixed(1) : 0
  }));
  return {
    total: total(),
    monthly: m,
    categorySpend: categorySpend(),
    topVendors: vendorSpend().slice(0, 8)
  };
}

export async function fetchVendorComparisonData(v1: string, v2: string) {
  if (!API.mock) {
    try {
      return await http<{
        vendorA: { id: string; name: string; profile: ReturnType<typeof vendorProfile> };
        vendorB: { id: string; name: string; profile: ReturnType<typeof vendorProfile> };
        radar: { k: string; A: number; B: number }[];
      }>(`/api/analytics/vendor-comparison?v1=${v1}&v2=${v2}`);
    } catch (err) {
      console.warn('Backend vendor comparison fetch failed, using local:', err);
    }
  }

  const pa = vendorProfile(v1),
    pb = vendorProfile(v2);
  const mx = (x: number, y: number) => Math.max(x, y) || 1;
  const n = (k: 'spend' | 'orders' | 'variety') => [
    (pa[k] / mx(pa[k], pb[k])) * 100,
    (pb[k] / mx(pa[k], pb[k])) * 100
  ] as const;
  const comp = (i: number) => Math.max(0, Math.min(100, 50 + (1 - i) * 500)),
    cons = (c: number) => Math.max(0, Math.min(100, 100 - c * 600));

  const radar = [
    ['Spend', ...n('spend')],
    ['Orders', ...n('orders')],
    ['Item variety', ...n('variety')],
    ['Price competitiveness', comp(pa.idx), comp(pb.idx)],
    ['Price consistency', cons(pa.cv), cons(pb.cv)]
  ].map(([k, x, y]) => ({ k: String(k), A: Math.round(Number(x)), B: Math.round(Number(y)) }));

  return {
    vendorA: { id: v1, name: vName(v1), profile: pa },
    vendorB: { id: v2, name: vName(v2), profile: pb },
    radar
  };
}

export async function fetchPriceTrendsData(itemId: string) {
  if (!API.mock) {
    try {
      return await http<{
        selectedItem?: Item;
        items: ReturnType<typeof itemStats>;
        vendorPrices: ReturnType<typeof itemByVendor>;
        trend: ReturnType<typeof itemTrend>;
        savings: ReturnType<typeof savings>;
        priceChanges: ReturnType<typeof priceChanges>;
      }>(`/api/analytics/price-trends?itemId=${itemId}`);
    } catch (err) {
      console.warn('Backend price trends fetch failed, using local:', err);
    }
  }

  return {
    selectedItem: items.find(i => i.itemId === itemId),
    items: itemStats(),
    vendorPrices: itemByVendor(itemId).sort((a, b) => a.avg - b.avg),
    trend: itemTrend(itemId),
    savings: savings(),
    priceChanges: priceChanges()
  };
}
