import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/*{.,-}test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/*{.,-}spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/coverage/**',
        'dist/',
        'build/'
      ]
    }
  }
})
