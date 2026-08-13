import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@mamasafe/clinical-core': r('./packages/clinical-core/src/index.ts'),
      '@mamasafe/audit': r('./packages/audit/src/index.ts'),
      '@mamasafe/ai-gateway': r('./packages/ai-gateway/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
    environment: 'node',
    reporters: ['default'],
  },
});
