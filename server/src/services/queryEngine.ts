import { DataStore } from '../db/store.js';

type Cell = string | number | boolean | null;
type Row = Record<string, Cell>;
export const schemas: Record<string, Record<string, 'string' | 'number'>> = {
  items: { itemId: 'string', itemName: 'string', category: 'string', description: 'string', unitOfMeasurement: 'string', currency: 'string', qty: 'number', spend: 'number', avg: 'number', min: 'number', max: 'number', vendors: 'number', lines: 'number' },
  vendors: { vendorId: 'string', vendorName: 'string', contactPerson: 'string', email: 'string', phone: 'string', address: 'string', status: 'string', spend: 'number', orders: 'number', share: 'number' },
  orders: { poId: 'string', vendorId: 'string', vendorName: 'string', orderDate: 'string', month: 'string', year: 'string', status: 'string', totalAmount: 'number' },
  lines: { lineId: 'string', poId: 'string', itemId: 'string', itemName: 'string', category: 'string', unitOfMeasurement: 'string', vendorId: 'string', vendorName: 'string', orderDate: 'string', month: 'string', year: 'string', status: 'string', quantity: 'number', unitPrice: 'number', lineTotal: 'number' },
  historical: { purchaseId: 'string', vendorId: 'string', vendorName: 'string', itemId: 'string', itemName: 'string', category: 'string', purchaseDate: 'string', month: 'string', year: 'string', quantity: 'number', unitPrice: 'number', totalAmount: 'number' },
  quotations: { quotationId: 'string', vendorId: 'string', vendorName: 'string', itemId: 'string', itemName: 'string', category: 'string', quotedPrice: 'number', quotationDate: 'string', validityDate: 'string', month: 'string', year: 'string' },
  datasets: { id: 'string', name: 'string', type: 'string', date: 'string', records: 'number', status: 'string' },
  savings: { item: 'string', best: 'string', bestAvg: 'number', est: 'number' },
  priceChanges: { item: 'string', pct: 'number' }
};
export interface Filter { field: string; op: 'eq' | 'ne' | 'contains' | 'in' | 'gt' | 'gte' | 'lt' | 'lte'; value: Cell | Cell[] }
export interface Metric { op: 'count' | 'distinct' | 'sum' | 'avg' | 'min' | 'max' | 'weightedAvg'; field?: string; weight?: string; as: string }
export interface Query {
  dataset: string; filters?: Filter[]; groupBy?: string[]; metrics?: Metric[];
  columns?: string[]; sort?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number; offset?: number; scope?: 'live' | 'all';
}
export interface QueryResult { dataset: string; columns: string[]; rows: Row[]; matchedRecords: number; totalRows: number; truncated: boolean; scope: string; filters: Filter[] }

export function validateQuery(raw: unknown): Query {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Query must be an object.');
  const q = raw as Query;
  if (!Object.hasOwn(schemas, q.dataset)) throw new Error('Unknown dataset.');
  const schema = schemas[q.dataset];
  const field = (name: unknown) => { if (typeof name !== 'string' || !Object.hasOwn(schema, name)) throw new Error(`Unknown field: ${String(name)}`); };
  const array = (value: unknown, max: number) => { if (value !== undefined && (!Array.isArray(value) || value.length > max)) throw new Error('Query exceeds operation limits.'); };
  array(q.filters, 12); array(q.groupBy, 3); array(q.metrics, 8); array(q.columns, 15); array(q.sort, 3);
  for (const f of q.filters ?? []) {
    if (!f || typeof f !== 'object') throw new Error('Invalid filter.');
    field(f.field);
    if (!['eq', 'ne', 'contains', 'in', 'gt', 'gte', 'lt', 'lte'].includes(f.op)) throw new Error('Unsupported filter.');
    const values = Array.isArray(f.value) ? f.value : [f.value];
    if ((f.op === 'in') !== Array.isArray(f.value) || values.length > 100 || !values.length) throw new Error('Invalid filter values.');
    for (const v of values) {
      if (typeof v !== 'string' && typeof v !== 'number') throw new Error('Filter values must be strings or numbers.');
      if (typeof v === 'string' && v.length > 300) throw new Error('Filter value too long.');
      if (schema[f.field] === 'number' && (typeof v !== 'number' || !Number.isFinite(v))) throw new Error('Numeric field requires numeric filter.');
    }
  }
  (q.groupBy ?? []).forEach(field); (q.columns ?? []).forEach(field);
  const aliases = new Set<string>();
  for (const m of q.metrics ?? []) {
    if (!m || !['count', 'distinct', 'sum', 'avg', 'min', 'max', 'weightedAvg'].includes(m.op)) throw new Error('Unsupported metric.');
    if (typeof m.as !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(m.as) || ['constructor', 'prototype', '__proto__'].includes(m.as) || aliases.has(m.as) || Object.hasOwn(schema, m.as)) throw new Error('Invalid or duplicate metric alias.');
    aliases.add(m.as);
    if (m.op !== 'count') field(m.field);
    if (['sum', 'avg', 'min', 'max', 'weightedAvg'].includes(m.op) && schema[m.field!] !== 'number') throw new Error('Metric requires a numeric field.');
    if (m.op === 'weightedAvg') { field(m.weight); if (schema[m.weight!] !== 'number') throw new Error('Weight must be numeric.'); }
  }
  const grouped = !!q.metrics?.length || !!q.groupBy?.length;
  for (const s of q.sort ?? []) {
    if (!s || !['asc', 'desc'].includes(s.direction)) throw new Error('Invalid sort.');
    if (grouped ? !aliases.has(s.field) && !q.groupBy?.includes(s.field) : !Object.hasOwn(schema, s.field)) throw new Error('Invalid sort field.');
  }
  if (q.scope !== undefined && !['live', 'all'].includes(q.scope)) throw new Error('Invalid scope.');
  if (q.limit !== undefined && (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 100)) throw new Error('Limit must be 1–100.');
  if (q.offset !== undefined && (!Number.isInteger(q.offset) || q.offset < 0 || q.offset > 1000000)) throw new Error('Invalid offset.');
  return q;
}

