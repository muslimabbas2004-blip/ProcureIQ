import { DataStore } from '../db/store.js';
import { Filter, Query, validateQuery } from './queryEngine.js';

export interface Plan { queries: Query[]; clarification?: string }
export const examples = [
  'How many items and vendors are in the database?',
  'Top 10 suppliers by spend in 2026',
  'Show pending purchase orders above 100000',
  'Which items have no purchase orders?',
  'Compare average quotation prices by supplier',
  'Show monthly historical purchase spend',
  'Which datasets have been imported?',
  'Show estimated savings opportunities'
];
export function validatePlan(raw: unknown): Plan {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid query plan.');
  const p = raw as Plan;
  if (!Array.isArray(p.queries) || p.queries.length > 4) throw new Error('Use at most four queries per question.');
  if (p.clarification !== undefined && (typeof p.clarification !== 'string' || p.clarification.length > 1000)) throw new Error('Invalid clarification.');
  if (!p.queries.length && !p.clarification) throw new Error('Plan needs queries or clarification.');
  return { queries: p.queries.map(validateQuery), ...(p.clarification ? { clarification: p.clarification } : {}) };
}

export function localPlan(question: string, store: DataStore, previous?: Plan): Plan {
  const s = question.toLowerCase();
  const clarify = (message: string): Plan => ({ queries: [], clarification: message });
  if (/\b(delete|remove|update|insert|change status|approve|cancel this|send email)\b/.test(s)) return clarify('I can analyze records, but cannot change data or send messages. Use the relevant administration screen to make changes.');
  if (/\b(stock|inventory|on.time|lead time|delivery date|late deliver\w*|overdue|invoice|payment|budget|contract|forecast|profit|tax|reliab\w*|quality score)\b/.test(s)) return clarify('The current data does not contain inventory balances, invoices, payment terms, budgets, contracts, promised/actual delivery dates, or quality measurements. I cannot determine those facts from purchase-order status alone. Ask about recorded orders, prices, quantities, vendors, quotations, or imports instead.');
  if (/^(hi|hello|hey|help)\b|what can you|what data/.test(s)) return clarify('I can search and summarize the complete item catalog, suppliers, purchase orders and lines, historical purchases, quotations, and imported dataset metadata. Combine an item or vendor name/ID with dates, statuses, rankings, or numeric thresholds. Estimates and missing fields are identified explicitly.');
  const filters: Filter[] = [];
  const dates = [...s.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(m => m[0]);
  const year = s.match(/\b(20\d{2})\b/)?.[1];
  if (/last month|this month|last year|this year|yesterday|today|last quarter|this quarter/.test(s)) return clarify('Please specify the calendar dates (for example 2026-01-01 to 2026-03-31) so the reporting period is unambiguous.');
  const count = /how many|\bcount\b|number of/.test(s);
  const limit = Math.min(100, Math.max(1, Number(s.match(/(?:top|bottom|first|last|show|next)\s+(\d+)/)?.[1] ?? 20)));
  const findMatches = (records: { id: string; name: string }[]) => records.filter(r => {
    if (!s.includes(r.id.toLowerCase()) && !s.includes(r.name.toLowerCase())) return false;
    const escaped = r.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|\\W)' + escaped + '(?:$|\\W)', 'i').test(question) || s.includes(r.name.toLowerCase());
  });
  const itemMatches = findMatches(store.items.map(i => ({ id: i.itemId, name: i.itemName })));
  const vendorMatches = findMatches(store.vendors.map(v => ({ id: v.vendorId, name: v.vendorName })));
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(s) && !year) return clarify('Which year should I use for that month?');
  const named = s.match(/(?:price(?:s)? of|price(?:s)? for|about|vendor named|supplier named|item named)\s+(.+?)(?:\s+in\s+20\d{2}|\?|$)/)?.[1]?.trim();
  if (named && !itemMatches.length && !vendorMatches.length) {
    const possibleItems = store.items.filter(i => i.itemName.toLowerCase().includes(named) || i.itemId.toLowerCase() === named);
    const possibleVendors = store.vendors.filter(v => v.vendorName.toLowerCase().includes(named) || v.vendorId.toLowerCase() === named);
    if (possibleItems.length + possibleVendors.length !== 1) return clarify(possibleItems.length + possibleVendors.length ? 'Several records match. Please specify an exact item/vendor name or ID.' : 'No item or vendor matches that name. Please check the spelling or provide its exact ID.');
    if (possibleItems.length) itemMatches.push({ id: possibleItems[0].itemId, name: possibleItems[0].itemName });
    if (possibleVendors.length) vendorMatches.push({ id: possibleVendors[0].vendorId, name: possibleVendors[0].vendorName });
  }
  const categories = [...new Set(store.items.map(i => i.category))].filter(c => c && s.includes(c.toLowerCase()));
  const status = ['Cancelled', 'Received', 'Ordered', 'Approved', 'Pending', 'Draft'].filter(v => new RegExp('\\b' + v.toLowerCase() + '\\b').test(s));
  const datesRequested = dates.length > 0 || !!year;
  if (count && /items|materials/.test(s) && /vendors|suppliers/.test(s) && !datesRequested && !itemMatches.length && !vendorMatches.length) {
    return { queries: ['items', 'vendors'].map(dataset => ({ dataset, metrics: [{ op: 'count', as: 'recordCount' }] })) };
  }
  let q: Query;
  const chartFollowUp = /\b(chart|graph|plot|visuali[sz]e|visuali[sz]ation)\b/.test(s) && /\b(this|that|it|previous|these|same|results?)\b/.test(s);
  if (previous?.queries.length && (/^(and |same |what about |only |now |next |show (?:the )?next|show more)/.test(s) || chartFollowUp)) {
    if (previous.queries.length !== 1) return clarify('Which of the previous result datasets should I continue?');
    const prior = previous.queries[0];
    q = JSON.parse(JSON.stringify(prior));
    if (/next|show more/.test(s)) q.offset = (q.offset ?? 0) + (q.limit ?? 20);
    else if (!chartFollowUp) q.offset = 0;
    if (!chartFollowUp) q.limit = limit;
    filters.push(...(q.filters ?? []).filter(f => !(datesRequested && ['year', 'month', 'orderDate', 'purchaseDate', 'quotationDate', 'date'].includes(f.field)) && !(status.length && f.field === 'status')));
  } else {
    let dataset = /dataset|import|upload/.test(s) ? 'datasets' : /quot|bid/.test(s) ? 'quotations' : /historical/.test(s) ? 'historical' : /saving/.test(s) ? 'savings' : /inflat|increas.*price|price.*increas/.test(s) ? 'priceChanges' : /purchase order|\bpos?\b|pending order|recent order|orders/.test(s) ? 'orders' : /vendor|supplier/.test(s) ? 'vendors' : /item|material|catalog|product/.test(s) ? 'items' : /spend|expenditure|monthly|quantity|price|cost/.test(s) ? 'orders' : '';
    if (!dataset && itemMatches.length) dataset = 'items';
    if (!dataset && vendorMatches.length) dataset = 'vendors';
    if (/items|materials/.test(s) && /no (purchase|orders)|never (bought|purchased)|unused/.test(s)) dataset = 'items';
    if (!dataset) return clarify('Please name the data you want to analyze (items, vendors, orders, quotations, historical purchases, or imports) and a measure or filter. Flexible natural-language planning requires a configured server AI provider.');
    if (['items', 'vendors', 'orders'].includes(dataset) && (/price|quantity|category|categories/.test(s) || itemMatches.length && (datesRequested || vendorMatches.length || /spend|trend|compar/.test(s)))) dataset = 'lines';
    if (dataset === 'vendors' && (datesRequested || /monthly|by month/.test(s))) dataset = 'orders';
    q = { dataset, limit, scope: status.length || count || /all orders|including draft|including cancel/.test(s) ? 'all' : 'live' };
    if (count) q.metrics = [{ op: 'count', as: 'recordCount' }];
    else if (dataset === 'savings') q.sort = [{ field: 'est', direction: 'desc' }];
    else if (dataset === 'priceChanges') q.sort = [{ field: 'pct', direction: 'desc' }];
    else if (['orders', 'lines', 'historical', 'quotations'].includes(dataset)) {
      const price = /price|cheapest|expensive/.test(s), aggregate = /total|average|avg|mean|sum|spend|expenditure|monthly|by |compar|cheapest|expensive|highest|lowest|top|bottom/.test(s);
      const amount = dataset === 'lines' ? 'lineTotal' : dataset === 'quotations' ? 'quotedPrice' : 'totalAmount';
      const field = /quantity/.test(s) ? 'quantity' : price ? dataset === 'quotations' ? 'quotedPrice' : 'unitPrice' : amount;
      if (aggregate && !(dataset === 'orders' && price)) {
        q.groupBy = /monthly|by month|trend/.test(s) ? ['month'] : /by categor|categories/.test(s) ? ['category'] : /vendor|supplier|compar/.test(s) ? ['vendorName'] : /by item|materials|top.*items/.test(s) ? ['itemName'] : [];
        const op = /lowest|cheapest|minimum/.test(s) ? 'min' : /highest.*price|maximum/.test(s) ? 'max' : price || /average|avg|mean/.test(s) ? 'avg' : 'sum';
        q.metrics = [{ op, field, as: 'value' }];
        q.sort = [{ field: q.groupBy.includes('month') ? 'month' : 'value', direction: q.groupBy.includes('month') || /lowest|cheapest|bottom/.test(s) ? 'asc' : 'desc' }];
      } else q.sort = [{ field: dataset === 'historical' ? 'purchaseDate' : dataset === 'quotations' ? 'quotationDate' : 'orderDate', direction: 'desc' }];
    } else if (dataset === 'vendors' && /spend|top|highest/.test(s)) q.sort = [{ field: 'spend', direction: 'desc' }];
    else if (dataset === 'items' && /spend|top/.test(s)) q.sort = [{ field: 'spend', direction: 'desc' }];
  }
  if (status.length && ['orders', 'lines'].includes(q.dataset)) { q.scope = 'all'; filters.push({ field: 'status', op: 'in', value: status }); }
  if (/inactive/.test(s) && q.dataset === 'vendors') filters.push({ field: 'status', op: 'eq', value: 'Inactive' });
  else if (/\bactive\b/.test(s) && q.dataset === 'vendors') filters.push({ field: 'status', op: 'eq', value: 'Active' });
  if (/no (purchase|orders)|never (bought|purchased)|unused/.test(s) && q.dataset === 'items') filters.push({ field: 'lines', op: 'eq', value: 0 });
  if (/no orders|unused/.test(s) && q.dataset === 'vendors') filters.push({ field: 'orders', op: 'eq', value: 0 });
  if (itemMatches.length && ['items', 'lines', 'historical', 'quotations'].includes(q.dataset)) filters.push({ field: 'itemId', op: 'in', value: itemMatches.slice(0, 100).map(i => i.id) });
  if (vendorMatches.length && ['vendors', 'orders', 'lines', 'historical', 'quotations'].includes(q.dataset)) filters.push({ field: 'vendorId', op: 'in', value: vendorMatches.slice(0, 100).map(v => v.id) });
  if (categories.length && ['items', 'lines', 'historical', 'quotations'].includes(q.dataset)) filters.push({ field: 'category', op: 'in', value: categories });
  const po = s.match(/\bpo-[a-z0-9-]+\b/i)?.[0];
  if (po && ['orders', 'lines'].includes(q.dataset)) filters.push({ field: 'poId', op: 'eq', value: po });
  const dateField = q.dataset === 'datasets' ? 'date' : q.dataset === 'historical' ? 'purchaseDate' : q.dataset === 'quotations' ? 'quotationDate' : 'orderDate';
  if (datesRequested && !['orders', 'lines', 'historical', 'quotations', 'datasets'].includes(q.dataset)) return clarify('Date filtering requires transaction records. Ask for order spend or quantities for a specified period instead of filtering lifetime master-data statistics.');
  if (dates.length) {
    for (const date of dates) if (Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return clarify('Please use valid calendar dates in YYYY-MM-DD format.');
    filters.push({ field: dateField, op: dates.length > 1 || /since|after|from/.test(s) ? 'gte' : /before|until/.test(s) ? 'lte' : 'eq', value: dates[0] });
    if (dates.length > 1) filters.push({ field: dateField, op: 'lte', value: dates[1] });
  } else if (year) {
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const month = monthNames.findIndex(m => s.includes(m));
    if (q.dataset === 'datasets') { filters.push({ field: 'date', op: 'gte', value: year + '-01-01' }, { field: 'date', op: 'lte', value: year + '-12-31' }); }
    else filters.push({ field: month >= 0 ? 'month' : 'year', op: 'eq', value: month >= 0 ? year + '-' + String(month + 1).padStart(2, '0') : year });
  }
  const threshold = s.match(/\b(above|over|greater than|below|under|less than)\s+(?:rs\.?\s*|pkr\s*)?([\d,]+(?:\.\d+)?)/);
  if (threshold) {
    const field = q.dataset === 'orders' || q.dataset === 'historical' ? 'totalAmount' : q.dataset === 'quotations' ? 'quotedPrice' : q.dataset === 'lines' ? /quantity/.test(s) ? 'quantity' : 'unitPrice' : 'spend';
    filters.push({ field, op: /above|over|greater/.test(threshold[1]) ? 'gt' : 'lt', value: Number(threshold[2].replaceAll(',', '')) });
  }
  q.filters = filters;
  try { return validatePlan({ queries: [q] }); } catch { return clarify('I need a more specific measure and dataset for this question. For example: “monthly order spend in 2026” or “average quotation prices by supplier”.'); }
}
