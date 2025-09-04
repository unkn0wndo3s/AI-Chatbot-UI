declare global {
  interface Window {
    __ENV__?: Record<string, any>
  }
}

export type AppConfig = {
  API_BASE: string
  USE_PROXY: boolean
  PUBLIC_API_KEY: string
}

// Valeurs par défaut (écrasées au runtime)
export const cfg: AppConfig = {
  API_BASE: '/api',
  USE_PROXY: false,
  PUBLIC_API_KEY: '',
}

export async function initConfig(): Promise<void> {
  // 1) runtime (_env.js) a priorité
  const rt = (window.__ENV__ ?? {}) as Partial<AppConfig>

  // 2) fallback sur les .env Vite (compile-time)
  const viteBase = (import.meta as any).env?.VITE_API_BASE
  const viteProxy = (import.meta as any).env?.VITE_USE_PROXY === 'true'
  const viteKey = (import.meta as any).env?.VITE_PUBLIC_API_KEY

  cfg.API_BASE = rt.API_BASE ?? viteBase ?? '/api'
  cfg.USE_PROXY = rt.USE_PROXY ?? viteProxy ?? false
  cfg.PUBLIC_API_KEY = rt.PUBLIC_API_KEY ?? viteKey ?? ''
}
