import { useState, useEffect, ReactNode } from 'react';
import Papa from 'papaparse';
import { Search, Download, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { http } from '../services/api';
import { fmt } from '../services/analyticsService';

type Row = Record<string, string | number>;

type Remote = { endpoint: string; fields: Record<string, string>; map: (row: any) => Row };
export function T({ rows, title, children, remote }: { rows: Row[]; title: string; children?: ReactNode; remote?: Remote }) {
  const [q, setQ] = useState('');
  const [sk, setSk] = useState('');
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [remoteRows, setRemoteRows] = useState<Row[]>([]);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!remote) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), q, direction: asc ? 'asc' : 'desc' });
      if (sk) params.set('sort', remote.fields[sk]);
      http<{ data: any[]; total: number; page: number }>(remote.endpoint + '?' + params, { signal: controller.signal })
        .then(result => { setRemoteRows(result.data.map(remote.map)); setRemoteTotal(result.total); setPage(result.page); })
        .catch(err => { if (!controller.signal.aborted) { setError(err.message); setRemoteRows([]); setRemoteTotal(0); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [remote, page, pageSize, q, sk, asc]);
  const cols = remote ? Object.keys(remote.fields) : rows[0] ? Object.keys(rows[0]) : [];

  const query = q.trim().toLowerCase();
  let r = query
    ? rows.filter(x => Object.values(x).some(val => String(val ?? '').toLowerCase().includes(query)))
    : rows;

  if (sk && !remote) {
    r = [...r].sort((a, b) => {
      const va = a[sk];
      const vb = b[sk];
      const na = typeof va === 'number' ? va : Number(String(va).replace(/[^0-9.-]+/g, ''));
      const nb = typeof vb === 'number' ? vb : Number(String(vb).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(na) && !isNaN(nb) && String(va).match(/\d/) && String(vb).match(/\d/)) {
        return (na > nb ? 1 : na < nb ? -1 : 0) * (asc ? 1 : -1);
      }
      return String(va ?? '').localeCompare(String(vb ?? '')) * (asc ? 1 : -1);
    });
  }

  useEffect(() => {
    setPage(1);
  }, [q, sk, asc]);

  if (remote) r = remoteRows;
  const totalCount = remote ? remoteTotal : r.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedRows = remote ? r : r.slice(startIdx, startIdx + pageSize);

  const exp = () => {
    const u = URL.createObjectURL(new Blob([Papa.unparse(r)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = u;
    a.download = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv';
    a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
            <span className="badge bg-slate-100 text-slate-700 font-semibold">
              {totalCount.toLocaleString()} record{totalCount === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Search the records or select a column heading to sort.
          </p>
        </div>

        <div className="table-controls flex items-center gap-2.5">
          <div className="relative min-w-0">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              className="border rounded-lg pl-8 pr-3 py-2 text-xs border-slate-200 focus:outline-none focus:border-royal w-48 sm:w-60"
              placeholder="Search in table…"
              aria-label={`Search ${title}`}
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <button className="btn2 text-xs" onClick={exp} disabled={loading || !!error || !r.length}>
            <Download size={14} />
            {remote ? 'Export this page' : 'Export CSV'}
          </button>
        </div>
      </div>

      {children}
      {loading && <p role="status">Loading records…</p>}
      {error && <p role="alert" className="text-red-700">Could not load records: {error}</p>}

      <div className="card overflow-x-auto p-0 border border-slate-200/80 shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c}>
                  <button
                    className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                    onClick={() => {
                      setPage(1);
                      setSk(c);
                      setAsc(sk === c ? !asc : true);
                    }}
                  >
                    <span>{c}</span>
                    {sk === c ? (
                      asc ? <ChevronUp size={13} className="text-royal" /> : <ChevronDown size={13} className="text-royal" />
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-400 opacity-60" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedRows.map((x, i) => (
              <tr key={startIdx + i} className="hover:bg-slate-50/80">
                {cols.map(c => (
                  <td key={c}>
                    <Badge v={x[c]} />
                  </td>
                ))}
              </tr>
            ))}
            {!r.length && !loading && !error && (
              <tr>
                <td colSpan={cols.length || 1} className="py-12 text-center text-slate-400 text-sm">
                  {q ? 'No matching records. Try a different search.' : 'No records available yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Showing <span className="font-semibold text-slate-800">{(startIdx + 1).toLocaleString()}</span> to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(startIdx + pageSize, totalCount).toLocaleString()}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{totalCount.toLocaleString()}</span> entries
            </span>
            <span className="text-slate-300">|</span>
            <label className="flex items-center gap-1.5 text-slate-500">
              Rows per page:
              <select
                className="border rounded px-1.5 py-1 text-xs border-slate-200 bg-white focus:outline-none focus:border-royal text-slate-800"
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              className="btn2 text-xs py-1 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage(1)}
              disabled={currentPage <= 1}
            >
              First
            </button>
            <button
              className="btn2 text-xs py-1 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
            </span>
            <button
              className="btn2 text-xs py-1 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
            <button
              className="btn2 text-xs py-1 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage(totalPages)}
              disabled={currentPage >= totalPages}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const itemRemote: Remote = {
  endpoint: '/api/items',
  fields: { ID: 'itemId', Item: 'itemName', Category: 'category', Unit: 'unitOfMeasurement', Qty: 'qty', 'Avg Price': 'avg', Spend: 'spend', Vendors: 'vendors' },
  map: i => ({ ID: i.itemId, Item: i.itemName, Category: i.category, Unit: i.unitOfMeasurement, Qty: i.qty, 'Avg Price': fmt(i.avg), Spend: fmt(i.spend), Vendors: i.vendors })
};
const orderRemote: Remote = {
  endpoint: '/api/purchase-orders',
  fields: { PO: 'poId', Date: 'orderDate', Vendor: 'vendorName', Total: 'totalAmount', Status: 'status' },
  map: p => ({ PO: p.poId, Date: p.orderDate, Vendor: p.vendorName, Total: fmt(p.totalAmount), Status: p.status })
};
export const ItemsPage = () => <T title="Items & Materials Catalog" rows={[]} remote={itemRemote} />;
export const POPage = () => <T title="Purchase Orders Register" rows={[]} remote={orderRemote} />;

const vendorRemote: Remote = {
  endpoint: '/api/vendors',
  fields: { Vendor: 'vendorName', 'Total Spend': 'totalSpend', 'Order Count': 'orderCount', 'Spend Share': 'share' },
  map: v => ({ Vendor: v.vendorName, 'Total Spend': fmt(v.totalSpend), 'Order Count': v.orderCount, 'Spend Share': v.share.toFixed(1) + '%' })
};
export const ReportsPage = () => <T title="Supplier Spend & Volume Reports" rows={[]} remote={vendorRemote} />;

const BC: Record<string, string> = {
  Received: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Ordered: 'bg-blue-50 text-blue-700 border border-blue-200',
  Approved: 'bg-teal-50 text-teal-700 border border-teal-200',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  Cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-600 border border-slate-200'
};

function Badge({ v }: { v: string | number }) {
  const c = BC[String(v)];
  return c ? (
    <span className={`badge ${c}`}>{v}</span>
  ) : (
    <span className="text-slate-800 text-xs font-medium">{v}</span>
  );
}
