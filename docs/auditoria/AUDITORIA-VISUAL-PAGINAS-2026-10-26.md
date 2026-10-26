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
| `src/pages/FornecedoresIndustrial.tsx` | `bb45757288a43ebb681ba3095f2ebf9a15dfb715` | PADRÃO NOVO — evidência estática | Há tokens compactos e paleta institucional. Precisa inspeção no navegador para confirmar cards excedentes, alinhamento e responsividade solicitados. |
| `src/pages/PCPProgramacaoGantt.tsx` | `d6a9b3150006ba4af0d74e348da714728a3e6a0e` | PADRÃO NOVO — evidência estática | Paleta institucional presente; ainda precisa validação de tela publicada e de dados reais. |

## Alertas encontrados nesta passada

1. **277 rotas não significam 277 telas independentes.** Há rotas que reutilizam componentes, aliases e redirecionamentos. A auditoria deve registrar a URL e o componente efetivamente renderizado para não inspecionar a mesma tela como se fosse outra.
2. **Não carimbar arquivos congelados individualmente:** inserir comentários nesses arquivos mudaria seus hashes e faria a trava falhar. A data e o hash verificado ficam neste registro de auditoria, mantendo os arquivos aprovados intactos.
3. **A presença de classes modernas não comprova que a tela esteja homologada.** Telas com estilos mistos devem ser revisadas no navegador.
4. **O build e o deploy são uma verificação separada.** Esta auditoria não declara CI verde nem produção validada.

## Próxima etapa da auditoria

Continuar o inventário por módulo — Cadastros, Compras, Vendas, Financeiro, PCP, Qualidade/SGQ, Estoque, Fiscal, RH, Engenharia, Manutenção, Logística e Administração — registrando cada rota, componente, hash, estado visual e pendência. Só marcar **VERIFICADA VISUALMENTE** depois de comparar a tela renderizada com a referência aprovada.
