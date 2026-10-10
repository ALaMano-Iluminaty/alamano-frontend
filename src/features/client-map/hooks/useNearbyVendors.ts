import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeConnection } from '@/context';
import type { GeoPoint } from '@/lib/geo';
import { RealtimeEvent, useRealtime } from '@/lib/realtime';
import { fetchNearbyVendors, type Promo, type Vendor } from '../services';

/**
 * 2.1 — Barberos disponibles cerca, en vivo.
 *
 * Snapshot + deltas: REST da el estado inicial y el WS lo mantiene al día.
 * Al reconectar se pide el snapshot otra vez, porque los eventos del corte
 * se perdieron.
 */
export function useNearbyVendors(center: GeoPoint, enabled: boolean) {
  const { isOnline } = useRealtimeConnection();
  const [vendors, setVendors] = useState<Map<string, Vendor>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // El centro solo importa al pedir el snapshot; no debe re-suscribir nada.
  const centerRef = useRef(center);
  centerRef.current = center;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchNearbyVendors(centerRef.current);
      setVendors(new Map(list.map((vendor) => [vendor.vendorId, vendor])));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los barberos cercanos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Espejo para decidir en los handlers sin meter efectos en los updaters.
  const vendorsRef = useRef(vendors);
  vendorsRef.current = vendors;

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  // Al recuperar la conexión (no en la primera apertura) se resincroniza.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (enabled && isOnline && !wasOnline.current) void load();
    wasOnline.current = isOnline;
  }, [enabled, isOnline, load]);

  useRealtime(RealtimeEvent.VendorLocationUpdate, (payload) => {
    // Barbero recién conectado sin nombre: no hay con qué pintarlo, se pide el snapshot.
    if (!vendorsRef.current.has(payload.vendorId) && !payload.name) {
      void load();
      return;
    }
    setVendors((current) => {
      const previous = current.get(payload.vendorId);
      const next = new Map(current);
      next.set(payload.vendorId, {
        vendorId: payload.vendorId,
        name: previous?.name ?? payload.name ?? '',
        specialty: previous?.specialty,
        promos: previous?.promos ?? [],
        lat: payload.lat,
        lng: payload.lng,
        updatedAt: payload.updatedAt,
      });
      return next;
    });
  });

  useRealtime(RealtimeEvent.VendorDisconnected, (payload) => {
    setVendors((current) => {
      if (!current.has(payload.vendorId)) return current;
      const next = new Map(current);
      next.delete(payload.vendorId);
      return next;
    });
  });

  const patchPromo = useCallback((vendorId: string, promoId: string, patch: Partial<Promo>) => {
    setVendors((current) => {
      const vendor = current.get(vendorId);
      if (!vendor) return current;
      const next = new Map(current);
      next.set(vendorId, {
        ...vendor,
        promos: vendor.promos.map((promo) => (promo.promoId === promoId ? { ...promo, ...patch } : promo)),
      });
      return next;
    });
  }, []);

  useRealtime(RealtimeEvent.PromoStockUpdated, (payload) => {
    patchPromo(payload.vendorId, payload.promoId, { remaining: payload.remaining, total: payload.total });
  });

  const removeVendor = useCallback((vendorId: string) => {
    setVendors((current) => {
      const next = new Map(current);
      next.delete(vendorId);
      return next;
    });
  }, []);

  return { vendors, loading, error, reload: load, patchPromo, removeVendor };
}
