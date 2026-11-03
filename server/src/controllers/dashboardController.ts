import { Request, Response } from 'express';
import { store } from '../db/store.js';

export const getDashboardOverview = (_req: Request, res: Response) => {
  const kpis = store.getKPIs();
  const monthly = store.getMonthlySpend();
  const topVendors = store.getVendorSpend().slice(0, 5);
  const frequentItems = store
    .getItemStats()
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5);

  const recentPOs = [...store.pos]
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .slice(0, 6)
    .map(po => ({
      ...po,
      vendorName: store.getVendorName(po.vendorId)
    }));

  const counts: Record<string, { count: number; spend: number }> = {
    Received: { count: 0, spend: 0 },
    Ordered: { count: 0, spend: 0 },
    Approved: { count: 0, spend: 0 },
    Pending: { count: 0, spend: 0 },
    Draft: { count: 0, spend: 0 },
    Cancelled: { count: 0, spend: 0 }
  };
  store.pos.forEach(p => {
    const st = p.status || 'Draft';
    if (!counts[st]) counts[st] = { count: 0, spend: 0 };
    counts[st].count++;
    counts[st].spend += p.totalAmount;
  });
  const totalCount = store.pos.length || 1;
  const totalValue = store.pos.reduce((a, b) => a + b.totalAmount, 0);
  const receivedCount = counts['Received']?.count || 0;
  const cancelledCount = counts['Cancelled']?.count || 0;
  const liveCount = store.pos.filter(p => p.status !== 'Draft' && p.status !== 'Cancelled').length || 1;

  const pipeline = {
    totalCount: store.pos.length,
    totalValue,
    fulfillmentRate: Number(((receivedCount / liveCount) * 100).toFixed(1)),
    cancellationRate: Number(((cancelledCount / totalCount) * 100).toFixed(1)),
    avgOrderValue: totalCount ? Math.round(totalValue / totalCount) : 0,
    pipeline: Object.entries(counts).map(([status, d]) => ({
      status,
      count: d.count,
      spend: d.spend,
      pct: (d.count / totalCount) * 100,
      avgSpend: d.count ? d.spend / d.count : 0
    }))
  };

  const vs = store.getVendorSpend();
  const totalSpend = vs.reduce((acc, v) => acc + v.value, 0) || 1;
  let running = 0;
  const pareto = vs.map((v, idx) => {
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

  return res.json({
    kpis,
    monthly,
    topVendors,
    frequentItems,
    recentPOs,
    pipeline,
    pareto
  });
};
