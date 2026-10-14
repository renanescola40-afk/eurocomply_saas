# RISCK COMPLY — Buyer Technical Handover and Evidence Closure V3

Date: 2026-10-14. Source baseline: `main` @ `b6360490bcbaedf774acf22dce08417d87ad9e58`.
Status: **WORKING DRAFT / NOT BUYER-ACCEPTED**. No change to demo, production, billing or external correspondence.

## 1. Verified repository-source references
- `docs/trust/BUYER_FIRST_48_HOURS_HANDOFF.md` — existing controlled disclosure playbook, four disclosure tiers, explicit secret/customer-data restrictions.
- `docs/ma/buyer-materials/RISCK_COMPLY_TRANSACTION_PERIMETER.md` — existing asset perimeter including explicit open creator-to-seller IP title gap; provider accounts not blanket-transferable.
- `docs/due-diligence/VALIDATION_AND_BUYER_ACCEPTANCE_V2.md` — previous acceptance gates, no runtime test proof.

These are internal source assertions, not independent ownership or provider certification.

## 2. Acquisition engineering handover steps
| Stage | Action | Evidence required | Status |
|---|---|---|---|
| 0 | Agree permitted scope, NDA and access tiers | Executed access protocol | EXTERNAL_PENDING |
| 1 | Freeze accepted exact source SHA, dependencies, target configuration | Git SHA, SBOM, configuration manifest (without secrets) | PENDING |
| 2 | Export full route/action/schema/asset inventories | Machine-generated manifests tied to SHA | PENDING |
| 3 | Independently check tests and non-production tenant security | Reproducible commands, exit codes, redacted logs | PENDING |
| 4 | Review code/IP and third-party license transfer perimeter | Executed creator-to-seller instruments and licensed asset schedules | EXTERNAL_PENDING |
| 5 | Map infrastructure ownership | Vercel/Supabase/Stripe/email/domain records, target account plan | PENDING |
| 6 | Create buyer-controlled staging with synthetic tenants | Staging account and no-production-data test report | PENDING |
| 7 | Demonstrate release, rollback, backups and restoration | Signed-off isolated dry runs, RTO/RPO assumptions | PENDING |
| 8 | Deliver operator runbooks, support and incident handover | Documented owners, escalation, key rotation plan | PENDING |
| 9 | Perform contract closing and authorized migration | Signed acceptance and transfer evidence | EXTERNAL_PENDING |

**No credential, raw database, token or provider control transfer is authorized by this document.**

## 3. Integration failure and trust-boundary register

| Domain | Failure scenario | Evidence needed before PASS |
|---|---|---|
| Auth | Expired session/OAuth callback mismatch | Local negative-case replay |
| Tenancy | Suspended membership, wrong organization | A/B fixtures plus RLS negative assertions |
| Database | Missing migration or schema drift | Versioned migration-to-live read-only mapping |
| Stripe | Invoice arrives before subscription; duplicate event | Mock/test-mode deterministic event-sequence test |
| Uploads | Untrusted file names, content-type, malware processing | Isolated upload test and scanner behavior |
| Document export | Unauthorized export and sensitive caching | Tenant/role denial and response-header checks |
| SCIM/SSO | Provisioning drift and revoked access | Isolated identity-provider simulation |
| Observability | Sensitive data in errors/logs | Redacted sample evidence |
| Deploy | Source/runtime mismatch and rollback failure | Vercel read-only commit comparison and dry-run |
| OSS | Notice obligations or license restriction | Current-SHA SBOM and license review |

## 4. Buyer-safe limitations and dependency disclosures
- The source has code and documentation for substantial product modules, but this workstream has **not** executed or verified feature journeys in runtime.
- The seller IP chain-of-title is shown as partial/open in an existing transaction perimeter file; a GitHub admin permission is not ownership proof.
- A historical 2026-09-24 OSS inventory reports 940 entries; it is not independently refreshed for this source baseline.
- Pentest, SOC 2 and ISO certificates are not claimed here.
- No asset-sale valuation, engineering rebuild cost, delivery date, customer traction or acquisition acceptance is inferred.
- An accepted handover requires coordinated legal, technical, security, privacy and provider reviews.

## 5. Closing score methodology

12 original technical buyer deliverables. Workstream has now created or referenced draft material in **5/12 topics (41.7% begun)**. This is *not* completion or audit coverage. **Independently completed: 0/12 = 0%; remaining under strict acceptance gates: 100%**. No validated runtime features added by this workstream. No code fixes or tests executed.

## 6. Safe operating restrictions
- PRODUCTION_READ_ONLY and DATAGUARD_DEMO_PROTECTION remain mandatory.
- NO merge, deployment, database mutation, provider updates, buyer email or external sharing.
- The next PR must remain draft and unmerged pending external review.
