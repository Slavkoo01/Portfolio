import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  server: {
    proxy: {
      // Forward all /api requests to the Flask backend in development.
      // This makes the browser treat them as same-origin, so session cookies
      // and CSRF work without CORS headaches.
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
