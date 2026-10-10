revoke all on function public.erp_qms_decidir_inspecao_recebimento(uuid, text) from public;
revoke all on function public.erp_qms_decidir_inspecao_recebimento(uuid, text) from anon;
grant execute on function public.erp_qms_decidir_inspecao_recebimento(uuid, text) to authenticated;
