# RISCK COMPLY — commercial authorization gate investigation

Date: 2026-10-15. Read-only inspection. No production mutations.

## Verified source behavior

- `app_private.resolve_commercial_plan(uuid)` evaluates contracts, subscription records and processed Stripe events for a supplied organization ID. It is `SECURITY DEFINER` and is not directly executable by the checked `anon` or `authenticated` roles.
- `app_private.has_commercial_authority(uuid)` and `app_private.has_minimum_commercial_plan(uuid,text)` are executable by authenticated users and delegate to `resolve_commercial_plan` without an explicit caller-membership check in their own definitions.
- The helpers are referenced in numerous tenant-data RLS policies, including some marked restrictive and a permissive `payment_first_commercial_authority` policy. Permissive/restrictive composition and other policies must be reviewed before declaring a cross-tenant vulnerability.
- `public.current_jwt_subject()` reads the request JWT subject; `current_legacy_user_id` and `current_clerk_user_id` distinguish UUID/non-UUID forms of that subject. These depend on trusted claim propagation and warrant isolated negative tests.
- `public.tenant_mfa_satisfied(uuid)` checks organization MFA settings and JWT assurance level; validate interaction with member checks and missing configuration.

## Security hypotheses requiring safe tests

1. Whether the commercial helpers can be called by authenticated users to reveal another organization's subscription tier through boolean responses (information disclosure).
2. Whether any permissive policy supplies read/write access with only a commercial-plan check instead of independently requiring active membership. Test effective policy union/intersection, privileges and API access in an isolated environment.
3. Whether claim-based legacy identities can be spoofed in test sessions; do not test or modify genuine production sessions.
4. Whether MFA fail-closed rules operate correctly under missing settings and membership revocation.

## Recommended actions

- Inventory every relevant policy, its `permissive` mode, `USING` and `WITH CHECK`, and other overlapping policies.
- Audit app-side service-role routes for caller-owned organization checks.
- If a real vulnerability is reproduced, add a minimum narrowly scoped fix and isolated positive/negative tests before producing a migration.
- No production migration without specific owner authorization.

Status: investigation only, NOT a vulnerability proof, NOT security PASS. No production changes, no customer records accessed. DATABASE_SECURITY_100=NO_PASS.
