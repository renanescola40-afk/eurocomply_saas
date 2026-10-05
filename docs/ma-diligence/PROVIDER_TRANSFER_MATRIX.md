# RISCK COMPLY — Provider Transfer Matrix

Date: 2026-10-05  
Baseline main SHA: `6219f52c463c367848c1139158e5389d35298ca2`  
Status: `PROVIDER_TRANSFER_DILIGENCE=PARTIAL_ADVANCED`

This matrix consolidates repository and connected-account evidence for M&A handover. It does not state that provider accounts are transferable unless provider/account terms prove it.

| Provider | Current evidence | Account/billing owner | Transferability / change of control | DPA/data/region | Criticality | Handover requirement |
|---|---|---|---|---|---|---|
| Vercel | Connected Pro project, repo/domain binding documented historically/currently in trust evidence | PROVIDER_REQUIRED | PROVIDER_REQUIRED | DPA framework documented; complete account/flow facts partial | Critical hosting/release | Export project/team ownership, billing, domains, env-var names (not values), agreement, invoices, support plan; determine account transfer vs buyer recreation. |
| Supabase | Production project `tganhbbhfxcpblmgqprg`, eu-west-1, DPA framework evidence | PROVIDER_REQUIRED | PROVIDER_REQUIRED | Strong DPA framework evidence; backup/support/transfer facts partial | Critical DB/Auth/Storage | Confirm organization owner, billing, project transfer/migration options, backups/PITR, DPA/account terms, service-role rotation plan. |
| Stripe | LIVE RISCK COMPLY SAAS account discovered in prior evidence; Stripe account notification to corporate mailbox independently supports live account identity | PROVIDER_REQUIRED | PROVIDER_REQUIRED | Account entity/tax/privacy details not fully closed | Critical billing | Confirm legal account owner, representative, connected bank/tax profile, products/prices, subscriptions, customer portal, webhook, transfer/change-of-control rules, buyer migration path. |
| Google OAuth / Identity | Runtime integration via Supabase Auth | PROVIDER_REQUIRED | PROVIDER_REQUIRED | Account/legal facts open | Critical auth | Identify Cloud project/client owner, consent screen, domains, credentials rotation, transfer/project ownership route. |
| Google Workspace | Corporate mail operational; Google domain-service communications reference `risckcomply.com` | PROVIDER_REQUIRED | PROVIDER_REQUIRED | CDPA/account/retention facts require revalidation | High operations | Admin ownership, billing, aliases/shared mailboxes, retention, domain/DNS dependencies, buyer handover or archive. |
| GitHub / Actions | Primary repository, protected main, CI/CD | Repository account evidence required | PROVIDER_REQUIRED | Account/company DPA and runner-flow details partial | Critical source/CI | Transfer repo/org or controlled buyer migration; archive audit trail; rotate secrets; re-establish branch protections and environments. |
| Sentry | Integration and release signals documented | PROVIDER_REQUIRED | PROVIDER_REQUIRED | Production account/region/plan/retention/DPA partial | High observability | Confirm org/project owner and billing; export settings; project transfer or buyer recreation; rotate auth token/DSN as needed. |
| Upstash / Redis | Distributed rate-limit/security integration evidenced | PROVIDER_REQUIRED | PROVIDER_REQUIRED | DPA/SCC framework evidence exists; account plan/region partial | High security/runtime | Confirm database owner, regions, plan, retention, credentials rotation and transfer/migration. |
| Resend | Transactional email integration; historical delivery/provider framework evidence | PROVIDER_REQUIRED | PROVIDER_REQUIRED | Current exact account binding partial | High communications | Confirm account owner, domains, DNS records, sending identity, templates, retention, DPA, API-key rotation. |
| Cloudflare | DNS/edge evidence in trust register | PROVIDER_REQUIRED | PROVIDER_REQUIRED | DPA framework documented; enabled products/account facts partial | Critical DNS/edge | Confirm zone owner, registrar relationship, DNSSEC, billing, enabled edge/security services; plan domain/zone transfer. |
| PostHog | PandaDoc completion notice dated 2026-09-01 confirms `PostHog DPA — Samuel Cerqueira, Unipessoal, Lda` was completed by all participants; connected project mismatch with Production remains documented | ENTITY-LINKED DPA EVIDENCE / PRODUCTION ACCOUNT OWNER OPEN | PROVIDER_REQUIRED | Account-linked DPA completion proven; actual Production project binding/retention/transfer facts unresolved | Conditional analytics | Recover correct Production account/project, then confirm owner/plan/region/retention and transfer/change-of-control route. |
| Malware/content scanner | Active external provider identity not conclusively established in reviewed evidence | NOT_APPLICABLE until active provider proven | — | — | Conditional | If enabled at closing, identify provider and complete full row. |

## Attributable evidence improvements on 2026-10-05

- PostHog: account-linked DPA completion evidence is no longer merely an internal repository statement; the corporate mailbox contains the PandaDoc completion notice.
- Stripe: a Stripe notification to the corporate mailbox references the live `RISCK COMPLY SAAS` account, strengthening account-existence evidence, without proving the final contracting entity or tax profile.
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
STRIPE_LIVE_ACCOUNT_IDENTITY=STRENGTHENED_EMAIL_EVIDENCE
ACCOUNT_OWNER_PROOF=PARTIAL_OPEN
BILLING_OWNER_PROOF=PARTIAL_OPEN
TRANSFERABILITY=OPEN_PER_PROVIDER
CHANGE_OF_CONTROL=OPEN_PER_PROVIDER
DPA_FRAMEWORKS=ADVANCED
HANDOVER_RUNBOOK_STRUCTURE=PASS
PROVIDER_TRANSFER_READY_FOR_CLOSING=NO
```
