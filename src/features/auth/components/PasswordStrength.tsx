import { PASSWORD_RULES, passwordScore } from '../validation';

const LEVEL_LABEL = ['Muy débil', 'Débil', 'Regular', 'Casi', 'Segura'];

/** Medidor de complejidad: cada regla cumplida llena un tramo. */
export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);

  return (
    <div className="strength">
      <div className="strength__meter" aria-hidden="true">
        {PASSWORD_RULES.map((rule, index) => (
          <span
            key={rule.id}
            className={`strength__segment ${index < score ? `strength__segment--on strength__segment--${score}` : ''}`}
          />
        ))}
      </div>
      <p className="strength__level">
        Contraseña: <strong>{password ? LEVEL_LABEL[score] : '—'}</strong>
      </p>
      <ul className="strength__rules">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.id} className={met ? 'strength__rule strength__rule--met' : 'strength__rule'}>
              <span aria-hidden="true">{met ? '✓' : '·'}</span> {rule.label}
              <span className="visually-hidden">{met ? ' (cumplido)' : ' (pendiente)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
