/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  // Weitere env-Variablen können hier hinzugefügt werden
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

