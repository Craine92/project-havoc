/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HAVOC_SERVER_URL?: string
  readonly VITE_PUBLIC_JOIN_URL?: string
  readonly VITE_ALLOW_LOOPBACK_JOIN_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
