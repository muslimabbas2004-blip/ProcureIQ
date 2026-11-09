import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import {
  Vendor,
  Item,
  PurchaseOrder,
  PurchaseOrderLine,
  Quotation,
  HistoricalPurchase,
  POStatus,
  User,
  Dataset,
  AiAnswer
} from '../types/index.js';

// Seeded pseudorandom generator for deterministic, realistic initial data
let seed = 42;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const vendorNames = [
  'Karachi Steel Mills',
  'Lahore Cement Traders',
  'Faisalabad Packaging Co',
  'Sialkot Industrial Supplies',
  'Islamabad Office Mart',
  'Gadoon Chemicals',
  'Multan Electricals',
  'Port Qasim Logistics',
  'Peshawar Machinery House',
  'Rawalpindi Spare Parts',
  'Hyderabad Poly Pack',
  'Quetta Minerals',
  'Sukkur Oil & Lubricants',
  'Gujranwala Cables',
  'Korangi Fasteners'
];

const cities = [
  'Karachi',
  'Lahore',
  'Faisalabad',
  'Sialkot',
  'Islamabad',
  'Gadoon',
  'Multan',
  'Port Qasim',
  'Peshawar',
  'Rawalpindi',
  'Hyderabad',
  'Quetta',
  'Sukkur',
  'Gujranwala',
  'Korangi'
];

const rawItems: [string, string, string, number][] = [
  ['Steel Rod 12mm', 'Raw Materials', 'kg', 245],
  ['Cement OPC 50kg', 'Raw Materials', 'bag', 1280],
  ['Aluminium Sheet', 'Raw Materials', 'kg', 720],
  ['Copper Wire', 'Electrical Supplies', 'kg', 2650],
  ['PVC Granules', 'Raw Materials', 'kg', 310],
  ['Corrugated Box L', 'Packaging Materials', 'pc', 85],
  ['Stretch Film', 'Packaging Materials', 'roll', 1450],
  ['Pallet Wood', 'Packaging Materials', 'pc', 1900],
  ['A4 Paper Ream', 'Office Supplies', 'ream', 1350],
  ['Printer Toner', 'Office Supplies', 'pc', 14500],
  ['Hydraulic Pump', 'Machinery', 'pc', 185000],
  ['CNC Spindle', 'Machinery', 'pc', 420000],
  ['Bearing 6204', 'Spare Parts', 'pc', 950],
  ['Conveyor Belt', 'Spare Parts', 'm', 3200],
  ['Caustic Soda', 'Chemicals', 'kg', 185],
  ['Industrial Solvent', 'Chemicals', 'l', 640],
  ['Circuit Breaker 63A', 'Electrical Supplies', 'pc', 7800],
  ['LED Panel 40W', 'Electrical Supplies', 'pc', 2900],
  ['Freight Karachi-Lahore', 'Logistics and Services', 'trip', 165000],
  ['Warehouse Handling', 'Logistics and Services', 'day', 48000],
  ['Hex Bolt M12', 'Spare Parts', 'kg', 420],
  ['Welding Electrodes', 'Raw Materials', 'kg', 560],
  ['Lubricant Oil 20L', 'Chemicals', 'drum', 21000],
  ['Safety Gloves', 'Office Supplies', 'pair', 240],
  ['Cable Tray', 'Electrical Supplies', 'm', 1100],
  ['Packing Tape', 'Packaging Materials', 'roll', 130],
  ['Gearbox Unit', 'Machinery', 'pc', 310000],
  ['Filter Cartridge', 'Spare Parts', 'pc', 3800],
  ['Acetone', 'Chemicals', 'l', 520],
  ['Wooden Crate', 'Packaging Materials', 'pc', 2400]
];

export class DataStore {
  private queryCache = new Map<string, unknown>();
  invalidateQueries() { this.queryCache.clear(); }
  private cached<T>(key: string, build: () => T): T {
    if (!this.queryCache.has(key)) this.queryCache.set(key, build());
    return this.queryCache.get(key) as T;
  }
  private indexes() {
    return this.cached('indexes', () => {
      const orders = new Map(this.pos.map(p => [p.poId, p]));
      const vendors = new Map(this.vendors.map(v => [v.vendorId, v]));
      const items = new Map(this.items.map(i => [i.itemId, i]));
      const live = this.pos.filter(p => p.status !== 'Cancelled' && p.status !== 'Draft');
      const ids = new Set(live.map(p => p.poId));
      const lines = this.lines.filter(l => ids.has(l.poId));
      const byItem = new Map<string, PurchaseOrderLine[]>();
      for (const line of lines) {
        const group = byItem.get(line.itemId) ?? [];
        group.push(line); byItem.set(line.itemId, group);
      }
      return { orders, vendors, items, live, lines, byItem };
    });
  }
  users: User[] = [
    {
      email: 'procurement@demo.com',
      name: 'Purchase Department',
      role: 'user',
      status: 'Active'
    },
    {
      email: 'purchase@demo.com',
      name: 'Purchase Department',
      role: 'user',
      status: 'Active'
    },
    {
      email: 'admin@demo.com',
      name: 'Hemani Purchase',
      role: 'admin',
      status: 'Active'
    }
  ];

