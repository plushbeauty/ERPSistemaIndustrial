'use strict'

const path = require('node:path')
const { Service } = require('node-windows')

const tokenFile = process.env.SYSNQRA_TOKEN_FILE
if (!tokenFile) {
  console.error('Defina SYSNQRA_TOKEN_FILE antes de instalar o serviço.')
  process.exit(1)
}

const service = new Service({
  name: 'SYSNQRAFileManagerIndustrial',
  description: 'Agente local seguro de arquivos do SYSNQRA ERP Industrial',
  script: path.join(__dirname, 'sysnqra-agent.cjs'),
  env: [
    { name: 'SYSNQRA_TOKEN_FILE', value: tokenFile },
    { name: 'SYSNQRA_HOST', value: process.env.SYSNQRA_HOST || '127.0.0.1' },
    { name: 'SYSNQRA_PORT', value: process.env.SYSNQRA_PORT || '8970' },
    { name: 'SYSNQRA_PRIMARY_PATH', value: process.env.SYSNQRA_PRIMARY_PATH || 'C:\\SYSNQRA\\Arquivos' },
    { name: 'SYSNQRA_CONFIG', value: process.env.SYSNQRA_CONFIG || path.join(__dirname, 'sysnqra-agent-config.json') },
    { name: 'SYSNQRA_CORS_ORIGINS', value: process.env.SYSNQRA_CORS_ORIGINS || 'https://erp-sistema-industrial.vercel.app' },
  ],
})

service.on('install', () => {
  console.log('Serviço SYSNQRAFileManagerIndustrial instalado. O instalador PowerShell irá configurar a conta de execução e iniciá-lo.')
})
service.on('alreadyinstalled', () => {
  console.log('O serviço SYSNQRAFileManagerIndustrial já existe; não será substituído automaticamente.')
  process.exitCode = 2
})
service.on('error', error => {
  console.error('Falha ao instalar o serviço Windows:', error.message)
  process.exitCode = 1
})

service.install()
