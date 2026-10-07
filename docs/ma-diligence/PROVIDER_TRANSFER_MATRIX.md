# RISCK COMPLY — Provider Transfer Matrix

Date: 2026-10-05  
Baseline main SHA: `6219f52c463c367848c1139158e5389d35298ca2`  
Status: `PROVIDER_TRANSFER_DILIGENCE=PARTIAL_ADVANCED`

This matrix consolidates repository and connected-account evidence for M&A handover. It does not state that provider accounts are transferable unless provider/account terms prove it.

| Provider | Current evidence | Account/billing owner | Transferability / change of control | DPA/data/region | Criticality | Handover requirement |
|---|---|---|---|---|---|---|
| Vercel | Authenticated team `team_wu3LZI6ReFxO16xipv73GLwG` has exactly one confirmed member, `renanescola40-afk`, role `OWNER`; project `eurocomply-saas` (`prj_APpXAyQFy1Gie50xfbO45zjkyUSm`) belongs to the same team; authenticated FOCUS billing for 2026-09-30 through 2026-10-06 returned 5,229 records and USD 48.712680341607 billed cost. | ACCOUNT_OWNER=VERIFIED / PROJECT_CONTROL=VERIFIED / BILLING_ACCESS=VERIFIED | Official Vercel project/team transfer mechanisms documented; buyer-specific execution remains a closing step. | DPA framework documented; account control and billing evidence current. | Critical hosting/release | Add buyer owner, reconcile seller legal billing title, transfer project/domain if required, then rotate credentials/secrets. |
| Supabase | Authenticated organization `renanescola40-afk's Org` is Pro; Production project `tganhbbhfxcpblmgqprg` (`eurocomply_saas`) is `ACTIVE_HEALTHY` in `eu-west-1` | AUTHENTICATED_ORG_CONTROL_VERIFIED / LEGAL_BILLING_OWNER_OPEN | Official Supabase documentation supports project transfer between organizations subject to owner/membership and configuration preconditions | Strong DPA framework evidence; region verified `eu-west-1` | Critical DB/Auth/Storage | Run transfer-preview/eligibility at closing; preserve backups, functions, storage/auth settings and rotate service credentials. |
| Stripe | Authenticated LIVE account directly read: RISCK COMPLY SAAS; company name recorded as Samuel Cerqueira, Unipessoal Lda.; EUR account; charges/payouts enabled; 0 customers/subscriptions/charges/invoices and €0 Stripe balance at cut-off | ACCOUNT_ENTITY_EVIDENCE_VERIFIED / FINAL_LEGAL_REGISTRY_MATCH_OPEN | PROVIDER_REQUIRED | Provider-account identity is strong; transfer/change-of-control and final registry/tax reconciliation remain open | Critical billing | Preserve account export, products/prices/webhooks and handover plan; confirm transfer/change-of-control route and reconcile provider entity against official registry. |
| Google OAuth / Identity | Runtime integration via Supabase Auth | PROVIDER_REQUIRED | PROVIDER_REQUIRED | Account/legal facts open | Critical auth | Identify Cloud project/client owner, consent screen, domains, credentials rotation, transfer/project ownership route. |
| Google Workspace | Corporate mail operational; provider invoices dated 2026-06-30, 2026-07-31, 2026-08-31 and 2026-09-30 identify `risckcomply.com`, billing ID `5869-2084-8146`, billed party text `Risck comply`, and recurring Workspace charges | PARTIAL_BILLING_ACCOUNT_EVIDENCE / LEGAL_OWNER_OPEN | PROVIDER_REQUIRED | CDPA/account/retention facts require revalidation | High operations | Admin ownership, billing, aliases/shared mailboxes, retention, domain/DNS dependencies, buyer handover or archive. |
| GitHub / Actions | Primary repository, protected main, CI/CD | Repository account evidence required | PROVIDER_REQUIRED | Account/company DPA and runner-flow details partial | Critical source/CI | Transfer repo/org or controlled buyer migration; archive audit trail; rotate secrets; re-establish branch protections and environments. |
| Sentry | Integration and release signals documented | PROVIDER_REQUIRED | PROVIDER_REQUIRED | Production account/region/plan/retention/DPA partial | High observability | Confirm org/project owner and billing; export settings; project transfer or buyer recreation; rotate auth token/DSN as needed. |
| Upstash / Redis | Distributed rate-limit/security integration evidenced; human Upstash support response confirms DPA incorporation model, self-service contracting entity and retention/backups model | BILLING_PROFILE_STILL_REQUIRED | Transfer/change-of-control still requires account-specific verification | Upstash confirms DPA incorporated via Terms; SCC Module 2 / DPF safeguards described; exact account region/plan still requires console export | High security/runtime | Export team billing profile, database Details/Backups, region/plan and transfer/migration steps; rotate credentials. |
| Resend | Transactional email integration; historical delivery/provider framework evidence | PROVIDER_REQUIRED | PROVIDER_REQUIRED | Current exact account binding partial | High communications | Confirm account owner, domains, DNS records, sending identity, templates, retention, DPA, API-key rotation. |
| Cloudflare | DNS/edge evidence in trust register | PROVIDER_REQUIRED | PROVIDER_REQUIRED | DPA framework documented; enabled products/account facts partial | Critical DNS/edge | Confirm zone owner, registrar relationship, DNSSEC, billing, enabled edge/security services; plan domain/zone transfer. |
| PostHog | PandaDoc completion notice dated 2026-09-01 confirms `PostHog DPA — Samuel Cerqueira, Unipessoal, Lda` was completed by all participants; connected project mismatch with Production remains documented | ENTITY-LINKED DPA EVIDENCE / PRODUCTION ACCOUNT OWNER OPEN | PROVIDER_REQUIRED | Account-linked DPA completion proven; actual Production project binding/retention/transfer facts unresolved | Conditional analytics | Recover correct Production account/project, then confirm owner/plan/region/retention and transfer/change-of-control route. |
| Malware/content scanner | Active external provider identity not conclusively established in reviewed evidence | NOT_APPLICABLE until active provider proven | — | — | Conditional | If enabled at closing, identify provider and complete full row. |

