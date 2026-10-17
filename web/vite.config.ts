/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// 개발 중에는 /api를 로컬 백엔드(8080)로 넘긴다 — 웹과 API가 같은 주소(origin)라 CORS가 필요 없고 쿠키가 그대로 오간다.
// 배포에서도 Caddy가 같은 주소로 / → 웹, /api → 서버로 나눈다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
