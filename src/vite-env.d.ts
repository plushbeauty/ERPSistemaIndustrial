/// <reference types="vite/client" />

/**
 * Versao publicada em package.json, injetada pelo `define` do vite.config.ts.
 * Usada na barra de status da tela de acesso; evita versao digitada a mao.
 */
declare const __APP_VERSION__: string
