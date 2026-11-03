# Configuracoes

Codigo atualmente ativo: `src/pages/AdministracaoConfiguracoesGlobais.tsx` e `src/pages/SetupADMInicial.tsx`.

Rota administrativa registrada em `src/AppEntryV2.tsx`: `/pageprincipal/administracao-configuracoes`.

A aba **Instalação do sistema** (`src/components/administration/SystemInstallationSettings.tsx`) prepara, com autorização explícita do navegador, a pasta `<Empresa>.Doc` e as subpastas de desenhos, procedimentos, notas fiscais (XML/PDF) e documentos. A referência à pasta é salva localmente no IndexedDB do navegador. O app web não instala um serviço de sincronização nem habilita operação offline; rede e sincronização exigem um agente local próprio.
