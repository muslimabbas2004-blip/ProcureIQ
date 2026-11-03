import { useState, useEffect, DragEvent, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Database,
  Building2,
  Package,
  FileText,
  Layers,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  RefreshCw,
  FileDown,
  Download
} from 'lucide-react';
import {
  TYPES,
  validate,
  StagedFile,
  parseMultipleFiles,
  Dataset,
  AdminStats,
  fetchDatasets,
  fetchAdminStats,
  batchUploadDatasetsApi,
  removeDatasetApi,
  downloadSampleExcelTemplate,
  SAMPLE_TEMPLATES
} from '../services/uploadService';
import { useAuth } from '../context/Auth';

export default function Admin() {
  const { user } = useAuth();
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [expandedPreview, setExpandedPreview] = useState<Record<string, boolean>>({});
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const refreshData = async () => {
    try {
      const [ds, st] = await Promise.all([fetchDatasets(), fetchAdminStats()]);
      setDatasets(ds);
      setStats(st);
    } catch (e) {
      console.error('Failed to load admin stats:', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    setStatusMessage(null);
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const parsed = await parseMultipleFiles(files);
      setStagedFiles(prev => [...prev, ...parsed]);
    } catch (err) {
      setStatusMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const updateFileType = (id: string, newType: string) => {
    setStagedFiles(prev =>
      prev.map(item => {
        if (item.id === id) {
          const issues = validate(newType, item.rows);
          const errors = issues.filter(i => i.level === 'Error');
          return {
            ...item,
            detectedType: newType,
            issues,
            valid: errors.length === 0
          };
        }
        return item;
      })
    );
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== id));
  };

  const importAll = async () => {
    const validFiles = stagedFiles.filter(f => f.valid && f.rows.length > 0);
    if (validFiles.length === 0) return;

    setLoading(true);
    try {
      const payload = validFiles.map(f => ({
        name: f.name,
        type: f.detectedType,
        rows: f.rows,
        by: user?.email || 'admin@demo.com'
      }));

      const res = await batchUploadDatasetsApi(payload);
      setStatusMessage({
        type: 'success',
        text: `Successfully extracted and ingested ${res.totalIngested.toLocaleString()} records across ${validFiles.length} file(s) into the database!`
      });
      setStagedFiles([]);
      await refreshData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Import failed: ' + (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataset = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this dataset from the library?')) {
      await removeDatasetApi(id);
      await refreshData();
      setStatusMessage({ type: 'success', text: 'Dataset removed successfully.' });
    }
  };

  const validStagedCount = stagedFiles.filter(f => f.valid).length;
  const totalStagedRows = stagedFiles.reduce((acc, f) => acc + (f.valid ? f.rows.length : 0), 0);

  const filteredDatasets = datasets.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.by.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || d.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900">Admin Control Center</h1>
            <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200">
              Data Management
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Drag & drop multiple procurement files. The engine automatically extracts and integrates them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            className="btn2 text-slate-600 hover:text-slate-900"
            title="Refresh database statistics"
          >
            <RefreshCw size={15} />
            Sync Stats
          </button>
          <Link to="/app" className="btn2 flex items-center gap-1.5">
            <ArrowLeft size={15} />
            Back to Procurement
          </Link>
        </div>
      </div>

      {/* Database Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="p-2.5 rounded-lg bg-blue-50 text-royal">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Vendors</div>
            <div className="text-xl font-bold text-slate-800">
              {stats?.activeVendors ?? 0}{' '}
              <span className="text-xs font-normal text-slate-400">/ {stats?.vendors ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Items Master</div>
            <div className="text-xl font-bold text-slate-800">{stats?.items ?? 0}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Purchase Orders</div>
            <div className="text-xl font-bold text-slate-800">{stats?.pos ?? 0}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Line Items</div>
            <div className="text-xl font-bold text-slate-800">{stats?.lines ?? 0}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50 col-span-2 sm:col-span-1">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Database size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Datasets</div>
            <div className="text-xl font-bold text-slate-800">{stats?.datasets ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <XCircle size={18} className="text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="ml-auto text-xs font-semibold uppercase hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Download Sample Excel Templates */}
      <div className="card space-y-4 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/20 border-emerald-200/50">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <FileSpreadsheet size={18} />
              </span>
              <h2 className="text-base font-bold text-slate-900">Download Sample Excel Templates (.xlsx)</h2>
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                Ready to Import
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Download standard pre-formatted Excel templates with valid column headers and dummy data. Populate them and upload them directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              Object.keys(SAMPLE_TEMPLATES).forEach(type => {
                downloadSampleExcelTemplate(type);
              });
            }}
            className="btn2 text-xs font-semibold flex items-center gap-1.5 bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 whitespace-nowrap shadow-sm self-start sm:self-auto"
            title="Download all sample excel files at once"
          >
            <Download size={14} />
            Download All 7 Templates
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 pt-1">
          {Object.keys(SAMPLE_TEMPLATES).map(type => {
            const count = SAMPLE_TEMPLATES[type]?.length || 0;
            const cols = Object.keys(SAMPLE_TEMPLATES[type]?.[0] || {}).length;
            return (
              <button
                key={type}
                type="button"
                onClick={() => downloadSampleExcelTemplate(type)}
                className="group p-3 rounded-xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      .XLSX
                    </span>
                    <FileDown size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 leading-snug">
                    {type}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  {cols} columns • {count} rows
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-File Upload Zone */}
      <div className="card space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Multi-File Smart Upload</h2>
            <p className="text-xs text-slate-500">
              Drop 2–3 files simultaneously. Supported: Vendors, Item Master, Purchase Orders, Line Items, Quotations (.csv, .xlsx, .xls)
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            Auto-detects format
          </span>
        </div>

        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center transition-all duration-200 cursor-pointer ${
            isDragging
              ? 'border-royal bg-blue-50/60 scale-[1.005]'
              : 'border-slate-300 hover:border-royal hover:bg-slate-50/50 bg-slate-50/30'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".csv,.xls,.xlsx"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isDragging ? 'bg-royal text-white' : 'bg-blue-100/70 text-royal'
              }`}
            >
              <UploadCloud size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Drag & drop 2–3 files here, or <span className="text-royal underline">browse files</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Upload multiple CSV or Excel files. We will classify and validate each dataset automatically.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                .CSV
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                .XLSX
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                .XLS
              </span>
              <span className="text-[11px] text-slate-400">up to 10 MB each</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staged Files Preview & Batch Action */}
      {stagedFiles.length > 0 && (
        <div className="card space-y-5 border-royal/30 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Staged Files for Extraction</span>
                <span className="badge bg-royal/10 text-royal font-semibold">
                  {stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review auto-detected dataset types and validation statuses before importing into live database.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStagedFiles([])}
                className="btn2 text-slate-600 hover:text-rose-600 text-xs"
              >
                Clear All
              </button>
              <button
                type="button"
                disabled={loading || validStagedCount === 0}
                onClick={importAll}
                className="btn bg-royal hover:bg-blue-700 text-white shadow"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Extracting & Ingesting…
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Import All Datasets ({validStagedCount}) · {totalStagedRows.toLocaleString()} rows
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {stagedFiles.map((staged, idx) => {
              const errCount = staged.issues.filter(i => i.level === 'Error').length;
              const warnCount = staged.issues.filter(i => i.level === 'Warning').length;
              const isPreviewOpen = expandedPreview[staged.id] ?? false;
              const isIssuesOpen = expandedIssues[staged.id] ?? false;
              const cols = staged.rows[0] ? Object.keys(staged.rows[0]) : [];

              return (
                <div
                  key={staged.id}
                  className={`border rounded-xl p-4 transition-all ${
                    staged.valid
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-blue-50 text-royal mt-0.5 flex-shrink-0">
                        <FileSpreadsheet size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">{staged.name}</span>
                          <span className="text-xs text-slate-400">
                            ({(staged.size / 1024).toFixed(1)} KB)
                          </span>
                          <span className="badge bg-slate-100 text-slate-700">
                            {staged.rows.length.toLocaleString()} rows
                          </span>
                        </div>

                        {/* Smart Detection & Type Switcher */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500">Auto-detected as:</span>
                          <select
                            className="text-xs font-semibold border rounded-md px-2.5 py-1 bg-white border-slate-300 text-slate-800 focus:outline-none focus:border-royal"
                            value={staged.detectedType}
                            onChange={e => updateFileType(staged.id, e.target.value)}
                          >
                            {Object.keys(TYPES).map(t => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <span className="text-[11px] text-teal font-medium">
                            {Math.round(staged.confidence * 100)}% match
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      {staged.valid ? (
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={13} />
                          Ready to Ingest
                        </span>
                      ) : (
                        <span className="badge bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle size={13} />
                          {errCount} error{errCount > 1 ? 's' : ''}
                        </span>
                      )}

                      {warnCount > 0 && (
                        <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle size={13} />
                          {warnCount} warning{warnCount > 1 ? 's' : ''}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPreview(prev => ({ ...prev, [staged.id]: !isPreviewOpen }))
                        }
                        className="btn2 text-xs py-1 px-2.5"
                      >
                        Preview
                        {isPreviewOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {staged.issues.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIssues(prev => ({ ...prev, [staged.id]: !isIssuesOpen }))
                          }
                          className="btn2 text-xs py-1 px-2.5"
                        >
                          Issues ({staged.issues.length})
                          {isIssuesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeStagedFile(staged.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Issues Drawer */}
                  {isIssuesOpen && staged.issues.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs space-y-1 max-h-36 overflow-auto">
                      <div className="font-semibold text-amber-900 pb-1">Validation Details:</div>
                      {staged.issues.slice(0, 50).map((issue, i) => (
                        <div key={i} className="flex gap-2">
                          <span
                            className={`font-semibold ${
                              issue.level === 'Error' ? 'text-rose-600' : 'text-amber-700'
                            }`}
                          >
                            [Row {issue.row} - {issue.level}]:
                          </span>
                          <span className="text-slate-700">{issue.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Data Preview Table */}
                  {isPreviewOpen && (
                    <div className="mt-3 overflow-x-auto border rounded-lg bg-slate-50/50">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            {cols.map(c => (
                              <th key={c} className="py-2 px-3 font-semibold text-slate-700">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {staged.rows.slice(0, 5).map((r, rowIdx) => (
                            <tr key={rowIdx}>
                              {cols.map(c => (
                                <td key={c} className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                                  {String(r[c] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-[11px] text-slate-400 p-2 text-center bg-slate-50">
                        Showing first 5 rows of {staged.rows.length} total rows
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dataset Library */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Ingested Datasets Library</h2>
            <p className="text-xs text-slate-500">
              Audit log of all imported files currently integrated into the relational database.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search datasets…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border rounded-lg border-slate-200 focus:outline-none focus:border-royal w-48"
              />
            </div>
          </div>
        </div>
        {/* Dataset Distribution Visual Bar */}
        {datasets.length > 0 && (
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold flex items-center gap-1.5">
                <Database size={13} className="text-royal" />
                Live Ingested Database Records Distribution
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {datasets.reduce((acc, d) => acc + d.records, 0).toLocaleString()} Total Rows Ingested
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden flex">
              {['Vendors', 'Item Master', 'Purchase Orders', 'PO Line Items', 'Historical Purchases', 'Quotations', 'Goods Received'].map((type, idx) => {
                const totalRows = datasets.reduce((acc, d) => acc + d.records, 0) || 1;
                const typeRows = datasets.filter(d => d.type === type).reduce((acc, d) => acc + d.records, 0);
                const pct = (typeRows / totalRows) * 100;
                if (pct === 0) return null;
                const colors = ['bg-royal', 'bg-teal', 'bg-indigo-600', 'bg-purple-600', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-600'];
                return (
                  <div
                    key={type}
                    title={`${type}: ${typeRows.toLocaleString()} rows (${pct.toFixed(1)}%)`}
                    style={{ width: `${pct}%` }}
                    className={`${colors[idx % colors.length]} h-full transition-all`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
              {['Vendors', 'Item Master', 'Purchase Orders', 'PO Line Items', 'Historical Purchases', 'Quotations', 'Goods Received'].map((type, idx) => {
                const typeRows = datasets.filter(d => d.type === type).reduce((acc, d) => acc + d.records, 0);
                if (typeRows === 0) return null;
                const colors = ['bg-royal', 'bg-teal', 'bg-indigo-600', 'bg-purple-600', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-600'];
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                    <span>{type}</span>
                    <span className="font-semibold text-slate-700">({typeRows.toLocaleString()})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {['All', 'Vendors', 'Item Master', 'Purchase Orders', 'PO Line Items', 'Historical Purchases', 'Quotations'].map(
            cat => (
              <button
                key={cat}
                onClick={() => setTypeFilter(cat)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  typeFilter === cat
                    ? 'bg-royal text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        {filteredDatasets.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">
            No datasets match your search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Dataset Name</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Imported By</th>
                  <th>Records</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDatasets.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileSpreadsheet size={15} className="text-royal" />
                      {d.name}
                    </td>
                    <td>
                      <span className="badge bg-slate-100 text-slate-700 border border-slate-200">
                        {d.type}
                      </span>
                    </td>
                    <td className="text-slate-500 text-xs">{d.date}</td>
                    <td className="text-slate-500 text-xs">{d.by}</td>
                    <td className="font-semibold text-slate-700">
                      {d.records.toLocaleString()}
                    </td>
                    <td>
                      <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {d.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDeleteDataset(d.id)}
                        className="btn-danger"
                        title="Delete dataset"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
