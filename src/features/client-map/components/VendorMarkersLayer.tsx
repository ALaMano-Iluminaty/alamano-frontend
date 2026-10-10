import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { animateMarkerTo, vendorIcon, vendorIconSelected } from '@/lib/map';
import type { Vendor } from '../services';

interface VendorMarkersLayerProps {
  vendors: Map<string, Vendor>;
  selectedId: string | null;
  onSelect: (vendorId: string) => void;
}

/**
 * Marcadores de barberos gestionados a mano, fuera del árbol de React.
 *
 * Con decenas de barberos moviéndose cada pocos segundos, re-renderizar
 * <Marker> por cada evento es caro. Aquí se guarda un Map<vendorId, L.Marker>
 * y cada evento solo mueve (animado) el marcador que cambió.
 */
export function VendorMarkersLayer({ vendors, selectedId, onSelect }: VendorMarkersLayerProps) {
  const map = useMap();
  const markers = useRef(new Map<string, L.Marker>());

  // El click se registra una vez por marcador: el handler va en ref.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const current = markers.current;

    for (const vendor of vendors.values()) {
      const existing = current.get(vendor.vendorId);
      if (existing) {
        animateMarkerTo(existing, vendor);
        continue;
      }
      const marker = L.marker([vendor.lat, vendor.lng], {
        icon: vendorIcon,
        title: vendor.name,
        alt: `Barbero ${vendor.name}`,
        riseOnHover: true,
      })
        .on('click', () => onSelectRef.current(vendor.vendorId))
        .addTo(map);
      current.set(vendor.vendorId, marker);
    }

    for (const [vendorId, marker] of current) {
      if (!vendors.has(vendorId)) {
        marker.remove();
        current.delete(vendorId);
      }
    }
  }, [vendors, map]);

  useEffect(() => {
    for (const [vendorId, marker] of markers.current) {
      const selected = vendorId === selectedId;
      marker.setIcon(selected ? vendorIconSelected : vendorIcon);
      marker.setZIndexOffset(selected ? 1000 : 0);
    }
  }, [selectedId, vendors]);

  useEffect(() => {
    const current = markers.current;
    return () => {
      for (const marker of current.values()) marker.remove();
      current.clear();
    };
  }, []);

  return null;
}
