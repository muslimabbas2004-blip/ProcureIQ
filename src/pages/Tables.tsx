import { useState, useEffect, ReactNode } from 'react';
import Papa from 'papaparse';
import { Search, Download, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { pos } from '../data/mock';
import * as A from '../services/analyticsService';
import { fmt, vName, fetchPurchaseOrdersList, fetchItemsList } from '../services/analyticsService';

type Row = Record<string, string | number>;

export function T({ rows, title, children }: { rows: Row[]; title: string; children?: ReactNode }) {
  const [q, setQ] = useState('');
  const [sk, setSk] = useState('');
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const cols = rows[0] ? Object.keys(rows[0]) : [];

  const query = q.trim().toLowerCase();
  let r = query
    ? rows.filter(x => Object.values(x).some(val => String(val ?? '').toLowerCase().includes(query)))
    : rows;

  if (sk) {
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

  const totalPages = Math.max(1, Math.ceil(r.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedRows = r.slice(startIdx, startIdx + pageSize);

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
              {r.length.toLocaleString()} record{r.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time procurement records. Sort columns or search any attribute.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              className="border rounded-lg pl-8 pr-3 py-2 text-xs border-slate-200 focus:outline-none focus:border-royal w-48 sm:w-60"
              placeholder="Search in table…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <button className="btn2 text-xs" onClick={exp}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {children}

      <div className="card overflow-x-auto p-0 border border-slate-200/80 shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c}>
                  <button
                    className="flex items-center gap-1.5 hover:text-slate-900 font-semibold"
                    onClick={() => {
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
            {!r.length && (
              <tr>
                <td colSpan={cols.length || 1} className="py-12 text-center text-slate-400 text-sm">
                  No matching procurement records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {r.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Showing <span className="font-semibold text-slate-800">{(startIdx + 1).toLocaleString()}</span> to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(startIdx + pageSize, r.length).toLocaleString()}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{r.length.toLocaleString()}</span> entries
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

export const ItemsPage = () => {
  const [items, setItems] = useState<Row[]>(() =>
    A.itemStats().map(i => ({
      ID: i.itemId,
      Item: i.itemName,
      Category: i.category,
      Unit: i.unitOfMeasurement,
      Qty: i.qty ? i.qty.toLocaleString() : '0',
      'Avg Price': i.avg ? fmt(i.avg) : '—',
      Spend: i.spend ? fmt(i.spend) : '—',
      Vendors: i.vendors || 0
    }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItemsList()
      .then(itemList => {
        if (itemList && itemList.length > 0) {
          setItems(
            itemList.map(i => {
              const anyItem = i as any;
              const q = Number(anyItem.qty || 0);
              const avg = Number(anyItem.avg || 0);
              const spend = Number(anyItem.spend || 0);
              const v = Number(anyItem.vendors || 0);

              return {
                ID: anyItem.itemId || '',
                Item: anyItem.itemName || '',
                Category: anyItem.category || 'General Supplies',
                Unit: anyItem.unitOfMeasurement || anyItem.unit || 'unit',
                Qty: q > 0 ? q.toLocaleString() : '0',
                'Avg Price': avg > 0 ? fmt(avg) : '—',
                Spend: spend > 0 ? fmt(spend) : '—',
                Vendors: v
              };
            })
          );
        }
      })
      .catch(err => {
        console.error('Failed to load items list:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <T title="Items & Materials Catalog" rows={items}>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
          <span className="w-2 h-2 rounded-full bg-teal animate-ping" />
          Synchronizing items catalog...
        </div>
      )}
    </T>
  );
};

export const POPage = () => {
  const [orders, setOrders] = useState<Row[]>(() =>
    pos.map(p => ({
      PO: p.poId,
      Date: p.orderDate,
      Vendor: vName(p.vendorId),
      Total: fmt(p.totalAmount),
      Status: p.status
    }))
  );

  useEffect(() => {
    fetchPurchaseOrdersList().then(poList => {
      setOrders(
        poList.map(p => ({
          PO: p.poId,
          Date: p.orderDate,
          Vendor: p.vendorName || vName(p.vendorId),
          Total: fmt(p.totalAmount),
          Status: p.status
        }))
      );
    });
  }, []);

  return <T title="Purchase Orders Register" rows={orders} />;
};

export const ReportsPage = () => (
  <T
    title="Supplier Spend & Volume Reports"
    rows={A.vendorSpend().map(v => ({
      Vendor: v.name,
      'Total Spend': fmt(v.value),
      'Order Count': v.orders,
      'Spend Share': v.share.toFixed(1) + '%'
    }))}
  />
);

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
