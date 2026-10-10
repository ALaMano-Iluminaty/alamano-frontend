/**
 * Teselas estándar de OpenStreetMap: livianas y sin API key. El modo oscuro
 * no cambia de proveedor: se invierte la capa por CSS (ver `.base-map` en
 * index.css), así no hay que recargar teselas al cambiar de tema.
 *
 * Para producción con tráfico real conviene un proveedor con SLA (la
 * política de uso de tile.openstreetmap.org no cubre apps con volumen).
 */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
