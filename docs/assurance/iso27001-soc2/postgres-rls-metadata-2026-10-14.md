# Production Postgres security metadata — 2026-10-14
Classification: internal; read-only observation, not certification evidence of effective tenant isolation.

## Verified through read-only pg_catalog queries
- public tables (ordinary + partitioned): 115
- relrowsecurity true: 115/115 (100% of inspected table set)
- relforcerowsecurity true: 115/115 (100% of inspected table set)
- pg_policies rows in public: 227
- distinct public tables with at least one policy: 82
- remaining tables without explicit policy: 33 (could be intentional deny-by-default; requires contextual investigation)
- public SECURITY DEFINER functions: 125 (not automatically vulnerabilities).
- public pg_policies rows with literal role 'public' in rendered roles: 0; does NOT prove correct role scoping or isolation.
- Vercel deployment dpl_2Gz8W5BhreKD7AwN28yVnSCjAyhq READY and aliased to www.risckcomply.com, SHA 857ddfb21d0135df3a026ad480da5945119b175c. Deployment health only.

## Risk-driven next tests (no production mutation)
1. Inventory 33 no-policy tables; document use and exposure. Determine whether deny-by-default is intentional.
2. List SECURITY DEFINER function owners, granted EXECUTE roles, search_path and reviewed authorization predicates. Never invoke risky functions in live system.
3. Check policies for tenant joins, authenticated roles, NULL handling, WITH CHECK vs USING, CRUD coverage, and permissive combinations; test with synthetic isolated fixtures only.
4. Assess RLS bypass roles and service-role code paths; privileged RLS bypass can exist despite FORCE RLS.
5. Verify Storage RLS and all non-public application schemas.
6. Validate production vs main commit and evidence retention.

## Control claims
Observed: RLS and FORCE RLS configuration coverage of public tables.
NOT VERIFIED: policy correctness, tenant isolation, privileged access safety, all-schema security, operational effectiveness, ISO 27001 or SOC 2 conformity.

## Safety
No production writes, no DataGuard user interactions, no emails, no Stripe writes. All further fixes require staging and change-control review.
