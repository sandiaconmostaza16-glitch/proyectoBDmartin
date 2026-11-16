import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    port: 5173,
    // El navegador llama a /api en el mismo origen y Vite lo reenvia al backend.
    proxy: {
      '/api/': 'http://localhost:3000'
    }
  }
});
