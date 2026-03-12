import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider }        from './context/SocketContext';
import AppShell                  from './components/layout/AppShell';

// Pages
import LoginPage          from './features/auth/LoginPage';
import RegisterPage       from './features/auth/RegisterPage';
import DashboardPage      from './features/dashboard/DashboardPage';
import POSPage            from './features/pos/POSPage';
import KDSPage            from './features/kds/KDSPage';
import InventoryPage      from './features/inventory/InventoryPage';
import MenuBrowsePage     from './features/qrmenu/MenuBrowsePage';
import OrderStatusPage    from './features/qrmenu/OrderStatusPage';

// Lazy placeholders for pages not yet built
import { lazy, Suspense } from 'react';
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const SettingsPage  = lazy(() => import('./features/settings/SettingsPage'));
const OrdersListPage= lazy(() => import('./features/orders/OrdersListPage'));

const Fallback = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Guard: redirect to /login if not authenticated
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Guard: KDS requires kitchen or admin role
function RequireKitchen({ children }) {
  const { user } = useAuth();
  const allowed = ['tenant_admin', 'manager', 'kitchen_staff'];
  return allowed.includes(user?.role) ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      {/* ── Guest / QR routes (no auth, /guest socket namespace) ── */}
      <Routes>
        {/* QR menu — public */}
        <Route
          path="/:tenantSlug/menu"
          element={
            <SocketProvider isGuest>
              <MenuBrowsePage />
            </SocketProvider>
          }
        />
        <Route
          path="/order-status/:orderId"
          element={
            <SocketProvider isGuest>
              <OrderStatusPage />
            </SocketProvider>
          }
        />

        {/* Auth */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated staff routes */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <SocketProvider>
                <AppShell />
              </SocketProvider>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="pos"        element={<POSPage />} />
          <Route path="orders"     element={<Suspense fallback={<Fallback />}><OrdersListPage /></Suspense>} />
          <Route path="kds"        element={<RequireKitchen><KDSPage /></RequireKitchen>} />
          <Route path="inventory"  element={<InventoryPage />} />
          <Route path="analytics"  element={<Suspense fallback={<Fallback />}><AnalyticsPage /></Suspense>} />
          <Route path="settings"   element={<Suspense fallback={<Fallback />}><SettingsPage /></Suspense>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
