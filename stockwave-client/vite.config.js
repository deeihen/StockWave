import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '..',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5258',
        changeOrigin: true,
        secure: false
      }
    }
  }
})