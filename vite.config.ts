/*
  @AUDIT_REVISION: #AUDIT-ERP-20261101-01
  @STATUS: PENDING_CI
  @SCOPE: vite.config.ts
  @CHECKLIST: Package-Version-Define | React-Vite-Compatible | No-UI-Changes
*/
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkgVersion: string = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
).version;

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
  },
});
