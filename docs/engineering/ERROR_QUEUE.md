# ERROR QUEUE

Fila persistente de erros. Nunca apagar histórico.

## ERR-0001
STATUS: OPEN
PRIORIDADE: P0
CATEGORIA: BUILD
ARQUIVO: src/AppEntryV2.tsx / src/pages/CentraisIndustriais.tsx
SINTOMA: erro reportado de contrato envolvendo `materiais`.
CAUSA A INVESTIGAR: reproduzir type-check no HEAD atual.
IMPACTO: potencial bloqueio de produção.
CORREÇÃO OBSERVADA: o contrato atual de CentraisIndustriais já declara `materiais`.
TESTE: npm run type-check

## ERR-0002
STATUS: OPEN
PRIORIDADE: P1
CATEGORIA: TABLET
ARQUIVO: src/components/TabletMenuModal.tsx
SINTOMA: catálogo anterior não correspondia ao SGQ M01-M22.
CORREÇÃO: catálogo M01-M22 aplicado.
TESTE: type-check, lint e integração.
