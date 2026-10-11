/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_GATEWAY_URL: string;
  readonly VITE_WS_GATEWAY_URL: string;
  /** 'true' activa los mocks de `lib/mock`. */
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_AUTH_URL?: string;
  /** Ruta de los servicios activos del usuario. Vacía mientras el Core no la tenga. */
  readonly VITE_ACTIVE_SERVICES_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