  vendors: Vendor[] = [];
  items: Item[] = [];
  pos: PurchaseOrder[] = [];
  lines: PurchaseOrderLine[] = [];
  historical: HistoricalPurchase[] = [];
  quotations: Quotation[] = [];
  datasets: Dataset[] = [];

  constructor(initialize = true) {
    if (!initialize) return;
    if (!this.loadFromDisk()) {
      this.initData();
    }

  }

  // Only remove the original complete sample when every record is unchanged.
  // Imported or edited data makes this operation unavailable.
  removeUntouchedDemoData(): boolean {
    const oldSeed = seed;
    const sample = new DataStore(false);
    try { seed = 42; sample.initData(); } finally { seed = oldSeed; }
    const collections = ['items', 'vendors', 'pos', 'lines', 'historical', 'quotations'] as const;
    if (collections.some(key => JSON.stringify(this[key]) !== JSON.stringify(sample[key]))) return false;
    if (this.datasets.some(d => d.id !== 'ds-seed-01')) return false;
    this.items = []; this.vendors = []; this.pos = []; this.lines = [];
    this.historical = []; this.quotations = []; this.datasets = [];
    this.saveToDisk();
    return true;
  }

  private getStoragePath(): string {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    return path.join(dataDir, 'store.json');
  }

  saveToDisk() {
    this.invalidateQueries();
    try {
      const p = this.getStoragePath();
      const payload = {
        users: this.users,
        vendors: this.vendors,
        items: this.items,
        pos: this.pos,
        lines: this.lines,
        historical: this.historical,
        quotations: this.quotations,
        datasets: this.datasets
      };
      const temporary = p + '.tmp';
      fs.writeFileSync(temporary, JSON.stringify(payload), 'utf8');
      fs.renameSync(temporary, p);
    } catch (e) {
      throw new Error('Failed to persist data', { cause: e });
    }
  }

