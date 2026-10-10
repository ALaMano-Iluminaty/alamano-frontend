import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ConnectionBanner } from '@/components';
import { useRealtimeConnection } from '@/context';
import { SERVICE_STATUS_LABEL, type ServiceDetail } from '@/lib/service';
import { etaMinutes, formatTime } from '@/utils';
import { useServiceTracking } from '../hooks/useServiceTracking';
import { ServiceStepper } from './ServiceStepper';
import { TrackingMap } from './TrackingMap';
import '../tracking.css';

interface TrackingScreenProps {
  serviceId: string;
}

/** Titular grande de la tarjeta: lo único que el cliente necesita saber de un vistazo. */
function headline(service: ServiceDetail): { big: string; small: string } {
  switch (service.status) {
    case 'ACCEPTED':
      return { big: 'Preparándose', small: `${service.vendor.name} aceptó tu servicio y sale en breve.` };
    case 'ON_THE_WAY': {
      if (service.etaSeconds === undefined) return { big: 'En camino', small: 'Calculando la llegada…' };
      const arrival = new Date(Date.now() + service.etaSeconds * 1000).toISOString();
      return {
        big: `${etaMinutes(service.etaSeconds)} min`,
        small: `Llega hacia las ${formatTime(arrival)}.`,
      };
    }
    case 'ARRIVED':
      return { big: 'En la puerta', small: `${service.vendor.name} ya llegó a tu ubicación.` };
    case 'COMPLETED':
      return { big: 'Listo', small: 'Servicio completado. ¡Gracias por usar Barbería!' };
    case 'CANCELLED':
      return { big: 'Cancelado', small: 'Este servicio se canceló.' };
  }
}

export function TrackingScreen({ serviceId }: TrackingScreenProps) {
  const navigate = useNavigate();
  const { service, loading, error, reload } = useServiceTracking(serviceId);
  const { isOnline, isRecovering } = useRealtimeConnection();
  const [autoFit, setAutoFit] = useState(true);
  const [fitRequest, setFitRequest] = useState(0);

  const onUserMove = useCallback(() => setAutoFit(false), []);

  if (loading) {
    return <p className="tracking__loading">Cargando tu servicio…</p>;
  }

  if (error || !service) {
    return (
      <div className="tracking__failed">
        <p className="panel panel--error">{error ?? 'No encontramos ese servicio.'}</p>
        <Button variant="secondary" onClick={() => void reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { big, small } = headline(service);
  const ended = service.status === 'COMPLETED' || service.status === 'CANCELLED';

  return (
    <section className="tracking" aria-label={`Seguimiento del servicio con ${service.vendor.name}`}>
      <TrackingMap
        customer={service.customerLocation}
        vendor={service.vendorLocation}
        vendorName={service.vendor.name}
        route={service.route}
        autoFit={autoFit}
        onUserMove={onUserMove}
        fitRequest={fitRequest}
      />

      <div className="tracking__top">
        <ConnectionBanner isStale={!isOnline} isRecovering={isRecovering} onRetry={() => void reload()} />
        {!autoFit && !ended ? (
          <button
            type="button"
            className="tracking__refit"
            onClick={() => {
              setAutoFit(true);
              setFitRequest((n) => n + 1);
            }}
          >
            Ver trayecto completo
          </button>
        ) : null}
      </div>

      <article className={`eta-card eta-card--${service.status.toLowerCase()}`}>
        <header className="eta-card__vendor">
          <span className="eta-card__avatar" aria-hidden="true">
            {service.vendor.name.charAt(0)}
          </span>
          <div>
            <p className="eta-card__name">{service.vendor.name}</p>
            {service.vendor.specialty ? <p className="eta-card__specialty">{service.vendor.specialty}</p> : null}
          </div>
          <span className="eta-card__status">{SERVICE_STATUS_LABEL[service.status]}</span>
        </header>

        {/* Se anuncia cada cambio de estado o de ETA sin mover el foco. */}
        <div className="eta-card__headline" aria-live="polite">
          <p className="eta-card__big">{big}</p>
          <p className="eta-card__small">{small}</p>
        </div>

        {service.status !== 'CANCELLED' ? <ServiceStepper status={service.status} /> : null}

        {ended ? (
          <Button className="eta-card__done" onClick={() => navigate('/map')}>
            Volver al mapa
          </Button>
        ) : null}
      </article>
    </section>
  );
}