function matches(row: Row, filter: Filter): boolean {
  const value = row[filter.field];
  if (value === undefined || value === null) return false;
  const normalize = (v: Cell) => typeof v === 'string' ? v.toLowerCase() : v;
  const a = normalize(value), b = normalize(filter.value as Cell);
  switch (filter.op) {
    case 'eq': return a === b;
    case 'ne': return a !== b;
    case 'in': return (filter.value as Cell[]).some(v => a === normalize(v));
    case 'contains': return String(a).includes(String(b));
    case 'gt': return a! > b!;
    case 'gte': return a! >= b!;
    case 'lt': return a! < b!;
    case 'lte': return a! <= b!;
  }
}

export function executeQuery(store: DataStore, raw: unknown): QueryResult {
  const q = validateQuery(raw);
  const scope = q.scope ?? (['orders', 'lines'].includes(q.dataset) ? 'live' : 'all');
  const catalog = q.dataset === 'items' ? store.items : q.dataset === 'vendors' ? store.vendors : undefined;
  if (catalog && q.metrics?.length && q.metrics.every(metric => metric.op === 'count') && !q.filters?.length && !q.groupBy?.length) {
    const offset = q.offset ?? 0;
    const columns = q.metrics.map(metric => metric.as);
    return {
      dataset: q.dataset, columns, rows: offset ? [] : [Object.fromEntries(columns.map(column => [column, catalog.length]))],
      matchedRecords: catalog.length, totalRows: 1, truncated: offset > 0, scope, filters: []
    };
  }
  const vendors = new Map(['orders', 'lines', 'historical', 'quotations'].includes(q.dataset)
    ? store.vendors.map(v => [v.vendorId, v.vendorName]) : []);
  const items = new Map(['lines', 'historical', 'quotations'].includes(q.dataset)
    ? store.items.map(i => [i.itemId, i]) : []);
  const orders = new Map(q.dataset === 'lines' ? store.pos.map(p => [p.poId, p]) : []);
  const dates = (date: string) => ({ month: date.slice(0, 7), year: date.slice(0, 4) });
  // Project only allowlisted columns; dataset previews and user credentials are never exposed.
  function* records(): Generator<Row> {
    if (q.dataset === 'items') { for (const i of store.getItemStats()) yield { ...i }; }
    if (q.dataset === 'vendors') {
      const spend = new Map(store.getVendorSpend().map(v => [v.id, v]));
      for (const v of store.vendors) { const s = spend.get(v.vendorId); yield { ...v, spend: s?.value ?? 0, orders: s?.orders ?? 0, share: s?.share ?? 0 }; }
    }
    if (q.dataset === 'orders') for (const p of store.pos) yield { ...p, vendorName: vendors.get(p.vendorId) ?? p.vendorId, ...dates(p.orderDate) };
    if (q.dataset === 'lines') for (const line of store.lines) {
      const p = orders.get(line.poId), i = items.get(line.itemId);
      yield { ...line, vendorId: p?.vendorId ?? '', vendorName: vendors.get(p?.vendorId ?? '') ?? '', status: p?.status ?? '', orderDate: p?.orderDate ?? '', ...dates(p?.orderDate ?? ''), itemName: i?.itemName ?? line.itemId, category: i?.category ?? '', unitOfMeasurement: i?.unitOfMeasurement ?? '' };
    }
    if (q.dataset === 'historical') for (const p of store.historical) yield { ...p, vendorName: vendors.get(p.vendorId) ?? p.vendorId, itemName: items.get(p.itemId)?.itemName ?? p.itemId, category: items.get(p.itemId)?.category ?? '', ...dates(p.purchaseDate) };
    if (q.dataset === 'quotations') for (const p of store.quotations) yield { ...p, vendorName: vendors.get(p.vendorId) ?? p.vendorId, itemName: items.get(p.itemId)?.itemName ?? p.itemId, category: items.get(p.itemId)?.category ?? '', ...dates(p.quotationDate) };
    if (q.dataset === 'datasets') for (const d of store.datasets) yield { id: d.id, name: d.name, type: d.type, date: d.date, records: d.records, status: d.status };
    if (q.dataset === 'savings') for (const s of store.getSavings()) yield { ...s };
    if (q.dataset === 'priceChanges') for (const p of store.getPriceChanges()) yield { ...p };
  }
  const groupBy = q.groupBy ?? [], metrics = q.metrics ?? [];
  const grouped = groupBy.length > 0 || metrics.length > 0;
  type Acc = { row: Row; count: number; sums: number[]; weights: number[]; extrema: number[]; distinct: Set<Cell>[] };
  const groups = new Map<string, Acc>();
  const newGroup = (row: Row): Acc => ({ row: Object.fromEntries(groupBy.map(k => [k, row[k] ?? null])), count: 0, sums: metrics.map(() => 0), weights: metrics.map(() => 0), extrema: metrics.map(m => m.op === 'min' ? Infinity : -Infinity), distinct: metrics.map(() => new Set()) });
  if (grouped && !groupBy.length) groups.set('[]', newGroup({}));
  let rows: Row[] = [], matchedRecords = 0;
  for (const row of records()) {
    if (['orders', 'lines'].includes(q.dataset) && scope === 'live' && !['Received', 'Ordered', 'Approved', 'Pending'].includes(String(row.status))) continue;
    if (!(q.filters ?? []).every(f => matches(row, f))) continue;
    matchedRecords++;
    if (!grouped) { rows.push(row); continue; }
    const key = JSON.stringify(groupBy.map(k => row[k] ?? null));
    let acc = groups.get(key);
    if (!acc) { acc = newGroup(row); groups.set(key, acc); }
    acc.count++;
    metrics.forEach((m, j) => {
      const n = Number(row[m.field!] ?? 0);
      if (m.op === 'distinct') acc!.distinct[j].add(row[m.field!] ?? null);
      else if (m.op === 'weightedAvg') { const weight = Number(row[m.weight!] ?? 0); acc!.sums[j] += n * weight; acc!.weights[j] += weight; }
      else { acc!.sums[j] += n; acc!.extrema[j] = m.op === 'min' ? Math.min(acc!.extrema[j], n) : Math.max(acc!.extrema[j], n); }
    });
  }
  if (grouped) rows = [...groups.values()].map(acc => {
    metrics.forEach((m, j) => {
      const value = m.op === 'count' ? acc.count : m.op === 'distinct' ? acc.distinct[j].size : m.op === 'sum' ? acc.sums[j] : m.op === 'avg' ? (acc.count ? acc.sums[j] / acc.count : null) : m.op === 'weightedAvg' ? (acc.weights[j] ? acc.sums[j] / acc.weights[j] : null) : (acc.count ? acc.extrema[j] : null);
      acc.row[m.as] = value !== null && !Number.isFinite(value) ? null : value;
    });
    return acc.row;
  });
  if (q.sort?.length) rows.sort((a, b) => {
    for (const s of q.sort!) {
      const x = a[s.field], y = b[s.field];
      const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''));
      if (cmp) return cmp * (s.direction === 'desc' ? -1 : 1);
    }
    return 0;
  });
  const totalRows = rows.length, offset = q.offset ?? 0, limit = q.limit ?? 20;
  const columns = grouped ? [...groupBy, ...metrics.map(m => m.as)] : q.columns?.length ? q.columns : Object.keys(schemas[q.dataset]).slice(0, 10);
  return { dataset: q.dataset, columns, rows: rows.slice(offset, offset + limit).map(row => Object.fromEntries(columns.map(c => [c, row[c] ?? null]))), matchedRecords, totalRows, truncated: totalRows > offset + limit || offset > 0, scope, filters: q.filters ?? [] };
}
