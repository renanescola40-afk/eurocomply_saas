# SECURITY DEFINER — first source inspection (2026-10-14)
Classification: internal. Read-only pg_get_functiondef observations. NOT a test of effective authorization.

## Scope and actual completion
54 priority functions have 'public' in configured search_path.
Definitions inspected this session: 3/54 = 5.56% of prioritized functions, 51/54 (94.44%) not yet inspected this way.
These 3 are **preliminary source reviews**, not validated-safe conclusions.
Fully tested effective authorization: 0/54 = 0%; 100% remaining.

## Observed functions
1. `create_organization_with_owner_atomic`: validation and organization creation plus owner membership observed. Takes p_user_id input. No explicit auth.uid() check visible in retrieved complete definition; no direct execute grants for anon/authenticated in previous catalog check. Verify trusted server call path, caller identity binding and role permissions.
2. `create_enterprise_evidence_pack_atomic`: uses p_actor_user_id and p_organization_id, inserts data into pack/items and scopes AI-system collection by organization. In retrieved complete definition, no explicit membership check observed. No direct execute grants for anon/authenticated found in earlier metadata. Verify privileged service invocation and caller-supplied IDs.
3. `change_organization_member_role_atomic`: selected definition was truncated at 3500 chars, showing organization/member scoping, transactional locking and last-owner logic. Cannot conclude caller authorization until reviewing full function and call site.

The presence of caller-supplied identity does not prove exploitable access: execution grants, server-side authorization, and code call sites are essential.

## Recommended next technical checks
- Fetch full function definitions for role change and compare app call sites and auth guards.
- Inspect EXECUTE grants for any other roles and role inheritance.
- Cross-check service-role usage against server-only code and authenticated identity.
- Test tenant isolation in isolated staging; never run mutating functions on production.
- Assess all ISO clauses 4-10 and organizational operating controls separately.

## Percentages
Priority function preliminary source inspections: 3/54 = 5.56% done; 94.44% left.
Priority function authorization tests: 0/54 = 0% done; 100% left.
ISO 27001 / SOC 2 overall readiness: NOT YET MEASURABLE, remaining NOT YET MEASURABLE.

Protection: no email, no production write, no DataGuard interaction, no Stripe live write.
