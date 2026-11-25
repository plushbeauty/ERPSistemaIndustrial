-- MIGRATION SUPERSEDED.
-- The original implementation logged a failed attempt and then raised an exception,
-- which rolled back the attempt record. The hardened replacement below persists
-- failures, binds the operator to auth.uid(), and protects start/finalize RPCs.
-- Kept as a no-op so out-of-order migration replay cannot restore the vulnerable v1.
begin;
do $$ begin
  raise notice 'Superseded by 20261125005809_operator_session_and_remaining_rbac_hardening.sql';
end $$;
commit;
