import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { homePathFor, useSession, type Session, type UserRole } from '@/context';
import { authErrorMessage } from '../services';

/** Pantallas que puede abrir cada rol. Sirve para no llevar a nadie a una ruta que no es suya. */
const ROLE_AREAS: Record<UserRole, string[]> = {
  CUSTOMER: ['/map', '/tracking'],
  SELLER: ['/seller'],
  ADMIN: ['/admin'],
};

/**
 * Destino tras entrar: la pantalla que el usuario intentaba abrir, si es de
 * su rol; si no, su inicio (mapa, panel o administracion).
 */
export function destinationFor(role: UserRole, from: unknown): string {
  if (typeof from === 'string' && ROLE_AREAS[role].some((area) => from.startsWith(area))) {
    return from;
  }
  return homePathFor(role);
}

/** Envio del acceso: estado de carga, error y redireccion segun el rol. */
export function useAuthSubmit<P>(action: (payload: P) => Promise<Session>) {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: unknown } | null)?.from;

  const submit = useCallback(
    async (payload: P) => {
      setLoading(true);
      setError(null);
      try {
        const session = await action(payload);
        signIn(session);
        navigate(destinationFor(session.user.role, from), { replace: true });
      } catch (caught) {
        setError(authErrorMessage(caught));
        setLoading(false);
      }
    },
    [action, signIn, navigate, from],
  );

  return { submit, loading, error };
}
