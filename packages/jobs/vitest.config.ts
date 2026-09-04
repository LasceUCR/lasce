import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Measured at 86% lines once the Redis-bound clients are excluded.
      thresholds: { lines: 80, statements: 80, functions: 90, branches: 90 },
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      // connection.ts and queue.ts construct the ioredis and BullMQ clients and
      // cannot run without a live Redis, the same reason packages/db is left
      // out entirely. They are exercised by the worker and the e2e suite.
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/connection.ts', 'src/queue.ts'],
    },
  },
})
