import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  /*
   * RELATIVE ASSET PATHS, WHICH IS WHAT MAKES THE ELECTRON BUILD WORK.
   *
   * The default base of '/' emits `<script src="/assets/index-xxxx.js">`. Over `file://`
   * that path resolves to the filesystem ROOT (`C:\assets\...`) rather than the app folder,
   * so the packaged window would open blank with only console 404s to explain it. './'
   * makes the HTML ask for assets sitting beside it, which is true both in dist/ and on the
   * dev server.
   *
   * The game has no client-side router, so there is no path-based routing that a relative
   * base could break here.
   */
  base: './',
  plugins: [react()],
  server: {
    // Pinned to match the `wait-on` target in the `electron:dev` script. `strictPort` makes a
    // busy 5173 fail loudly instead of silently drifting to 5174, which would leave `wait-on`
    // waiting on a port nothing is serving.
    port: 5173,
    strictPort: true,
  },
})
