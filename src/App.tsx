import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout, AuthLayout } from '@/layouts';
import { homePathFor, useSession } from '@/context';
import { LoginScreen, RequireAuth } from '@/features/auth';
import { ClientMapScreen } from '@/features/client-map';
import { SellerDashboardScreen } from '@/features/seller-dashboard';
import { TrackingScreen } from '@/features/tracking';
import { SellerServiceScreen } from '@/features/seller-service';
import { AdminUsersScreen } from '@/features/admin-users';

function TrackingRoute() {
  const { serviceId } = useParams<{ serviceId: string }>();
  if (!serviceId) return <Navigate to="/map" replace />;
  return <TrackingScreen serviceId={serviceId} />;
}

function SellerServiceRoute() {
  const { serviceId } = useParams<{ serviceId: string }>();
  if (!serviceId) return <Navigate to="/seller/dashboard" replace />;
  return <SellerServiceScreen serviceId={serviceId} />;
}

/** Raíz y rutas desconocidas: cada rol a su pantalla de inicio. */
function HomeRedirect() {
  const { session } = useSession();
  return <Navigate to={session ? homePathFor(session.user.role) : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginScreen />} />
      </Route>

      <Route element={<RequireAuth role="CUSTOMER" />}>
        <Route element={<AppLayout />}>
          <Route path="/map" element={<ClientMapScreen />} />
          <Route path="/tracking/:serviceId" element={<TrackingRoute />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="SELLER" />}>
        <Route element={<AppLayout />}>
          <Route path="/seller/dashboard" element={<SellerDashboardScreen />} />
          <Route path="/seller/service/:serviceId" element={<SellerServiceRoute />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="ADMIN" />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/users" element={<AdminUsersScreen />} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
