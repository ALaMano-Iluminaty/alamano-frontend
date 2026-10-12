import type { ServiceStatus } from '@/lib/realtime';
import type { ServiceDetail } from './flow';

export type CoreServiceStatus =
  | 'RESERVED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CoreServiceDto {
  id: string;
  professionalId: string;
  clientId: string;
  status: CoreServiceStatus | string;
  updatedAt: string;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  etaSeconds?: number | null;
  professional?: { id: string; status?: string | null };
  /** Estados a los que el Core deja pasar desde el actual. */
  allowedTransitions?: (CoreServiceStatus | string)[];
}

export function toFrontStatus(status: string): ServiceStatus {
  switch (status) {
    case 'RESERVED':
      return 'ACCEPTED';
    case 'EN_ROUTE':
      return 'ON_THE_WAY';
    case 'ARRIVED':
      return 'ARRIVED';
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      // Estado que el front aún no conoce: se deja pasar tal cual.
      return status as ServiceStatus;
  }
}

export function toCoreStatus(status: ServiceStatus): CoreServiceStatus {
  switch (status) {
    case 'ACCEPTED':
      return 'RESERVED';
    case 'ON_THE_WAY':
      return 'EN_ROUTE';
    case 'ARRIVED':
      return 'ARRIVED';
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
  }
}

export function toServiceDetail(dto: CoreServiceDto): ServiceDetail {
  return {
    serviceId: dto.id,
    status: toFrontStatus(dto.status),
    vendor: {
      id: dto.professionalId,
      name: `Vendedor ${dto.professionalId.slice(0, 6)}`,
    },
    customer: {
      id: dto.clientId,
      name: `Cliente ${dto.clientId.slice(0, 6)}`,
    },
    customerLocation: {
      lat: dto.destinationLatitude ?? 0,
      lng: dto.destinationLongitude ?? 0,
    },
    vendorLocation:
      dto.lastLatitude != null && dto.lastLongitude != null
        ? { lat: dto.lastLatitude, lng: dto.lastLongitude }
        : null,
    etaSeconds: dto.etaSeconds ?? undefined,
    ...(dto.allowedTransitions ? { allowedTransitions: dto.allowedTransitions.map(toFrontStatus) } : {}),
    updatedAt: dto.updatedAt,
  };
}
