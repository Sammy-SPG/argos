import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { NODE_ENV: 'test', ENABLE_TEST_ROUTES: 'true' },
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});
