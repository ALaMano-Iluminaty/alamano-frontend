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
        ],
      },
    },
  }),
);
