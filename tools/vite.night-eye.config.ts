/**
 * Vite config for the night-barn EYE PROBE.
 *
 * Renders every species with its computed eyes marked, so the percentage offsets
 * can be checked by eye against the actual sprites. Separate from the geometry
 * check because this one is for looking at, not for asserting.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: fileURLToPath(new URL('./nightEyeProbe.tsx', import.meta.url)),
    outDir: 'node_modules/.tmp/night-eye-probe',
    emptyOutDir: true,
    minify: false,
    rollupOptions: { output: { entryFileNames: 'probe.mjs' } },
  },
  logLevel: 'error',
});
