import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/context';
import { ApiError } from '@/lib/api-client';
import { claimPromo, reserveVendor, type Promo, type Vendor } from '../services';

interface VendorActionsOptions {
  /** 409 en la reserva: el barbero ya no está disponible. */
  onVendorTaken: (vendorId: string) => void;
  /** Stock real devuelto por el gateway (o 0 tras un 409). */
  onPromoStock: (vendorId: string, promoId: string, remaining: number) => void;
}

function describe(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * 4.2 — Reservar barbero y tomar promoción con concurrencia.
 *
 * El botón queda en loading mientras la petición está en vuelo (sin doble
 * envío). Un 409 no es un fallo: otro cliente llegó antes. Se avisa con un
 * toast y la disponibilidad se corrige al momento.
 */
export function useVendorActions({ onVendorTaken, onPromoStock }: VendorActionsOptions) {
  const navigate = useNavigate();
  const { show } = useToast();
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const reserve = useCallback(
    async (vendor: Vendor) => {
      setReservingId(vendor.vendorId);
      try {
        const { serviceId } = await reserveVendor(vendor.vendorId);
        show({ tone: 'success', title: `${vendor.name} está reservado para ti`, body: 'Síguelo en el mapa.' });
        navigate(`/tracking/${serviceId}`);
      } catch (caught) {
        if (caught instanceof ApiError && caught.isConflict) {
          show({
            tone: 'conflict',
            title: `Otro cliente reservó a ${vendor.name}`,
            body: 'Llegó unos segundos antes. Elige otro barbero del mapa.',
          });
          onVendorTaken(vendor.vendorId);
        } else {
          show({ tone: 'conflict', title: 'No se pudo reservar', body: describe(caught, 'Inténtalo de nuevo.') });
        }
      } finally {
        setReservingId(null);
      }
    },
    [navigate, show, onVendorTaken],
  );

  const claim = useCallback(
    async (promo: Promo) => {
      setClaimingId(promo.promoId);
      try {
        const stock = await claimPromo(promo.promoId);
        onPromoStock(promo.vendorId, promo.promoId, stock.remaining);
        show({
          tone: 'success',
          title: `Promoción tomada: ${promo.title}`,
          body: 'El barbero la verá al aceptar tu servicio.',
        });
      } catch (caught) {
        if (caught instanceof ApiError && caught.isConflict) {
          onPromoStock(promo.vendorId, promo.promoId, 0);
          show({
            tone: 'conflict',
            title: `Se acabaron los cupos de «${promo.title}»`,
            body: 'Otro cliente tomó el último mientras decidías.',
          });
        } else {
          show({ tone: 'conflict', title: 'No se pudo tomar la promoción', body: describe(caught, 'Inténtalo de nuevo.') });
        }
      } finally {
        setClaimingId(null);
      }
    },
    [show, onPromoStock],
  );

  return { reserve, claim, reservingId, claimingId };
}
