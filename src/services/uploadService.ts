import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { API, http } from './api';

export const TYPES: Record<string, string[]> = {
  Vendors: ['vendorId', 'vendorName'],
  'Item Master': ['itemId', 'itemName'],
  'Purchase Orders': ['poId', 'vendorId', 'orderDate'],
  'PO Line Items': ['lineId', 'poId', 'itemId', 'quantity', 'unitPrice'],
  'Historical Purchases': ['purchaseId', 'vendorId', 'itemId', 'purchaseDate'],
  Quotations: ['quotationId', 'vendorId', 'itemId', 'quotedPrice'],
  'Goods Received': ['grnId', 'poId']
};

export type Row = Record<string, unknown>;

export const SAMPLE_TEMPLATES: Record<string, Record<string, unknown>[]> = {
  Vendors: [
    {
      vendorId: 'V101',
      vendorName: 'Apex Industrial Solutions',
      contactPerson: 'Zubair Qureshi',
      email: 'sales@apexindustrial.pk',
      phone: '+92 300 4567890',
      address: 'Plot 45, Korangi Industrial Area, Karachi',
      status: 'Active'
    },
    {
      vendorId: 'V102',
      vendorName: 'Punjab Allied Chemicals',
      contactPerson: 'Fatima Noor',
      email: 'orders@punjaballied.pk',
      phone: '+92 321 9876543',
      address: '22 Multan Road, Lahore',
      status: 'Active'
    },
    {
      vendorId: 'V103',
      vendorName: 'National Logistics Hub',
      contactPerson: 'Kashif Mehmood',
      email: 'info@nationallogistics.pk',
      phone: '+92 333 1122334',
      address: 'Port Qasim Industrial Zone, Karachi',
      status: 'Inactive'
    }
  ],
  'Item Master': [
    {
      itemId: 'I101',
      itemName: 'Stainless Steel Sheet 2mm',
      category: 'Raw Materials',
      description: 'Grade 304 2mm cold-rolled sheet',
      unitOfMeasurement: 'kg',
      currency: 'PKR'
    },
    {
      itemId: 'I102',
      itemName: 'Heavy Duty Pallet Wrap',
      category: 'Packaging Materials',
      description: '500mm x 300m 23 micron stretch film roll',
      unitOfMeasurement: 'roll',
      currency: 'PKR'
    },
    {
      itemId: 'I103',
      itemName: 'Industrial Safety Helmets',
      category: 'Office Supplies',
      description: 'EN 397 Certified HDPE hard hats',
      unitOfMeasurement: 'pc',
      currency: 'PKR'
    }
  ],
  'Purchase Orders': [
    {
      poId: 'PO-2026-0501',
      vendorId: 'V101',
      orderDate: '2026-02-15',
      status: 'Approved',
      totalAmount: 485000
    },
    {
      poId: 'PO-2026-0502',
      vendorId: 'V102',
      orderDate: '2026-02-18',
      status: 'Received',
      totalAmount: 1250000
    },
    {
      poId: 'PO-2026-0503',
      vendorId: 'V101',
      orderDate: '2026-02-20',
      status: 'Pending',
      totalAmount: 320000
    }
  ],
  'PO Line Items': [
    {
      lineId: 'L501-1',
      poId: 'PO-2026-0501',
      itemId: 'I101',
      quantity: 500,
      unitPrice: 970,
      lineTotal: 485000
    },
    {
      lineId: 'L502-1',
      poId: 'PO-2026-0502',
      itemId: 'I102',
      quantity: 800,
      unitPrice: 1562.5,
      lineTotal: 1250000
    }
  ],
  'Historical Purchases': [
    {
      purchaseId: 'H-2025-101',
      vendorId: 'V101',
      itemId: 'I101',
      purchaseDate: '2025-11-20',
      quantity: 400,
      unitPrice: 940,
      totalAmount: 376000
    },
    {
      purchaseId: 'H-2025-102',
      vendorId: 'V102',
      itemId: 'I102',
      purchaseDate: '2025-12-05',
      quantity: 600,
      unitPrice: 1500,
      totalAmount: 900000
    }
  ],
  Quotations: [
    {
      quotationId: 'Q-2026-081',
      vendorId: 'V101',
      itemId: 'I101',
      quotedPrice: 935,
      quotationDate: '2026-01-10',
      validityDate: '2026-03-31'
    },
    {
      quotationId: 'Q-2026-082',
      vendorId: 'V102',
      itemId: 'I102',
      quotedPrice: 1480,
      quotationDate: '2026-01-12',
      validityDate: '2026-03-15'
    }
  ],
  'Goods Received': [
    {
      grnId: 'GRN-2026-001',
      poId: 'PO-2026-0502',
      receivedDate: '2026-02-25',
      receivedBy: 'Tariq Mehmood',
      remarks: 'Inspected and verified in warehouse'
    }
  ]
};

