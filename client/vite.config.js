import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:5001',
      '/auth': 'http://127.0.0.1:5001',
      '/uploads': 'http://127.0.0.1:5001',
      '/ws': {
        target: 'ws://127.0.0.1:5001',
        ws: true,
      },
    },
  },
});
