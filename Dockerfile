# Imagen del frontend de ALaManoApp: compila con Vite y sirve estáticos con nginx.
# Detrás de alamano-infra, su nginx ya enruta /auth, /api y /ws a los servicios:
# esta imagen solo responde por "/".

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Nunca se publica una imagen con datos simulados, aunque alguien tenga un .env local.
# Las URLs no se fijan aquí: el código usa /api, /auth y /ws (rutas relativas), que es
# lo que nginx y Caddy esperan. Con http://localhost:XXXX se rompería en la VM.
ENV VITE_USE_MOCKS=false
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1