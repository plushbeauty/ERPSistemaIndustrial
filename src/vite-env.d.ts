/// <reference types="vite/client" />

/**
 * Versao publicada em package.json, injetada pelo `define` do vite.config.ts.
 * Usada na barra de status da tela de acesso; evita versao digitada a mao.
 */
declare const __APP_VERSION__: string

/**
 * Carimbo da publicacao, injetado pelo `define` do vite.config.ts a partir do git/Vercel no momento
 * do build. E o que permite distinguir na tela um deploy das telas novas de um deploy antigo.
 */
declare const __SYNQRA_CARIMBO__: {
  contrato: string
  branchOficial: string
  branchesDeProducaoPermitidas: string[]
  branch: string
  commit: string
  quando: string
  ambiente: string
}
