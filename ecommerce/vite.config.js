import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({ root: fileURLToPath(new URL('.', import.meta.url)), plugins: [react()], server: { port: 5174, proxy: { '/shop-api': { target: 'http://127.0.0.1:3003', changeOrigin: false } } }, build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } } } });
