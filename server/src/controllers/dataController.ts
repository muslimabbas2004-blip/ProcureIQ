import { sendPage } from './pagination.js';
import { Request, Response } from 'express';
import { store } from '../db/store.js';

export const getVendors = (req: Request, res: Response) => {
  const vendorSpendMap = new Map(store.getVendorSpend().map(s => [s.id, s]));
  const vendorsWithStats = store.vendors.map(v => {
    const stat = vendorSpendMap.get(v.vendorId);
    return {
      ...v,
      totalSpend: stat?.value ?? 0,
      orderCount: stat?.orders ?? 0,
      share: stat?.share ?? 0
    };
  });
  return sendPage(req, res, vendorsWithStats, ['vendorId','vendorName','status','totalSpend','orderCount','share'], 'vendorId');
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

export const getItems = (req: Request, res: Response) => {
  const stats = store.getItemStats(false);
  return sendPage(req, res, stats, ['itemId','itemName','category','unitOfMeasurement','qty','avg','spend','vendors'], 'itemId');
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

export const getPurchaseOrders = (req: Request, res: Response) => {
  const posWithVendor = store.pos.map(p => ({
    ...p,
    vendorName: store.getVendorName(p.vendorId)
  }));
  return sendPage(req, res, posWithVendor, ['poId','orderDate','vendorName','totalAmount','status'], 'poId');
};
