/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: supabase/migrations/20260921154154_harden_lote_touch_search_path_v1.sql
- Status Atual: Revisão 1
- Total de Linhas Lido/Gerado: 8
- Assinatura de Entrada: Não se aplica a SQL; migration DDL
- Integração Concretizada: configura search_path fixo da trigger de configuração de lote
*/
ALTER FUNCTION public.erp_config_lote_touch()
SET search_path = pg_catalog;
