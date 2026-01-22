import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ... andere Konfigurationen
  define: {
    // Hier definieren wir die Variable für die Testumgebung
    'import.meta.env.VITE_API_BASE': JSON.stringify('http://localhost:8000'),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  // @ts-ignore - Vitest benötigt diesen Block
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts', // Pfad prüfen!
    deps: {
      optimizer: {
        web: {
          include: ['react', 'react-dom'],
        },
      },
    },
  },
})

