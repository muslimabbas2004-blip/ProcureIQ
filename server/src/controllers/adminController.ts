import { Request, Response } from 'express';
import { store } from '../db/store.js';
import { Issue, Dataset, Vendor, Item, PurchaseOrder, PurchaseOrderLine, HistoricalPurchase, Quotation, POStatus } from '../types/index.js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const TYPES: Record<string, string[]> = {
  Vendors: ['vendorId', 'vendorName'],
  'Item Master': ['itemId', 'itemName'],
  'Purchase Orders': ['poId', 'vendorId', 'orderDate'],
  'PO Line Items': ['lineId', 'poId', 'itemId', 'quantity', 'unitPrice'],
  'Historical Purchases': ['purchaseId', 'vendorId', 'itemId', 'purchaseDate'],
  Quotations: ['quotationId', 'vendorId', 'itemId', 'quotedPrice'],
  'Goods Received': ['grnId', 'poId']
};

export function validateRows(type: string, rows: Record<string, unknown>[]): Issue[] {
  const req = TYPES[type];
  if (!req) return [{ row: 1, level: 'Error', msg: `Unknown dataset type "${type}".` }];

  const issues: Issue[] = [];
  const seen = new Set<string>();

  rows.forEach((r, i) => {
    req.forEach(k => {
      if (r[k] === undefined || r[k] === '' || r[k] === null) {
        issues.push({ row: i + 2, level: 'Error', msg: `Missing required field "${k}"` });
      }
    });

    Object.entries(r).forEach(([k, v]) => {
      if (/date/i.test(k) && v && isNaN(Date.parse(String(v)))) {
        issues.push({ row: i + 2, level: 'Error', msg: `Invalid date in "${k}"` });
      }
      if (
        /quantity|price|amount/i.test(k) &&
        v !== '' &&
        (isNaN(Number(v)) || Number(v) < 0)
      ) {
        issues.push({ row: i + 2, level: 'Error', msg: `Invalid number in "${k}"` });
      }
    });

    const key = String(r[req[0]]);
    if (seen.has(key)) {
      issues.push({ row: i + 2, level: 'Warning', msg: `Duplicate ${req[0]} "${key}"` });
    }
    seen.add(key);
  });

  return issues;
}

