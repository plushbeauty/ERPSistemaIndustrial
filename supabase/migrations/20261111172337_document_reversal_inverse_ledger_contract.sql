alter table public.erp_fiscal_estornos
  add column if not exists tipo_documento text,
  add column if not exists acao_titulo text,
  add column if not exists valor_estornado numeric(18,2) not null default 0,
  add column if not exists lancamentos_originais uuid[] not null default '{}'::uuid[],
  add column if not exists lancamentos_inversos uuid[] not null default '{}'::uuid[],
  add column if not exists comprovante_path text,
  add column if not exists usuario_id uuid,
  add column if not exists status text not null default 'EXECUTADO';

alter table public.erp_fiscal_razao_lancamentos
  add column if not exists estorno_id uuid,
  add column if not exists lancamento_original_id uuid;

create index if not exists idx_erp_fiscal_razao_estorno_id on public.erp_fiscal_razao_lancamentos(estorno_id) where estorno_id is not null;
create index if not exists idx_erp_fiscal_razao_lancamento_original on public.erp_fiscal_razao_lancamentos(lancamento_original_id) where lancamento_original_id is not null;
create unique index if not exists uq_erp_fiscal_estornos_empresa_documento on public.erp_fiscal_estornos(empresa_id,documento_alvo);

create or replace function public.erp_fiscal_estornar_documento(
 p_documento text,p_documento_id uuid,p_source_table text,p_tipo_documento text,
 p_data date,p_acao_titulo text,p_justificativa text,p_comprovante_path text
)
returns uuid language plpgsql security invoker set search_path=public,pg_temp
as $$
declare
 v_empresa_id uuid; v_auth uuid:=auth.uid(); v_user public.erp_usuarios%rowtype;
 v_title public.erp_financeiro_titulos%rowtype; v_note public.erp_notas_debito_financeiras%rowtype;
 v_original public.erp_fiscal_razao_lancamentos%rowtype; v_estorno_id uuid; v_inverse_id uuid;
 v_original_ids uuid[]:=array[]::uuid[]; v_inverse_ids uuid[]:=array[]::uuid[];
 v_total numeric(18,2):=0; v_count integer:=0;
