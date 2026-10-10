const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Escribe tu correo.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Revisa el correo: falta algo como nombre@dominio.com.';
  return null;
}

export function validateName(name: string): string | null {
  if (name.trim().length < 2) return 'Escribe tu nombre (mínimo 2 letras).';
  return null;
}

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

/** Reglas de complejidad, en el orden en que se muestran. */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: '8 caracteres o más', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Una mayúscula', test: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { id: 'lower', label: 'Una minúscula', test: (p) => /[a-záéíóúñ]/.test(p) },
  { id: 'digit', label: 'Un número', test: (p) => /\d/.test(p) },
];

export function passwordScore(password: string): number {
  return PASSWORD_RULES.filter((rule) => rule.test(password)).length;
}

export function validateNewPassword(password: string): string | null {
  if (!password) return 'Crea una contraseña.';
  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password));
  if (missing.length > 0) return `Le falta: ${missing.map((rule) => rule.label.toLowerCase()).join(', ')}.`;
  return null;
}

/** En el login no se exige complejidad: la contraseña ya existe. */
export function validateExistingPassword(password: string): string | null {
  return password ? null : 'Escribe tu contraseña.';
}
