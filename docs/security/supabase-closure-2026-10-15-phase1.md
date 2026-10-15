# Supabase security closure — phase 1 (2026-10-15)

Status: **READ-ONLY INSPECTION / NOT PRODUCTION-VERIFIED SECURITY PASS**

## Evidence captured
- Production project: `tganhbbhfxcpblmgqprg`.
- Live database metadata query: **115 public ordinary tables, 115 RLS enabled, 115 FORCE RLS**.
- Supabase Security Advisor: **33 INFO** (`rls_enabled_no_policy`) and **1 WARN** (`auth_leaked_password_protection` disabled).
- Supabase Performance Advisor: **111 INFO** (`unindexed_foreign_keys`), requiring independent priority analysis, not automatic index creation.
- On inspected sensitive tables `billing_checkout_attempts`, `enterprise_api_keys`, `enterprise_contracts`, `organization_entitlements`, `sales_leads`, `stripe_webhook_events`, information_schema.role_table_grants returned **no entries** for anon/authenticated/PUBLIC. This narrow metadata result is **not proof of absence of indirect access**.
- Existing repository evidence: `docs/assurance/iso27001-soc2/database-metadata-followup-2026-10-14.md` reports 227 policy rows on 82 public tables and 125 SECURITY DEFINER functions with explicit search_path. Values, function ownership, EXECUTE ACLs, authorization correctness and effectiveness **remain unverified**.

## All 33 no-policy findings — disposition pending
These must each receive source-code access-path, ACL, RPC and threat-model examination before approval.

| Table | Initial classification | Current disposition |
|---|---|---|
| billing_checkout_attempts | billing internal candidate | REQUIRES_INVESTIGATION |
| billing_lifecycle_requests | billing internal candidate | REQUIRES_INVESTIGATION |
| compliance_metric_snapshots | operational snapshots candidate | REQUIRES_INVESTIGATION |
| enterprise_access_escalation_policies | privileged operations candidate | REQUIRES_INVESTIGATION |
| enterprise_api_keys | sensitive integration credentials candidate | REQUIRES_INVESTIGATION |
| enterprise_break_glass_approvals | privileged operations candidate | REQUIRES_INVESTIGATION |
| enterprise_break_glass_events | privileged operations candidate | REQUIRES_INVESTIGATION |
| enterprise_break_glass_requests | privileged operations candidate | REQUIRES_INVESTIGATION |
| enterprise_break_glass_reviews | privileged operations candidate | REQUIRES_INVESTIGATION |
| enterprise_contract_billing_events | billing internal candidate | REQUIRES_INVESTIGATION |
| enterprise_contracts | contractual data candidate | REQUIRES_INVESTIGATION |
| enterprise_identity_connections | identity infrastructure candidate | REQUIRES_INVESTIGATION |
| enterprise_integration_audit_events | audit infrastructure candidate | REQUIRES_INVESTIGATION |
| enterprise_scim_identities | identity infrastructure candidate | REQUIRES_INVESTIGATION |
| enterprise_scim_tokens | credentials candidate | REQUIRES_INVESTIGATION |
| enterprise_seat_operations | billing/entitlement candidate | REQUIRES_INVESTIGATION |
| enterprise_service_accounts | credentials candidate | REQUIRES_INVESTIGATION |
| enterprise_webhook_deliveries | integration operations candidate | REQUIRES_INVESTIGATION |
| enterprise_webhook_subscriptions | integration operations candidate | REQUIRES_INVESTIGATION |
| linkedin_marketing_posts | platform-owned editorial candidate | REQUIRES_INVESTIGATION |
| organization_entitlements | commercial authority candidate | REQUIRES_INVESTIGATION |
| organization_security_settings | configuration candidate | REQUIRES_INVESTIGATION |
| organization_usage | metering candidate | REQUIRES_INVESTIGATION |
| platform_admin_users | platform operator candidate | REQUIRES_INVESTIGATION |
| sales_lead_activities | internal CRM candidate | REQUIRES_INVESTIGATION |
| sales_lead_activity_events | internal CRM candidate | REQUIRES_INVESTIGATION |
| sales_lead_notes | internal CRM candidate | REQUIRES_INVESTIGATION |
| sales_leads | internal CRM candidate | REQUIRES_INVESTIGATION |
| step_up_challenges | authentication infrastructure candidate | REQUIRES_INVESTIGATION |
| step_up_tokens | authentication infrastructure candidate | REQUIRES_INVESTIGATION |
| stripe_events_processed | billing internal candidate | REQUIRES_INVESTIGATION |
| stripe_webhook_events | billing internal candidate | REQUIRES_INVESTIGATION |
| waitlist_leads | signup/marketing candidate | REQUIRES_INVESTIGATION |

## Immediate engineering gate
1. Map each of the 33 tables to its server call sites and any direct client access.
2. Inspect database ACLs and public/private RPC execution paths, including SECURITY DEFINER functions.
3. Verify RLS policy composition (permissive OR versus restrictive AND) on the 82 policy-bearing public tables.
4. Test in an isolated, zero-new-cost environment with synthetic tenants, role impersonation and positive/negative CRUD cases.
5. Review password protection availability, plan cost and expected Auth behavior; production setting change requires specific owner approval.
6. Inspect 111 foreign-key index findings and choose only performance-justified indexes after benchmarks.
7. Reconcile migration state against main SHA and tested revision before deployment.
8. Obtain separate production approval for any deployment; perform read-only post-release verification.

## Protection boundary
No production DDL/DML, service settings mutation, authentication changes, emails, payments, main merge, or DataGuard demo changes authorized. No production customer data sampled.

## Closure state
- Public RLS and FORCE RLS configuration: **115/115 VERIFIED CONFIGURATION**.
- RLS 33 finding remediation/disposition: **0/33 VERIFIED CLOSED** (metadata identified, not yet resolved).
- Effective cross-tenant isolation: **NOT TESTED in this phase**.
- Leaked-password warning: **OPEN**.
- Overall DATABASE_SECURITY_100: **NO_PASS**.
- Percentages beyond scoped metadata are **NOT MEASURABLE** pending complete control inventory.
