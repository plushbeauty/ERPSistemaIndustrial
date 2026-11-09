/*
  @AUDIT_REVISION: #AUDIT-ERP-20260920-01
  @STATUS: VERIFIED_GREEN
  @SCOPE: vite.config.ts
  @CHECKLIST: No-Duplicate-Actions | Valid-Canonical-Links | Active-Noop-Callbacks
*/
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkgVersion: string = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
).version;

type CarimboDePublicacao = {
  contrato: string
  branchOficial: string
  branchesDeProducaoPermitidas: string[]
  branch: string
  commit: string
  quando: string
  ambiente: string
}

/**
 * Carimbo embutido no bundle: toda tela mostra de qual commit veio o build, e o alerta da shell
 * acusa publicacao fora da linhagem. Sem isso, um deploy antigo e um deploy novo sao identicos
 * na tela — foi assim que o sistema "voltou" para as telas velhas sem ninguem perceber.
 */
const linhagem = JSON.parse(
  readFileSync(new URL('./scripts/release-lineage.json', import.meta.url), 'utf8'),
) as { contrato: string; branchOficial: string }

const consultaGit = (comando: string): string => {
  try {
    return execSync(comando, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

const carimbo: CarimboDePublicacao = {
  contrato: linhagem.contrato,
  branchOficial: linhagem.branchOficial,
  branchesDeProducaoPermitidas: linhagem.branchesDeProducaoPermitidas,
  branch: process.env.VERCEL_GIT_COMMIT_REF?.trim() || consultaGit('git rev-parse --abbrev-ref HEAD') || 'desconhecida',
  commit: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || consultaGit('git rev-parse HEAD') || 'desconhecido',
  quando: process.env.VERCEL_GIT_COMMIT_TIMESTAMP?.trim() || consultaGit('git show -s --format=%cI HEAD') || 'desconhecido',
  ambiente: process.env.VERCEL_ENV?.trim() || 'local',
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
    __SYNQRA_CARIMBO__: JSON.stringify(carimbo),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
  },
});
