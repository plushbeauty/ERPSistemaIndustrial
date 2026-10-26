# Auditoria visual e de código — SYSNQRA ERP INDUSTRIAL

- **Data da verificação estática:** 26/10/2026
- **Repositório/branch:** `plushbeauty/ERPSistemaIndustrial` / `main`
- **Escopo inventariado:** 223 arquivos `.tsx/.jsx` sob `src/pages`; 277 declarações de rota em `src/AppEntryV2.tsx`; 19 entradas congeladas no contrato de UI aprovado.
- **Tipo de verificação nesta revisão:** leitura do código-fonte via GitHub, comparação com o contrato de hashes e identificação de assinaturas de layout. Isso **não equivale** a uma inspeção visual de todas as 277 rotas no navegador.

## Critérios

- **APROVADA / CONGELADA:** arquivo protegido por `scripts/verify-approved-ui-lock.mjs`. Não editar nem atualizar o hash sem autorização explícita.
- **PADRÃO NOVO — evidência estática:** há sinais do sistema visual compacto/premium, como controles compactos, paleta institucional e layout consistente. Confirmar visualmente no navegador antes de declarar homologado.
- **REVISÃO VISUAL PENDENTE:** não há evidência suficiente para confirmar o padrão novo só pelo código consultado.
- **ALERTA DE ESTILO MISTO:** coexistem padrões modernos e classes de layout genéricas/antigas; precisa inspeção de tela e eventual ajuste.
- **ALIAS / ARQUIVO MÍNIMO:** arquivo muito pequeno, possivelmente delega para outra página; verificar o destino efetivo da rota.

## Páginas verificadas individualmente nesta primeira passada

| Arquivo | Hash Git do arquivo (snapshot verificado) | Resultado em 26/10/2026 | Observação |
|---|---|---|---|
| `src/pages/ComprasCentral.tsx` | `6d7947a4dcbe1b2f04f10e56a5165d031cedc4f3` | APROVADA / CONGELADA | Referência visual aprovada de Compras; revisão `APROV-COMPRAS-2026-10-24-R1`. |
| `src/pages/ComprasAbaNativa.tsx` | `adbf0e76c6c627a2c53fe82e7f7f8370d2265083` | APROVADA / CONGELADA | Preservar layout; alteração funcional permitida anteriormente. |
| `src/pages/VendasCentral.tsx` | `0129b7cd990ed03982803d473fcb917589969947` | APROVADA / CONGELADA | Não modificar sem autorização. |
| `src/pages/NovoPedido.tsx` | `6d1368026d51f186baa297f71569a61a1f79e944` | APROVADA / CONGELADA | Evidência de controles compactos e paleta institucional. |
| `src/pages/ProdutosVendasIndustrial.tsx` | `95434d18498d1a0709c0ccfb1d7ba51949b71d1d` | APROVADA / CONGELADA | Não alterar o visual aprovado. |
| `src/pages/PCPTabletOperador.tsx` | `e7c407a6a21df06081f374b06805c39d69086597` | APROVADA / CONGELADA | Preservar o tablet aprovado; classes genéricas também existem, por isso a homologação visual depende da tela publicada. |
| `src/components/PCPTabletMenuModal.tsx` | `60bf035ae3bd3e89be45577ca62714058f56b1bc` | APROVADA / CONGELADA | Menu do tablet congelado. |
| `src/components/layout/ERPHorizontalShell.tsx` | `73e718465200f7f54743a0e82011f86761dd385b` | APROVADA / CONGELADA | Shell global; não alterar sem autorização. |
| `src/components/IndustrialCommandDashboard.tsx` | `821b2cb2add9ec0a31d0c81e906a2c1f6e84118b` | APROVADA / CONGELADA | Dashboard industrial aprovado. |
| `src/pages/PCPFichasProcesso.tsx` | `eed2c198fb8628719a909cbf5eb1b613025c0e14` | APROVADA / CONGELADA | Revisão visual `REV-FICHA-010`. |
| `src/pages/QualidadeInspecoesIndustrial.tsx` | `ebb5bd1e523f38a2ab6169bda4e7a9855ee3e65a` | APROVADA / CONGELADA | Inspeções de lotes, layout aprovado. |
| `src/PublicIndustrialHome.tsx` | `5c6a08d84d9d942ac6f274bb32a3a12d39e964bd` | APROVADA / CONGELADA | Home aprovada; zoom do carrossel em 85%. |
| `src/pages/CalibracaoIndustrial.tsx` | `848b72d7c4c7db5c52de3db18c73a22f94a7af54` | PADRÃO NOVO — evidência estática | Revisão `REV-SGQ-CALIBRACAO-PAQUIMETRO-002`; contém controles compactos, paleta institucional e card com ilustração. O hash permanece protegido. |
| `src/pages/FinanceiroDashboardCaixa.tsx` | `4f139da09789e0f3c8e669bd1bfbca9aa3e65659` | ALERTA DE ESTILO MISTO | Contém cabeçalho/paleta/controles compactos, mas também classes genéricas como `rounded-xl` e `bg-slate-50 p-4`. Comparar com Contas a Receber no navegador antes de declarar padrão uniforme. Hash protegido; não atualizar sem autorização. |
| `src/pages/FinanceiroTitulos.tsx` | `2e9f2a554993145f2e00335ec509c50062beb33c` | APROVADA / REFERÊNCIA FINANCEIRA | Padrão de referência para Financeiro conforme contrato; preservar o layout. |
| `src/pages/QualidadePaquimetroDigital.tsx` | `3c355adb13c288e66c54556fd9123700e6956097` | APROVADA / CONGELADA | Página dedicada de paquímetro; código mantido intacto. |
| `src/components/DigitalCaliper.tsx` | `2de2550896b0ccb33730432bc0457085f693b488` | APROVADA / CONGELADA | Componente de medição aprovado; manter validações e identificação da leitura simulada. |
| `src/pages/FornecedoresIndustrial.tsx` | `da0978ec2ed0c66f106b32be7ce3047ddae7f23e` | PADRÃO NOVO — evidência estática | Há tokens compactos e paleta institucional. Precisa inspeção no navegador para confirmar cards excedentes, alinhamento e responsividade solicitados. |
| `src/pages/PCPProgramacaoGantt.tsx` | `d6a9b3150006ba4af0d74e348da714728a3e6a0e` | PADRÃO NOVO — evidência estática | Paleta institucional presente; ainda precisa validação de tela publicada e de dados reais. |

