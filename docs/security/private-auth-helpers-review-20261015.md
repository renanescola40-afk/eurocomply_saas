# Supabase private authorization helpers: source review

Date: 2026-10-15. Read-only production function-definition inspection; no customer data accessed or altered.

Seven app_private SECURITY DEFINER helpers allow authenticated EXECUTE. All are owned by postgres and explicitly set search_path.

- enterprise_member_can_read: requires auth.uid(), matching active organization_members user_id.
- enterprise_member_can_manage: same active membership plus role owner/admin/editor/compliance_manager.
- has_commercial_authority: delegates to resolve_commercial_plan; delegated authorization requires separate review.
- has_minimum_commercial_plan: delegates to resolve_commercial_plan; maps commercial tiers; delegated authorization requires separate review.
- has_org_role: requires tenant_mfa_satisfied and active membership, but also accepts current_legacy_user_id or current_clerk_user_id identity paths.
- has_org_write_role: delegates to has_org_role with owner/admin/editor roles.
- is_org_member: checks tenant_mfa_satisfied and membership via current_legacy_user_id or current_clerk_user_id.

## Open verification work

1. Inspect implementations and grants of current_legacy_user_id, current_clerk_user_id and tenant_mfa_satisfied. Verify that neither trusts user-controlled request claims in a way that could elevate identity.
2. Inspect resolve_commercial_plan implementation for caller-binding and entitlement leakage or cross-tenant authority errors.
3. Identify every RLS policy and RPC invoking the seven helpers. Verify that requested organization ID remains bound to the caller's active membership.
4. Reconcile legacy Clerk compatibility with the active Supabase Auth architecture. Do not delete legacy helpers without a dependency inventory.
5. Create isolated, synthetic positive and negative tests for membership and role validation.

The inspected function definitions have some explicit identity and active-membership checks. This is not a full security PASS: delegated helpers and alternate identity resolvers have not been audited or behaviorally tested.

Production writes: none. main merge: none. DataGuard demo: unchanged. DATABASE_SECURITY_100=NO_PASS.
