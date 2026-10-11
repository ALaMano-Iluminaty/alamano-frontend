import type { GeoPoint } from '@/lib/geo';
import type { ServiceStatus } from '@/lib/realtime';

/**
 * Máquina de estados del servicio a domicilio. La comparten la vista del
 * cliente (3.1) y la del barbero (3.2): los dos tienen que leer igual el
 * mismo estado.
 */
export const SERVICE_FLOW: readonly ServiceStatus[] = ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

/** Pasos del stepper del cliente: la reserva es el punto de partida, no un paso. */
export const SERVICE_STEPS: readonly ServiceStatus[] = SERVICE_FLOW.slice(1);

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  ACCEPTED: 'Aceptado',
  ON_THE_WAY: 'En camino',
  ARRIVED: 'Llegó',
  IN_PROGRESS: 'Iniciando',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

/** Etiqueta con respaldo: un estado que el front no conoce se muestra tal cual. */
export function statusLabel(status: ServiceStatus): string {
  return SERVICE_STATUS_LABEL[status] ?? status;
}

/** Único estado al que se puede avanzar desde `status`, o null si ya terminó. */
export function nextStatus(status: ServiceStatus): ServiceStatus | null {
  const index = SERVICE_FLOW.indexOf(status);
  if (index === -1 || index === SERVICE_FLOW.length - 1) return null;
  return SERVICE_FLOW[index + 1];
}

export function stepIndex(status: ServiceStatus): number {
  return SERVICE_FLOW.indexOf(status);
}

/** 3.2 — el barbero solo comparte ubicación mientras va de camino. */
export function sharesLocation(status: ServiceStatus): boolean {
  return status === 'ON_THE_WAY';
}

export function isFinished(status: ServiceStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED';
}

/** Respuesta de GET /services/:id. Cada rol lee la parte que le toca. */
export interface ServiceDetail {
  serviceId: string;
  status: ServiceStatus;
  vendor: { id: string; name: string; specialty?: string };
  customer: { id: string; name: string; address?: string };
  customerLocation: GeoPoint;
  /** null hasta que el barbero arranca el trayecto. */
  vendorLocation: GeoPoint | null;
  etaSeconds?: number;
  /**
   * Estados a los que el Core deja pasar (viene en GET /services/:id). Sin él
   * (mocks), se usa `nextStatus`.
   */
  allowedTransitions?: ServiceStatus[];
  /** Ruta física opcional; sin ella se traza la línea recta. */
  route?: GeoPoint[];
  updatedAt: string;
}
