import assert from 'node:assert/strict';
import { DataStore } from './dist/db/store.js';
import { executeQuery, validateQuery } from './dist/services/queryEngine.js';
import { localPlan, validatePlan, examples } from './dist/services/localPlanner.js';
import { askGemini, planWithProvider } from './dist/services/geminiService.js';

const store = new DataStore(false);
store.vendors = [{ vendorId: 'V1', vendorName: 'Alpha', status: 'Active' }, { vendorId: 'V2', vendorName: 'Beta', status: 'Inactive' }];
store.items = [{ itemId: 'I1', itemName: 'Steel', category: 'Metal', unitOfMeasurement: 'kg' }, { itemId: 'I2', itemName: 'Unused item', category: 'Other', unitOfMeasurement: 'pc' }];
store.pos = [
  { poId: 'PO-1', vendorId: 'V1', orderDate: '2026-01-01', status: 'Received', totalAmount: 100 },
  { poId: 'PO-2', vendorId: 'V2', orderDate: '2026-02-01', status: 'Pending', totalAmount: 300 },
  { poId: 'PO-3', vendorId: 'V1', orderDate: '2025-12-01', status: 'Cancelled', totalAmount: 900 }
];
store.lines = [
  { lineId: 'L1', poId: 'PO-1', itemId: 'I1', quantity: 2, unitPrice: 50, lineTotal: 100 },
  { lineId: 'L2', poId: 'PO-2', itemId: 'I1', quantity: 3, unitPrice: 100, lineTotal: 300 },
  { lineId: 'L3', poId: 'PO-3', itemId: 'I1', quantity: 9, unitPrice: 100, lineTotal: 900 }
];
store.quotations = [{ quotationId: 'Q1', itemId: 'I1', vendorId: 'V1', quotedPrice: 45, quotationDate: '2026-01-01', validityDate: '2026-02-01' }];
store.historical = [{ purchaseId: 'H1', itemId: 'I1', vendorId: 'V2', quantity: 10, unitPrice: 40, totalAmount: 400, purchaseDate: '2024-01-01' }];
store.datasets = [{ id: 'D1', name: 'Import.csv', type: 'Item Master', date: '2026-01-01', records: 2, status: 'Imported', rows: [{ secret: 'must not leak' }] }];

