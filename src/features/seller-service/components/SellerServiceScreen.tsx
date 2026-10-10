import { useNavigate } from 'react-router-dom';
import { BarberPole, Button, ConnectionBanner } from '@/components';
import { useRealtimeConnection } from '@/context';
import { useCurrentPosition, type WatchStatus } from '@/lib/geo';
import type { ServiceStatus } from '@/lib/realtime';
import { SERVICE_STATUS_LABEL, sharesLocation } from '@/lib/service';
import { formatRelative } from '@/utils';
import { useLocationSharing } from '../hooks/useLocationSharing';
import { useSellerService } from '../hooks/useSellerService';
import { RouteMap } from './RouteMap';
import { StatusControls } from './StatusControls';
import '../seller-service.css';

interface SellerServiceScreenProps {
  serviceId: string;
}

function gpsMessage(status: ServiceStatus, gps: WatchStatus, lastSentAt: string | null): string {
  if (!sharesLocation(status)) {
    return status === 'ACCEPTED'
      ? 'Ubicación privada · se comparte al iniciar el trayecto'
      : 'Ubicación privada · ya no se comparte';
  }
  if (gps === 'denied') return 'Sin permiso de GPS: el cliente no ve tu posición';
  if (gps === 'unavailable') return 'Sin señal de GPS: el cliente no ve tu posición';
  if (gps === 'waiting') return 'Buscando señal de GPS…';
  return lastSentAt ? `Compartiendo tu ubicación · enviada ${formatRelative(lastSentAt)}` : 'Compartiendo tu ubicación';
}

export function SellerServiceScreen({ serviceId }: SellerServiceScreenProps) {
  const navigate = useNavigate();
  const { isOnline, isRecovering } = useRealtimeConnection();
  const { service, loading, error, reload, advance, advancing } = useSellerService(serviceId);

  const sharing = service ? sharesLocation(service.status) : false;
  const location = useLocationSharing(serviceId, sharing);
  // Fuera del trayecto no se transmite nada, pero el barbero sí ve dónde está.
  const { position: localPosition, status: localStatus } = useCurrentPosition();

  if (loading) return <p className="seller-service__loading">Cargando el servicio…</p>;

  if (error || !service) {
    return (
      <div className="seller-service__failed">
        <p className="panel panel--error">{error ?? 'No encontramos ese servicio.'}</p>
        <Button variant="secondary" onClick={() => void reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const me = location.position ?? (localStatus === 'ready' ? localPosition : service.vendorLocation);
  const gpsProblem = sharing && (location.gpsStatus === 'denied' || location.gpsStatus === 'unavailable');
  const transmitting = sharing && location.gpsStatus === 'active';
  const ended = service.status === 'COMPLETED' || service.status === 'CANCELLED';

  return (
    <section className="seller-service" aria-label={`Servicio para ${service.customer.name}`}>
      <RouteMap me={me} destination={service.customerLocation} customerName={service.customer.name} />

      <div className="seller-service__top">
        <ConnectionBanner isStale={!isOnline} isRecovering={isRecovering} onRetry={() => void reload()} />
      </div>

      <aside className="service-panel">
        <header className="service-panel__head">
          <div>
            <p className="service-panel__eyebrow">{SERVICE_STATUS_LABEL[service.status]}</p>
            <h1 className="service-panel__name">{service.customer.name}</h1>
            {service.customer.address ? <p className="service-panel__address">{service.customer.address}</p> : null}
          </div>
        </header>

        <p
          className={`gps-pill ${transmitting ? 'gps-pill--live' : ''} ${gpsProblem ? 'gps-pill--problem' : ''}`}
          role="status"
          aria-live="polite"
        >
          <BarberPole orientation="vertical" spinning={transmitting} className="gps-pill__pole" />
          <span>{gpsMessage(service.status, location.gpsStatus, location.lastSentAt)}</span>
        </p>
        {location.sendError && sharing ? (
          <p className="service-panel__warn">La última posición no llegó al servidor; se reintenta con la siguiente.</p>
        ) : null}

        {service.status === 'CANCELLED' ? (
          <p className="panel panel--error">El cliente canceló este servicio.</p>
        ) : (
          <StatusControls status={service.status} advancing={advancing} onAdvance={() => void advance()} />
        )}

        {ended ? (
          <Button variant="secondary" className="service-panel__back" onClick={() => navigate('/seller/dashboard')}>
            Volver a mi panel
          </Button>
        ) : null}
      </aside>
    </section>
  );
}
