insert into public.erp_qualidade_documentos_revisoes (
  empresa_id, codigo_documento, titulo_documento, departamento, revisao,
  responsavel, status, conteudo_texto, motivo_alteracao, criado_em, data_vigencia
)
select
  e.empresa_id,
  e.codigo_documento,
  e.titulo_documento,
  coalesce(nullif(trim(e.setor_responsavel), ''), 'QUALIDADE'),
  greatest(e.revisao, 1),
  'Histórico inicial migrado',
  case
    when upper(coalesce(e.status, '')) in ('VIGENTE', 'ATIVA') then 'VIGENTE'
    when upper(coalesce(e.status, '')) = 'OBSOLETO' then 'OBSOLETO'
    else 'EM_REVISAO'
  end,
  coalesce(e.conteudo_texto, ''),
  e.motivo_alteracao,
  coalesce(e.atualizado_em, now()),
  e.data_homologacao
from public.erp_qualidade_documentos_editor e
where not exists (
  select 1
  from public.erp_qualidade_documentos_revisoes r
  where r.empresa_id = e.empresa_id
    and r.codigo_documento = e.codigo_documento
    and r.revisao = greatest(e.revisao, 1)
)
on conflict (empresa_id, codigo_documento, revisao) do nothing;
