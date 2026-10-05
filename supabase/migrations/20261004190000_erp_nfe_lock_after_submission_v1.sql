create or replace function public.erp_guard_nfe_document_content()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if old.modelo = '55' and old.status is distinct from 'Rascunho' then
      raise exception 'Somente rascunhos de NF-e podem ser excluídos';
    end if;
    return old;
  end if;

  if old.modelo = '55' then
    if old.status is distinct from 'Rascunho' and new.status = 'Rascunho' then
      raise exception 'Uma NF-e que iniciou processamento não pode voltar a rascunho';
    end if;

    if (
      old.status is distinct from 'Rascunho'
      or new.status is distinct from 'Rascunho'
    ) and row(
      new.tipo,
      new.modelo,
      new.serie,
      new.numero,
      new.natureza_operacao,
      new.cfop,
      new.ambiente,
      new.data_emissao,
      new.data_saida,
      new.destinatario_nome,
      new.destinatario_documento,
      new.destinatario_ie,
      new.destinatario_email,
      new.destinatario_endereco,
      new.destinatario_bairro,
      new.destinatario_cep,
      new.destinatario_cidade,
      new.destinatario_uf,
      new.modalidade_frete,
      new.transportadora,
      new.placa,
      new.uf_transportadora,
      new.peso_liquido,
      new.peso_bruto,
      new.volumes,
      new.valor_produtos,
      new.valor_frete,
      new.valor_outras_despesas,
      new.valor_desconto,
      new.base_calculo_icms,
      new.valor_icms,
      new.base_icms_st,
      new.valor_icms_st,
      new.valor_ipi,
      new.valor_pis,
      new.valor_cofins,
      new.valor_total,
      new.valor_liquido
    ) is distinct from row(
      old.tipo,
      old.modelo,
      old.serie,
      old.numero,
      old.natureza_operacao,
      old.cfop,
      old.ambiente,
      old.data_emissao,
      old.data_saida,
      old.destinatario_nome,
      old.destinatario_documento,
      old.destinatario_ie,
      old.destinatario_email,
      old.destinatario_endereco,
      old.destinatario_bairro,
      old.destinatario_cep,
      old.destinatario_cidade,
      old.destinatario_uf,
      old.modalidade_frete,
      old.transportadora,
      old.placa,
      old.uf_transportadora,
      old.peso_liquido,
      old.peso_bruto,
      old.volumes,
      old.valor_produtos,
      old.valor_frete,
      old.valor_outras_despesas,
      old.valor_desconto,
      old.base_calculo_icms,
      old.valor_icms,
      old.base_icms_st,
      old.valor_icms_st,
      old.valor_ipi,
      old.valor_pis,
      old.valor_cofins,
      old.valor_total,
      old.valor_liquido
    ) then
      raise exception 'O conteúdo fiscal de uma NF-e em processamento ou finalizada é imutável';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists erp_nfe_lock_document_content on public.erp_documentos_fiscais;
create trigger erp_nfe_lock_document_content
before update or delete on public.erp_documentos_fiscais
for each row execute function public.erp_guard_nfe_document_content();

create or replace function public.erp_guard_nfe_item_content()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select d.status into v_status
    from public.erp_documentos_fiscais d
    where d.id = old.documento_id
      and d.empresa_id = old.empresa_id;

    if found and v_status is distinct from 'Rascunho' then
      raise exception 'Os itens de uma NF-e em processamento ou finalizada são imutáveis';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select d.status into v_status
    from public.erp_documentos_fiscais d
    where d.id = new.documento_id
      and d.empresa_id = new.empresa_id;

    if not found then
      raise exception 'Documento fiscal do item não localizado na empresa';
    end if;
    if v_status is distinct from 'Rascunho' then
      raise exception 'Só é permitido alterar itens de uma NF-e em rascunho';
    end if;
    return new;
  end if;

  return old;
end;
$$;

drop trigger if exists erp_nfe_lock_item_content on public.erp_documentos_fiscais_itens;
create trigger erp_nfe_lock_item_content
before insert or update or delete on public.erp_documentos_fiscais_itens
for each row execute function public.erp_guard_nfe_item_content();
