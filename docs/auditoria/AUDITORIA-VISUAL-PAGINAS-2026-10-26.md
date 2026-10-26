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


## Terceira passada — Financeiro, Fiscal, RH, Manutenção, Engenharia, Estoque e Logística (26/10/2026)

| Arquivo | Hash verificado nesta rodada | Triagem | Evidência / próximo passo |
|---|---|---|---|
| `src/pages/FinanceiroTitulos.tsx` | `2e9f2a554993145f2e00335ec509c50062beb33c` | REFERÊNCIA FINANCEIRA PROTEGIDA | É a referência definida no contrato, embora use classes genéricas de cards; não alterar sem autorização. Usar comparação visual antes de padronizar outras páginas. |
| `src/pages/Fiscal.tsx` | `7e8493a13db5cf86cb6d375e24655ae3574ae5c5` | POSSÍVEL MODELO ANTIGO | Não foram encontrados sinais locais claros de controles compactos/paleta; 14 usos de padrões genéricos de card. Prioridade para inspeção. |
| `src/pages/FiscalCarteiraNFe.tsx` | `b3b44a733bee1ddbc4077262d4cf35ead2ca7dad` | PARCIAL — triagem | Há controles compactos, mas sem tokens de paleta local; conferir estilos globais. |
| `src/pages/FiscalImpostos.tsx` | `354f69a378abaa4b9f7f0d61aaaf674b6c7a5c9e` | PARCIAL — triagem | Controles compactos presentes; verificar cores e estrutura no navegador. |
| `src/pages/FiscalPendencias.tsx` | `e0088a12c78ce40831b201adbb3b2e380fb9e293` | PARCIAL — triagem | Controles compactos presentes; confirmar padrão global. |
| `src/pages/FiscalPrevisaoCaixa.tsx` | `2e83fd2d1b795959956e00951b56e5337bb48c91` | POSSÍVEL MODELO ANTIGO | Sem sinais claros de controles compactos/paleta; múltiplos cards genéricos. |
| `src/pages/RHIndustrial.tsx` | `8c8e33b952b6fbc2851f4340b54e580c914f7b78` | REVISÃO VISUAL PENDENTE | Usa layout compartilhado; conferir a implementação efetiva e comparar com a Central de Compras aprovada. |
| `src/pages/ManutencaoCentral.tsx` | `94af8f3431edfd82cedb9d668bd93af6883f42b6` | PADRÃO NOVO — triagem | Sinais de paleta institucional e controles compactos presentes. |
| `src/pages/ManutencaoCronograma.tsx` | `287293f957e8c8b27adad4c12ac4afaab0d6aafd` | PADRÃO NOVO — triagem | Sinais de paleta institucional e controles compactos presentes. |
| `src/pages/ManutencaoIndustrial.tsx` | `598fc552880778c270837d31685dff4cc6e86689` | REVISÃO VISUAL PENDENTE | Poucos tokens visuais locais; confirmar se o CSS compartilhado aplica o padrão. |
| `src/pages/ManutencaoPlanoMestre.tsx` | `c2e984e3c5e1a84ef9c08f68c2d536dd09edc735` | PARCIAL — triagem | Controles compactos presentes, mas verificar dados, CSS e tela publicada. |
| `src/pages/EngenhariaCentral.tsx` | `9bbc3242660db6a1c417dd05774b79613c216c9c` | PADRÃO NOVO — triagem | Paleta institucional detectada; precisa inspeção visual final. |
| `src/pages/EngenhariaBOM.tsx` | `61f87995e8c762560794f990e38b29cc0489ff74` | PADRÃO NOVO — triagem | Controles compactos e paleta institucional presentes. |
| `src/pages/EngenhariaRevisoesBOM.tsx` | `660d7cf2c87b5128810eb633121208a09d65837e` | REVISÃO VISUAL PENDENTE | Sinais locais insuficientes e card genérico detectado. |
| `src/pages/EstoqueAjustes.tsx` | `7f8871b674e237b5a04890eab080faf8b88992eb` | ALERTA DE ESTILO MISTO | Controles compactos, porém múltiplos cards genéricos; comparar com a tela ativa de Estoque. |
| `src/pages/EstoqueSeparacao.tsx` | `82382012cfa9b87bd027aaa7378801df22d83749` | REVISÃO VISUAL PENDENTE | Padrões genéricos de card presentes; verificar layout efetivo. |
| `src/pages/ExpedicaoPortaria.tsx` | `d5f6de70410f6c0317f4c8bf6f2acbda2814ca6a` | PARCIAL — triagem | Controles compactos com alguns padrões genéricos; confirmar responsividade. |
| `src/pages/ExpedicaoRoteirizacao.tsx` | `ab7c3b57c51ef7e9a82133deb183276de062438a` | POSSÍVEL MODELO ANTIGO | Vários padrões genéricos de card e ausência de sinais claros da paleta compacta. |
| `src/pages/RecebimentoMateriais.tsx` | `5a995f5cdfa4eb2f30f86e7e1225a2f666df3945` | REVISÃO VISUAL PENDENTE | Paleta institucional aparece, mas controles compactos não foram detectados localmente. |


