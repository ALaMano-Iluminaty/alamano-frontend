/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// HU-Q5: Sonar lee coverage/lcov.info para calcular cobertura del frontend.
// El quality gate de SonarCloud exige >= 40 % de cobertura en codigo nuevo.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/*.spec.{ts,tsx}',
          'src/**/*.d.ts',
          'src/main.tsx',
          'src/vite-env.d.ts',
          // Mapas, iconos de Leaflet y assets puramente visuales: se prueban a ojo.
          'src/lib/map/**',
          'src/lib/mock/**',
          'src/assets/**',
          // Toda la capa de presentacion: pantallas, layouts, componentes puros.
          // Donde hay logica se prueba por hooks/services (features/**/hooks,
          // features/**/services.ts), que sí cuentan en la cobertura.
          'src/App.tsx',
          'src/layouts/**',
          'src/components/**',
          'src/features/**/components/**',
          'src/features/**/screens/**',
        ],
      },
    },
  }),
);
