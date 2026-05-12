import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';

function resolveProxyTarget(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || !/^https?:\/\//.test(normalized)) {
    return 'http://127.0.0.1:4000';
  }

  return normalized.replace(/\/$/, '');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = resolveProxyTarget(env.VITE_API_URL);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@bingo/contracts': fileURLToPath(
          new URL('../../packages/contracts/src/index.ts', import.meta.url),
        ),
        '@bingo/ui': fileURLToPath(
          new URL('../../packages/ui/src/index.ts', import.meta.url),
        ),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/public': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
