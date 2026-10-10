import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeConnection } from '@/context';
import { RealtimeEvent, useRealtime } from '@/lib/realtime';
import { createPromo, fetchMyPromos, type MyPromo, type NewPromo } from '../services';

/**
 * 4.2 — Promociones del barbero con el contador de cupos en vivo.
 * Snapshot + deltas (PROMO_STOCK_UPDATED), resincronizando al reconectar.
 */
export function useMyPromos(vendorId: string) {
  const { isOnline } = useRealtimeConnection();
  const [promos, setPromos] = useState<MyPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** promoId que acaba de cambiar, para resaltarlo un momento. */
  const [flashId, setFlashId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPromos(await fetchMyPromos(vendorId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar tus promociones');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current) void load();
    wasOnline.current = isOnline;
  }, [isOnline, load]);

  useRealtime(RealtimeEvent.PromoStockUpdated, (payload) => {
    if (payload.vendorId !== vendorId) return;
    setPromos((current) =>
      current.map((promo) =>
        promo.promoId === payload.promoId
          ? { ...promo, remaining: payload.remaining, total: payload.total }
          : promo,
      ),
    );
    setFlashId(payload.promoId);
  });

  useEffect(() => {
    if (!flashId) return;
    const timer = setTimeout(() => setFlashId(null), 1_200);
    return () => clearTimeout(timer);
  }, [flashId]);

  const create = useCallback(
    async (input: NewPromo) => {
      const created = await createPromo(vendorId, input);
      setPromos((current) => [created, ...current]);
      return created;
    },
    [vendorId],
  );

  return { promos, loading, error, reload: load, create, flashId };
}