## Quarta passada — Cadastros, operações e páginas de apoio (26/10/2026)

| Arquivo | Hash verificado | Triagem estática | Observação |
|---|---|---|---|
| `src/pages/AcompanhamentoNaoConformidade.tsx` | `3071606fa1bf9f6bd746642c335ce25dd8c26b0c` | REVISÃO VISUAL PENDENTE | Não há sinais locais claros de paleta/controles compactos; conferir CSS global. |
| `src/pages/AdminLogs.tsx` | `9019d5d5abb344e0a8062caeeb9af3441c0aff59` | PARCIAL — triagem | Paleta aparece, mas há card genérico e não há sinal local de controles compactos. |
| `src/pages/AlmoxarifadoInventario.tsx` | `d1ade3f738404a16c1adae060f9ddf7d15c5659b` | ALERTA DE ESTILO MISTO | Paleta e controles compactos detectados, com um card genérico. |
| `src/pages/AssistenteAjudaERP.tsx` | `ffd69d18ee85382b1599b61f984ebb0eeb0a8880` | ALERTA DE ESTILO MISTO | Paleta e controles compactos presentes; conferir card e layout. |
| `src/pages/AtivarAcesso.tsx` | `c359688ab6850c005c099fb1993dbe3cfab2c918` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para classificar. |
| `src/pages/CadastroEmpresa.tsx` | `7e2098acee945c8f1d4b3f3287cb8251c850a0a0` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para classificar. |
| `src/pages/CatalogoDigital.tsx` | `fa55a62634dc8eb53dac27313fb9eda1244dfc25` | PARCIAL — triagem | Paleta detectada; validar densidade e componentes no navegador. |
| `src/pages/CentraisIndustriais.tsx` | `680fd4504b68e0751214e95d2e9ac6c1d5cb373b` | PARCIAL — triagem | Paleta detectada; controles compactos não identificados localmente. |
| `src/pages/CentralCustosIndustrial.tsx` | `e0f63d1104a4abdd05fe3fa0200abfbb101b69b0` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes; pode depender de CSS compartilhado. |
| `src/pages/ComercialSuprimentos.tsx` | `b7fcaf06e06dd8b35192a1e8370f222f445ad8cb` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para classificar. |
| `src/pages/ConfiguracaoLote.tsx` | `67def645e3ddbb70a4705276851278ee74638532` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para classificar. |
| `src/pages/ConfiguracaoLotePCP.tsx` | `ff13af0fe8062569212d35cf7554da0094ae6175` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para classificar. |
| `src/pages/Configuracoes.tsx` | `b51f633609940d5b420ebfd83a966919c49a1ca8` | PARCIAL — triagem | Controles compactos detectados; confirmar paleta e shell global. |
| `src/pages/DocumentosQualidadeControle.tsx` | `3f07ea1f6ffd9282178fb537c0cfd868f645b85a` | ALIAS / ARQUIVO MÍNIMO | Arquivo com 144 bytes; conferir o componente de destino. |
| `src/pages/FichaEngenharia.tsx` | `71fe3693f50a825be2f84e9e7628201a5c9336a5` | PARCIAL — triagem | Paleta institucional detectada; controles compactos não detectados localmente. |
| `src/pages/FichasProcesso.tsx` | `c51e911df3263f4395be96d59e5bdf410a8942d1` | PADRÃO NOVO — triagem | Paleta institucional e muitos controles compactos detectados. |
| `src/pages/IndustrialDashboardPremium.tsx` | `3f8e6dc6fae1e2345ab254a7c32ae78a16eef042` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes; conferir CSS/estrutura compartilhada. |
| `src/pages/IndustrialDataWorkspace.tsx` | `52696452fdd8da965b2d6511790a988abe666d08` | PARCIAL — triagem | Controles compactos e sinal de paleta detectados. |
| `src/pages/InjecaoIndustrial.tsx` | `f633fe34f6ba22da5d3d20b5f7a60cfb8fd3e7fe` | PADRÃO NOVO — triagem | Paleta institucional, controles compactos e layout compartilhado detectados. |
| `src/pages/InteligenciaIndustrial.tsx` | `9cf300d56f7b11a855fa7f7741cd69fec792c04f` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes; verificar CSS global e tela renderizada. |


