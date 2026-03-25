import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // Semua request /api/... diteruskan ke Laravel
      '/api': {
        target: 'http://localhost:8000',   // ← sesuaikan port Laravel kamu
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
