import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // On crée un raccourci : tout ce qui commence par /api ira vers PrestaShop
      '/api': {
        target: 'http://localhost/eval', // L'adresse de ton dossier PrestaShop
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api') 
      }
    }
  }
})
