import { useCallback } from 'react';
import { Button } from '@/components';
import type { UserRole } from '@/context';
import { USE_MOCKS } from '@/lib/mock';
import { useGoogleLogin } from '../hooks/useGoogleLogin';
import { useAuthBusy } from '../hooks/useAuthBusy';
import { useAuthSubmit } from '../hooks/useAuthSubmit';
import { demoLogin } from '../services';
import { GoogleSignInButton } from './GoogleSignInButton';
import '../auth.css';

const DEMO_ROLES: { role: UserRole; label: string }[] = [
  { role: 'CUSTOMER', label: 'Cliente' },
  { role: 'SELLER', label: 'Barbero' },
  { role: 'ADMIN', label: 'Administrador' },
];

/**
 * HU-Q2: la unica forma de entrar es con la cuenta de Google. No hay correo y
 * contrasena propios: la identidad la verifica un proveedor externo.
 */
export function LoginScreen() {
  const { submit: submitGoogle, loading, error } = useGoogleLogin();
  const { submit: submitDemo, loading: demoLoading, error: demoError } = useAuthSubmit<UserRole>(demoLogin);
  useAuthBusy(loading || demoLoading);

  // La referencia se mantiene estable entre renders para que el GoogleSignInButton
  // no reinicialice el SDK cada vez que cambia el estado de la pantalla.
  const onGoogleCredential = useCallback(
    (idToken: string) => {
      void submitGoogle({ idToken });
    },
    [submitGoogle],
  );

  const failure = error ?? demoError;

  return (
    <section className="auth-form">
      <h2 className="auth-form__title">Entra a tu cuenta</h2>
      <p className="auth-form__lead">Usa tu cuenta de Google. No guardamos contraseñas.</p>

      {failure ? (
        <p className="auth-form__error" role="alert">
          {failure}
        </p>
      ) : null}

      <GoogleSignInButton onCredential={onGoogleCredential} disabled={loading || demoLoading} text="signin_with" />

      {USE_MOCKS ? (
        <div className="auth-form__demo">
          <p>Modo demo: entra sin Google con el rol que quieras probar.</p>
          <div className="auth-form__demo-actions">
            {DEMO_ROLES.map(({ role, label }) => (
              <Button
                key={role}
                type="button"
                variant="secondary"
                disabled={loading || demoLoading}
                onClick={() => void submitDemo(role)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
