import { Link, Outlet } from 'react-router-dom';
import { homePathFor, useRealtimeConnection, useSession } from '@/context';
import { BarberPole, Button } from '@/components';

const ROLE_LABEL = { CUSTOMER: 'Cliente', SELLER: 'Barbero' } as const;

export function AppLayout() {
  const { session, signOut } = useSession();
  const { isOnline, isRecovering } = useRealtimeConnection();

  const connection = isOnline ? 'online' : isRecovering ? 'recovering' : 'offline';
  const connectionLabel = isOnline ? 'En vivo' : isRecovering ? 'Reconectando' : 'Sin conexión';

  return (
    <div className="shell">
      <header className="topbar">
        <Link to={session ? homePathFor(session.user.role) : '/'} className="wordmark">
          <BarberPole className="wordmark__pole" />
          Barbería
        </Link>

        {session ? <span className="role-chip">{ROLE_LABEL[session.user.role]}</span> : null}

        <span className="topbar__spacer" />

        <span className={`conn conn--${connection}`} role="status" aria-live="polite">
          <span className="conn__dot" aria-hidden="true" />
          <span className="conn__label">{connectionLabel}</span>
        </span>

        {session ? (
          <span className="avatar" title={session.user.name} aria-hidden="true">
            {session.user.name.charAt(0).toUpperCase()}
          </span>
        ) : null}
        <Button variant="ghost" onClick={signOut}>
          Salir
        </Button>
      </header>

      {!isOnline ? (
        <div className="shell__banner" role="status">
          {isRecovering
            ? 'Reconectando con el servidor… lo que ves puede no estar al día.'
            : 'Sin conexión en tiempo real.'}
        </div>
      ) : null}

      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