export function ingestRowsIntoStore(type: string, rows: Record<string, unknown>[]): number {
  let count = 0;

  if (type === 'Vendors') {
    const existingMap = new Map<string, number>();
    store.vendors.forEach((v, i) => existingMap.set(v.vendorId, i));

    rows.forEach(r => {
      const vid = String(r.vendorId || '').trim();
      const vname = String(r.vendorName || '').trim();
      if (vid && vname) {
        const vendorData: Vendor = {
          vendorId: vid,
          vendorName: vname,
          contactPerson: String(r.contactPerson || 'Purchasing Rep'),
          email: String(r.email || `contact@${vid.toLowerCase()}.pk`),
          phone: String(r.phone || '+92 300 0000000'),
          address: String(r.address || 'Pakistan'),
          status: (r.status === 'Inactive' ? 'Inactive' : 'Active')
        };
        const idx = existingMap.get(vid);
        if (idx !== undefined) {
          store.vendors[idx] = vendorData;
        } else {
          existingMap.set(vid, store.vendors.length);
          store.vendors.push(vendorData);
        }
        count++;
      }
    });
  } else if (type === 'Item Master') {
    const existingMap = new Map<string, number>();
    store.items.forEach((it, i) => existingMap.set(it.itemId, i));

    rows.forEach(r => {
      const itemId = String(r.itemId || '').trim();
      const itemName = String(r.itemName || '').trim();
      if (itemId && itemName) {
        const itemData: Item = {
          itemId,
          itemName,
          category: String(r.category || 'General Supplies'),
          description: String(r.description || itemName),
          unitOfMeasurement: String(r.unitOfMeasurement || r.unit || 'unit'),
          currency: 'PKR'
        };
        const idx = existingMap.get(itemId);
        if (idx !== undefined) {
          store.items[idx] = itemData;
        } else {
          existingMap.set(itemId, store.items.length);
          store.items.push(itemData);
        }
        count++;
      }
    });
  } else if (type === 'Purchase Orders') {
    const existingMap = new Map<string, number>();
    store.pos.forEach((p, i) => existingMap.set(p.poId, i));

    rows.forEach(r => {
      const poId = String(r.poId || '').trim();
      if (poId) {
        const poData: PurchaseOrder = {
          poId,
          vendorId: String(r.vendorId || store.vendors[0]?.vendorId || 'V001'),
          orderDate: String(r.orderDate || new Date().toISOString().slice(0, 10)),
          status: (r.status as POStatus) || 'Approved',
          totalAmount: Number(r.totalAmount || 0)
        };
        const idx = existingMap.get(poId);
        if (idx !== undefined) {
          store.pos[idx] = poData;
        } else {
          existingMap.set(poId, store.pos.length);
          store.pos.push(poData);
        }
        count++;
      }
    });
  } else if (type === 'PO Line Items') {
    const existingMap = new Map<string, number>();
    store.lines.forEach((l, i) => existingMap.set(l.lineId, i));

    rows.forEach(r => {
      const lineId = String(r.lineId || '').trim();
      if (lineId) {
        const qty = Number(r.quantity || 1);
        const price = Number(r.unitPrice || 0);
        const lineTotal = Number(r.lineTotal || (qty * price));
        const lineData: PurchaseOrderLine = {
          lineId,
          poId: String(r.poId || ''),
          itemId: String(r.itemId || ''),
          quantity: qty,
          unitPrice: price,
          lineTotal
        };
        const idx = existingMap.get(lineId);
        if (idx !== undefined) {
          store.lines[idx] = lineData;
        } else {
          existingMap.set(lineId, store.lines.length);
          store.lines.push(lineData);
        }
        count++;
      }
    });
  } else if (type === 'Historical Purchases') {
    const existingMap = new Map<string, number>();
    store.historical.forEach((h, i) => existingMap.set(h.purchaseId, i));

    rows.forEach(r => {
      const purchaseId = String(r.purchaseId || '').trim();
      if (purchaseId) {
        const qty = Number(r.quantity || 1);
        const price = Number(r.unitPrice || 0);
        const histData: HistoricalPurchase = {
          purchaseId,
          vendorId: String(r.vendorId || ''),
          itemId: String(r.itemId || ''),
          purchaseDate: String(r.purchaseDate || new Date().toISOString().slice(0, 10)),
          quantity: qty,
          unitPrice: price,
          totalAmount: Number(r.totalAmount || (qty * price))
        };
        const idx = existingMap.get(purchaseId);
        if (idx !== undefined) {
          store.historical[idx] = histData;
        } else {
          existingMap.set(purchaseId, store.historical.length);
          store.historical.push(histData);
        }
        count++;
      }
    });
  } else if (type === 'Quotations') {
    const existingMap = new Map<string, number>();
    store.quotations.forEach((q, i) => existingMap.set(q.quotationId, i));

    rows.forEach(r => {
      const quotationId = String(r.quotationId || '').trim();
      if (quotationId) {
        const qData: Quotation = {
          quotationId,
          vendorId: String(r.vendorId || ''),
          itemId: String(r.itemId || ''),
          quotedPrice: Number(r.quotedPrice || 0),
          quotationDate: String(r.quotationDate || new Date().toISOString().slice(0, 10)),
          validityDate: String(r.validityDate || new Date().toISOString().slice(0, 10))
        };
        const idx = existingMap.get(quotationId);
        if (idx !== undefined) {
          store.quotations[idx] = qData;
        } else {
          existingMap.set(quotationId, store.quotations.length);
          store.quotations.push(qData);
        }
        count++;
      }
    });
  }

  store.saveToDisk();
  return count;
}

export const validateDataset = (req: Request, res: Response) => {
  const { type, rows } = req.body;
  if (!type || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'type and rows array are required.' });
  }

  const issues = validateRows(type, rows);
  return res.json({ issues, totalRows: rows.length, valid: issues.filter(i => i.level === 'Error').length === 0 });
};

