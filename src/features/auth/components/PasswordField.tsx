import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string | null;
  /** Contenido bajo el campo (ej. el medidor de fuerza). */
  children?: ReactNode;
}

/** Campo de contraseña con botón para mostrarla. Mismo contrato a11y que `Input`. */
export function PasswordField({ label, error, id, children, ...rest }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="password-field">
        <input
          {...rest}
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`field__input password-field__input ${error ? 'field__input--error' : ''}`.trim()}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-controls={inputId}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {error ? (
        <p className="field__error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </div>
  );
}
