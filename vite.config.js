import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      // Ignore PNG/JPG files placed in the project root (e.g. logo assets)
      ignored: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.webp']
    }
  }
})
