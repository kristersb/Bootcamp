import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { Features } from 'lightningcss'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  css: {
    lightningcss: {
      // Vite's default CSS minifier (lightningcss) downlevels light-dark() - which index.css's whole
      // theme system is built on - into a `prefers-color-scheme`-only polyfill, which silently ignores
      // the app's own `color-scheme` override (Settings' Theme picker: see SettingsContext.jsx). Telling
      // it to never compile this one feature leaves it as the real, native function everywhere.
      exclude: Features.LightDark,
    },
  },
})
