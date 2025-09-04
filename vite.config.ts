import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useProxy = env.VITE_USE_PROXY === 'true'

  return {
    plugins: [vue()],
    server: {
      proxy: useProxy
        ? {
            '/api': {
              target: env.VITE_API_BASE,
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
