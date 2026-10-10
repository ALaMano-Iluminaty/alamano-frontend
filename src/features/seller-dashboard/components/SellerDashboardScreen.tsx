import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarberPole, Button, ConnectionBanner } from '@/components';
import { useRealtimeConnection, useSession } from '@/context';
import { formatRelative } from '@/utils';
import { useAvailability } from '../hooks/useAvailability';
import { useIncomingService } from '../hooks/useIncomingService';
import { useMyPromos } from '../hooks/useMyPromos';
import { AvailabilitySwitch } from './AvailabilitySwitch';
import { CoverageMap } from './CoverageMap';
import { CreatePromoModal } from './CreatePromoModal';
import { PromoCard } from './PromoCard';
import '../seller-dashboard.css';

const GPS_LABEL = {
  off: 'GPS apagado',
  waiting: 'Esperando señal de GPS…',
  active: 'GPS activo',
  denied: 'GPS sin permiso',
  unavailable: 'GPS no disponible',
} as const;

export function SellerDashboardScreen() {
  const navigate = useNavigate();
  const { session } = useSession();
  const vendorId = session?.user.id ?? '';
  const { isOnline, isRecovering } = useRealtimeConnection();

  const availability = useAvailability();
  const { promos, loading, error, reload, create, flashId } = useMyPromos(vendorId);
  const incoming = useIncomingService();
  const [creating, setCreating] = useState(false);

  const activePromos = promos.filter((promo) => promo.remaining > 0).length;

  return (
    <div className="seller-dash">
      <div className="seller-dash__col">
        <ConnectionBanner isStale={!isOnline} isRecovering={isRecovering} onRetry={() => void reload()} />

        {incoming ? (
          <section className="incoming" aria-live="assertive">
            <BarberPole spinning className="incoming__pole" />
            <div className="incoming__text">
              <p className="incoming__eyebrow">Nuevo servicio</p>
              <h2 className="incoming__title">{incoming.customerName} te reservó</h2>
            </div>
            <Button onClick={() => navigate(`/seller/service/${incoming.serviceId}`)}>Ir al servicio</Button>
          </section>
        ) : null}

        <section className="seller-card seller-card--status" aria-label="Disponibilidad">
          <AvailabilitySwitch online={availability.online} onToggle={availability.toggle} />
          <p className="gps-line">
            <span className={`gps-line__dot gps-line__dot--${availability.gpsStatus}`} aria-hidden="true" />
            {GPS_LABEL[availability.gpsStatus]}
            {availability.lastSentAt ? (
              <span className="gps-line__sent"> · ubicación enviada {formatRelative(availability.lastSentAt)}</span>
            ) : null}
          </p>
          {availability.gpsError ? (
            <p className="panel panel--error" role="alert">
              {availability.gpsError}
            </p>
          ) : null}
        </section>

        <section className="seller-card seller-card--map" aria-label="Tu ubicación y cobertura">
          <CoverageMap position={availability.position} online={availability.online} />
        </section>
      </div>

      <section className="seller-dash__col seller-promos" aria-labelledby="promos-title">
        <header className="seller-promos__head">
          <div>
            <h2 id="promos-title" className="seller-promos__title">
              Tus promociones
            </h2>
            <p className="seller-promos__summary">
              {loading ? 'Cargando…' : `${activePromos} activas · los cupos se actualizan en vivo`}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>Crear promoción</Button>
        </header>

        {error ? (
          <div className="panel panel--error" role="alert">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => void reload()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {!loading && promos.length === 0 && !error ? (
          <div className="seller-promos__empty">
            <p>Aún no tienes promociones.</p>
            <p>Publica una con cupos limitados para atraer a clientes cercanos.</p>
          </div>
        ) : (
          <ul className="seller-promos__list">
            {promos.map((promo) => (
              <PromoCard key={promo.promoId} promo={promo} flash={flashId === promo.promoId} />
            ))}
          </ul>
        )}
      </section>

      <CreatePromoModal open={creating} onClose={() => setCreating(false)} onCreate={create} />
    </div>
  );
}
