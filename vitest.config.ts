import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts'],
          environment: 'node',
          // Building the app and compiling the OpenAPI schema can exceed 5 s under full-suite load.
          testTimeout: 20_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          include: ['tests/component/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['tests/component/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/client/main.tsx', 'src/server/index.ts', '**/*.d.ts'],
      // Baseline measured 2026-11-17 (statements 94.05, branches 79.21, functions 96.06,
      // lines 95.76), rounded down; CI fails on a drop.
      thresholds: { statements: 94, branches: 79, functions: 96, lines: 95 },
    },
  },
});
