import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components';
import type { UserRole } from '@/context';
import { useRegister } from '../hooks/useRegister';
import { useAuthBusy } from '../hooks/useAuthBusy';
import { validateEmail, validateName, validateNewPassword } from '../validation';
import { AuthTabs } from './AuthTabs';
import { PasswordField } from './PasswordField';
import { PasswordStrength } from './PasswordStrength';
import { RoleSelector } from './RoleSelector';
import '../auth.css';

type Field = 'name' | 'email' | 'password';

export function RegisterScreen() {
  const { submit, loading, error } = useRegister();
  useAuthBusy(loading);

  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    name: false,
    email: false,
    password: false,
  });

  const errors: Record<Field, string | null> = {
    name: validateName(name),
    email: validateEmail(email),
    password: validateNewPassword(password),
  };
  const visibleError = (field: Field) => (touched[field] ? errors[field] : null);
  const touch = (field: Field) => setTouched((current) => ({ ...current, [field]: true }));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (Object.values(errors).some(Boolean)) return;
    void submit({ name: name.trim(), email: email.trim(), password, role });
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <AuthTabs />
      <h2 className="auth-form__title">Crea tu cuenta</h2>

      <RoleSelector value={role} onChange={setRole} />

      <Input
        label={role === 'SELLER' ? 'Nombre con el que te verán los clientes' : 'Nombre'}
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => touch('name')}
        error={visibleError('name') ?? undefined}
      />
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
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        onBlur={() => touch('password')}
        error={visibleError('password')}
      >
        <PasswordStrength password={password} />
      </PasswordField>

      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={loading} className="auth-form__submit">
        {loading ? 'Creando cuenta…' : role === 'SELLER' ? 'Crear cuenta de barbero' : 'Crear cuenta'}
      </Button>

      <p className="auth-form__switch">
        ¿Ya tienes cuenta? <Link to="/login">Entra</Link>
      </p>
    </form>
  );
}
