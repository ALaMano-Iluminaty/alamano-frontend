/**
 * `sub` del JWT, sin verificar la firma (eso lo hace el backend). Es el id con
 * el que el Core y el Gateway identifican al usuario, así que manda sobre el
 * `id` guardado en la sesión. null si el token no es un JWT legible (ej. los
 * tokens del modo demo).
 */
export function tokenSubject(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    const claims: unknown = JSON.parse(json);
    if (typeof claims !== 'object' || claims === null) return null;
    const { sub } = claims as Record<string, unknown>;
    return typeof sub === 'string' && sub !== '' ? sub : null;
  } catch {
    return null;
  }
}
