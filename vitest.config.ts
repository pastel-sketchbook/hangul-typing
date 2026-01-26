import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['www/src/**/*.test.{ts,tsx}'],
    globals: true,
  },
})
