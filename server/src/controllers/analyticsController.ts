import { Request, Response } from 'express';
import { store } from '../db/store.js';

export const getExpenditure = (_req: Request, res: Response) => {
  const monthly = store.getMonthlySpend().map((x, i, arr) => ({
    ...x,
    mom: i ? +(((x.value - arr[i - 1].value) / arr[i - 1].value) * 100).toFixed(1) : 0
  }));
  const categorySpend = store.getCategorySpend();
  const topVendors = store
    .getVendorSpend()
    .slice(0, 10)
    .map(v => ({
      ...v,
      value: Math.round(v.value)
    }));

  return res.json({
    total: store.getTotalSpend(),
    monthly,
    categorySpend,
    topVendors
  });
};

export const getVendorComparison = (req: Request, res: Response) => {
  const { v1, v2 } = req.query;
  const vendorA = String(v1 ?? store.vendors[0]?.vendorId ?? '');
  const vendorB = String(v2 ?? store.vendors[1]?.vendorId ?? '');

  const profileA = store.getVendorProfile(vendorA);
  const profileB = store.getVendorProfile(vendorB);

  const maxVal = (x: number, y: number) => Math.max(x, y) || 1;
  const norm = (key: 'spend' | 'orders' | 'variety') => [
    (profileA[key] / maxVal(profileA[key], profileB[key])) * 100,
    (profileB[key] / maxVal(profileA[key], profileB[key])) * 100
  ];

  const comp = (i: number) => Math.max(0, Math.min(100, 50 + (1 - i) * 500));
  const cons = (c: number) => Math.max(0, Math.min(100, 100 - c * 600));

  const radar = [
    ['Spend', ...norm('spend')],
    ['Orders', ...norm('orders')],
    ['Item variety', ...norm('variety')],
    ['Price competitiveness', comp(profileA.idx), comp(profileB.idx)],
    ['Price consistency', cons(profileA.cv), cons(profileB.cv)]
  ].map(([k, x, y]) => ({
    k: String(k),
    A: Math.round(Number(x)),
    B: Math.round(Number(y))
  }));

  return res.json({
    vendorA: {
      id: vendorA,
      name: store.getVendorName(vendorA),
      profile: profileA
    },
    vendorB: {
      id: vendorB,
      name: store.getVendorName(vendorB),
      profile: profileB
    },
    radar
  });
};

export const getPriceTrends = (req: Request, res: Response) => {
  const { itemId } = req.query;
  const id = String(itemId ?? store.items[0]?.itemId ?? '');

  const item = store.items.find(i => i.itemId === id);
  const itemStats = store.getItemStats(true);
  const vendorPrices = store.getItemByVendor(id).sort((a, b) => a.avg - b.avg);
  const trend = store.getItemTrend(id);
  const savings = store.getSavings();
  const priceChanges = store.getPriceChanges();

  return res.json({
    selectedItem: item,
    items: itemStats,
    vendorPrices,
    trend,
    savings,
    priceChanges
  });
};
