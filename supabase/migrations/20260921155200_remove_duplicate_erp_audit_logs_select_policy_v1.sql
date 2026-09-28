/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: supabase/migrations/20260921155200_remove_duplicate_erp_audit_logs_select_policy_v1.sql
- Status Atual: Revisão 1
- Total de Linhas Lido/Gerado: 8
- Assinatura de Entrada: Não se aplica a SQL; migration DDL
- Integração Concretizada: remove policy SELECT pública duplicada de erp_audit_logs, preservando a policy autenticada tenant-safe.
*/
DROP POLICY IF EXISTS audit_select ON public.erp_audit_logs;
