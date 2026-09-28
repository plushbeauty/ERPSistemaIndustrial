-- Restrict destructive Plastibor purge RPC to privileged server-side callers only.
-- The function itself enforces erp_is_master(); authenticated clients must not receive EXECUTE.
revoke execute on function public.erp_master_purge_plastibor_test_data() from authenticated;
revoke execute on function public.erp_master_purge_plastibor_test_data() from anon, public;