export function downloadSampleExcelTemplate(type: string) {
  const data = SAMPLE_TEMPLATES[type] || SAMPLE_TEMPLATES['Vendors'];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  const sheetName = type.replace(/[^a-zA-Z0-9]/g, '').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const fileName = `ProcureIQ_Template_${type.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Header alias mappings to tolerate slight naming differences in user files
const HEADER_ALIASES: Record<string, string> = {
  vendor_id: 'vendorId',
  vendorid: 'vendorId',
  'vendor id': 'vendorId',
  supplier_id: 'vendorId',
  supplierid: 'vendorId',
  'supplier id': 'vendorId',
  vendor_name: 'vendorName',
  vendorname: 'vendorName',
  'vendor name': 'vendorName',
  supplier_name: 'vendorName',
  suppliername: 'vendorName',
  'supplier name': 'vendorName',
  item_id: 'itemId',
  itemid: 'itemId',
  'item id': 'itemId',
  item_code: 'itemId',
  itemcode: 'itemId',
  'item code': 'itemId',
  material_id: 'itemId',
  item_name: 'itemName',
  itemname: 'itemName',
  'item name': 'itemName',
  material_name: 'itemName',
  product_name: 'itemName',
  description: 'description',
  category: 'category',
  unit: 'unitOfMeasurement',
  unit_of_measurement: 'unitOfMeasurement',
  unitofmeasurement: 'unitOfMeasurement',
  uom: 'unitOfMeasurement',
  po_id: 'poId',
  poid: 'poId',
  'po id': 'poId',
  po_number: 'poId',
  'po number': 'poId',
  ponumber: 'poId',
  order_id: 'poId',
  order_date: 'orderDate',
  orderdate: 'orderDate',
  'order date': 'orderDate',
  po_date: 'orderDate',
  total_amount: 'totalAmount',
  totalamount: 'totalAmount',
  'total amount': 'totalAmount',
  total: 'totalAmount',
  status: 'status',
  line_id: 'lineId',
  lineid: 'lineId',
  'line id': 'lineId',
  quantity: 'quantity',
  qty: 'quantity',
  unit_price: 'unitPrice',
  unitprice: 'unitPrice',
  'unit price': 'unitPrice',
  price: 'unitPrice',
  rate: 'unitPrice',
  line_total: 'lineTotal',
  linetotal: 'lineTotal',
  'line total': 'lineTotal',
  purchase_id: 'purchaseId',
  purchaseid: 'purchaseId',
  'purchase id': 'purchaseId',
  purchase_date: 'purchaseDate',
  purchasedate: 'purchaseDate',
  'purchase date': 'purchaseDate',
  quotation_id: 'quotationId',
  quotationid: 'quotationId',
  'quotation id': 'quotationId',
  quoted_price: 'quotedPrice',
  quotedprice: 'quotedPrice',
  'quoted price': 'quotedPrice',
  quotation_date: 'quotationDate',
  validity_date: 'validityDate'
};

export function normalizeHeaders(rows: Row[]): Row[] {
  if (!rows || rows.length === 0) return rows;
  return rows.map(r => {
    const normalized: Row = {};
    for (const [key, value] of Object.entries(r)) {
      const cleanKey = key.trim();
      const lookup = cleanKey.toLowerCase().replace(/[_\s-]+/g, ' ');
      const direct = cleanKey.toLowerCase().replace(/[_\s-]+/g, '_');
      const target = HEADER_ALIASES[lookup] || HEADER_ALIASES[direct] || HEADER_ALIASES[cleanKey.toLowerCase()] || cleanKey;
      normalized[target] = value;
    }
    return normalized;
  });
}

export function detectDatasetType(rows: Row[], fileName?: string): { detectedType: string; confidence: number } {
  if (!rows || rows.length === 0) {
    if (fileName) {
      const f = fileName.toLowerCase();
      if (/vendor|supplier/i.test(f)) return { detectedType: 'Vendors', confidence: 0.7 };
      if (/item|material|product/i.test(f)) return { detectedType: 'Item Master', confidence: 0.7 };
      if (/line/i.test(f)) return { detectedType: 'PO Line Items', confidence: 0.7 };
      if (/order|po/i.test(f)) return { detectedType: 'Purchase Orders', confidence: 0.7 };
      if (/quote|quotation/i.test(f)) return { detectedType: 'Quotations', confidence: 0.7 };
      if (/hist/i.test(f)) return { detectedType: 'Historical Purchases', confidence: 0.7 };
    }
    return { detectedType: 'Vendors', confidence: 0.4 };
  }

  const sample = rows[0];
  const keys = new Set(Object.keys(sample).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const fn = (fileName || '').toLowerCase();

  // 1. PO Line Items: lineId or poId+itemId+quantity+unitPrice
  if (keys.has('lineid') || (keys.has('poid') && keys.has('itemid') && (keys.has('quantity') || keys.has('qty')) && (keys.has('unitprice') || keys.has('price')))) {
    return { detectedType: 'PO Line Items', confidence: 0.95 };
  }

  // 2. Quotations: quotationId or quotedPrice
  if (keys.has('quotationid') || (keys.has('quotedprice') && keys.has('vendorid'))) {
    return { detectedType: 'Quotations', confidence: 0.95 };
  }

  // 3. Historical Purchases: purchaseId or (purchaseDate && totalAmount)
  if (keys.has('purchaseid') || (keys.has('purchasedate') && keys.has('totalamount'))) {
    return { detectedType: 'Historical Purchases', confidence: 0.95 };
  }

  // 4. Goods Received: grnId
  if (keys.has('grnid')) {
    return { detectedType: 'Goods Received', confidence: 0.95 };
  }

  // 5. Vendors: vendorId and vendorName (or supplier)
  if ((keys.has('vendorid') && keys.has('vendorname')) || (keys.has('vendorname') && (keys.has('email') || keys.has('phone') || keys.has('address')))) {
    return { detectedType: 'Vendors', confidence: 0.95 };
  }

  // 6. Item Master: itemId and itemName (or category + unitOfMeasurement)
  if ((keys.has('itemid') && keys.has('itemname')) || (keys.has('itemname') && (keys.has('category') || keys.has('unitofmeasurement') || keys.has('uom')))) {
    return { detectedType: 'Item Master', confidence: 0.95 };
  }

  // 7. Purchase Orders: poId and (orderDate or status or totalAmount)
  if (keys.has('poid') && (keys.has('orderdate') || keys.has('status') || keys.has('totalamount') || keys.has('vendorid'))) {
    return { detectedType: 'Purchase Orders', confidence: 0.9 };
  }

  // Check filename fallbacks
  if (/vendor|supplier/i.test(fn)) return { detectedType: 'Vendors', confidence: 0.8 };
  if (/item|material|product/i.test(fn)) return { detectedType: 'Item Master', confidence: 0.8 };
  if (/line/i.test(fn)) return { detectedType: 'PO Line Items', confidence: 0.8 };
  if (/order|po/i.test(fn)) return { detectedType: 'Purchase Orders', confidence: 0.8 };
  if (/quote/i.test(fn)) return { detectedType: 'Quotations', confidence: 0.8 };

  return { detectedType: 'Vendors', confidence: 0.5 };
}

export async function parseFile(f: File): Promise<Row[]> {
  if (f.size > 10 * 1024 * 1024) throw new Error(`"${f.name}" exceeds 10 MB limit.`);
  const ext = f.name.split('.').pop()?.toLowerCase();
  let raw: Row[];

  if (ext === 'csv') {
    raw = await new Promise((res, rej) =>
      Papa.parse<Row>(f, { header: true, skipEmptyLines: true, complete: r => res(r.data), error: e => rej(e) })
    );
  } else if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellFormula: false });
    raw = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]]);
  } else {
    throw new Error(`File "${f.name}" has an unsupported format. Please use .csv, .xls, or .xlsx.`);
  }

  return normalizeHeaders(raw);
}

export interface StagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  rows: Row[];
  detectedType: string;
  confidence: number;
  issues: Issue[];
  valid: boolean;
  status: 'pending' | 'uploading' | 'imported' | 'error';
  errorMsg?: string;
}

export async function parseMultipleFiles(files: FileList | File[]): Promise<StagedFile[]> {
  const fileArray = Array.from(files);
  const results = await Promise.all(
    fileArray.map(async (file, idx) => {
      try {
        const rows = await parseFile(file);
        const { detectedType, confidence } = detectDatasetType(rows, file.name);
        const issues = validate(detectedType, rows);
        const errors = issues.filter(i => i.level === 'Error');
        return {
          id: `file-${Date.now()}-${idx}`,
          file,
          name: file.name,
          size: file.size,
          rows,
          detectedType,
          confidence,
          issues,
          valid: errors.length === 0,
          status: 'pending' as const
        };
      } catch (err) {
        return {
          id: `file-${Date.now()}-${idx}`,
          file,
          name: file.name,
          size: file.size,
          rows: [],
          detectedType: 'Vendors',
          confidence: 0,
          issues: [{ row: 1, level: 'Error' as const, msg: (err as Error).message }],
          valid: false,
          status: 'error' as const,
          errorMsg: (err as Error).message
        };
      }
    })
  );
  return results;
}

export interface Issue {
  row: number;
  level: 'Error' | 'Warning';
  msg: string;
}

export function validate(type: string, rows: Row[]): Issue[] {
  const req = TYPES[type];
  const out: Issue[] = [];
  const seen = new Set<string>();
  if (!req) return [{ row: 1, level: 'Error', msg: `Unknown dataset type "${type}".` }];

  rows.forEach((r, i) => {
    req.forEach(k => {
      if (r[k] === undefined || r[k] === '' || r[k] === null) {
        out.push({ row: i + 2, level: 'Error', msg: `Missing required field "${k}"` });
      }
    });

    Object.entries(r).forEach(([k, v]) => {
      if (/date/i.test(k) && v && isNaN(Date.parse(String(v)))) {
        out.push({ row: i + 2, level: 'Error', msg: `Invalid date in "${k}"` });
      }
      if (
        /quantity|price|amount/i.test(k) &&
        v !== '' &&
        (isNaN(Number(v)) || Number(v) < 0)
      ) {
        out.push({ row: i + 2, level: 'Error', msg: `Invalid number in "${k}"` });
      }
    });

    const key = String(r[req[0]]);
    if (seen.has(key)) out.push({ row: i + 2, level: 'Warning', msg: `Duplicate ${req[0]} "${key}"` });
    seen.add(key);
  });
  return out;
}

export interface Dataset {
  id: string;
  name: string;
  type: string;
  date: string;
  by: string;
  records: number;
  status: string;
  rows: Row[];
}

export interface AdminStats {
  vendors: number;
  activeVendors: number;
  items: number;
  pos: number;
  lines: number;
  datasets: number;
  totalSpend: number;
}

const K = 'procureiq.datasets';

export const listDatasets = (): Dataset[] => {
  try {
    return JSON.parse(localStorage.getItem(K) ?? '[]');
  } catch {
    return [];
  }
};

export const saveDataset = (d: Dataset) =>
  localStorage.setItem(
    K,
    JSON.stringify([d, ...listDatasets()].map(x => ({ ...x, rows: x.rows.slice(0, 200) })))
  );

export const deleteDataset = (id: string) =>
  localStorage.setItem(K, JSON.stringify(listDatasets().filter(d => d.id !== id)));

// --- Backend API Integration methods ---

export async function fetchDatasets(): Promise<Dataset[]> {
  if (!API.mock) {
    try {
      return await http<Dataset[]>('/api/admin/datasets');
    } catch (err) {
      throw err;
    }
  }
  return listDatasets();
}

export async function fetchAdminStats(): Promise<AdminStats> {
  if (!API.mock) {
    try {
      return await http<AdminStats>('/api/admin/stats');
    } catch (err) {
      throw err;
    }
  }
  const ds = listDatasets();
  return {
    vendors: 15,
    activeVendors: 14,
    items: 30,
    pos: 100,
    lines: 200,
    datasets: ds.length,
    totalSpend: 64043517
  };
}

export async function validateDatasetApi(type: string, rows: Row[]): Promise<{ issues: Issue[]; valid: boolean }> {
  if (!API.mock) {
    try {
      return await http<{ issues: Issue[]; valid: boolean }>('/api/admin/datasets/validate', {
        method: 'POST',
        body: JSON.stringify({ type, rows })
      });
    } catch (err) {
      console.warn('Backend validation failed, using client validation:', err);
    }
  }
  const issues = validate(type, rows);
  return { issues, valid: issues.filter(i => i.level === 'Error').length === 0 };
}

export async function uploadDatasetApi(dataset: Dataset, file?: File): Promise<Dataset> {
  if (!API.mock) {
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', dataset.type);
        formData.append('by', dataset.by);
        const res = await http<{ success: boolean; dataset: Dataset }>('/api/admin/datasets/upload', {
          method: 'POST',
          body: formData
        });
        return res.dataset;
      } else {
        const res = await http<{ success: boolean; dataset: Dataset }>('/api/admin/datasets/upload', {
          method: 'POST',
          body: JSON.stringify(dataset)
        });
        return res.dataset;
      }
    } catch (err) {
      throw err;
    }
  }

  saveDataset(dataset);
  return dataset;
}

export async function batchUploadDatasetsApi(datasets: { name: string; type: string; rows: Row[]; by?: string }[]): Promise<{ success: boolean; totalIngested: number; results?: { name: string; status: string; error?: string }[] }> {
  if (!API.mock) {
    try {
      return await http<{ success: boolean; totalIngested: number; results?: { name: string; status: string; error?: string }[] }>('/api/admin/datasets/batch-upload', {
        method: 'POST',
        body: JSON.stringify({ datasets })
      });
    } catch (err) {
      throw err;
    }
  }

  datasets.forEach(d => {
    saveDataset({
      id: 'ds-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: d.name,
      type: d.type,
      date: new Date().toISOString().slice(0, 10),
      by: d.by || 'admin@demo.com',
      records: d.rows.length,
      status: 'Imported (mock mode)',
      rows: d.rows
    });
  });

  return { success: true, totalIngested: datasets.reduce((a, b) => a + b.rows.length, 0) };
}

export async function removeDatasetApi(id: string): Promise<void> {
  if (!API.mock) {
    try {
      await http(`/api/admin/datasets/${id}`, { method: 'DELETE' });
      return;
    } catch (err) {
      throw err;
    }
  }
  deleteDataset(id);
}
