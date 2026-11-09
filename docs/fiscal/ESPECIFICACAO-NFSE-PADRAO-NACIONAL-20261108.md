# SYSNQRA ERP INDUSTRIAL — Especificação funcional e técnica da NFS-e nacional

**Data:** 08/11/2026  
**Revisão:** REV-NFSE-ESPEC-20261108-01  
**Status:** ESPECIFICAÇÃO — NÃO IMPLEMENTAR ATÉ DECISÃO DO PROPRIETÁRIO  
**Escopo:** DPS, emissão, consulta, eventos, carteira e integração com faturamento.

## 1. Decisão de arquitetura

O módulo deverá adotar o padrão nacional da NFS-e e manter a DPS como documento de origem do contribuinte. O SYSNQRA não deverá montar uma NFS-e final por conta própria: deverá gerar e validar a DPS conforme os leiautes/XSD vigentes e enviar ao emissor autorizado, que executa as regras fiscais e retorna a NFS-e ou a rejeição.

A documentação oficial de produção consultada em 08/11/2026 foi atualizada em 04/11/2026 e disponibiliza Manual de Contribuintes, XSD v1.01, anexos de domínio e leiautes DPS/NFS-e. A implementação deverá fixar a versão efetivamente homologada e manter versionamento dos esquemas.

## 2. Modelo de dados proposto

### 2.1 erp_fiscal_nfse_documentos

Uma linha por DPS/NFS-e, sempre isolada por empresa_id.

Campos propostos:
- Identidade: id, empresa_id, faturamento_id, ordem_servico_id, cliente_id.
- DPS: dps_id, dps_serie, dps_numero, dps_competencia, dps_data_emissao, dps_xml, dps_payload_json, dps_hash, versao_leiaute.
- Prestador: CNPJ, inscrição municipal quando aplicável, município IBGE e regime tributário.
- Tomador: tipo e número de documento, nome/razão social, endereço e contatos necessários ao leiaute.
- Serviço: município de incidência, item da Lista Nacional, código de serviço municipal quando aplicável, NBS quando exigido, descrição e local da prestação.
- Valores: valor dos serviços, deduções legais, descontos, base de cálculo, alíquota, ISS devido/retido e demais tributos previstos no leiaute vigente.
- NFS-e retornada: chave de acesso, número, data de autorização, XML oficial, payload, protocolo e recibo quando disponibilizados.
- Integração: provedor, ambiente, status, tentativas, chave de idempotência, último envio e último retorno.
- Rejeição: código, mensagem, detalhe técnico e indicação de campo para correção.
- Auditoria: created_at, updated_at, created_by, updated_by.

Restrições:
- Unicidade por empresa + série + número da DPS.
- Unicidade da chave de acesso quando preenchida.
- Não permitir alteração do conteúdo fiscal da DPS após autorização sem fluxo formal de substituição/cancelamento.
- XML e payload originais devem ser preservados como evidência imutável.

### 2.2 erp_fiscal_nfse_eventos

Uma linha por evento fiscal vinculado à NFS-e:
- id, empresa_id, nfse_documento_id, tipo do evento, sequência e status.
- XML/payload do pedido de evento e retorno oficial.
- protocolo, código/mensagem de rejeição, datas de envio e processamento.
- ator responsável e trilha de auditoria.

### 2.3 Configuração e credenciais

A configuração fiscal da empresa deverá guardar somente referências seguras ao segredo/certificado, ambiente e provedor. Senhas, chaves privadas e certificados não poderão ser expostos ao navegador nem gravados em tabelas acessíveis ao cliente. Segredos devem permanecer em Edge Function secrets ou cofre do provedor, com rotação e trilha de acesso.

## 3. Contrato de emissão por DPS

1. O faturamento/ordem de serviço confirma cliente, serviço prestado, município, valores e competência.
2. O ERP consulta parâmetros municipais e valida os dados fiscais antes de permitir a emissão.
3. O backend reserva série e número sequencial da DPS de forma transacional por empresa.
4. O backend monta o XML da DPS na versão XSD vigente, valida o XSD e calcula hash do documento.
5. O backend envia a DPS ao adaptador do provedor escolhido, sem expor certificado ou segredo ao browser.
6. O retorno deve ser interpretado como:
   - autorizada: guardar XML oficial, chave, número e data;
   - rejeitada: guardar código/mensagem e permitir correção controlada;
   - comunicação indeterminada: consultar pelo identificador da DPS antes de reenviar, evitando duplicidade.
7. Somente após autorização a carteira fiscal e o faturamento recebem o vínculo definitivo da NFS-e.
8. Toda tentativa, resposta e evento deve ser auditável e vinculada ao tenant.

O identificador da DPS deverá respeitar o leiaute nacional vigente. A série e numeração devem ser sequenciais, controladas e sem reaproveitamento indevido.

## 4. Contrato mínimo do adaptador

