import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePathFor, useSession, type UserRole } from '@/context';

interface RequireAuthProps {
  /** Si se indica, un usuario con otro rol vuelve a su pantalla de inicio. */
  role?: UserRole;
}

/** Guarda de ruta: manda al login conservando a dónde quería ir. */
export function RequireAuth({ role }: RequireAuthProps) {
  const { session } = useSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role && session.user.role !== role) {
    return <Navigate to={homePathFor(session.user.role)} replace />;
  }
  return <Outlet />;
}
