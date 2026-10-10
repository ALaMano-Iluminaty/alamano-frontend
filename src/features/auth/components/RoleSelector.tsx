import type { UserRole } from '@/context';

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

const OPTIONS: { role: UserRole; title: string; text: string; icon: JSX.Element }[] = [
  {
    role: 'CUSTOMER',
    title: 'Busco barbero',
    text: 'Ve barberos cerca y pide que vengan a ti.',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path
          d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="10" r="2.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    role: 'SELLER',
    title: 'Soy barbero',
    text: 'Aparece en el mapa y recibe clientes cercanos.',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <circle cx="6" cy="17.5" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="17.5" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 15.5L17 3M16 15.5L7 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

/** Selector Cliente / Vendedor como dos tarjetas-radio. */
export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <fieldset className="role-picker">
      <legend className="field__label">¿Cómo vas a usar la app?</legend>
      <div className="role-picker__options">
        {OPTIONS.map((option) => (
          <label
            key={option.role}
            className={`role-card ${value === option.role ? 'role-card--checked' : ''}`}
          >
            <input
              type="radio"
              name="role"
              value={option.role}
              checked={value === option.role}
              onChange={() => onChange(option.role)}
              className="role-card__radio"
            />
            <span className="role-card__icon">{option.icon}</span>
            <span className="role-card__title">{option.title}</span>
            <span className="role-card__text">{option.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
