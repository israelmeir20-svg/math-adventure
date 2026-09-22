/**
 * Vite config for the picnic contact sheet.
 *
 * Builds `tools/picnicSheet.tsx` as an SSR bundle so the stage components can be
 * rendered with the project's own JSX runtime, then run through Node to write a
 * static HTML file. Separate from the invariant checks because this one is for
 * looking at, not for asserting.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: fileURLToPath(new URL('./picnicSheet.tsx', import.meta.url)),
    outDir: 'node_modules/.tmp/picnic-sheet',
    emptyOutDir: true,
    minify: false,
    rollupOptions: { output: { entryFileNames: 'sheet.mjs' } },
  },
  logLevel: 'error',
});
