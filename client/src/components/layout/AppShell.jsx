/**
 * AppShell — Persistent layout for authenticated staff views.
 * Sidebar on desktop, bottom nav on mobile.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList,
  ChefHat, Package, BarChart2, Settings, LogOut, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',  roles: ['tenant_admin','manager','cashier','waiter'] },
  { to: '/pos',        icon: UtensilsCrossed, label: 'POS',         roles: ['tenant_admin','manager','cashier','waiter'] },
  { to: '/orders',     icon: ClipboardList,   label: 'Orders',      roles: ['tenant_admin','manager','cashier','waiter'] },
  { to: '/kds',        icon: ChefHat,         label: 'Kitchen',     roles: ['tenant_admin','manager','kitchen_staff']     },
  { to: '/inventory',  icon: Package,         label: 'Inventory',   roles: ['tenant_admin','manager']                     },
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics',   roles: ['tenant_admin','manager']                     },
  { to: '/settings',   icon: Settings,        label: 'Settings',    roles: ['tenant_admin']                               },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { connected }    = useSocket();
  const navigate         = useNavigate();

  const visibleNav = NAV.filter((n) => n.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-500 text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar (md+) ──────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 py-5 px-3">
        {/* Brand */}
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-brand-500" />
            <span className="font-bold text-gray-900 text-sm leading-tight">
              {user?.tenantName || 'RMS'}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 mt-2 text-xs ${connected ? 'text-green-600' : 'text-red-400'}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? 'Live' : 'Reconnecting…'}
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t pt-3 mt-3">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 w-full rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* ── Bottom nav (mobile) ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-30">
        {visibleNav.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-500' : 'text-gray-500'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