begin
 if v_auth is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
 v_empresa_id:=public.erp_current_empresa_id();
 if v_empresa_id is null then raise exception 'Selecione uma empresa ativa antes de estornar.' using errcode='42501'; end if;
 select * into v_user from public.erp_usuarios where auth_user_id=v_auth and ativo=true and deleted_at is null limit 1;
 if v_user.id is null or (not public.erp_is_master() and v_user.empresa_id is distinct from v_empresa_id) then raise exception 'Usuário sem vínculo com a empresa ativa.' using errcode='42501'; end if;
 if not public.erp_has_permission('finance','update') and upper(coalesce(v_user.perfil,'')) not in ('ADMINISTRADOR','FINANCEIRO','CONTROLADORIA') and not public.erp_is_master() then
  raise exception 'Usuário sem permissão para estorno documental.' using errcode='42501';
 end if;
 if nullif(btrim(p_documento),'') is null or p_documento_id is null then raise exception 'Selecione um documento válido antes de estornar.' using errcode='22023'; end if;
 if p_data is null or p_data>current_date then raise exception 'Informe uma data de estorno válida.' using errcode='22023'; end if;
 if length(btrim(coalesce(p_justificativa,'')))<25 then raise exception 'A justificativa deve conter pelo menos 25 caracteres.' using errcode='22023'; end if;
 if upper(coalesce(p_acao_titulo,'')) not in ('REABRIR','CANCELAR','MANTER') then raise exception 'Ação do título inválida.' using errcode='22023'; end if;
 if exists(select 1 from public.erp_financeiro_periodos_fechados f where f.empresa_id=v_empresa_id and p_data between f.data_inicio and f.data_fim) then raise exception 'Período contábil fechado para a data informada.' using errcode='22023'; end if;
 if p_comprovante_path is not null and split_part(p_comprovante_path,'/',1)<>v_empresa_id::text then raise exception 'Comprovante fora da pasta da empresa ativa.' using errcode='42501'; end if;

 if p_source_table='erp_financeiro_titulos' and upper(p_tipo_documento)='TITULO' then
  select * into v_title from public.erp_financeiro_titulos where id=p_documento_id and empresa_id=v_empresa_id for update;
  if not found or (v_title.documento is distinct from p_documento and v_title.id::text is distinct from p_documento) then raise exception 'Título não encontrado ou documento divergente na empresa ativa.' using errcode='P0002'; end if;
  if p_acao_titulo<>'MANTER' and exists(select 1 from public.erp_financeiro_baixas b where b.titulo_id=v_title.id) then raise exception 'Título possui baixas. A reversão de pagamentos exige a rotina específica de baixa; nenhuma alteração foi executada.' using errcode='22023'; end if;
 elsif p_source_table='erp_notas_debito_financeiras' and upper(p_tipo_documento)='NOTA_DEBITO' then
  select * into v_note from public.erp_notas_debito_financeiras where id=p_documento_id and empresa_id=v_empresa_id for update;
  if not found or (v_note.numero_nota is distinct from p_documento and v_note.documento_ref is distinct from p_documento and v_note.id::text is distinct from p_documento) then raise exception 'Nota de débito não encontrada ou documento divergente na empresa ativa.' using errcode='P0002'; end if;
  if p_acao_titulo<>'MANTER' and v_note.titulo_id is not null and exists(select 1 from public.erp_financeiro_baixas b where b.titulo_id=v_note.titulo_id) then raise exception 'Nota vinculada a título com baixas. A reversão exige a rotina específica de baixa; nenhuma alteração foi executada.' using errcode='22023'; end if;
 else
  raise exception 'Este tipo de documento ainda não possui rotina de estorno automático segura. Nenhum registro foi alterado.' using errcode='22023';
 end if;

 perform pg_advisory_xact_lock(hashtextextended(v_empresa_id::text||':'||p_documento,0));
 if exists(select 1 from public.erp_fiscal_estornos e where e.empresa_id=v_empresa_id and e.documento_alvo=p_documento) then raise exception 'Este documento já possui um estorno registrado.' using errcode='23505'; end if;

 for v_original in select * from public.erp_fiscal_razao_lancamentos where empresa_id=v_empresa_id and documento=p_documento order by criado_em,id for update loop
  if exists(select 1 from public.erp_fiscal_razao_lancamentos x where x.lancamento_original_id=v_original.id) then raise exception 'Um dos lançamentos originais já possui estorno.' using errcode='23505'; end if;
  v_original_ids:=array_append(v_original_ids,v_original.id);
  v_total:=v_total+greatest(abs(coalesce(v_original.debito,0)),abs(coalesce(v_original.credito,0)));
  v_count:=v_count+1;
 end loop;
 if v_count=0 then raise exception 'Não existe lançamento contábil original para este documento. O estorno não foi executado e o documento original foi preservado.' using errcode='P0002'; end if;

 insert into public.erp_fiscal_estornos(empresa_id,documento_alvo,data_estorno,justificativa,documento_estornado_id,tipo_documento,acao_titulo,valor_estornado,lancamentos_originais,comprovante_path,usuario_id,status)
 values(v_empresa_id,p_documento,p_data,btrim(p_justificativa),p_documento_id,upper(p_tipo_documento),upper(p_acao_titulo),v_total,v_original_ids,p_comprovante_path,v_user.id,'EXECUTANDO')
 returning id into v_estorno_id;

 for v_original in select * from public.erp_fiscal_razao_lancamentos where id=any(v_original_ids) order by criado_em,id loop
  insert into public.erp_fiscal_razao_lancamentos(empresa_id,conta_bancaria_id,documento,descricao,debito,credito,criado_em,estorno_id,lancamento_original_id)
  values(v_empresa_id,v_original.conta_bancaria_id,'ESTORNO:'||v_estorno_id::text||':'||v_original.id::text,'ESTORNO INVERSO · '||coalesce(v_original.descricao,p_documento),coalesce(v_original.credito,0),coalesce(v_original.debito,0),p_data::timestamptz,v_estorno_id,v_original.id)
  returning id into v_inverse_id;
  v_inverse_ids:=array_append(v_inverse_ids,v_inverse_id);
 end loop;

 if upper(p_acao_titulo)='REABRIR' then
  if p_source_table='erp_financeiro_titulos' then update public.erp_financeiro_titulos set status='ABERTO' where id=p_documento_id and empresa_id=v_empresa_id;
  else update public.erp_notas_debito_financeiras set status='ABERTA' where id=p_documento_id and empresa_id=v_empresa_id; if v_note.titulo_id is not null then update public.erp_financeiro_titulos set status='ABERTO' where id=v_note.titulo_id and empresa_id=v_empresa_id; end if; end if;
 elsif upper(p_acao_titulo)='CANCELAR' then
  if p_source_table='erp_financeiro_titulos' then update public.erp_financeiro_titulos set status='CANCELADO' where id=p_documento_id and empresa_id=v_empresa_id;
  else update public.erp_notas_debito_financeiras set status='ESTORNADA' where id=p_documento_id and empresa_id=v_empresa_id; if v_note.titulo_id is not null then update public.erp_financeiro_titulos set status='CANCELADO' where id=v_note.titulo_id and empresa_id=v_empresa_id; end if; end if;
 end if;

 update public.erp_fiscal_estornos set lancamentos_inversos=v_inverse_ids,valor_estornado=v_total,status='EXECUTADO' where id=v_estorno_id and empresa_id=v_empresa_id;
 return v_estorno_id;
end;
$$;

create or replace function public.erp_fiscal_estornar_documento(p_documento text,p_data date,p_justificativa text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp
as $$
begin
 raise exception 'Assinatura antiga de estorno desativada. Use a rotina com documento, origem, tipo e ação validados.' using errcode='22023';
end;
$$;
revoke all on function public.erp_fiscal_estornar_documento(text,date,text) from public,anon,authenticated;
revoke all on function public.erp_fiscal_estornar_documento(text,uuid,text,text,date,text,text,text) from public,anon;
grant execute on function public.erp_fiscal_estornar_documento(text,uuid,text,text,date,text,text,text) to authenticated;
