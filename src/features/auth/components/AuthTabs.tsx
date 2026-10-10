import { NavLink } from 'react-router-dom';

/** Entrar / Crear cuenta. Son rutas, no pestañas: cada una tiene su URL. */
export function AuthTabs() {
  const className = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'auth-tabs__link auth-tabs__link--active' : 'auth-tabs__link';

  return (
    <nav className="auth-tabs" aria-label="Acceso">
      <NavLink to="/login" className={className} replace>
        Entrar
      </NavLink>
      <NavLink to="/register" className={className} replace>
        Crear cuenta
      </NavLink>
    </nav>
  );
}