## Quinta passada — PCP e Qualidade/SGQ (26/10/2026)

| Arquivo | Hash verificado | Triagem estática | Observação |
|---|---|---|---|
| `src/pages/PCPAcabamento.tsx` | `5c1bf3938ffa247e975cabd777ef5c422e611b16` | REVISÃO VISUAL PENDENTE | Um padrão genérico de card e nenhum sinal local claro de controles compactos. |
| `src/pages/PCPAgendaMaquinas.tsx` | `0b52989e6cd2bc3cc85a64c5a52380f1e34887d1` | PADRÃO NOVO — triagem | Muitos controles compactos e sinal da paleta institucional. |
| `src/pages/PCPAprovacaoSetup.tsx` | `3ba6557efc023b0d92f7b999453c276b604df471` | POSSÍVEL MODELO ANTIGO | Vários cards genéricos sem sinais locais de paleta/controles compactos. |
| `src/pages/PCPAreaFuncionario.tsx` | `5c3f1723bd306c54a42aea5839787ee46067a75b` | PADRÃO NOVO — triagem | Muitos controles compactos e tokens institucionais. |
| `src/pages/PCPCapacidade.tsx` | `7dc46177ebe93d550f5b9f21288feac76cb77c75` | ALERTA DE ESTILO MISTO | Tokens institucionais e controles compactos coexistem com cards genéricos. |
| `src/pages/PCPDashboardOEE.tsx` | `1da281205afb6128f2995d1dcefd5d576da154d1` | POSSÍVEL MODELO ANTIGO | Cards genéricos e nenhum sinal local claro do padrão compacto. |
| `src/pages/PCPDemanda.tsx` | `f8e336429be88de84b56a23c7760a5ae8727d178` | POSSÍVEL MODELO ANTIGO | Cards genéricos sem sinais locais de paleta/controles compactos. |
| `src/pages/PCPExecucaoIndustrial.tsx` | `84a6f594801998b999078bbde7daeecfaa418770` | PADRÃO NOVO — triagem | Controles compactos e sinais institucionais presentes. |
| `src/pages/PCPFichaProcessoTeste.tsx` | `fd501a9f654257f67dbbc7c0263b22e3f99f19d0` | ALERTA DE ESTILO MISTO | Controles compactos e paleta presentes, mas vários cards genéricos. |
| `src/pages/PCPParadas.tsx` | `ecedbfe0cb4992c275cc61064b26478af3c06f02` | PARCIAL — triagem | Paleta institucional presente; controles compactos não detectados localmente. |
| `src/pages/PCPParadasMaquina.tsx` | `c650ddf704ecd169e455ce54d8236d358fd1074d` | PADRÃO NOVO — triagem | Controles compactos e paleta institucional presentes. |
| `src/pages/PCPPedidosPendentes.tsx` | `e4fcbfbbdbb6e2c932f9d0448ec42e819a03e1a7` | ALERTA DE ESTILO MISTO | Controles compactos e paleta presentes; ainda há um card genérico. |
| `src/pages/PCPSequenciamento.tsx` | `93f4944f1c86e47e25cf4c786e5376f3029d07f3` | PARCIAL — triagem | Poucos sinais locais; validar estilos globais e densidade. |
| `src/pages/PCPTabletOperador.tsx` | `e7c407a6a21df06081f374b06805c39d69086597` | APROVADA / CONGELADA — confirmar publicação | Arquivo congelado; classes genéricas são presentes, portanto conferir que o deploy usa o código aprovado antes de qualquer alteração. |
| `src/pages/PCPValidaFluxo.tsx` | `b7e83277b90795f9f7bbe3213b6629f6467bdc07` | PADRÃO NOVO — triagem | Controles compactos presentes; validar paleta e comportamento. |
| `src/pages/QualidadeAuditoria5S.tsx` | `62cabb6cd507a97ce86d099a048bdea9373ad4ea` | ALERTA DE ESTILO MISTO | Controles compactos e paleta presentes com vários cards genéricos. |
| `src/pages/QualidadeAuditoriasPlanta.tsx` | `fbfd9a994a7974f3deda1123894dbaa0ecb7700e` | PADRÃO NOVO — triagem | Controles compactos, paleta e layout compartilhado presentes. |
| `src/pages/QualidadeEspecificacoesTecnicas.tsx` | `f35b450aaedea0b456d629e461cf156d94646258` | ALERTA DE ESTILO MISTO | Muitos controles compactos e alguns cards genéricos; conferir consistência. |
| `src/pages/QualidadeGraficosRefugo.tsx` | `7f1ae068d960c00b4d1c228074606cc46216dac0` | PADRÃO NOVO — triagem | Controles compactos e paleta institucional presentes. |
| `src/pages/QualidadeInspecaoProcesso.tsx` | `ee00a5324f152c17aebb435bb3552997d8c08cfa` | ALERTA DE ESTILO MISTO | Controles compactos, mas vários cards genéricos e sem paleta local clara. |


