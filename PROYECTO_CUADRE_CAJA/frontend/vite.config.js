import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cuadrecaja/',
  plugins: [react()],
  server: {
    proxy: {
      // Esto intercepta todo lo que vaya a /cuadrecaja/api
      '/cuadrecaja/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Esto quita "/cuadrecaja" de la URL antes de enviarla al backend
        rewrite: (path) => path.replace(/^\/cuadrecaja/, '')
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})