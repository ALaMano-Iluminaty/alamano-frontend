# Barbería — Frontend

React + TypeScript + Vite. Consume **Auth** y el **Core** por REST y recibe eventos del **Realtime Gateway**
por WebSocket (STOMP). Mapas con Leaflet (teselas estándar de `tile.openstreetmap.org`, sin API key).

## Arranque

```bash
npm install
cp .env.example .env    # obligatorio: Vite lee las variables de .env; VITE_USE_MOCKS=true para ver todo sin backend
npm run dev
```

| Script             | Qué hace                                  |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Servidor de desarrollo en `:5173`         |
| `npm run build`    | Typecheck + build de producción a `dist/` |
| `npm run lint`     | ESLint, sin warnings permitidos           |
| `npm run typecheck`| Solo TypeScript                           |
| `npm test`         | Tests con Vitest                          |
| `npm run format`   | Prettier sobre `src/`                     |

Variables de entorno (`.env.example`):

- `VITE_API_GATEWAY_URL` — base REST del Core, por defecto `/api` (la atiende el proxy de Vite)
- `VITE_WS_GATEWAY_URL` — WebSocket STOMP, por defecto `/ws` (la atiende el proxy de Vite)
- `VITE_AUTH_URL` — base de Auth, por defecto `/auth`
- `VITE_USE_MOCKS` — `true` simula datos y eventos en el navegador (ver [Modo demo](#modo-demo))
- `VITE_ACTIVE_SERVICES_PATH` — servicios activos del usuario. Vacía hasta que el Core esté
  desplegado; luego `/services/active` (relativa a la base: `GET /api/services/active`). Ver
  [Resincronización](#resincronización-64)

Ver [Integración con el backend real](#integración-con-el-backend-real) para los servicios y el proxy.

## Pantallas del MVP

| Ruta                          | Rol      | Épica / feature        | Carpeta                      |
| ----------------------------- | -------- | ---------------------- | ---------------------------- |
| `/login`, `/register`         | —        | 1.1                    | `features/auth`              |
| `/map`                        | Cliente  | 2.1 · 4.2              | `features/client-map`        |
| `/seller/dashboard`           | Barbero  | 2.2 · 4.2              | `features/seller-dashboard`  |
| `/tracking/:serviceId`        | Cliente  | 3.1                    | `features/tracking`          |
| `/seller/service/:serviceId`  | Barbero  | 3.2                    | `features/seller-service`    |

Las rutas se protegen por rol (`<RequireAuth role="…">`): un usuario con otro rol vuelve a su inicio.

## Estructura

```
src/
├── components/      Solo genérico (Button, Input, Modal, Sheet, BarberPole, Toast…)
├── layouts/         AppLayout (autenticado) · AuthLayout (login/registro)
├── lib/
│   ├── api-client/  Cliente REST hacia el gateway
│   ├── realtime/    Todo el WebSocket vive aquí
│   ├── geo/         Geolocalización del navegador + distancias
│   ├── map/         BaseMap, iconos divIcon, animación de marcadores
│   ├── service/     Máquina de estados del servicio (compartida cliente/barbero)
│   └── mock/        Interruptor del modo demo
├── features/        Una carpeta por pantalla, autocontenida
├── context/         Sesión (con roles), conexión y toasts
└── utils/           Helpers puros
```

### Reglas de la estructura

- Una feature **nunca** importa de otra feature. Si dos la necesitan, sube a `lib/`, `components/` o `context/`.
- Cada feature expone su superficie pública por su `index.ts`; nadie importa rutas internas desde fuera.
- Cada feature trae su propio CSS junto a su pantalla; `index.css` solo tiene tokens y piezas compartidas.
- `components/` es solo para lo genérico. Si tiene lógica de negocio, va dentro de la feature.
- Nadie crea un `new WebSocket` fuera de `lib/realtime/socket.ts`.

## Realtime

| Archivo          | Responsabilidad                                                 |
| ---------------- | --------------------------------------------------------------- |
| `socket.ts`         | Conexión STOMP única, token en el CONNECT, reconexión, `subscribe()` y heartbeats |
| `eventGate.ts`      | Descarta eventos repetidos (`eventId`) o viejos (`version`)        |
| `gatewayAdapter.ts` | Traduce los eventos del Gateway al contrato interno                |
| `events.ts`         | Contrato interno de eventos (payloads tipados)                     |
| `useRealtime.ts`    | Hooks `useRealtime`, `useConnectionStatus` y `useServiceChannel`   |

Las features solo conocen los eventos internos: `VENDOR_LOCATION_UPDATE`, `VENDOR_DISCONNECTED`,
`PROMO_STOCK_UPDATED`, `SERVICE_STATUS_CHANGED`, `SERVICE_LOCATION_UPDATE`.
Cualquier mensaje del Gateway que no se pueda traducir se descarta con un warning.

**Reconexión.** Backoff exponencial de stompjs (1 s → 30 s máx.). Toda suscripción pedida con
`realtimeSocket.subscribe(destino)` o `useServiceChannel(id)` se rehace sola en cada reconexión. Si
el Gateway responde un frame ERROR (por ejemplo, token rechazado) no se reintenta. Los eventos
emitidos durante un corte se pierden: toda feature con estado acumulado vuelve a pedir el snapshot
REST al recuperar la conexión (patrón snapshot + deltas).

**Duplicados y desorden.** Un evento puede llegar por dos destinos o desordenado tras una
reconexión. Se descarta un `eventId` ya visto y, en `service.status.changed`, una `version` menor o
igual a la ya aplicada para ese servicio (la versión empieza en 0).

### Estados del servicio

| Core          | Front         | Stepper del cliente | Siguiente (Core)          |
| ------------- | ------------- | ------------------- | ------------------------- |
| `RESERVED`    | `ACCEPTED`    | — (punto de partida)| `EN_ROUTE` o `CANCELLED`  |
| `EN_ROUTE`    | `ON_THE_WAY`  | En camino           | `ARRIVED` o `CANCELLED`   |
| `ARRIVED`     | `ARRIVED`     | Llegó               | `IN_PROGRESS`             |
| `IN_PROGRESS` | `IN_PROGRESS` | Iniciando           | `COMPLETED`               |
| `COMPLETED`   | `COMPLETED`   | Finalizado          | —                         |
| `CANCELLED`   | `CANCELLED`   | —                   | —                         |

Un estado desconocido se muestra tal cual en vez de romper la pantalla. El botón del vendedor sale
de `allowedTransitions` de `GET /api/services/{id}`: el front no repite la máquina de estados del
Core (solo la usa el modo demo).

## Concurrencia (4.2)

Reservar un barbero o tomar un cupo de promoción puede chocar con otro cliente. El botón pasa a
`loading` mientras la petición está en vuelo; un `409` del gateway significa que otro ganó la
carrera: se avisa con un toast y se actualiza la disponibilidad al momento.

## Modo demo

Con `VITE_USE_MOCKS=true` los `services.ts` devuelven datos simulados y el socket no abre conexión:
los mocks inyectan eventos con `realtimeSocket.dispatch()`. Sirve para ver y probar las pantallas
mientras el backend no existe. Login demo: cualquier correo entra como cliente; uno que empiece por
`barbero` entra como barbero.

## Integración con el backend real

| Servicio         | Puerto local | Ruta en el navegador | Variable del proxy |
| ---------------- | ------------ | -------------------- | ------------------ |
| Auth             | 8081         | `/auth/*`            | `AUTH_URL`         |
| Core             | 8082         | `/api/*`             | `CORE_URL`         |
| Realtime Gateway | 8083         | `/ws` (WebSocket)    | `GATEWAY_URL`      |

El navegador solo habla con `localhost:5173`: el proxy de `vite.config.ts` reparte las peticiones
(sin CORS, igual que nginx en producción). Para apuntar a
otro host, se exportan las variables antes de arrancar, por ejemplo
`CORE_URL=http://otra-maquina:8082 npm run dev`. El puerto de Auth (8081) es provisional: ajustarlo
al que use `alamano-auth-service`.

El JWT viaja en `Authorization: Bearer <jwt>` en REST y en el frame CONNECT de STOMP. El backend
usa los roles `CLIENT` y `PROFESSIONAL`; al iniciar sesión se convierten a `CUSTOMER` y `SELLER`.

### WebSocket (STOMP)

STOMP sobre WebSocket nativo (sin SockJS) en `VITE_WS_GATEWAY_URL` (`/ws`), heartbeats de 10 s.
El token va en el CONNECT (`Authorization: Bearer <jwt>`), nunca en la URL.

| Destino                     | Quién                 | Para qué                                                          |
| --------------------------- | --------------------- | ----------------------------------------------------------------- |
| `/topic/map`                | todos                 | Vendedores que se conectan o desconectan                          |
| `/user/queue/errors`        | todos                 | Errores del Gateway (por ahora solo a la consola)                 |
| `/user/queue/services`      | vendedor (`SELLER`)   | Aviso de reserva: `service.status.changed` con `RESERVED`         |
| `/topic/service.{id}`       | cliente y vendedor    | Estado y posición del servicio que se está siguiendo              |

El cliente sigue `/topic/service.{id}` del servicio que creó. El vendedor, al llegar el aviso de
reserva, pide `GET /api/services/{id}` para el destino (el evento no trae nombre ni destino) y
empieza a seguir `/topic/service.{id}`; si el cliente cancela, el aviso desaparece.

| Evento del Gateway          | Evento interno            | Campos                                                                       |
| --------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `professional.online`       | `VENDOR_LOCATION_UPDATE`  | `professionalId → vendorId`, `latitude → lat`, `longitude → lng`, `occurredAt → updatedAt` |
| `professional.disconnected` | `VENDOR_DISCONNECTED`     | `professionalId → vendorId`, `reason: 'OFFLINE'`                             |
| `service.status.changed`    | `SERVICE_STATUS_CHANGED`  | `serviceId`, `status` y `previousStatus` (ver estados), `professionalId`, `clientId`, `version` |
| `tracking.updated`          | `SERVICE_LOCATION_UPDATE` | `latitude → lat`, `longitude → lng`, `etaSeconds`, `recordedAt → updatedAt`  |
| cualquier otro              | — (se ignora)             |                                                                              |

El front todavía no envía nada por el WebSocket (`emit` es un no-op): el Gateway aún no recibe
mensajes del cliente.

### REST del Core

- `GET /api/professionals/nearby?lat&lng&radiusKm`: snapshot del mapa del cliente. El Core aún no
  manda nombres, así que se muestra `Vendedor <6 primeros caracteres del id>`.
- `POST /api/professionals/me/online` con `{ latitude, longitude }`: se llama al pasar a "En línea"
  con la primera lectura del GPS. Un `409 professional_busy` apaga el interruptor y avisa.

### Probar sin el login de Auth

1. Generar un token con `scripts/token.sh` del repo `alamano-realtime-gateway`.
2. Con `VITE_USE_MOCKS=false`, en la consola del navegador (en `localhost:5173`):

   ```js
   localStorage.setItem('barberia.session', JSON.stringify({
     token: '<jwt>',
     user: { id: 'cliente-1', name: 'Cliente', email: 'cliente@demo.com', role: 'CUSTOMER' }
   }));
   location.reload();
   ```

   Para el vendedor: `id` igual al `sub` del token y `role: 'SELLER'`.

### Resincronización (6.4)

Al conectar y al reconectar el socket se vuelve a pedir el servicio en curso por REST:

- **Cliente:** al reservar se guarda el `serviceId` en `localStorage` (`barberia.activeService`).
  Al reconectar se pide `GET /api/services/{id}`; si sigue activo, el mapa muestra "Tienes un
  servicio en curso" con acceso al seguimiento. Al terminar o cancelarse se olvida.
- **Vendedor:** sin solución por ahora. El Core no expone los servicios activos del usuario;
  `fetchActiveServices()` (en `lib/service/activeService.ts`) queda lista detrás de
  `VITE_ACTIVE_SERVICES_PATH` y se usa en cuanto esa variable tenga la ruta real.

## Pendiente

- Endpoint de servicios activos en el Core, para resincronizar al vendedor (`VITE_ACTIVE_SERVICES_PATH`).
- Nombre del cliente y del vendedor: el Core aún no los expone.
- Tomar cupo de promoción (`POST /promotions/{id}/claims`) sigue apuntando a un endpoint que el backend aún no tiene.
