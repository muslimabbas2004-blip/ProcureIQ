import assert from 'node:assert/strict';
import express from 'express';
import { performance } from 'node:perf_hooks';
import { store } from './dist/db/store.js';
import { getItems, getVendors, getPurchaseOrders } from './dist/controllers/dataController.js';
import { getDashboardOverview } from './dist/controllers/dashboardController.js';
import { executeQuery } from './dist/services/queryEngine.js';
import { localPlan } from './dist/services/localPlanner.js';

// Synthetic data exists only in this process; never save over company data.
store.vendors = Array.from({ length: 500 }, (_, n) => ({ vendorId: `V${n}`, vendorName: `Vendor ${n}`, status: 'Active' }));
store.items = Array.from({ length: 45000 }, (_, n) => ({ itemId: `I${String(n).padStart(5, '0')}`, itemName: `Material ${n}`, category: `Category ${n % 20}`, unitOfMeasurement: 'kg', currency: 'PKR' }));
store.pos = Array.from({ length: 100000 }, (_, n) => ({ poId: `P${n}`, vendorId: `V${n % 500}`, orderDate: '2026-01-01', status: n % 10 === 0 ? 'Cancelled' : 'Received', totalAmount: 100 }));
store.lines = Array.from({ length: 200000 }, (_, n) => ({ lineId: `L${n}`, poId: `P${n % 100000}`, itemId: store.items[n % 45000].itemId, quantity: 1, unitPrice: 50, lineTotal: 50 }));
store.invalidateQueries();
const queryStart = performance.now();
const assistantPlan = localPlan('Top 10 suppliers by spend in 2026', store);
const assistantResult = executeQuery(store, assistantPlan.queries[0]);
assert.equal(assistantResult.matchedRecords, 90000);
assert.equal(assistantResult.rows.length, 10);
const itemCount = executeQuery(store, { dataset: 'items', metrics: [{ op: 'count', as: 'n' }] });
assert.equal(itemCount.rows[0].n, 45000);
console.log('Assistant plan + full-store queries ms:', Math.round(performance.now() - queryStart));
store.invalidateQueries();
const start = performance.now();
const stats = store.getItemStats();
assert.equal(stats.length, 45000);
assert.equal(stats.reduce((sum, i) => sum + i.spend, 0), 9000000);
store.getKPIs(); store.getCategorySpend(); store.getPriceChanges();
console.log('Cold analytics ms:', Math.round(performance.now() - start));
// Cached arrays must tolerate consumer sorting, and invalidate after updates.
stats.reverse();
assert.equal(store.getItemStats()[0].itemId, 'I00000');
store.items[0].itemName = 'Changed material'; store.invalidateQueries();
assert.equal(store.getItemStats()[0].itemName, 'Changed material');

const app = express();
app.get('/items', getItems); app.get('/vendors', getVendors);
app.get('/orders', getPurchaseOrders); app.get('/dashboard', getDashboardOverview);
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const page = await (await fetch(base + '/items?page=900&pageSize=50')).json();
  assert.equal(page.total, 45000); assert.equal(page.data.length, 50);
  assert.equal(page.data.at(-1).itemId, 'I44999');
  const match = await (await fetch(base + '/items?q=Changed%20material')).json();
  assert.equal(match.total, 1);
  for (const query of ['pageSize=501', 'page=-1', 'pageSize=NaN', 'sort=bad']) {
    assert.equal((await fetch(base + '/items?' + query)).status, 400);
  }
  const vendors = await (await fetch(base + '/vendors?pageSize=500')).json();
  assert.equal(vendors.total, 500); assert.equal(vendors.data.length, 500);
  const times = [];
  for (let batch = 0; batch < 5; batch++) {
    await Promise.all(Array.from({ length: 20 }, async (_, n) => {
      const t = performance.now();
      const response = await fetch(base + ['/items?pageSize=50', '/orders?pageSize=50', '/dashboard'][n % 3]);
      assert.equal(response.status, 200); await response.json();
      times.push(performance.now() - t);
    }));
  }
  times.sort((a, b) => a - b);
  console.log(JSON.stringify({ requests: times.length, concurrency: 20, p50Ms: Math.round(times[49]), p95Ms: Math.round(times[94]), rssMB: Math.round(process.memoryUsage().rss / 1048576) }));
  console.log('Scale and correctness checks passed. No data written.');
} finally { server.close(); }