## Attributable evidence improvements on 2026-10-05

- Vercel: authenticated connected-account evidence proves Pro team control, exact GitHub project binding and production-domain association. Official transfer capability is documented; legal billing owner/final buyer eligibility remain open.
- Supabase: authenticated connected-account evidence proves a Pro organization and the exact Production project is ACTIVE_HEALTHY in eu-west-1. Official project-transfer capability is documented; source-owner role/final billing owner and closing eligibility remain open.
- PostHog: account-linked DPA completion evidence is no longer merely an internal repository statement; the corporate mailbox contains the PandaDoc completion notice.
- Stripe: authenticated LIVE API evidence now proves the active account identity, provider-recorded company name, EUR account status and zero customer/subscription/charge/invoice activity at cut-off. Transferability and official corporate/tax matching remain open.
- Google: corporate mailbox evidence confirms operational use of `risckcomply.com` within Google-admin/domain services, without proving registrar title.

## Handover rule

For every active provider, the closing checklist must distinguish:
1. transfer of existing account/project;
2. addition of buyer admin followed by seller removal;
3. recreation/migration into buyer-controlled account;
4. credentials/key rotation;
5. billing/payment-method replacement;
6. DPA/terms acceptance by buyer;
7. data export/deletion/retention;
8. DNS/domain cutover;
9. webhook/OAuth callback updates;
10. rollback window.

No credential value belongs in the repository or data-room index.

## Current conclusion

