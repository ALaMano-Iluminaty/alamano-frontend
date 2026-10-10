import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components';
import { USE_MOCKS } from '@/lib/mock';
import { useLogin } from '../hooks/useLogin';
import { useAuthBusy } from '../hooks/useAuthBusy';
import { validateEmail, validateExistingPassword } from '../validation';
import { AuthTabs } from './AuthTabs';
import { PasswordField } from './PasswordField';
import '../auth.css';

type Field = 'email' | 'password';

export function LoginScreen() {
  const { submit, loading, error } = useLogin();
  useAuthBusy(loading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Los errores aparecen al salir del campo o al enviar, no mientras se escribe.
  const [touched, setTouched] = useState<Record<Field, boolean>>({ email: false, password: false });

  const errors = { email: validateEmail(email), password: validateExistingPassword(password) };
  const visibleError = (field: Field) => (touched[field] ? errors[field] : null);
  const touch = (field: Field) => setTouched((current) => ({ ...current, [field]: true }));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (errors.email || errors.password) return;
    void submit({ email: email.trim(), password });
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <AuthTabs />
      <h2 className="auth-form__title">Entra a tu cuenta</h2>

      <Input
        label="Correo"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => touch('email')}
        error={visibleError('email') ?? undefined}
      />
      <PasswordField
        label="Contraseña"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        onBlur={() => touch('password')}
        error={visibleError('password')}
      />

      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={loading} className="auth-form__submit">
        {loading ? 'Entrando…' : 'Entrar'}
      </Button>

      <p className="auth-form__switch">
        ¿Primera vez? <Link to="/register">Crea tu cuenta</Link>
      </p>

      {USE_MOCKS ? (
        <p className="auth-form__demo">
          Modo demo: cualquier correo entra como cliente; uno que empiece por <code>barbero</code> entra
          como barbero.
        </p>
      ) : null}
    </form>
  );
}
