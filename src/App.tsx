import { Routes, Route, NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Building2,
  Package,
  FileText,
  TrendingUp,
  BarChart3,
  Download,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  Search,
  Menu,
  X
} from 'lucide-react';
import { Guard, useAuth } from './context/Auth';
import Brand from './components/Brand';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import Admin from './pages/Admin';
import { ItemsPage, POPage, ReportsPage } from './pages/Tables';
import { Vendors, PricePage, AnalyticsPage } from './pages/Compare';

const nav = [
  ['/app', 'Overview', LayoutDashboard],
  ['/app/assistant', 'AI Assistant', Sparkles],
  ['/app/vendors', 'Suppliers', Building2],
  ['/app/items', 'Items & Materials', Package],
  ['/app/purchase-orders', 'Purchase Orders', FileText],
  ['/app/pricing', 'Price Intelligence', TrendingUp],
  ['/app/analytics', 'Analytics', BarChart3],
  ['/app/reports', 'Vendor Reports', Download]
] as const;

function Shell() {
  const { user, signOut } = useAuth();
  const go = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div className="app-shell min-h-screen md:flex bg-slate-50">
      <div className="mobile-app-bar md:hidden">
        <Brand to="/app" dark />
        <button type="button" className="mobile-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="app-navigation" onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {/* Sidebar */}
      <aside id="app-navigation" aria-label="Main navigation" className={`${menuOpen ? 'flex' : 'hidden'} bg-navy text-white md:w-64 md:min-h-screen p-3 md:p-5 md:flex flex-col gap-1 border-r border-slate-800 flex-shrink-0`}>
        <Brand to="/app" dark tagline className="mb-8 px-2 max-md:hidden" />

        <nav aria-label="Procurement sections" className="flex flex-col gap-1 w-full flex-1">
          {nav.map(([to, l, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-royal text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon size={17} />
              <span>{l}</span>
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1 block">
                Administration
              </span>
              <Link
                to="/admin"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold bg-teal/15 text-teal border border-teal/30 hover:bg-teal/25 transition-colors whitespace-nowrap"
              >
                <ShieldCheck size={16} />
                Admin Console
              </Link>
            </div>
          )}
        </nav>

        {/* User Mini Profile in Sidebar */}
        <div className="hidden md:flex items-center gap-3 pt-4 border-t border-slate-800 mt-auto">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-teal border border-slate-600">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="flex justify-between items-center px-6 py-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-10 shadow-sm/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                {initials}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {user?.name}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {user?.role === 'admin' ? 'Administrator' : 'Procurement Specialist'}
                </span>
              </div>
            </div>

            <button
              className="btn2 text-xs py-1.5 px-2.5 text-slate-600 hover:text-rose-600 hover:border-rose-200"
              onClick={() => {
                signOut();
                go('/');
              }}
              title="Sign out of ProcureIQ"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          <div key={location.pathname} className="page-enter"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/app"
        element={
          <Guard>
            <Shell />
          </Guard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="purchase-orders" element={<POPage />} />
        <Route path="pricing" element={<PricePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <Guard role="admin">
            <Admin />
          </Guard>
        }
      />
    </Routes>
  );
}
