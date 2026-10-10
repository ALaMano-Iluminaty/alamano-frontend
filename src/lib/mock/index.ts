import { ApiError } from '@/lib/api-client';

/**
 * Modo demo: los `services.ts` devuelven datos simulados y el socket no abre
 * conexión real. Permite ver y probar las pantallas sin gateway.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/** Latencia artificial, para que los estados de carga se vean como en real. */
export function mockDelay(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simula el 409 del gateway cuando otro usuario ganó la carrera. */
export function mockConflict(message: string): never {
  throw new ApiError(409, message, 'CONFLICT');
}