## Sexta passada — SGQ, Vendas, Suprimentos e Administração (26/10/2026)

| Arquivo | Hash verificado | Triagem estática | Observação |
|---|---|---|---|
| `src/pages/QualidadeRefugos.tsx` | `0dd79191b0265b839b22814ca6f3bed517a9042f` | PADRÃO NOVO — triagem | Controles compactos e paleta institucional presentes. |
| `src/pages/QualidadeRelatoriosDocumentos.tsx` | `c251a84732da62dc22424af19a7f8b27a127f55e` | ALERTA DE ESTILO MISTO | Controles compactos coexistem com cards genéricos. |
| `src/pages/QualidadeRPNCMultiorigem.tsx` | `b91ef1e0cca0d2989c65eddf8065189ecff25216` | PARCIAL — triagem | Paleta institucional presente; confirmar densidade e controles. |
| `src/pages/QualidadeSGQAvancado.tsx` | `5e6f979eb3f76f32880077f77bff94b742d85022` | REVISÃO VISUAL PENDENTE | Sinais locais insuficientes para confirmar o padrão novo. |
| `src/pages/RecebimentoNfe.tsx` | `04bc16d97f047d8ecfcda76f1581b8a0f3b3d09e` | ALIAS / ARQUIVO MÍNIMO | Arquivo com 603 bytes; conferir o componente de destino. |
| `src/pages/SolicitacaoCompra.tsx` | `11a1cbf4cb23ca7d1ed65a98ae2d249d9b70b80f` | REVISÃO VISUAL PENDENTE | Usa layout compartilhado; comparar a tela real com a Central de Compras. |
| `src/pages/TabelaPrecos.tsx` | `4d850167cb957770418797323e681e146264ed03` | PARCIAL — triagem | Poucos controles compactos e layout compartilhado. |
| `src/pages/TabletDashboard.tsx` | `196341f90eab71387531b0ac873493092c464993` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes; verificar se é rota ativa ou legado. |
| `src/pages/TabletHome.tsx` | `1f712dc4aee5edd1d4b281c9ba4804d92d81168b` | REVISÃO VISUAL PENDENTE | Poucos sinais locais de padrão compacto. |
| `src/pages/UsuariosAdmin.tsx` | `09e06a6ce41d8d57f7e71fa928ab01b9bc534d0e` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes; verificar CSS e tela renderizada. |
| `src/pages/VendasAnaliseCustos.tsx` | `5c28dfa8ec7920ad0c81fe9d51d76d74c3a86aa4` | PADRÃO NOVO — triagem | Muitos controles compactos e layout compartilhado. |
| `src/pages/VendasCarteira.tsx` | `abf32dc7da0024e76efb41ac0eaa0b56839852f0` | REVISÃO VISUAL PENDENTE | Usa layout compartilhado, mas sem sinais locais claros de controles compactos. |
| `src/pages/VendasCatalogoDigital.tsx` | `4c9bfcfbba6fed8baf4d1b0822ea48e5e6c05d47` | ALERTA DE ESTILO MISTO | Paleta e controles compactos, com um card genérico residual. |
| `src/pages/VendasCatalogoDigitalGestao.tsx` | `635f0cf250c0c0c2f6d1b50b1c797da287350c7a` | ALERTA DE ESTILO MISTO | Alguns controles compactos e paleta, com card genérico. |
| `src/pages/VendasConfiguracoes.tsx` | `d919807c544bd5c1e4cf0d7d500b4854d2c357a9` | REVISÃO VISUAL PENDENTE | Usa layout compartilhado; revisar a tela renderizada. |
| `src/pages/VendasDashboardGraficos.tsx` | `25ccb3a03689ec4ce095c23bf42fba1c1011c8a4` | REVISÃO VISUAL PENDENTE | Usa layout compartilhado, sem sinais locais claros de controles compactos. |
| `src/pages/VendasMetas.tsx` | `682b75e9d5b135e755deb85aa1d0075a41a3d68e` | REVISÃO VISUAL PENDENTE | Usa layout compartilhado; confirmar consistência visual. |
| `src/pages/VendasPedidoStatus.tsx` | `bd2aff279ed1b9c00d518203e77642bb5138e4e1` | ALERTA DE ESTILO MISTO | Paleta parcial e cards genéricos; comparar com VendasCentral aprovada. |
| `src/pages/VendasStatusPedidos.tsx` | `5ba4917be5ef9b93984091e5e5e6dadc9deeb17f` | PARCIAL — triagem | Alguns controles compactos, sem paleta local clara. |
| `src/pages/VendasTablet.tsx` | `48cb6abe18cb88d04fb60fa5b1c49932e52b08da` | REVISÃO VISUAL PENDENTE | Usa layout compartilhado; confirmar se é a tela de tablet pretendida. |


