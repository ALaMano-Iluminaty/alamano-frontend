# Imagen del frontend de ALaManoApp: compila con Vite y sirve estáticos con nginx.
# Detrás de alamano-infra, su nginx ya enruta /auth, /api y /ws a los servicios:
# esta imagen solo responde por "/".

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

# Nunca se publica una imagen con datos simulados, aunque alguien tenga un .env local.
# Las URLs no se fijan aquí: el código usa /api, /auth y /ws (rutas relativas), que es
# lo que nginx y Caddy esperan. Con http://localhost:XXXX se rompería en la VM.
ENV VITE_USE_MOCKS=false
ENV VITE_ACTIVE_SERVICES_PATH=/services/active

# HU-G2: el Client ID de Google se inyecta al bundle en tiempo de build. Vite
# incrusta todas las VITE_* en el JavaScript resultante, asi que tiene que estar
# presente aqui. Si queda vacio, el boton de Google muestra el aviso "Falta
# configurar VITE_GOOGLE_CLIENT_ID" y el login clasico sigue funcionando.
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# S6471: nginx corre sin root. Necesita poder escribir su pid, su cache y sus logs.
# El puerto 80 sigue funcionando sin root porque Docker abre los puertos bajos a todos los usuarios del contenedor.
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid
USER nginx

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1