/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENVIRONMENT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