  loadFromDisk(): boolean {
    try {
      const p = this.getStoragePath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.items)) {
          this.users = data.users || this.users;
          this.vendors = data.vendors || [];
          this.items = data.items || [];
          this.pos = data.pos || [];
          this.lines = data.lines || [];
          this.historical = data.historical || [];
          this.quotations = data.quotations || [];
          this.datasets = data.datasets || [];
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to load store from disk:', e);
    }
    return false;
  }

  private checkAutoSeed() {
    const templatePath = 'C:/Users/DELL/Downloads/ProcureIQ_Template_Item_Master.xlsx';
    if (this.items.length <= 35 && fs.existsSync(templatePath)) {
      try {
        const xlsxLib = (XLSX as any).default || XLSX;
        const wb = xlsxLib.readFile(templatePath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = xlsxLib.utils.sheet_to_json(sheet) as Record<string, unknown>[];
        if (Array.isArray(rows) && rows.length > 0) {
          const existingMap = new Map<string, number>();
          this.items.forEach((it, i) => existingMap.set(it.itemId, i));

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
                this.items[idx] = itemData;
              } else {
                existingMap.set(itemId, this.items.length);
                this.items.push(itemData);
              }
            }
          });

          const hasDs = this.datasets.some(d => d.name.includes('ProcureIQ_Template_Item_Master'));
          if (!hasDs) {
            this.datasets.unshift({
              id: 'ds-' + Date.now() + '-item-master',
              name: 'ProcureIQ_Template_Item_Master.xlsx',
              type: 'Item Master',
              date: new Date().toISOString().slice(0, 10),
              by: 'admin@demo.com',
              records: rows.length,
              status: 'Imported to database',
              rows: rows.slice(0, 200) as any
            });
          }

          this.saveToDisk();
          console.log(`Auto-seeded ${rows.length} items from template into store.`);
        }
      } catch (e) {
        console.warn('Failed to auto-seed template item master:', e);
      }
    }
  }

  private initData() {
    // 1. Vendors
    this.vendors = vendorNames.map((name, i) => ({
      vendorId: `V${String(i + 1).padStart(3, '0')}`,
      vendorName: name,
      contactPerson: ['Ahmed Raza', 'Bilal Khan', 'Sana Malik', 'Usman Ali', 'Hina Shah'][i % 5],
      email: `sales@${name.split(' ')[0].toLowerCase()}.pk`,
      phone: `+92 3${i % 5}${i} ${1000000 + i * 7919}`,
      address: `${cities[i]}, Pakistan`,
      status: i === 13 ? 'Inactive' : 'Active'
    }));

    // 2. Items
    this.items = rawItems.map((x, i) => ({
      itemId: `I${String(i + 1).padStart(3, '0')}`,
      itemName: x[0],
      category: x[1],
      description: `${x[0]} (${x[2]})`,
      unitOfMeasurement: x[2],
      currency: 'PKR'
    }));

    const basePrice = (i: number) => rawItems[i][3];
    const toIso = (m: number, d: number) => {
      const y = 2025 + Math.floor((10 + m) / 12);
      const mm = ((10 + m) % 12) + 1;
      return `${y}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };
    const calcPrice = (i: number, v: number, m: number) =>
      Math.round(basePrice(i) * (1 + m * 0.006 + ((v % 5) - 2) * 0.025 + (rand() - 0.5) * 0.05));

    const statuses: POStatus[] = [
      'Received',
      'Received',
      'Received',
      'Ordered',
      'Approved',
      'Pending',
      'Draft',
      'Cancelled'
    ];

    // 3. Purchase orders and lines
    for (let n = 0; n < 100; n++) {
      const v = Math.floor(Math.pow(rand(), 1.5) * 15);
      const m = Math.floor(rand() * 12);
      const poId = `PO-2026-${String(n + 1).padStart(4, '0')}`;
      let total = 0;

      for (let k = 0; k < 2; k++) {
        const itemIdx = (v * 2 + k + Math.floor(rand() * 3)) % 30;
        const q = Math.max(
          1,
          Math.round(
            (rand() * 50 + 5) *
              (basePrice(itemIdx) > 50000 ? 0.1 : basePrice(itemIdx) > 5000 ? 1 : 10)
          )
        );
        const p = calcPrice(itemIdx, v, m);
        const lineTotal = q * p;
        total += lineTotal;

        this.lines.push({
          lineId: `L${n}-${k}`,
          poId,
          itemId: this.items[itemIdx].itemId,
          quantity: q,
          unitPrice: p,
          lineTotal
        });
      }

      this.pos.push({
        poId,
        vendorId: this.vendors[v].vendorId,
        orderDate: toIso(m, 1 + Math.floor(rand() * 27)),
        status: statuses[Math.floor(rand() * 8)],
        totalAmount: total
      });
    }

    // 4. Historical purchases
    this.historical = Array.from({ length: 50 }, (_, n) => {
      const v = n % 15;
      const itemIdx = (v * 2 + n) % 30;
      const m = n % 12;
      const q = 10 + n;
      const p = calcPrice(itemIdx, v, m);
      return {
        purchaseId: `H${n + 1}`,
        vendorId: this.vendors[v].vendorId,
        itemId: this.items[itemIdx].itemId,
        purchaseDate: toIso(m, 10),
        quantity: q,
        unitPrice: p,
        totalAmount: q * p
      };
    });

    // 5. Quotations
    this.quotations = Array.from({ length: 40 }, (_, n) => {
      const v = (n * 7) % 15;
      const itemIdx = (n * 3) % 30;
      return {
        quotationId: `Q${n + 1}`,
        vendorId: this.vendors[v].vendorId,
        itemId: this.items[itemIdx].itemId,
        quotedPrice: calcPrice(itemIdx, v, 11),
        quotationDate: toIso(11, 5),
        validityDate: toIso(12, 5)
      };
    });

    // 6. Default sample dataset in admin library
    this.datasets.push({
      id: 'ds-seed-01',
      name: 'Initial-Vendor-Master.csv',
      type: 'Vendors',
      date: new Date().toISOString().slice(0, 10),
      by: 'admin@demo.com',
      records: this.vendors.length,
      status: 'Active Ingested',
      rows: this.vendors.map(v => ({ ...v }))
    });
  }

  // --- Helper Query Methods ---

  getLivePOs() {
    return this.indexes().live;
  }

  getLiveLines() {
    return this.indexes().lines;
  }

  getPOById(id: string) {
    return this.indexes().orders.get(id);
  }

  getVendorName(vendorId: string) {
    return this.indexes().vendors.get(vendorId)?.vendorName ?? vendorId;
  }

  getTotalSpend() {
    return this.getLivePOs().reduce((acc, p) => acc + p.totalAmount, 0);
  }

  getMonthlySpend() {
    const map: Record<string, number> = {};
    this.getLivePOs().forEach(p => {
      const k = p.orderDate.slice(0, 7);
      map[k] = (map[k] ?? 0) + p.totalAmount;
    });
    return Object.entries(map)
      .sort()
      .map(([name, value]) => ({ name, value }));
  }

  getVendorSpend() {
    const map: Record<string, { value: number; count: number }> = {};
    this.getLivePOs().forEach(p => {
      const entry = (map[p.vendorId] ??= { value: 0, count: 0 });
      entry.value += p.totalAmount;
      entry.count++;
    });
    const total = this.getTotalSpend();
    return Object.entries(map)
      .map(([id, entry]) => ({
        id,
        name: this.getVendorName(id),
        value: entry.value,
        orders: entry.count,
        share: total ? (entry.value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }

  getItemStats(onlyWithLines = false) {
    return [...this.cached("getItemStats:" + String(onlyWithLines), () => {
    const liveLines = this.getLiveLines();
    const statsMap = new Map<
      string,
      { qty: number; spend: number; prices: number[]; vendorIds: Set<string>; count: number }
    >();

    for (const l of liveLines) {
      let s = statsMap.get(l.itemId);
      if (!s) {
        s = { qty: 0, spend: 0, prices: [], vendorIds: new Set(), count: 0 };
        statsMap.set(l.itemId, s);
      }
      s.qty += l.quantity;
      s.spend += l.lineTotal;
      s.prices.push(l.unitPrice);
      s.count++;
      const po = this.getPOById(l.poId);
      if (po?.vendorId) {
        s.vendorIds.add(po.vendorId);
      }
    }

    const result = this.items.map(item => {
      const s = statsMap.get(item.itemId);
      const qty = s ? s.qty : 0;
      const spend = s ? s.spend : 0;
      const prices = s ? s.prices : [];
      const vendorCount = s ? s.vendorIds.size : 0;
      const lines = s ? s.count : 0;

      return {
        ...item,
        qty,
        spend,
        avg: qty ? spend / qty : 0,
        min: prices.length ? prices.reduce((a, b) => Math.min(a, b), Infinity) : 0,
        max: prices.length ? prices.reduce((a, b) => Math.max(a, b), -Infinity) : 0,
        vendors: vendorCount,
        lines
      };
    });

    return onlyWithLines ? result.filter(i => i.lines > 0) : result;

    })];
  }

  getItemByVendor(itemId: string) {
    const liveLines = (this.indexes().byItem.get(itemId) ?? []);
    const map: Record<string, number[]> = {};

    liveLines.forEach(l => {
      const po = this.getPOById(l.poId);
      if (po) {
        (map[po.vendorId] ??= []).push(l.unitPrice);
      }
    });

    return Object.entries(map).map(([id, prices]) => ({
      id,
      name: this.getVendorName(id),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      min: prices.reduce((a, b) => Math.min(a, b), Infinity),
      max: prices.reduce((a, b) => Math.max(a, b), -Infinity),
      n: prices.length
    }));
  }

  getItemTrend(itemId: string) {
    const liveLines = (this.indexes().byItem.get(itemId) ?? []);
    const map: Record<string, number[]> = {};

    liveLines.forEach(l => {
      const po = this.getPOById(l.poId);
      if (po) {
        const month = po.orderDate.slice(0, 7);
        (map[month] ??= []).push(l.unitPrice);
      }
    });

    return Object.entries(map)
      .sort()
      .map(([name, prices]) => ({
        name,
        value: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      }));
  }

  getSavings() {
    return [...this.cached("getSavings:" + "all", () => {
    const liveLines = this.getLiveLines();
    return this.getItemStats(true)
      .map(item => {
        const vendorPrices = this.getItemByVendor(item.itemId)
          .filter(v => v.n >= 2)
          .sort((a, b) => a.avg - b.avg);
        if (vendorPrices.length < 2) return null;

        const best = vendorPrices[0];
        const itemLines = (this.indexes().byItem.get(item.itemId) ?? []);
        const est = itemLines.reduce(
          (acc, l) => acc + Math.max(0, l.unitPrice - best.avg) * l.quantity,
          0
        );

        return {
          item: item.itemName,
          best: best.name,
          bestAvg: best.avg,
          est: Math.round(est)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.est - a!.est) as {
      item: string;
      best: string;
      bestAvg: number;
      est: number;
    }[];

    })];
  }

  getPriceChanges() {
    return [...this.cached("getPriceChanges:" + "all", () => {
    return this.getItemStats(true)
      .map(item => {
        const trend = this.getItemTrend(item.itemId);
        if (trend.length < 4) return null;
        const firstTwo = trend.slice(0, 2).reduce((a, b) => a + b.value, 0) / 2;
        const lastTwo = trend.slice(-2).reduce((a, b) => a + b.value, 0) / 2;
        return {
          item: item.itemName,
          pct: ((lastTwo - firstTwo) / firstTwo) * 100
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.pct - a!.pct) as { item: string; pct: number }[];

    })];
  }

  getKPIs() {
    const live = this.getLivePOs();
    const savings = this.getSavings().reduce((acc, s) => acc + s.est, 0);
    return {
      spend: this.getTotalSpend(),
      orders: live.length,
      vendors: this.vendors.filter(v => v.status === 'Active').length,
      savings
    };
  }

  getCategorySpend() {
    const liveLines = this.getLiveLines();
    const map: Record<string, number> = {};
    liveLines.forEach(l => {
      const item = this.indexes().items.get(l.itemId);
      if (item) {
        map[item.category] = (map[item.category] ?? 0) + l.lineTotal;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  getVendorProfile(vendorId: string) {
    const liveLines = this.getLiveLines().filter(l => {
      const po = this.getPOById(l.poId);
      return po?.vendorId === vendorId;
    });

    const itemStatsMap = Object.fromEntries(this.getItemStats(true).map(i => [i.itemId, i.avg]));
    const itemPricesMap: Record<string, number[]> = {};
    liveLines.forEach(l => (itemPricesMap[l.itemId] ??= []).push(l.unitPrice));

    const idx = liveLines.length
      ? liveLines.reduce(
          (acc, l) => acc + (itemStatsMap[l.itemId] ? l.unitPrice / itemStatsMap[l.itemId] : 1),
          0
        ) / liveLines.length
      : 1;

    const cvs = Object.values(itemPricesMap)
      .filter(prices => prices.length > 1)
      .map(prices => {
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance =
          prices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / prices.length;
        return Math.sqrt(variance) / mean;
      });

    const cv = cvs.length ? cvs.reduce((a, b) => a + b, 0) / cvs.length : 0;

    return {
      spend: liveLines.reduce((acc, l) => acc + l.lineTotal, 0),
      orders: new Set(liveLines.map(l => l.poId)).size,
      variety: Object.keys(itemPricesMap).length,
      idx,
      cv
    };
  }

  findItemByQuery(query: string) {
    if (!query) return undefined;
    const s = query.toLowerCase();
    // 1. Direct includes match
    const exact = this.items.find(i => s.includes(i.itemName.toLowerCase()));
    if (exact) return exact;

    // 2. Significant word matching (excluding city names and stop words)
    const stopWords = ['what','show','tell','with','from','have','item','items','price','cost','trend','karachi','lahore','multan','peshawar','quetta','sukkur','korangi'];
    const words = s.split(/[^a-z0-9]+/i).filter(w => w.length >= 3 && !stopWords.includes(w));
    for (const w of words) {
      const match = this.items.find(i => i.itemName.toLowerCase().includes(w));
      if (match) return match;
    }
    return undefined;
  }

  findVendorByQuery(query: string) {
    if (!query) return undefined;
    const s = query.toLowerCase();
    const exact = this.vendors.find(v => s.includes(v.vendorName.toLowerCase()));
    if (exact) return exact;

    const words = s.split(/[^a-z0-9]+/i).filter(w => w.length >= 4 && !['vendor','vendors','supplier','suppliers','company'].includes(w));
    for (const w of words) {
      const match = this.vendors.find(v => v.vendorName.toLowerCase().includes(w));
      if (match) return match;
    }
    return undefined;
  }

  // --- AI Insights Engine ---
  answerChat(question: string, history: string[] = []): AiAnswer {
    const s = question.toLowerCase().trim();
    const fmt = (n: number) => 'Rs. ' + Math.round(n).toLocaleString('en-PK');
    const sourceRef = 'Source: PO records 2025-11 to 2026-10 (excludes Draft/Cancelled).';

    // 1. GREETINGS & CAPABILITIES / HELP
    if (/^(hi|hello|hey|help|who are you|what can you do|how to use|commands|assist)/i.test(s) || s === 'hi' || s === 'hello') {
      return {
        text: `Hello! I am your ProcureIQ AI Procurement Assistant. I can analyze purchase orders, benchmark supplier rates, identify savings, and monitor inflation trends across your procurement dataset. Here are some questions you can ask me:`,
        table: {
          head: ['Capability', 'Example Query'],
          rows: [
            ['Supplier Price Benchmark', 'Compare prices of Steel Rod 12mm across vendors'],
            ['Historical Price Trends', 'Show the historical price trend of Cement'],
            ['Cost Reduction Opportunities', 'Identify potential procurement savings'],
            ['Top Suppliers', 'Who are our highest-spending suppliers?'],
            ['Spending Analytics', 'Show our monthly procurement expenditure'],
            ['Material Inflation', 'Which materials have increased in price?'],
            ['Recent Orders', 'Show recent purchase orders'],
            ['Supplier Profile', 'Tell me about Karachi Steel Mills']
          ]
        },
        sources: [sourceRef],
        followups: [
          'Compare the prices of Steel Rod 12mm across vendors',
          'Show our monthly procurement expenditure',
          'Identify potential procurement savings',
          'Who are our highest-spending suppliers?'
        ]
      };
    }

    // Resolve item or vendor from query or history
    let item = this.findItemByQuery(question);
    if (!item && /\b(it|that|this|the item|the material)\b/.test(s)) {
      item = this.findItemByQuery(history.slice().reverse().join(' '));
    }

    let vendor = this.findVendorByQuery(question);
    if (!vendor && /\b(they|them|their|that vendor|the supplier)\b/.test(s)) {
      vendor = this.findVendorByQuery(history.slice().reverse().join(' '));
    }
    const isVendorExact = this.vendors.some(v => s.includes(v.vendorName.toLowerCase()));

    // 2. SPECIFIC VENDOR INQUIRY
    if (vendor && (!item || (isVendorExact && !/compare|price of|cost of|lowest|cheapest/i.test(s)))) {
      const prof = this.getVendorProfile(vendor.vendorId);
      const pos = this.pos.filter(p => p.vendorId === vendor!.vendorId).sort((a,b) => b.orderDate.localeCompare(a.orderDate));
      const compPct = ((prof.idx - 1) * 100).toFixed(1);
      const compLabel = prof.idx <= 1 ? `${Math.abs(+compPct)}% below market avg` : `${compPct}% above market avg`;

      return {
        text: `${vendor.vendorName} (${vendor.status}): Total procurement spend is ${fmt(prof.spend)} across ${prof.orders} purchase orders (${prof.variety} unique item varieties). Price competitiveness is ${compLabel}. Located in ${vendor.address}. Contact: ${vendor.contactPerson} (${vendor.phone}, ${vendor.email}).`,
        table: {
          head: ['Recent PO', 'Date', 'Total Amount', 'Status'],
          rows: pos.slice(0, 5).map(p => [p.poId, p.orderDate, fmt(p.totalAmount), p.status])
        },
        chart: {
          type: 'bar',
          data: pos.slice(0, 6).reverse().map(p => ({
            name: p.poId.replace('PO-2026-', 'PO-'),
            value: Math.round(p.totalAmount)
          }))
        },
        sources: [sourceRef, `Vendor ${vendor.vendorId}`],
        followups: [
          'Who are our highest-spending suppliers?',
          'Identify potential procurement savings'
        ]
      };
    }

    // 3. ITEM PRICE COMPARISON & BENCHMARKING
    if (item && (/compar|lowest|cheapest|price|cost|rate|best vendor|who sells|how much|quote|supplier/i.test(s) || !/trend|history|historical/.test(s))) {
      // If trend specifically requested, skip to trend handler
      if (!/trend|history|historical|over time/i.test(s) || /compar/i.test(s)) {
        const vendorPrices = this.getItemByVendor(item.itemId).sort((a, b) => a.avg - b.avg);
        if (vendorPrices.length === 0) {
          return {
            text: `No active purchase order lines found for ${item.itemName} (${item.itemId}).`,
            sources: [sourceRef],
            followups: ['Show our items & materials', 'Who are our highest-spending suppliers?']
          };
        }
        if (vendorPrices.length === 1) {
          return {
            text: `${item.itemName}: Only 1 vendor (${vendorPrices[0].name}) supplied this item, at an average of ${fmt(vendorPrices[0].avg)} (${vendorPrices[0].n} orders). There is not enough multi-vendor data to compare.`,
            table: {
              head: ['Vendor', 'Avg Price', 'Lowest', 'Highest', 'Orders'],
              rows: [[vendorPrices[0].name, fmt(vendorPrices[0].avg), fmt(vendorPrices[0].min), fmt(vendorPrices[0].max), vendorPrices[0].n]]
            },
            sources: [sourceRef, `Item ${item.itemId}`],
            followups: [`Show price trend of ${item.itemName}`, 'Identify potential savings']
          };
        }

        const diff = vendorPrices[vendorPrices.length - 1].avg - vendorPrices[0].avg;
        const diffPct = ((diff / vendorPrices[0].avg) * 100).toFixed(1);
        return {
          text: `${item.itemName}: ${vendorPrices[0].name} offers the lowest average price at ${fmt(
            vendorPrices[0].avg
          )}; ${vendorPrices[vendorPrices.length - 1].name} is highest at ${fmt(
            vendorPrices[vendorPrices.length - 1].avg
          )} (+${diffPct}% higher, difference of ${fmt(diff)} per ${item.unitOfMeasurement}).`,
          table: {
            head: ['Vendor', 'Avg Price', 'Lowest', 'Highest', 'Orders'],
            rows: vendorPrices.map(x => [x.name, fmt(x.avg), fmt(x.min), fmt(x.max), x.n])
          },
          chart: {
            type: 'bar',
            data: vendorPrices.map(x => ({
              name: x.name.split(' ')[0],
              value: Math.round(x.avg)
            }))
          },
          sources: [sourceRef, `Item ${item.itemId}`],
          followups: [`Show price trend of ${item.itemName}`, 'Identify potential savings']
        };
      }
    }

    // 4. ITEM PRICE TREND & HISTORY
    if (item && /trend|history|historical|over time|monthly price/i.test(s)) {
      const trend = this.getItemTrend(item.itemId);
      const values = trend.map(x => x.value);
      if (values.length === 0) {
        return {
          text: `No historical monthly data recorded for ${item.itemName}.`,
          sources: [sourceRef],
          followups: [`Compare prices of ${item.itemName}`]
        };
      }
      const pctChange = values.length > 1
        ? (((values[values.length - 1] - values[0]) / values[0]) * 100).toFixed(1)
        : '0.0';
      return {
        text: `Monthly average price of ${item.itemName}: min ${fmt(Math.min(...values))}, max ${fmt(
          Math.max(...values)
        )}, change ${pctChange}% from ${trend[0]?.name ?? ''} to ${
          trend[trend.length - 1]?.name ?? ''
        }.`,
        chart: {
          type: 'line',
          data: trend
        },
        sources: [sourceRef, `Item ${item.itemId}`],
        followups: [`Compare prices of ${item.itemName}`, 'Identify potential savings']
      };
    }

    // 5. SAVINGS & COST REDUCTION
    if (/saving|opportunit|reduce cost|discount|negotiat/i.test(s)) {
      const savingsList = this.getSavings().slice(0, 6);
      const totalSavings = savingsList.reduce((acc, b) => acc + b.est, 0);
      return {
        text: `Estimated savings opportunity (not guaranteed) from shifting orders to the lowest vendor average across items with 2+ suppliers: ${fmt(
          totalSavings
        )} across the top ${savingsList.length} items.`,
        table: {
          head: ['Item', 'Best Vendor', 'Best Avg', 'Est. Savings'],
          rows: savingsList.map(r => [r.item, r.best, fmt(r.bestAvg), fmt(r.est)])
        },
        sources: [sourceRef],
        followups: ['Which materials have increased in price?', 'Who are our highest-spending suppliers?']
      };
    }

    // 6. PRICE INCREASES & INFLATION
    if (/increas|rise|risen|surge|inflati|more expensive|up in price/i.test(s)) {
      const priceChanges = this.getPriceChanges().slice(0, 6);
      return {
        text: 'Items with the largest price rise (comparing first 2 vs last 2 months of PO records):',
        table: {
          head: ['Item', 'Price Rise (%)'],
          rows: priceChanges.map(r => [r.item, '+' + r.pct.toFixed(1) + '%'])
        },
        chart: {
          type: 'bar',
          data: priceChanges.map(r => ({
            name: r.item.split(' ')[0],
            value: +r.pct.toFixed(1)
          }))
        },
        sources: [sourceRef],
        followups: ['Identify potential savings', 'Show our monthly spending']
      };
    }

    // 7. PURCHASE ORDERS & RECENT PROCUREMENT
    if (/(purchase\s*order|po\b|recent\s*order|latest\s*order|last\s*order|orders)/i.test(s)) {
      const targetPos = vendor
        ? this.pos.filter(p => p.vendorId === vendor!.vendorId)
        : this.pos;
      const sortedPos = [...targetPos].sort((a,b) => b.orderDate.localeCompare(a.orderDate)).slice(0, 8);
      const statusCounts: Record<string, number> = {};
      targetPos.forEach(p => statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1);
      const summaryStr = Object.entries(statusCounts).map(([st, cnt]) => `${cnt} ${st}`).join(', ');

      const headerText = vendor
        ? `${vendor.vendorName} has ${targetPos.length} purchase orders on record (${summaryStr}). Latest orders:`
        : `There are ${this.pos.length} total purchase orders recorded (${summaryStr}). Here are the latest purchase orders:`;

      return {
        text: headerText,
        table: {
          head: ['PO #', 'Vendor', 'Date', 'Amount', 'Status'],
          rows: sortedPos.map(p => [p.poId, this.getVendorName(p.vendorId), p.orderDate, fmt(p.totalAmount), p.status])
        },
        sources: [sourceRef],
        followups: ['Who are our highest-spending suppliers?', 'Show our monthly procurement expenditure']
      };
    }

    // 8. ITEMS & MATERIALS CATALOG
    if (/items|materials|products|what do we buy|catalog|categories/i.test(s)) {
      const stats = this.getItemStats().sort((a,b) => b.spend - a.spend).slice(0, 8);
      const cats = this.getCategorySpend();

      return {
        text: `We procure ${this.items.length} materials across ${cats.length} categories. Top category is ${cats[0]?.name} (${fmt(cats[0]?.value)}). Here are our highest-volume items:`,
        table: {
          head: ['Item', 'Category', 'Avg Price', 'Total Spend', 'Suppliers'],
          rows: stats.map(i => [i.itemName, i.category, fmt(i.avg), fmt(i.spend), i.vendors])
        },
        chart: {
          type: 'bar',
          data: cats.map(c => ({ name: c.name.split(' ')[0], value: Math.round(c.value) }))
        },
        sources: [sourceRef],
        followups: ['Compare the prices of Steel Rod 12mm across vendors', 'Identify potential savings']
      };
    }

    // 9. VENDOR & SUPPLIER RANKINGS / SPEND
    if (/vendor|supplier/i.test(s)) {
      const topVendors = this.getVendorSpend().slice(0, 10);
      return {
        text: `We have ${this.vendors.filter(v => v.status === 'Active').length} active suppliers. ${topVendors[0].name} leads overall procurement with ${fmt(topVendors[0].value)} (${topVendors[0].share.toFixed(
          1
        )}% of total spend).`,
        table: {
          head: ['Vendor', 'Total Spend', 'Orders', 'Spend Share'],
          rows: topVendors.map(r => [r.name, fmt(r.value), r.orders, r.share.toFixed(1) + '%'])
        },
        chart: {
          type: 'bar',
          data: topVendors.map(r => ({
            name: r.name.split(' ')[0],
            value: Math.round(r.value)
          }))
        },
        sources: [sourceRef],
        followups: ['Identify potential savings', 'Show our monthly procurement expenditure']
      };
    }

    // 10. SPEND & EXPENDITURE ANALYTICS
    if (/expenditure|spend|spending|monthly|total|budget|cost|summary|overview|kpis/i.test(s)) {
      const monthly = this.getMonthlySpend();
      const latest = monthly[monthly.length - 1];
      const prev = monthly[monthly.length - 2];
      const mom = prev ? (((latest.value - prev.value) / prev.value) * 100).toFixed(1) : '0';
      return {
        text: `Total procurement expenditure over the period is ${fmt(this.getTotalSpend())} across ${this.getLivePOs().length} purchase orders. Latest month (${
          latest.name
        }) was ${fmt(latest.value)} (${+mom >= 0 ? '+' : ''}${mom}% vs ${prev?.name ?? 'prior month'}).`,
        chart: {
          type: 'bar',
          data: monthly
        },
        sources: [sourceRef],
        followups: ['Who are our highest-spending suppliers?', 'Identify potential savings']
      };
    }

    // 11. GENERAL INTELLIGENT FALLBACK
    return {
      text: `I could not locate specific records matching "${question}". You can ask about any item (e.g., "Steel Rod", "Cement", "Copper Wire"), vendor spending, monthly expenditure, or savings opportunities.`,
      sources: [sourceRef],
      followups: [
        'Compare the prices of Steel Rod 12mm across vendors',
        'Show our monthly procurement expenditure',
        'Identify potential procurement savings',
        'Who are our highest-spending suppliers?'
      ]
    };
  }
}

export const store = new DataStore();