## Sétima passada — páginas públicas, fiscais, financeiras e administrativas (26/10/2026)

| Arquivo | Hash verificado | Triagem estática | Observação |
|---|---|---|---|
| `src/pages/Blog.tsx` | `78646c610fafa26abc71c43a9f2897a89fe2205d` | REVISÃO VISUAL PENDENTE | Página pública; avaliar com referência visual própria, não com o formulário industrial. |
| `src/pages/Contato.tsx` | `521a06f95c148957eabb9e1015fafa431a4426ae` | REVISÃO VISUAL PENDENTE | Página pública; verificar separadamente do shell interno. |
| `src/pages/AtivarAcesso.tsx` | `c359688ab6850c005c099fb1993dbe3cfab2c918` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para classificar. |
| `src/pages/RecuperarSenha.tsx` | `57907ac773557f002644dac96a7e3f954b422975` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para classificar; preservar autenticação. |
| `src/pages/SetupADMInicial.tsx` | `cc3ee7dd6571b826791306497fa396a789a38e1a` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes; não alterar fluxo de bootstrap sem auditoria funcional. |
| `src/pages/Master.tsx` | `a1b467291424366781a2027a283183bd2debe4fb` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes; preservar RBAC e área Master. |
| `src/pages/PlanosIndustrial.tsx` | `8bc1b4d9802355f840a2c18d4f44fc16cbcd03a4` | ALERTA DE ESTILO MISTO | Cards genéricos detectados; verificar padrão da página pública de planos. |
| `src/pages/ModuleOverviewIndustrial.tsx` | `c17520a39278eefdb718446684cc574bb33493e5` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para classificar. |
| `src/pages/ManualUsuario.tsx` | `7076458b20ea8e1bdd3dd5167a5b1241fb220f0c` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes; avaliar hierarquia e legibilidade. |
| `src/pages/TesteERP.tsx` | `f34bd5fd84a8698c7fe7a762af503b96cca55684` | REVISÃO VISUAL PENDENTE | Página de teste; verificar se está acessível em produção e se deve permanecer no menu. |
| `src/pages/OutlookCaixaEntrada.tsx` | `c812b8a278dda673b42639fa5059b2ba4608169a` | ALERTA DE ESTILO MISTO | Um padrão genérico de card; sem paleta compacta detectada localmente. |
| `src/pages/OutlookConfiguracao.tsx` | `c3eac9e680464c9037898c6fb65b0de0a4254017` | POSSÍVEL MODELO ANTIGO | Cards genéricos e sem sinais locais claros de paleta/controles compactos. |
| `src/pages/FinanceiroGraficoDesvios.tsx` | `6305319fc1375225f407d54c0659b01267847b84` | POSSÍVEL MODELO ANTIGO | Reforça o alerta anterior: cards genéricos sem sinais do padrão novo. |
| `src/pages/FiscalCompras.tsx` | `447a2ebc2973ed66ed07b12088ff81b0d19d7d7d` | REVISÃO VISUAL PENDENTE | Usa layout compartilhado; verificar CSS e tela renderizada. |
| `src/pages/FiscalPublic.tsx` | `ccfb5e65722b41df77b601f38410ad9c7f3d03fb` | ALERTA DE ESTILO MISTO | Um sinal compacto, mas vários cards genéricos. |
| `src/pages/NFeEmissaoCompact.tsx` | `d871d4835c0e85ea385fc96bcb33a92b88afbb00` | REVISÃO VISUAL PENDENTE | A palavra Compact no nome não comprova o visual; inspecionar CSS e tela. |
| `src/pages/NFeEmissao.tsx` | `1469d2e1c70873336b715abd049b3e161c65c487` | PARCIAL — triagem | Paleta institucional aparece, mas controles compactos não foram detectados localmente. |
| `src/pages/FinanceiroCustoPadrao.tsx` | `e65b085cc7eceda9c57358f395aeee24ac4b43b0` | POSSÍVEL MODELO ANTIGO | Confirma ausência de sinais claros do padrão compacto e uso de cards genéricos. |
| `src/pages/FinanceiroDashboardCaixa.tsx` | `4f139da09789e0f3c8e669bd1bfbca9aa3e65659` | ALERTA DE ESTILO MISTO — protegido | Controles compactos/paleta coexistem com cards genéricos; hash congelado. Não modificar sem autorização explícita. |
| `src/pages/FinancasContasPagar.tsx` | `6eecd65cc1451d39e6ae4829a6a1dcb1c85325e4` | ALIAS / ARQUIVO MÍNIMO | Arquivo com 228 bytes; conferir o componente efetivo que a rota renderiza. |


