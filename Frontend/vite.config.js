import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  server: {
    proxy: {
      // Flask API
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      // Uploaded files (thumbnails, GLB models) served by Flask at /files/<key>
      '/files': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
})