## Alertas encontrados nesta passada

1. **277 rotas não significam 277 telas independentes.** Há rotas que reutilizam componentes, aliases e redirecionamentos. A auditoria deve registrar a URL e o componente efetivamente renderizado para não inspecionar a mesma tela como se fosse outra.
2. **Não carimbar arquivos congelados individualmente:** inserir comentários nesses arquivos mudaria seus hashes e faria a trava falhar. A data e o hash verificado ficam neste registro de auditoria, mantendo os arquivos aprovados intactos.
3. **A presença de classes modernas não comprova que a tela esteja homologada.** Telas com estilos mistos devem ser revisadas no navegador.
4. **O build e o deploy são uma verificação separada.** Esta auditoria não declara CI verde nem produção validada.


## Segunda passada — leitura de código por módulo (26/10/2026)

Esta rodada ampliou a leitura dos componentes de Fornecedores, Clientes, Compras, Vendas, Financeiro, PCP, Qualidade e Estoque. A classificação abaixo é **triagem estática**, não aprovação visual definitiva.

| Arquivo | Hash verificado nesta rodada | Triagem | Evidência / próximo passo |
|---|---|---|---|
| `src/pages/FornecedoresIndustrial.tsx` | `da0978ec2ed0c66f106b32be7ce3047ddae7f23e` | PADRÃO NOVO — triagem | Paleta institucional e sinais compactos presentes; confirmar visualmente a remoção de cards excedentes e alinhamento dos campos. |
| `src/pages/ClientesIndustrial.tsx` | `29cb9f19d39954f965b699e660051404b20b77a6` | PADRÃO NOVO — triagem | Paleta institucional e consultas Supabase presentes; precisa comparação visual com Fornecedores. |
| `src/pages/ComprasRFQ.tsx` | `acc6ab9645f4a5a2c8aaff7ea92c2d2063c57efb` | REVISÃO VISUAL PENDENTE | Tem marcação de revisão, mas a página importa parte do visual; confirmar CSS efetivo e tela renderizada. |
| `src/pages/ComprasIndustrial.tsx` | `9bfc4df93c834c85660fa3279cc4523fddb6e434` | REVISÃO VISUAL PENDENTE | Não foi possível confirmar a anatomia nova pelos tokens locais; verificar se usa CSS compartilhado. |
| `src/pages/ComprasRequisicoes.tsx` | `c3d6363264e0fc00410ff5efb04bf99bd07cb1d0` | ALERTA DE ESTILO MISTO | Há controles compactos e paleta institucional, junto de pelo menos um padrão genérico de card. |
| `src/pages/ComprasPedidoCompra.tsx` | `077612fa7e1249ccd87275d4a57e80f684bd5e03` | REVISÃO VISUAL PENDENTE | Marcadores de revisão presentes; tokens visuais podem vir de estilos compartilhados. |
| `src/pages/ComprasRelatorios.tsx` | `c90af80902d3ae0e8f6ed6d8d79154880e28a0f9` | REVISÃO VISUAL PENDENTE | Conferir CSS compartilhado e consistência com a Central de Compras. |
| `src/pages/VendasClientes.tsx` | `6fd01f2609c25f9f192c1a702cf6746f15129ebf` | ALERTA DE ESTILO MISTO | Controles compactos presentes, mas o componente usa layout compartilhado; conferir cabeçalho e cards no navegador. |
| `src/pages/VendasPDV.tsx` | `429dadc34087b6df95968e98fcd31bf30e64a508` | PADRÃO NOVO — triagem | Paleta institucional e vários controles compactos; confirmar responsividade e fluxo operacional. |
| `src/pages/VendasRelatorios.tsx` | `f007cee075cfa43c38b9f8a1daeafe441c7e212d` | ALERTA DE ESTILO MISTO | Controles compactos coexistem com cards genéricos; comparar com padrão aprovado de Vendas. |
| `src/pages/DashboardComercial.tsx` | `f474c5b4b0b846b202a5858e297624a08429925a` | PADRÃO NOVO — triagem | Tokens compactos e paleta institucional presentes; validar consistência do layout. |
| `src/pages/FinanceiroCustoPadrao.tsx` | `e65b085cc7eceda9c57358f395aeee24ac4b43b0` | POSSÍVEL MODELO ANTIGO | Sem sinais claros da paleta/controles compactos nesta leitura e com múltiplos cards genéricos; priorizar revisão. |
| `src/pages/FinanceiroGraficoDesvios.tsx` | `6305319fc1375225f407d54c0659b01267847b84` | POSSÍVEL MODELO ANTIGO | Sem sinais claros da anatomia visual nova e com cards genéricos; priorizar revisão. |
| `src/pages/PCPIndustrial.tsx` | `d1788a46a6fbb2e836d19a96f2103ce97c683054` | ALERTA DE ESTILO MISTO | Paleta institucional presente em muitos pontos, mas também há padrões genéricos; revisar telas internas/abas separadamente. |
| `src/pages/PCPOrdens.tsx` | `9b1d1a74f184e58424bd4ab7c7e0ed4fe83c4428` | ALERTA DE ESTILO MISTO | Muitos controles compactos e tokens institucionais, com cards genéricos residuais. |
| `src/pages/PCPPlanejamentoIndustrial.tsx` | `90ccdc6231b5b9ccad620c0dbdc63cd376aeeeff` | REVISÃO VISUAL PENDENTE | Poucos tokens locais detectados; pode depender de CSS compartilhado. |
| `src/pages/QualidadeIndustrial.tsx` | `ba610f5e7994217e4f1b68e5978fe8870148f0be` | REVISÃO VISUAL PENDENTE | Precisa inspeção do layout compartilhado e dos acessos SGQ. |
| `src/pages/QualidadeRNC.tsx` | `a86127d0dc965a93474db9e1afb8fe73e18b5e21` | PADRÃO NOVO — triagem | Paleta e controles compactos presentes; validar fluxos e consistência do formulário. |
| `src/pages/EstoqueAlmoxarifadoCompact.tsx` | `4bd25f3b2556919ad64609d3ea0ee885859a91f4` | REVISÃO VISUAL PENDENTE | Nome indica variante compacta, mas não basta para confirmar o visual; verificar CSS e rota ativa. |
| `src/pages/EstoqueAlmoxarifado.tsx` | `d3ad3801d09b59192a33394a78f8e5f13b878872` | REVISÃO VISUAL PENDENTE | Conferir qual variante é usada em produção e impedir que uma rota antiga aponte para a versão antiga. |

## Próxima etapa da auditoria

Continuar o inventário por módulo — Cadastros, Compras, Vendas, Financeiro, PCP, Qualidade/SGQ, Estoque, Fiscal, RH, Engenharia, Manutenção, Logística e Administração — registrando cada rota, componente, hash, estado visual e pendência. Só marcar **VERIFICADA VISUALMENTE** depois de comparar a tela renderizada com a referência aprovada.