export const uploadDataset = (req: Request, res: Response) => {
  let { name, type, rows, by } = req.body;

  if (req.file) {
    name = req.file.originalname;
    const ext = name.split('.').pop()?.toLowerCase();
    type = req.body.type || 'Vendors';
    by = req.body.by || req.cookies?.piq_user || 'admin@demo.com';

    try {
      if (ext === 'csv') {
        const text = req.file.buffer.toString('utf-8');
        const parsed = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true
        });
        rows = parsed.data;
      } else if (ext === 'xlsx' || ext === 'xls') {
        const xlsxLib = (XLSX as any).default || XLSX;
        const wb = xlsxLib.read(req.file.buffer, { type: 'buffer' });
        rows = xlsxLib.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, unknown>[];
      } else {
        return res.status(400).json({ error: 'Unsupported file format.' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Failed to parse file: ' + (err as Error).message });
    }
  }

  if (!type || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'Valid dataset type and rows are required.' });
  }

  const issues = validateRows(type, rows);
  const errorCount = issues.filter(i => i.level === 'Error').length;
  if (errorCount > 0) {
    return res.status(422).json({
      error: `Validation failed with ${errorCount} error(s). Please fix before importing.`,
      issues
    });
  }

  const newDataset: Dataset = {
    id: 'ds-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    name: name || `${type}-import-${new Date().toISOString().slice(0, 10)}.csv`,
    type,
    date: new Date().toISOString().slice(0, 10),
    by: by || req.cookies?.piq_user || 'admin@demo.com',
    records: rows.length,
    status: 'Imported to database',
    rows: rows.slice(0, 200)
  };

  store.datasets.unshift(newDataset);
  const ingested = ingestRowsIntoStore(type, rows);

  return res.status(201).json({
    success: true,
    dataset: newDataset,
    ingestedRecords: ingested,
    issues
  });
};

export const batchUploadDatasets = (req: Request, res: Response) => {
  const { datasets } = req.body;
  if (!Array.isArray(datasets) || datasets.length === 0) {
    return res.status(400).json({ error: 'Array of datasets is required.' });
  }

  const results: { name: string; type: string; records: number; status: string; error?: string }[] = [];
  let totalIngested = 0;

  for (const item of datasets) {
    const { name, type, rows, by } = item;
    if (!type || !Array.isArray(rows)) {
      results.push({ name: name || 'Unknown', type: type || 'Unknown', records: 0, status: 'Failed', error: 'Missing type or rows' });
      continue;
    }

    const issues = validateRows(type, rows);
    const errors = issues.filter(i => i.level === 'Error');
    if (errors.length > 0) {
      results.push({
        name: name || `${type}.csv`,
        type,
        records: rows.length,
        status: 'Rejected',
        error: `${errors.length} validation error(s)`
      });
      continue;
    }

    const newDataset: Dataset = {
      id: 'ds-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: name || `${type}-import.csv`,
      type,
      date: new Date().toISOString().slice(0, 10),
      by: by || req.cookies?.piq_user || 'admin@demo.com',
      records: rows.length,
      status: 'Imported to database',
      rows: rows.slice(0, 200)
    };

    store.datasets.unshift(newDataset);
    const count = ingestRowsIntoStore(type, rows);
    totalIngested += count;

    results.push({
      name: newDataset.name,
      type,
      records: count,
      status: 'Imported'
    });
  }

  return res.status(201).json({
    success: true,
    totalIngested,
    results
  });
};

export const getAdminStats = (_req: Request, res: Response) => {
  return res.json({
    vendors: store.vendors.length,
    activeVendors: store.vendors.filter(v => v.status === 'Active').length,
    items: store.items.length,
    pos: store.pos.length,
    lines: store.lines.length,
    datasets: store.datasets.length,
    totalSpend: store.getTotalSpend()
  });
};

export const getDatasets = (_req: Request, res: Response) => {
  return res.json(store.datasets);
};

export const deleteDataset = (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = store.datasets.length;
  store.datasets = store.datasets.filter(d => d.id !== id);
  if (store.datasets.length === initialLen) {
    return res.status(404).json({ error: 'Dataset not found.' });
  }
  store.saveToDisk();
  return res.json({ success: true });
};

export const getUsers = (_req: Request, res: Response) => {
  return res.json(store.users);
};