```text
ACTIVE_PROVIDER_INVENTORY=SUBSTANTIALLY_DOCUMENTED
POSTHOG_ACCOUNT_LINKED_DPA_COMPLETION=VERIFIED_EMAIL_EVIDENCE
STRIPE_LIVE_ACCOUNT_IDENTITY=VERIFIED_PROVIDER_API
STRIPE_LIVE_FINANCIAL_ACTIVITY=ZERO_AT_CUTOFF_VERIFIED
ACCOUNT_OWNER_PROOF=PARTIAL_OPEN
BILLING_OWNER_PROOF=PARTIAL_OPEN
TRANSFERABILITY=OPEN_PER_PROVIDER
CHANGE_OF_CONTROL=OPEN_PER_PROVIDER
DPA_FRAMEWORKS=ADVANCED
VERCEL_TRANSFER_CAPABILITY=OFFICIAL_DOCS_CONFIRMED
SUPABASE_TRANSFER_CAPABILITY=OFFICIAL_DOCS_CONFIRMED
UPSTASH_DPA_INCORPORATION=HUMAN_PROVIDER_CONFIRMATION
HANDOVER_RUNBOOK_STRUCTURE=PASS
PROVIDER_TRANSFER_READY_FOR_CLOSING=NO
```


## Production release/account-status reconciliation — 2026-10-06

Authenticated production-deployment creation against the then-current main `e0c591620837877991451eb3a0ef6f4d08c4d2ee` was attempted through Vercel and rejected with `402 Payment Required` / `resource_creation_blocked`. The provider states that the team has an overdue balance and requires a valid payment method before resource creation can resume.

Truth boundary:

```text
VERCEL_CURRENT_ACCOUNT_CONTROL=VERIFIED
VERCEL_PROJECT_CONTROL=VERIFIED
VERCEL_PRODUCTION_LAST_READY_SHA=def7bad00e082ce336734ff7658846fe87595c79
VERCEL_CURRENT_MAIN_SHA=3e60383a2c5e0762990f2b5fd83fde635e16f792
MAIN_PRODUCTION_SHA_EQUALITY=FAIL
VERCEL_RESOURCE_CREATION=BLOCKED_OVERDUE_BALANCE
VERCEL_PAYMENT_ACTION=OWNER_REAL_MONEY_ACTION_REQUIRED
PAYMENT_PERFORMED_BY_THIS_RECONCILIATION=NO
PROVIDER_SCORE_CHANGE=0
```

This is stronger account-specific operational evidence but does not close provider requirement 91 because billing/legal owner reconciliation, buyer-specific transfer and closing execution remain incomplete.


## GitHub source-control confidentiality reconciliation — 2026-10-07

Authenticated GitHub repository metadata currently reports the primary repository as public (`visibility=public`, `private=false`). Operational repository control remains verified, but public visibility means confidentiality must not be assumed for historic source code already exposed through the repository.

No visibility mutation was performed. Any public-to-private transition is an owner-controlled change that should be impact-checked against GitHub Actions, Vercel linkage, external integrations and buyer handover sequencing before execution.

```text
GITHUB_REPOSITORY_CONTROL=VERIFIED
GITHUB_REPOSITORY_VISIBILITY=PUBLIC
SOURCE_CONFIDENTIALITY_ASSUMPTION=FAIL
VISIBILITY_CHANGE=OWNER_DECISION_REQUIRED
PROVIDER_SCORE_CHANGE=0
```


## Vercel account-owner evidence update — 2026-10-07

Authenticated Vercel team membership shows one confirmed team member: `renanescola40-afk`, role `OWNER`. This strengthens operational account-owner evidence but does not prove seller legal/billing ownership or buyer-specific transfer completion.

```text
VERCEL_TEAM_OWNER_ACCOUNT=renanescola40-afk
VERCEL_TEAM_OWNER_ROLE=OWNER
VERCEL_TEAM_MEMBER_COUNT=1
VERCEL_OPERATIONAL_ACCOUNT_OWNER=VERIFIED
VERCEL_LEGAL_BILLING_OWNER=OPEN
VERCEL_BUYER_TRANSFER_EXECUTION=OPEN
PROVIDER_REQUIREMENT_91=PARTIAL
PROVIDER_SCORE_CHANGE=0
```
