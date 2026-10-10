import L from 'leaflet';

// Leaflet resuelve sus iconos por URL relativa y Vite no los empaqueta:
// todos los marcadores son divIcon dibujados con CSS (ver index.css).

/** Barbero disponible: pin con la franja del poste dentro. */
export const vendorIcon = L.divIcon({
  className: 'map-icon',
  html: '<span class="vendor-pin"><span class="vendor-pin__pole"></span></span>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
});

export const vendorIconSelected = L.divIcon({
  className: 'map-icon',
  html: '<span class="vendor-pin vendor-pin--selected"><span class="vendor-pin__pole"></span></span>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
});

/** El propio usuario: punto con halo que respira. */
export const selfIcon = L.divIcon({
  className: 'map-icon',
  html: '<span class="self-dot"><span class="self-dot__halo"></span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Destino del servicio (la casa del cliente, vista por el barbero). */
export const destinationIcon = L.divIcon({
  className: 'map-icon',
  html: '<span class="dest-pin"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});