## Oitava passada — Configurações e Cadastro Mestre de Produtos (26/10/2026)

| Arquivo | Hash verificado | Triagem estática | Observação |
|---|---|---|---|
| `src/pages/configuracoes/Backups.tsx` | `0b59577287f4a88ded6b2b24086c46e73a0b27e3` | PADRÃO NOVO — triagem | Controles compactos e paleta presentes; revisar visualmente. |
| `src/pages/configuracoes/CodificacaoAreas.tsx` | `a908efc70910e7522b2440dccd6962113054fbf8` | ALERTA DE ESTILO MISTO | Paleta presente, mas muitos cards genéricos e sem controles compactos claros. |
| `src/pages/configuracoes/ConfiguracaoBackups.tsx` | `6075fdb63491c775ed1c2cf1c06c8d86baf40196` | PARCIAL — triagem | Alguns controles compactos e paleta institucional. |
| `src/pages/configuracoes/ConfiguracaoCodificacaoAreas.tsx` | `c0d7d50f0b4579624ac038550120253560f1714b` | PADRÃO NOVO — triagem | Muitos sinais de paleta e controles compactos. |
| `src/pages/configuracoes/ConfiguracaoIntegracoes.tsx` | `4731a855327edb59aa8ea5c7e7918b964065892f` | PADRÃO NOVO — triagem | Paleta e controles compactos detectados. |
| `src/pages/configuracoes/ConfiguracaoLogs.tsx` | `96111bd03904e39999b24d91dcbd9ea7a294a4c9` | PADRÃO NOVO — triagem | Paleta e controles compactos detectados. |
| `src/pages/configuracoes/ConfiguracaoPerfis.tsx` | `91670823d90bd67d991ce0a1c356d0e56044bb68` | PADRÃO NOVO — triagem | Paleta e controles compactos detectados. |
| `src/pages/configuracoes/ConfiguracaoPermissoes.tsx` | `c3d7d83f2bc3bcda31bdae05fa3b623c40d8b299` | PARCIAL — triagem | Muitos controles compactos, mas paleta local limitada. |
| `src/pages/configuracoes/ConfiguracaoSeguranca.tsx` | `542cf4418c7a16ff47bfb2319a1b92ea751ab3d5` | PADRÃO NOVO — triagem | Paleta e controles compactos detectados. |
| `src/pages/configuracoes/ConfiguracaoSistema.tsx` | `28ebb3c86268f295f1033e359b22968fff7450f3` | PADRÃO NOVO — triagem | Paleta e controles compactos detectados. |
| `src/pages/configuracoes/ConfiguracoesADM.tsx` | `2df9ab8933148407c2035b36d6ebe0a45624cc1b` | PARCIAL — triagem | Paleta presente, controles compactos não identificados. |
| `src/pages/configuracoes/ConfiguracoesEngenhariaLayout.tsx` | `d991f9eb268ada891b206cc0fa44bac9dd8ff038` | ALERTA DE ESTILO MISTO | Controles compactos coexistem com cards genéricos. |
| `src/pages/configuracoes/ControlePermissoes.tsx` | `f3a604df99187b596e7185eb2c41b20fe0280374` | PARCIAL — triagem | Sinais de paleta, controles compactos limitados. |
| `src/pages/configuracoes/HelpBackups.tsx` | `72b6bb29e43092addbe97a597f8ccda77579df10` | PADRÃO NOVO — triagem | Revisão registrada, tokens compactos e paleta presentes. |
| `src/pages/configuracoes/Logs.tsx` | `46dc8e832e312602885d3af2dafe6a4bccca13f9` | ALERTA DE ESTILO MISTO | Paleta e alguns controles compactos, com card genérico. |
| `src/pages/configuracoes/Perfis.tsx` | `8a2978758292b4a14e59160ca227cbd030314347` | ALERTA DE ESTILO MISTO | Paleta e poucos controles compactos, com card genérico. |
| `src/pages/cadastro-produtos/FormFichaTecnica.tsx` | `3ffd487c976dfc791d3740fe795110180eb8e669` | ALERTA DE ESTILO MISTO | Revisão registrada; controles compactos coexistem com cards genéricos. |
| `src/pages/cadastro-produtos/ListagemProdutos.tsx` | `5ddc362e3ded80dd906f1fdd51766466848c8428` | ALERTA DE ESTILO MISTO | Revisão registrada; controles compactos e paleta com cards genéricos. |
| `src/pages/cadastro-produtos/ModuloCadastroProdutos.tsx` | `d1eb3a9c2358edba1cfe6675c1c36aa5158a4802` | ALERTA DE ESTILO MISTO | Controles compactos com vários cards genéricos. |
| `src/pages/cadastro-produtos/ParametrosCodigo.tsx` | `7e3156bebbcd0612dbc87e6b0e78b5a215b0023e` | ALERTA DE ESTILO MISTO | Revisão registrada; controles compactos e cards genéricos coexistem. |


