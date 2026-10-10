import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { BarberPole } from '@/components';
import { homePathFor, useSession } from '@/context';
import './AuthLayout.css';

/**
 * Login y registro. A la izquierda el rótulo de la barbería; entre los dos
 * paneles, el poste, que gira mientras se envía el formulario.
 */
export function AuthLayout() {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);

  // Con sesión abierta, /login y /register no tienen sentido.
  if (session) return <Navigate to={homePathFor(session.user.role)} replace />;

  return (
    <div className="auth">
      <header className="auth__sign">
        <p className="auth__eyebrow">Barbería a domicilio</p>
        <h1 className="auth__wordmark">Barbería</h1>
        <p className="auth__claim">
          Tu barbero,
          <br />a la puerta de tu casa.
        </p>
        <p className="auth__note">Mira quién está cerca en el mapa y síguelo en vivo hasta que llegue.</p>
      </header>

      <BarberPole spinning={busy} className="auth__pole auth__pole--seam" />
      <BarberPole spinning={busy} orientation="horizontal" className="auth__pole auth__pole--band" />

      <main className="auth__panel">
        <div className="auth__card">
          <Outlet context={{ setBusy }} />
        </div>
      </main>
    </div>
  );
}
