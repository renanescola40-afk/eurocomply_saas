# Provider factual evidence register

**Status:** `FACTUAL_EVIDENCE_IN_REVIEW`  
**Evidence snapshot:** 2026-08-24  
**Current protected main/runtime subject:** `75151c463ea7bf54c74e4dc9e5cd3af995615eae`  
**Current Production deployment:** `dpl_AR5ZwbDCHxT1kmps5xJVm5gmaBRx`  
**Canonical tracker:** GitHub issue `#1727`

This register separates attributable provider/configuration facts from legal interpretation. It is not a DPA, legal opinion, GDPR-compliance statement, certification, independent pentest, regulator approval, or proof that every public provider term is contractually applicable to the RISCK COMPLY account.

## Evidence rules

- Runtime/configuration facts require attributable Production evidence.
- Public provider documents can establish general contractual/policy frameworks but do not prove an account-specific acceptance actor/timestamp, custom agreement or final legal role.
- A provider can be technically active while account/legal facts remain open.
- An assurance account is not Production evidence unless it can be attributed to the Production integration.
- Plan defaults are recorded separately from optional add-ons when the add-on state is not owner-visible through the connected tools.
- Do not retain API keys, tokens, passwords, connection strings, webhook secrets, private KYC records, private contracts or user-level identity data when unnecessary.

## Factual reconciliation

| Provider / service | Current attributable fact | Region / retention fact | Current evidence state | Still required before final contractual disclosure |
| --- | --- | --- | --- | --- |
| Vercel | Production deployment `dpl_AR5ZwbDCHxT1kmps5xJVm5gmaBRx` is attributable to `75151c...`; canonical health returned `200`; connected team plan is `pro`. Current Vercel DPA expressly covers Pro and Enterprise customers and includes SCC/subprocessor mechanics. | Runtime placement is deployment-specific and does not establish all processing locations. Standard Pro Runtime Logs retention is 1 day; Observability Plus would extend it to 30 days, but the account add-on state is not exposed here. | `CURRENT_RUNTIME_PROVEN / PRO_PLAN_PROVEN / STANDARD_DPA_PRO_PLAN_MATCHED / SCC_FRAMEWORK_PROVEN` | Observability Plus state if material; account-specific acceptance actor/timestamp or custom/superseding agreement; final legal role/transfer interpretation. |
| Supabase | Production project `tganhbbhfxcpblmgqprg` is `ACTIVE_HEALTHY`; connected organization is `pro`. Provider correspondence/public material establishes the standard DPA framework is incorporated into the standard agreement unless superseded. | Project region `eu-west-1` (Ireland). Standard Pro daily-backup access is 7 days; PITR is a separate add-on and the account PITR state/window is not exposed by connected tools. | `PROJECT_REGION_PROVEN / PRO_PLAN_PROVEN / STANDARD_DPA_FRAMEWORK_PROVEN / PRO_BACKUP_DEFAULT_PROVEN` | Check for superseding negotiated agreement; account-specific PITR state; final retention/transfer/legal-role interpretation. |
| Stripe | Connected account is LIVE, country `PT`, type `standard`, `business_type=individual`, with charges/payouts enabled. Standard EEA DPA/transfer/subprocessor framework is separately evidenced. | Account country is Portugal; provider processing/storage geography is not inferred from that field. | `LIVE_CONTROL_PLANE_PROVEN / ACCOUNT_COUNTRY_PROVEN / STANDARD_FRAMEWORK_PROVEN / OPERATOR_ENTITY_ALIGNMENT_OPEN` | Align account/operator with the final existing-company decision if required; retain applicable account agreement/DPA and enabled-service data-flow evidence. |
| Google OAuth / Google Identity | Production Auth contains non-zero Google-provider identities from an aggregate, non-PII query. Application source uses Supabase `signInWithOAuth` with provider `google`. Google OAuth/OpenID Connect policy framework is publicly established. | Exact account processing region, retention and transfer treatment are not established here. | `PRODUCTION_USAGE_PROVEN / AUTH_IDENTITY_PROVIDER / POLICY_FRAMEWORK_PROVEN / LEGAL_ROLE_OPEN` | Applicable Google contracting entity/terms for this OAuth client, DPA applicability if any, region/retention/transfers and qualified legal role classification. |
| GitHub / GitHub Actions | Repository and CI are actively used; repository is public and owned by a Personal User account. Protected recovery workflows can transiently process Production database data on GitHub-hosted runners; only redacted recovery evidence JSON is intentionally uploaded as artifact. | GitHub-hosted runner is ephemeral per job. Recovery evidence artifacts are retained 90 days. No company-specific processing region is established for the Personal Account. | `MATERIAL_OPERATIONAL_PROVIDER / TRANSIENT_PRODUCTION_PROCESSING_PROVEN / PERSONAL_ACCOUNT_CONTRACT_BOUNDARY_OPEN` | Determine whether any company/enterprise DPA or customer agreement applies to the current account; final legal role and transfer treatment. |
| Sentry | Direct Production fetch exposes `sentry-environment=production` and exact `sentry-release=75151c...`; current-release binding is freshly proven. Human support established the self-service assurance-material boundary. | Public runtime evidence does not expose a deterministic US-vs-Germany organization storage region. | `CURRENT_RELEASE_BINDING_PROVEN / HUMAN_SUPPORT_BOUNDARY_PROVEN / ACCOUNT_DPA_REGION_OPEN` | Owner-visible organization region, plan/retention and DPA acceptance actor/timestamp; final transfer/legal interpretation. |
| PostHog | Production client targets EU PostHog endpoints. Connected assurance organization exposes only a different `Default project`, created 2026-08-22 with no ingested event; it is not Production. Human support states EU Cloud is Frankfurt and account-linked DPA generation is available from the organization Legal page. | Production client uses EU endpoints; actual Production account ownership/plan/retention remains unrecovered. | `PRODUCTION_EU_ENDPOINT_BINDING_PROVEN / ASSURANCE_PROJECT_MISMATCH / PRODUCTION_ACCOUNT_RECOVERY_OPEN` | Recover actual Production account/project; retrieve/generate account-linked DPA; confirm plan, retention and account settings. |
| Resend / transactional email | Historical real delivery is independently evidenced from recipient-side email authentication headers. Provider-published current Terms/DPA establish `Plus Five Five, Inc.`/Resend, standard DPA/SCC/subprocessor framework and standard deletion language. No attributable send on exact current release is retained. | Provider states customer data is stored in the US; DPA states user/customer data deletion within 90 days after account termination. Current account/runtime location and plan remain unproven. | `HISTORICAL_DELIVERY_PROVEN / PROVIDER_FRAMEWORK_PROVEN_GENERAL / CURRENT_EXACT_RELEASE_BINDING_OPEN` | Current Production binding; account plan/owner and account-specific acceptance/effective agreement evidence. |
| Upstash / Redis | Exact-current Production binding is proven through a safe route that traverses fail-closed distributed rate limiting. Provider-published Terms/DPA establish `Upstash, Inc.`, incorporated DPA, transfer/subprocessor framework and deletion-on-termination mechanics. | Exact account region/plan remain unproven; no fixed account-specific retention period is inferred from generic documents. | `CURRENT_EXACT_RELEASE_RUNTIME_PROVEN / PROVIDER_FRAMEWORK_PROVEN_GENERAL / ACCOUNT_FACTS_OPEN` | Account plan/owner/region, account-specific agreement/DPA acceptance and final retention/transfer/legal interpretation. |
| Malware/content scanner | Runtime policy requires provider-backed scanning when enterprise upload scanning is enabled; exact-current provider identity/binding is not established. | `UNKNOWN_CURRENT` | `CONDITIONAL_UNVERIFIED` | Confirm active provider/scope, data categories, region, retention and legal terms if enabled. |
| OpenAI / ChatGPT — founder operational use outside SaaS runtime | Founder operational use exists outside direct SaaS runtime; no direct SaaS model-provider integration is established by current evidence. | Workspace-specific processing/storage posture is outside current runtime provider evidence. | `FOUNDER_OPERATIONAL_USE_CAPTURED / DIRECT_RUNTIME_INTEGRATION_NOT_IDENTIFIED / LEGAL_FACTS_OPEN` | Final policy on customer-content use, workspace terms/retention/training posture and qualified legal role. |

