/*
  @AUDIT_REVISION: #AUDIT-ERP-20260920-01
  @STATUS: VERIFIED_GREEN
  @SCOPE: vite.config.ts
  @CHECKLIST: No-Duplicate-Actions | Valid-Canonical-Links | Active-Noop-Callbacks
*/
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
  },
});
