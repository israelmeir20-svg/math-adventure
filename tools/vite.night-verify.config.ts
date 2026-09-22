/**
 * Vite config for the night-barn render verification.
 *
 * The check renders the REAL stage component, which uses the automatic JSX
 * runtime and imports PNG sprites. Rather than bolt a second JSX toolchain onto
 * the test, it is bundled and run through the SAME pipeline the app uses, so
 * sprite resolution and JSX behave exactly as they do in production.
 *
 * `ssr` mode keeps `react-dom/server` external so Node's own copy is used.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: fileURLToPath(new URL('./nightRenderCheck.ts', import.meta.url)),
    outDir: 'node_modules/.tmp/night-verify',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: { entryFileNames: 'check.mjs' },
    },
  },
  logLevel: 'warn',
});
