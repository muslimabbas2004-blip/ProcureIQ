import { Request, Response } from 'express';
import { store } from '../db/store.js';

export const getVendors = (_req: Request, res: Response) => {
  const vendorSpendMap = store.getVendorSpend();
  const vendorsWithStats = store.vendors.map(v => {
    const stat = vendorSpendMap.find(s => s.id === v.vendorId);
    return {
      ...v,
      totalSpend: stat?.value ?? 0,
      orderCount: stat?.orders ?? 0,
      share: stat?.share ?? 0
    };
  });
  return res.json(vendorsWithStats);
};

export const getVendorById = (req: Request, res: Response) => {
  const { id } = req.params;
  const vendor = store.vendors.find(v => v.vendorId === id);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' });
  }
  const profile = store.getVendorProfile(id);
  return res.json({
    ...vendor,
    profile
  });
};

export const getItems = (_req: Request, res: Response) => {
  const stats = store.getItemStats(false);
  return res.json(stats);
};

export const getItemById = (req: Request, res: Response) => {
  const { id } = req.params;
  const item = store.items.find(i => i.itemId === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  const vendorComparison = store.getItemByVendor(id);
  const trend = store.getItemTrend(id);
  return res.json({
    ...item,
    vendorComparison,
    trend
  });
};

export const getPurchaseOrders = (_req: Request, res: Response) => {
  const posWithVendor = store.pos.map(p => ({
    ...p,
    vendorName: store.getVendorName(p.vendorId)
  }));
  return res.json(posWithVendor);
};
