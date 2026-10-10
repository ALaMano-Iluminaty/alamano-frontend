import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    // El navegador solo habla con :5173 (sin CORS), igual que con nginx en producción.
    // El orden importa: la regla más específica va primero.
    proxy: {
      // Auth: ajustar el puerto al que use alamano-auth-service.
      '/api/auth': { target: process.env.AUTH_URL ?? 'http://localhost:8081', changeOrigin: true },
      '/api': { target: process.env.CORE_URL ?? 'http://localhost:8082', changeOrigin: true },
      '/ws': { target: process.env.GATEWAY_URL ?? 'http://localhost:8083', ws: true },
    },
  },
});
