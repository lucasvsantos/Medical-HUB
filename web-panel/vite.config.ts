import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxy = (target: string, prefix: string, destination = '') => ({
  target,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(new RegExp(`^${prefix}`), destination),
})

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': proxy('http://localhost:8083', '/api/auth'),
      '/api/appointments': proxy('http://localhost:8080', '/api/appointments', '/appointments'),
      '/api/history': proxy('http://localhost:8081', '/api/history'),
      '/api/notifications': proxy('http://localhost:8082', '/api/notifications', '/notifications'),
    },
  },
})