## Nona passada — SGQ especializado, Logística e Manutenção (26/10/2026)

| Arquivo | Hash verificado | Triagem estática | Observação |
|---|---|---|---|
| `src/pages/qualidade/CEP.tsx` | `0c2693581dfc0f46cd139121d68f5ee6d8cf673a` | PADRÃO NOVO — triagem | Controles compactos e paleta institucional presentes. |
| `src/pages/qualidade/ControleDesenhos.tsx` | `db8c8f466b6424feb26fd0689cff24a7e0d8db5d` | ALERTA DE ESTILO MISTO | Controles compactos e paleta, com um card genérico. |
| `src/pages/qualidade/FichasProcesso.tsx` | `b559b83f4afca92e3aba60e5fa7500d080e08316` | ALERTA DE ESTILO MISTO | Controles compactos e paleta, mas há vários cards genéricos. |
| `src/pages/qualidade/FMEA.tsx` | `eddbd80e85d44e44f821b88818145f8ddc3b091d` | PADRÃO NOVO — triagem | Controles compactos e sinais da paleta presentes. |
| `src/pages/qualidade/GEDDocumentos.tsx` | `f711a0511e54ff5695f9470d826caff61a20f802` | PADRÃO NOVO — triagem | Muitos controles compactos e paleta institucional. |
| `src/pages/qualidade/QualidadeAssinaturaIT.tsx` | `5e4b02b257f5a7309da2d5dcd9c2a03636eaccac` | POSSÍVEL MODELO ANTIGO | Cards genéricos e sem sinais locais de paleta/controles compactos. |
| `src/pages/qualidade/QualidadeEditorIT.tsx` | `81dbc59bf6370176e60e92068a9d76d1efc32d6b` | ALERTA DE ESTILO MISTO | Poucos controles compactos, um card genérico e sem paleta local clara. |
| `src/pages/qualidade/QualidadeGenealogiaLote.tsx` | `f6eab2bc49332893babe296359e95dfa090c8ba6` | PADRÃO NOVO — triagem | Revisão registrada, controles compactos e paleta presentes. |
| `src/pages/qualidade/QualidadeLiberacaoLotes.tsx` | `9b36c7cc6135e9187c4bcdb81fa9aa0c8cea7efd` | PADRÃO NOVO — triagem | Revisão registrada, controles compactos e paleta presentes. |
| `src/pages/qualidade/QualidadeProcedimentos.tsx` | `ed6eb0e45671538a3786e8e535261c4fa42ae6d1` | PARCIAL — triagem | Sinais limitados de paleta/controles; revisar no navegador. |
| `src/pages/qualidade/QualidadeQuarentena.tsx` | `7a1a848efd79e8a8394a676177294f78d9e4f5f1` | ALERTA DE ESTILO MISTO | Revisão registrada, muitos controles compactos, mas um card genérico. |
| `src/pages/qualidade/QualidadeRPNCCompleta.tsx` | `9ba451761e21327945b47503758e7735461e40b9` | PARCIAL — triagem | Paleta detectada, sem controles compactos locais. |
| `src/pages/qualidade/sala-rnc.tsx` | `236ea137597805e71bfa3972ff0da568a8141d8b` | PADRÃO NOVO — triagem | Muitos controles compactos, paleta institucional e layout compartilhado. |
| `src/pages/logistica/ExpedicaoNFe.tsx` | `6aef5cdf6b74631b261903cb72811ca35ae3f905` | ALERTA DE ESTILO MISTO | Controles compactos/paleta com um card genérico. |
| `src/pages/logistica/ImpressaoEtiquetas.tsx` | `3a9bed0ea2914a2b3e6a2b378152b31d8c351fbd` | ALERTA DE ESTILO MISTO | Controles compactos/paleta com um card genérico. |
| `src/pages/logistica/RomaneioCarga.tsx` | `25ca0b064985f849bd688352c61b3a22183ab884` | ALERTA DE ESTILO MISTO | Controles compactos/paleta com um card genérico. |
| `src/pages/manutencao/ManutencaoIndicadores.tsx` | `1e78e765d92634bd6a3f630d87840de34aa0589d` | REVISÃO VISUAL PENDENTE | Poucos sinais de paleta e nenhum de controles compactos localmente. |
| `src/pages/manutencao/ManutencaoOrdens.tsx` | `3ad5fab6c974b8b7c59f5065df2a8cdf79af3666` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para confirmar o padrão novo. |
| `src/pages/manutencao/ManutencaoPreventivas.tsx` | `1f88aee988e7fdda4f3631b21e7f4415b77a0e82` | REVISÃO VISUAL PENDENTE | Sem sinais locais suficientes para confirmar o padrão novo. |
| `src/pages/pcp/ControleProcessoInjetora.tsx` | `c61502c0e95d3f2df1a7fc11829c5021db124b8b` | PADRÃO NOVO — triagem | Revisão registrada, controles compactos, paleta e layout compartilhado. |

## Próxima etapa da auditoria

Continuar o inventário por módulo — Cadastros, Compras, Vendas, Financeiro, PCP, Qualidade/SGQ, Estoque, Fiscal, RH, Engenharia, Manutenção, Logística e Administração — registrando cada rota, componente, hash, estado visual e pendência. Só marcar **VERIFICADA VISUALMENTE** depois de comparar a tela renderizada com a referência aprovada.