let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS', name); }
const query = q => executeQuery(store, q);
const local = (question, prior) => localPlan(question, store, prior);
check('Live totals exclude cancelled orders', () => assert.equal(query({ dataset: 'orders', metrics: [{ op: 'sum', field: 'totalAmount', as: 'total' }] }).rows[0].total, 400));
check('All order counts include cancelled', () => assert.equal(query({ dataset: 'orders', scope: 'all', metrics: [{ op: 'count', as: 'n' }] }).rows[0].n, 3));
check('Joined lines and weighted averages', () => assert.equal(query({ dataset: 'lines', metrics: [{ op: 'weightedAvg', field: 'unitPrice', weight: 'quantity', as: 'price' }] }).rows[0].price, 80));
check('Date boundaries and grouping', () => assert.deepEqual(query({ dataset: 'orders', filters: [{ field: 'orderDate', op: 'gte', value: '2026-02-01' }], groupBy: ['vendorName'], metrics: [{ op: 'sum', field: 'totalAmount', as: 'amount' }] }).rows, [{ vendorName: 'Beta', amount: 300 }]));
check('Count distinct suppliers', () => assert.equal(query({ dataset: 'lines', metrics: [{ op: 'distinct', field: 'vendorId', as: 'n' }] }).rows[0].n, 2));
check('Empty sum/count and undefined average', () => assert.deepEqual(query({ dataset: 'orders', filters: [{ field: 'year', op: 'eq', value: '2000' }], metrics: [{ op: 'count', as: 'n' }, { op: 'sum', field: 'totalAmount', as: 'total' }, { op: 'avg', field: 'totalAmount', as: 'average' }] }).rows[0], { n: 0, total: 0, average: null }));
check('Rank before limiting; pagination', () => assert.equal(query({ dataset: 'orders', sort: [{ field: 'totalAmount', direction: 'desc' }], limit: 1 }).rows[0].poId, 'PO-2'));
check('Dataset previews excluded', () => assert.ok(!JSON.stringify(query({ dataset: 'datasets' })).includes('must not leak')));
for (const q of [
  { dataset: '__proto__' }, { dataset: 'users' }, { dataset: 'items', columns: ['constructor'] },
  { dataset: 'items', limit: 100000 }, { dataset: 'items', filters: [{ field: 'spend', op: 'eq', value: 'NaN' }] },
  { dataset: 'items', metrics: [{ op: 'eval', as: 'x' }] }, { dataset: 'items', metrics: [{ op: 'count', as: '__proto__' }] },
  { dataset: 'items', metrics: [{ op: 'sum', field: 'itemName', as: 'n' }] }, { dataset: 'orders', groupBy: ['vendorName'], sort: [{ field: 'totalAmount', direction: 'desc' }] }
]) check('Reject unsafe/invalid query ' + JSON.stringify(q), () => assert.throws(() => validateQuery(q)));
check('Plan query budget', () => assert.throws(() => validatePlan({ queries: Array(5).fill({ dataset: 'items' }) })));
check('Question combines catalog counts', () => assert.equal(local(examples[0]).queries.length, 2));
check('Pending and numeric filters', () => assert.deepEqual(local(examples[2]).queries[0].filters.map(f => f.field), ['status', 'totalAmount']));
check('Unused items', () => assert.equal(query(local(examples[3]).queries[0]).rows[0].itemId, 'I2'));
check('Missing fields prompt clarification', () => assert.ok(local('Which supplier has the most late deliveries?').clarification));
check('Unknown entity does not return unrelated totals', () => assert.ok(local('Prices for unicorn').clarification));
check('Unknown year clarified', () => assert.ok(local('Spend in January').clarification));
check('Follow-up replaces date', () => {
  const first = local('Top suppliers by spend in 2026');
  const next = local('And in 2025', first);
  assert.equal(next.queries[0].filters.filter(f => f.field === 'year').length, 1);
  assert.equal(next.queries[0].filters.find(f => f.field === 'year').value, '2025');
});
check('Follow-up advances page', () => assert.equal(local('Show the next 20 results', local('Show items')).queries[0].offset, 20));
check('Chart follow-up keeps the previous filters and result limit', () => {
  const first = local('Top 10 suppliers by spend in 2026');
  const next = local('Show this as a pie chart', first);
  assert.deepEqual(next.queries[0], first.queries[0]);
});
for (const question of examples) check('Example produces a valid plan: ' + question, () => { const p = local(question); assert.ok(p.queries.length); p.queries.forEach(query); });
// Stub provider transport, no external request or credential required.
process.env.GEMINI_API_KEY = 'test-only'; process.env.GEMINI_MODEL = 'test-model';
const provider = await planWithProvider('Count items', [], store, undefined, async (url, init) => {
  assert.ok(!String(url).includes('test-only'));
  assert.ok(init.headers['x-goog-api-key'] === 'test-only');
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ queries: [{ dataset: 'items', metrics: [{ op: 'count', as: 'n' }] }] }) }] } }] }));
});
check('Provider output validated and executed locally', () => assert.equal(query(provider.queries[0]).rows[0].n, 2));
await assert.rejects(() => planWithProvider('bad', [], store, undefined, async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"queries":[{"dataset":"users"}]}' }] } }] }))));
delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_MODEL;
const answer = await askGemini('How many items and vendors are in the database?', [], store);
check('Answer uses local truth and multiple tables', () => { assert.equal(answer.tables.length, 2); assert.equal(answer.mode, 'local'); assert.ok(answer.warnings.length); });
const empty = new DataStore(false);
const emptyAnswer = await askGemini('Show monthly expenditure', [], empty);
check('Empty store returns useful answer', () => assert.match(emptyAnswer.text, /No matching data/));
console.log(`${checks} checks passed; provider transport mocked, no data written.`);
