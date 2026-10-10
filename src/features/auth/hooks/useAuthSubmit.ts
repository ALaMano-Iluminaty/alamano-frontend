import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { homePathFor, useSession, type Session, type UserRole } from '@/context';
import { authErrorMessage } from '../services';

/**
 * Destino tras entrar: la pantalla que el usuario intentaba abrir, si es de
 * su rol; si no, su inicio (mapa o panel).
 */
function destinationFor(role: UserRole, from: unknown): string {
  if (typeof from === 'string') {
    const isSellerPath = from.startsWith('/seller');
    if (isSellerPath === (role === 'SELLER')) return from;
  }
  return homePathFor(role);
}

/** Envío compartido por login y registro: estado de carga, error y redirección por rol. */
export function useAuthSubmit<P>(action: (payload: P) => Promise<Session>, mode: 'login' | 'register') {
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
        setError(authErrorMessage(caught, mode));
        setLoading(false);
      }
    },
    [action, mode, signIn, navigate, from],
  );

  return { submit, loading, error };
}
