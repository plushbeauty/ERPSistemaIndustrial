# SGQ/eQMS — arquitetura de referência

A implementação adapta conceitos funcionais das referências públicas, sem copiar código-fonte.

## OCA/management-system
O ciclo adotado para RPNC segue registro, análise de causa, plano de ação, execução, avaliação de eficácia e encerramento. A referência também relaciona origem, procedimento, responsáveis e prazos.

## QAtrial
A interface separa visualização, edição e aprovação, mantém estados explícitos, trilha de auditoria e CAPA com investigação, execução, verificação e fechamento.

## OpenQMS
O controle documental usa versões imutáveis após liberação e distribuição dirigida por departamento. A distribuição é registrada como evento de negócio.

## Licenciamento
OCA/management-system, QAtrial e C-realize/OpenQMS possuem componentes AGPL-3.0. Este diretório é implementação original baseada em padrões funcionais; não contém cópia de arquivos dessas bases. Qualquer código AGPL reutilizado no futuro deve respeitar a licença aplicável.

## Fluxos
Documento: Rascunho -> Revisão -> Aprovação -> Vigente -> Obsoleta.
RPNC/CAPA: Aberta -> Em análise -> Em tratamento -> Aguardando eficácia -> Encerrada.

## Segurança
As novas tabelas usam RLS por empresa. A distribuição exige a permissão qualidade_documentos.liberar ou perfil Master. Revisões são criadas, não sobrescritas.
