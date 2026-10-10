import { useEffect } from 'react';
import { Circle, Marker, useMap } from 'react-leaflet';
import { DEFAULT_CENTER, type GeoPoint } from '@/lib/geo';
import { BaseMap, selfIcon } from '@/lib/map';
import { COVERAGE_RADIUS_M } from '../services';

interface CoverageMapProps {
  position: GeoPoint | null;
  online: boolean;
}

function FollowPosition({ position }: { position: GeoPoint }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [map, position]);
  return null;
}

/** Resumen de dónde estás y hasta dónde te ven los clientes (L.circle). */
export function CoverageMap({ position, online }: CoverageMapProps) {
  const center = position ?? DEFAULT_CENTER;

  return (
    <div className={`coverage ${online ? '' : 'coverage--off'}`}>
      <BaseMap center={center} zoom={13} interactive={false} className="coverage__map">
        {position ? (
          <>
            <FollowPosition position={position} />
            <Circle
              center={[position.lat, position.lng]}
              radius={COVERAGE_RADIUS_M}
              pathOptions={{ className: 'coverage__circle' }}
            />
            <Marker position={[position.lat, position.lng]} icon={selfIcon} keyboard={false} />
          </>
        ) : null}
      </BaseMap>
      {!online ? (
        <p className="coverage__overlay">Conéctate para compartir tu ubicación.</p>
      ) : !position ? (
        <p className="coverage__overlay">Buscando señal de GPS…</p>
      ) : null}
      <p className="coverage__legend">
        Radio de cobertura · {COVERAGE_RADIUS_M / 1000} km
      </p>
    </div>
  );
}
