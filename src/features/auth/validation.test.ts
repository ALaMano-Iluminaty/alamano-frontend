import { describe, expect, it } from 'vitest';
import {
  PASSWORD_RULES,
  passwordScore,
  validateEmail,
  validateExistingPassword,
  validateName,
  validateNewPassword,
} from './validation';

describe('validateEmail', () => {
  it('pide el correo si está vacío', () => {
    expect(validateEmail('   ')).toBe('Escribe tu correo.');
  });

  it('rechaza un correo sin dominio', () => {
    expect(validateEmail('ana@')).toMatch(/Revisa el correo/);
    expect(validateEmail('ana.com')).toMatch(/Revisa el correo/);
  });

  it('acepta un correo válido, incluso con espacios alrededor', () => {
    expect(validateEmail(' ana@correo.com ')).toBeNull();
  });
});

describe('validateName', () => {
  it('exige al menos 2 letras', () => {
    expect(validateName('A')).not.toBeNull();
    expect(validateName(' ')).not.toBeNull();
    expect(validateName('Al')).toBeNull();
  });
});

describe('contraseña nueva', () => {
  it('pide una contraseña si está vacía', () => {
    expect(validateNewPassword('')).toBe('Crea una contraseña.');
  });

  it('lista lo que le falta', () => {
    const message = validateNewPassword('abc');
    expect(message).toContain('8 caracteres o más');
    expect(message).toContain('una mayúscula');
    expect(message).toContain('un número');
    expect(message).not.toContain('una minúscula');
  });

  it('acepta una contraseña que cumple todas las reglas', () => {
    expect(validateNewPassword('Barbero2026')).toBeNull();
  });

  it('puntúa de 0 a 4 según las reglas cumplidas', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('abcdefgh')).toBe(2);
    expect(passwordScore('Barbero2026')).toBe(PASSWORD_RULES.length);
  });
});

describe('validateExistingPassword', () => {
  it('solo exige que no esté vacía', () => {
    expect(validateExistingPassword('')).toBe('Escribe tu contraseña.');
    expect(validateExistingPassword('x')).toBeNull();
  });
});
