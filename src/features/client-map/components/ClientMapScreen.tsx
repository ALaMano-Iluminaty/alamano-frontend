import { useCallback, useEffect, useState } from 'react';
import { Marker } from 'react-leaflet';
import type L from 'leaflet';
import { Button, ConnectionBanner } from '@/components';
import { useRealtimeConnection } from '@/context';
import { useCurrentPosition } from '@/lib/geo';
import { BaseMap, selfIcon } from '@/lib/map';
import { useNearbyVendors } from '../hooks/useNearbyVendors';
import { useVendorActions } from '../hooks/useVendorActions';
import { NEARBY_RADIUS_KM } from '../services';
import { MapBridge } from './MapBridge';
import { VendorMarkersLayer } from './VendorMarkersLayer';
import { VendorSheet } from './VendorSheet';
import '../client-map.css';

const USER_ZOOM = 15;

export function ClientMapScreen() {
  const { position, status: locateStatus, locate } = useCurrentPosition();
  const located = locateStatus !== 'locating';
  const { isOnline, isRecovering } = useRealtimeConnection();
  const { vendors, loading, error, reload, patchPromo, removeVendor } = useNearbyVendors(position, located);

  const [map, setMap] = useState<L.Map | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? (vendors.get(selectedId) ?? null) : null;

  const closeSheet = useCallback(() => setSelectedId(null), []);

  const { reserve, claim, reservingId, claimingId } = useVendorActions({
    onVendorTaken: (vendorId) => {
      removeVendor(vendorId);
      setSelectedId(null);
    },
    onPromoStock: (vendorId, promoId, remaining) => patchPromo(vendorId, promoId, { remaining }),
  });

  // Si el barbero abierto se desconecta o lo reservan, el sheet se cierra solo.
  useEffect(() => {
    if (selectedId && !vendors.has(selectedId) && !loading) setSelectedId(null);
  }, [selectedId, vendors, loading]);

  // En móvil el sheet tapa la mitad baja: se sube el barbero elegido al tercio superior.
  useEffect(() => {
    if (!map || !selectedId) return;
    const vendor = vendors.get(selectedId);
    if (!vendor) return;
    const mobile = window.matchMedia('(max-width: 899px)').matches;
    map.panTo([vendor.lat, vendor.lng], { animate: true });
    if (mobile) map.panBy([0, map.getSize().y * 0.28], { animate: true });
    // Solo al elegir: si siguiera al barbero en cada update, pelearía con el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedId]);

  // Centrar en el usuario en cuanto el navegador da la ubicación.
  useEffect(() => {
    if (map && locateStatus === 'ready') map.setView([position.lat, position.lng], USER_ZOOM);
  }, [map, locateStatus, position]);

  const recenter = () => {
    locate();
    map?.flyTo([position.lat, position.lng], USER_ZOOM, { duration: 0.6 });
  };

  const count = vendors.size;

  return (
    <section className="client-map" aria-label="Mapa de barberos cercanos">
      <BaseMap center={position} zoom={13} className="client-map__canvas">
        <MapBridge onReady={setMap} />
        {locateStatus === 'ready' ? (
          <Marker position={[position.lat, position.lng]} icon={selfIcon} title="Tu ubicación" keyboard={false} />
        ) : null}
        <VendorMarkersLayer vendors={vendors} selectedId={selectedId} onSelect={setSelectedId} />
      </BaseMap>

      <div className="client-map__top">
        <div className="radar" role="status" aria-live="polite">
          {loading && count === 0 ? (
            <span className="radar__label">Buscando barberos cerca…</span>
          ) : (
            <>
              <span className="radar__count">{count}</span>
              <span className="radar__label">
                {count === 1 ? 'barbero disponible' : 'barberos disponibles'}
                <small>a menos de {NEARBY_RADIUS_KM} km · en vivo</small>
              </span>
            </>
          )}
        </div>

        <ConnectionBanner isStale={!isOnline} isRecovering={isRecovering} onRetry={() => void reload()} />

        {locateStatus === 'denied' || locateStatus === 'unavailable' ? (
          <div className="client-map__notice" role="status">
            <span>
              {locateStatus === 'denied'
                ? 'Sin permiso de ubicación: el mapa muestra el centro de la ciudad.'
                : 'No pudimos obtener tu ubicación.'}
            </span>
            <Button variant="ghost" onClick={locate}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {error ? (
          <div className="client-map__notice client-map__notice--error" role="alert">
            <span>No se pudo cargar el mapa: {error}</span>
            <Button variant="ghost" onClick={() => void reload()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {!loading && !error && count === 0 ? (
          <div className="client-map__notice">
            Ahora mismo no hay barberos disponibles cerca. El mapa se actualiza solo cuando alguno se
            conecte.
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`recenter ${selected ? 'recenter--behind-sheet' : ''}`}
        onClick={recenter}
        aria-label="Centrar el mapa en mi ubicación"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <VendorSheet
        vendor={selected}
        origin={position}
        reserving={reservingId !== null && reservingId === selectedId}
        claimingId={claimingId}
        onReserve={(vendor) => void reserve(vendor)}
        onClaim={(promo) => void claim(promo)}
        onClose={closeSheet}
      />
    </section>
  );
}
