import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cuadrecaja/',
  plugins: [react()],
  server: {
    proxy: {
      '/cuadrecaja/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cuadrecaja\/api/, '/api'),
      },
    },
  },
})