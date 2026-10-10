import { Button, Sheet } from '@/components';
import { distanceMeters, type GeoPoint } from '@/lib/geo';
import { formatDistance, formatRelative } from '@/utils';
import type { Promo, Vendor } from '../services';
import { PromoTicket } from './PromoTicket';

interface VendorSheetProps {
  vendor: Vendor | null;
  origin: GeoPoint;
  reserving: boolean;
  claimingId: string | null;
  onReserve: (vendor: Vendor) => void;
  onClaim: (promo: Promo) => void;
  onClose: () => void;
}

export function VendorSheet({
  vendor,
  origin,
  reserving,
  claimingId,
  onReserve,
  onClaim,
  onClose,
}: VendorSheetProps) {
  if (!vendor) return null;

  const busy = reserving || claimingId !== null;

  return (
    <Sheet
      open
      title={vendor.name}
      eyebrow={
        <>
          a {formatDistance(distanceMeters(origin, vendor))} · posición {formatRelative(vendor.updatedAt)}
        </>
      }
      onClose={onClose}
    >
      {vendor.specialty ? <p className="vendor-sheet__specialty">{vendor.specialty}</p> : null}

      <Button
        className="vendor-sheet__reserve"
        loading={reserving}
        disabled={busy && !reserving}
        onClick={() => onReserve(vendor)}
      >
        {reserving ? 'Reservando…' : 'Reservar barbero'}
      </Button>
      <p className="vendor-sheet__hint">Mientras lo reservas, nadie más puede tomarlo.</p>

      {vendor.promos.length > 0 ? (
        <>
          <h3 className="vendor-sheet__section">Promociones activas</h3>
          <ul className="vendor-sheet__promos">
            {vendor.promos.map((promo) => (
              <PromoTicket
                key={promo.promoId}
                promo={promo}
                claiming={claimingId === promo.promoId}
                disabled={busy && claimingId !== promo.promoId}
                onClaim={() => onClaim(promo)}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="vendor-sheet__empty">Sin promociones por ahora.</p>
      )}
    </Sheet>
  );
}
