# Privilege and exposure check — 2026-10-14
Evidence type: production read-only metadata. No independent audit opinion.

## SQL results
- 125 public SECURITY DEFINER functions observed.
- has_function_privilege('anon',oid,'EXECUTE') true: 0/125.
- has_function_privilege('authenticated',oid,'EXECUTE') true: 0/125.
- 33 public tables without explicit pg_policies entries.
- has_table_privilege('anon',table,'SELECT') true: 0/33.
- has_table_privilege('authenticated',table,'SELECT') true: 0/33.
- 138/227 public RLS policies contained the text 'organization' in USING or WITH CHECK; string matching is only discovery, never a correctness test.

## Scope limits
Results only cover specified Postgres roles and privileges, not ownership, roles with BYPASSRLS, service_role paths, privileged connections, or SQL function execution through other roles.
No user data was read or changed. No claim is made that all 33 tables are secured against all actors.
ISO 27001 readiness: NOT YET MEASURABLE.
SOC 2 Type I/II readiness: NOT YET MEASURABLE.

## Next steps
1. Review policies by table/command and policy permissiveness/restriction.
2. Review SECURITY DEFINER function body and effective execution roles, owners, secure search_path values.
3. Assess server-role-only architecture and test organization isolation in synthetic staging.
4. Map observations to applicable controls after risk assessment and approved scope.

## Protection evidence
Production SQL was SELECT only. No customer or DataGuard demo data read. No emails sent, no production changes, no Stripe mutations.