## Superseded provider blockers

Do not report these historical states as current:

- `VERCEL_HOBBY_PLAN_MISMATCH` — resolved; connected team is Pro.
- `SUPABASE_FREE_PLAN_MISMATCH` — resolved; connected organization is Pro.
- `STRIPE_ACCOUNT_COUNTRY_OPEN` — resolved; account country is Portugal.
- `SENTRY_CURRENT_RELEASE_BINDING_OPEN` — resolved for runtime binding; organization region/DPA acceptance remain separate.
- `POSTHOG_EU_ENDPOINT_BINDING_OPEN` — resolved for Production endpoint configuration; Production account recovery remains separate.
- `UPSTASH_CURRENT_EXACT_RELEASE_REPROOF_OPEN` — resolved for runtime binding on `75151c...`; account/legal facts remain separate.
- `GOOGLE_OAUTH_USAGE_UNPROVEN` — superseded by non-zero aggregate Production identity evidence.

## Legal interpretation boundary

The following remain `QUALIFIED_HUMAN_REQUIRED` where applicable:

- controller/processor/subprocessor/independent-controller role allocation;
- lawful-basis descriptions;
- Article 28 DPA sufficiency;
- international-transfer treatment;
- provider/subprocessor authorisation, notice and objection model;
- analytics/cookie/consent legal requirements;
- retention/legal-hold decisions;
- final Privacy Policy, Terms and DPA language.

Public provider terms reduce factual uncertainty but are not a substitute for confirming the actual account agreement and obtaining qualified legal review.

## Exact-SHA treatment

Release-specific facts in this register are bound to the stated runtime subject. Documentation-only commits do not by themselves invalidate provider/account facts. A material runtime, provider configuration, data-flow, region, retention or service-scope change requires revalidation.

## Closure state

`PROVIDER_FACTUAL_RECONCILIATION: MATERIALLY_RECONCILED`

`GOOGLE_OAUTH_PRODUCTION_USAGE: PROVEN`

`GITHUB_ACTIONS_MATERIALITY: PROVEN`

`SENTRY_CURRENT_RELEASE_BINDING: PROVEN`

`UPSTASH_CURRENT_EXACT_RELEASE_RUNTIME: PROVEN`

`POSTHOG_PRODUCTION_ACCOUNT_RECOVERY: OPEN`

`RESEND_CURRENT_EXACT_RELEASE_BINDING: OPEN`

`MALWARE_SCANNER_CURRENT_PROVIDER_BINDING: OPEN`

`STRIPE_OPERATOR_ENTITY_ALIGNMENT: OPEN`

`ACCOUNT_LEGAL_FACTS_OPEN: OPEN`

`PRIVACY_GDPR_LEGAL_INTERPRETATION: WAITING_QUALIFIED_HUMAN`

`SUBPROCESSOR_DPA_REGISTER: NO_PASS_YET`
