insert into public.erp_planos_catalogo (codigo,nome,ordem,preco_mensal,descricao,ativo)
values ('enterprise_gold','Industrial Enterprise Gold',4,1290,'SGQ Avançado, TPM e rastreabilidade industrial de ponta a ponta.',true)
on conflict (codigo) do update set
  nome=excluded.nome,
  ordem=excluded.ordem,
  preco_mensal=excluded.preco_mensal,
  descricao=excluded.descricao,
  ativo=true,
  atualizado_em=now();

insert into public.erp_plano_modulos
  (plano_codigo,modulo_codigo,modulo_nome,acesso,recursos)
values
  ('enterprise_gold','sgq-tpm','SGQ Avançado e TPM',true,
   '{"features":["Balança Rodoviária de Portaria","Roteirização de Carga com trava de excesso de peso","Gestão de Não Conformidades RNC 8D","Assinatura Eletrônica SHA-256","Assistente de IA de Ajuda Contextual POP-SGQ-012"]}'::jsonb)
on conflict (plano_codigo,modulo_codigo) do update set
  modulo_nome=excluded.modulo_nome,
  acesso=true,
  recursos=excluded.recursos;