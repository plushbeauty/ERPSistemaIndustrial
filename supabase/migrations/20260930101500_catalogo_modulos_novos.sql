/*
 * ERP INDUSTRIAL — catálogo comercial alinhado ao novo ecossistema operacional.
 * Somente recursos já expostos no produto público/rotas atuais são adicionados ao catálogo.
 */
insert into public.erp_plano_modulos(plano_codigo,modulo_codigo,modulo_nome,acesso,recursos)
values
('diamante','rastreabilidade','Rastreabilidade ponta a ponta',true,'{"lotes":true,"genealogia":true,"pedido_op":true,"expedicao":true}'::jsonb),
('diamante','fmea','FMEA, RPNC e CAPA',true,'{"fmea":true,"rpn":true,"capa":true,"auditoria":true}'::jsonb),
('diamante','prensa-dupla','PCP de Prensa Dupla',true,'{"lados_ab":true,"moldes":true,"operadores":true,"setup":true,"gantt":true}'::jsonb),
('diamante','chao-fabrica','Chão de Fábrica',true,'{"apontamento":true,"paradas":true,"refugo":true,"rastreabilidade":true}'::jsonb),
('diamante','metrologia-rbc','Metrologia RBC',true,'{"instrumentos":true,"calibracao":true,"certificados":true}'::jsonb),
('diamante','documentos-obsoletos','Documentos Controlados e Obsoletos',true,'{"revisao":true,"aprovacao":true,"historico":true}'::jsonb),
('enterprise_gold','rastreabilidade','Rastreabilidade ponta a ponta',true,'{"lotes":true,"genealogia":true,"pedido_op":true,"expedicao":true,"auditoria":true}'::jsonb),
('enterprise_gold','fmea','FMEA, RPNC e CAPA',true,'{"fmea":true,"rpn":true,"capa":true,"auditoria":true,"8d":true}'::jsonb),
('enterprise_gold','prensa-dupla','PCP de Prensa Dupla',true,'{"lados_ab":true,"moldes":true,"operadores":true,"setup":true,"gantt":true,"capacidade":true}'::jsonb),
('enterprise_gold','chao-fabrica','Chão de Fábrica',true,'{"apontamento":true,"paradas":true,"refugo":true,"rastreabilidade":true,"oee":true}'::jsonb),
('enterprise_gold','metrologia-rbc','Metrologia RBC',true,'{"instrumentos":true,"calibracao":true,"certificados":true,"historico":true}'::jsonb),
('enterprise_gold','documentos-obsoletos','Documentos Controlados e Obsoletos',true,'{"revisao":true,"aprovacao":true,"assinatura":true,"historico":true}'::jsonb),
('enterprise_gold','matriz-desenhos','Matriz de Desenhos',true,'{"revisoes":true,"engenharia":true,"documentos_tecnicos":true}'::jsonb),
('enterprise_gold','manutencao-tpm','Manutenção TPM',true,'{"preventiva":true,"corretiva":true,"tpm":true,"laudo":true}'::jsonb),
('enterprise_gold','roteirizacao-balanca','Roteirização de Carga',true,'{"roteirizacao":true,"portaria":true,"peso":true,"conferencia":true}'::jsonb)
on conflict(plano_codigo,modulo_codigo) do update set
  modulo_nome=excluded.modulo_nome,
  acesso=true,
  recursos=excluded.recursos;