Interface interna independente de fornecedor:
- consultarParametrosMunicipais(municipioIbge, codigoServico, cnpj)
- validarDps(dps, versaoXsd)
- emitirDps(xmlDps, idempotencyKey)
- consultarNfse(chaveAcesso)
- consultarDps(idDps)
- verificarDps(idDps)
- registrarEvento(chaveAcesso, eventoAssinado)
- consultarEventos(chaveAcesso)

O adaptador deverá traduzir autenticação, endpoints, códigos de retorno, limites e retentativas do provedor, sem contaminar as páginas com regras específicas de fornecedor.

## 5. Carteira NFS-e

Filtros:
- período de emissão/competência;
- cliente/tomador;
- número da DPS e da NFS-e;
- chave de acesso;
- ordem de serviço/faturamento;
- status fiscal;
- município;
- valor e ISS retido.

Ações condicionadas ao estado e à autorização:
- visualizar/imprimir DANFSe ou representação oficial;
- baixar XML da DPS e da NFS-e;
- consultar situação;
- registrar evento permitido;
- solicitar cancelamento ou substituição quando permitido;
- abrir faturamento/contas a receber de origem.

A carteira deverá separar documentos autorizados, rejeitados, pendentes, cancelados e com comunicação indeterminada. Não exibir uma nota como autorizada apenas porque a DPS foi salva localmente.

## 6. Integração com faturamento e financeiro

- Uma NFS-e deve apontar para o documento de faturamento/ordem de serviço que originou a prestação.
- O valor fiscal autorizado deve ser conciliado com o valor faturado, sem criar recebível duplicado.
- O contas a receber deve ser criado/atualizado conforme o contrato financeiro existente e somente após a regra fiscal aprovada.
- Cancelamento deve gerar estorno/reversão auditável dos lançamentos relacionados, sem apagar histórico.
- Substituição deve manter o vínculo entre documento original, evento de cancelamento por substituição e NFS-e substituta.
- A integração deve ser idempotente e transacional dentro do banco do ERP; chamadas externas devem usar chave de idempotência e reconciliação por DPS.

## 7. Status propostos

RASCUNHO → VALIDANDO_DPS → PRONTA_PARA_ENVIO → ENVIANDO → AUTORIZADA.

Estados alternativos:
- REJEITADA: retorno fiscal de rejeição; requer correção.
- COMUNICACAO_INDETERMINADA: sem confirmação; consultar DPS antes de reenviar.
- CANCELAMENTO_PENDENTE / CANCELADA.
- SUBSTITUICAO_PENDENTE / SUBSTITUIDA.
- ERRO_TECNICO: falha local ou do adaptador, sem afirmar rejeição fiscal.

A transição de status deverá ocorrer no backend, com registro de histórico; o cliente não poderá definir diretamente status fiscal.

## 8. Segurança e conformidade

- RLS em todas as tabelas por empresa_id, respeitando o contrato Master existente.
- Escrita fiscal privilegiada somente por RPC/Edge Function validada no servidor.
- service_role e certificados nunca no browser.
- Assinatura digital e autenticação conforme o manual e o ambiente do emissor/provedor.
- Guardar XML original, retorno, eventos, hash, versão de XSD e trilha de auditoria.
- Separar homologação e produção; bloquear emissão de produção até credenciais, credenciamento e testes aprovados.
- Validar retenção de ISS e regras municipais por prestador/tomador/local da prestação.

## 9. Decisão pendente do proprietário

Não iniciar implementação de integração até definir o caminho:

1. SEFIN Nacional diretamente: maior controle do contrato, mas exige credenciamento prévio para API, certificado/autenticação e manutenção própria dos leiautes, XSD, eventos e regras.
2. Provedor intermediário (Focus NFe ou Webmania): reduz a integração direta com os endpoints fiscais, mas exige contratação, credenciais, análise de cobertura municipal, custos, limites e validação do contrato de serviço.

A escolha deve considerar municípios de emissão, volume mensal, custo por documento, suporte a cancelamento/substituição, armazenamento de XML, homologação, SLA e propriedade dos dados.

## 10. Critérios de aceite antes de liberar

- decisão formal do provedor;
- credenciais e certificado disponíveis em ambiente seguro;
- XSD e leiaute de produção conferidos com a documentação oficial vigente;
- testes de DPS válida, rejeitada, consulta, comunicação indeterminada, cancelamento e substituição;
- teste de isolamento multiempresa e permissões;
- conciliação com faturamento/contas a receber;
- homologação com prestador e município reais;
- autorização explícita para produção.

## 11. Referências oficiais consultadas

- Documentação Atual de Produção (atualizada em 04/11/2026): https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
- Manual de Contribuintes — API Emissor Público Nacional: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf
- O que é DPS: https://www.gov.br/nfse/pt-br/saiba-mais/como-a-nfs-e-e-gerada/o-que-e-dps
- Serviço oficial de emissão NFS-e padrão nacional e credenciamento para API: https://www.gov.br/pt-br/servicos/emitir-nota-fiscal-de-servico-eletronica

**Situação final:** especificação registrada. Nenhuma tela, migration, integração, credencial ou emissão NFS-e foi criada ou executada por este documento.
