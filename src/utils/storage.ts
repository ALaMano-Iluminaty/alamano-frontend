/**
 * localStorage tipado y a prueba de fallos: en modo privado o con las cookies
 * bloqueadas, el acceso lanza. Nunca debe tumbar la app.
 */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sin almacenamiento disponible: se ignora
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // sin almacenamiento disponible: se ignora
  }
}
