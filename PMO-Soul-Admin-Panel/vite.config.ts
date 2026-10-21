import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Frontend runs on :3000 inside the sandbox and proxies /api to the
// NestJS backend on :3001 (dev). In production set VITE_API_URL.
//
// Bright PMO, local runs: DEV_PORT and DEV_API_TARGET (in .env.local) move the
// panel to :7063 and point the proxy at PMO-Soul-Backend on :7062. /socket.io
// is proxied too, for live notifications and workflow runs.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.DEV_API_TARGET || 'http://localhost:3001';
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: Number(env.DEV_PORT) || 3000,
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
    build: { outDir: 'dist', sourcemap: true },
  };
});
