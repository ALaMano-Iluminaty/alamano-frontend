import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, configureApiClient } from '@/lib/api-client';
import { readStorage, removeStorage, writeStorage } from '@/utils';

export type UserRole = 'CUSTOMER' | 'SELLER';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Session {
  /** Access token (JWT). */
  token: string;
  refreshToken?: string;
  user: SessionUser;
}

interface SessionContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
  /**
   * Registra algo que debe ejecutarse justo antes de cerrar sesión, con el
   * socket todavía abierto (ej. avisar VENDOR_OFFLINE). Devuelve el unsubscribe.
   */
  onBeforeSignOut: (hook: () => void) => () => void;
}

const STORAGE_KEY = 'barberia.session';

interface RefreshResponse {
  token: string;
  refreshToken: string;
}

/** A dónde va cada rol tras entrar. */
export function homePathFor(role: UserRole): string {
  return role === 'SELLER' ? '/seller/dashboard' : '/map';
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() =>
    readStorage<Session | null>(STORAGE_KEY, null),
  );
  const hooksRef = useRef(new Set<() => void>());
  // La renovación corre fuera del ciclo de render: necesita la sesión vigente,
  // no la que había cuando se registró el callback.
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const signIn = useCallback((next: Session) => {
    writeStorage(STORAGE_KEY, next);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    for (const hook of hooksRef.current) {
      try {
        hook();
      } catch (error) {
        console.error('[session] hook de cierre falló', error);
      }
    }
    removeStorage(STORAGE_KEY);
    setSession(null);
  }, []);

  const onBeforeSignOut = useCallback((hook: () => void) => {
    hooksRef.current.add(hook);
    return () => {
      hooksRef.current.delete(hook);
    };
  }, []);

  // El cliente REST lee el token de aquí en vez de tocar localStorage.
  // Se registra en render (no en efecto) para que la primera petición de un
  // hijo ya salga autenticada.
  configureApiClient({
    getToken: () => session?.token ?? null,
    onUnauthorized: signOut,
    refresh: async () => {
      const current = sessionRef.current;
      if (!current?.refreshToken) return null;
      const tokens = await apiClient.post<RefreshResponse>(
        '/auth/refresh',
        { refreshToken: current.refreshToken },
        { auth: false },
      );
      signIn({ ...current, token: tokens.token, refreshToken: tokens.refreshToken });
      return tokens.token;
    },
  });

  const value = useMemo<SessionContextValue>(
    () => ({ session, isAuthenticated: session !== null, signIn, signOut, onBeforeSignOut }),
    [session, signIn, signOut, onBeforeSignOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return context;
}

/** Ejecuta `hook` justo antes de cerrar sesión mientras el componente esté montado. */
export function useBeforeSignOut(hook: () => void): void {
  const { onBeforeSignOut } = useSession();
  const hookRef = useRef(hook);
  hookRef.current = hook;

  useEffect(() => onBeforeSignOut(() => hookRef.current()), [onBeforeSignOut]);
}
