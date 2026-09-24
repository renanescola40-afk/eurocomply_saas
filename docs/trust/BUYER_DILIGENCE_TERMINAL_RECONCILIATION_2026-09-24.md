# RISCK COMPLY — Buyer Diligence Terminal Reconciliation

Date: 2026-09-24  
Source main at branch start: `1792aaa1cc9614ebb1a2d87954ccc63b2ad8065f`

## Internal terminal classification

| Workstream | State |
| --- | --- |
| Buyer data-room index | PASS_INTERNAL |
| Procurement package | PASS_INTERNAL |
| DPA Article 28 structure | PASS_INTERNAL |
| Privacy/GDPR documentation | PASS_INTERNAL |
| Terms buyer-review structure | PASS_INTERNAL |
| Cookie/ePrivacy documentation/runtime boundary | PASS_INTERNAL / evidence-bound |
| Subprocessor register | PASS_INTERNAL |
| Transfer register | PASS_INTERNAL |
| Retention/deletion structure and DSR flows | PASS_INTERNAL |
| Data residency disclosure | PASS_INTERNAL |
| Incident response documentation | PASS_INTERNAL |
| Audit evidence-pack export | PASS_INTERNAL |
| Audit tamper evidence | PASS_INTERNAL — hash-chain; WORM not claimed |
| MFA | PASS_INTERNAL for protected step-up/AAL2 scope; tenant-wide mandatory policy not claimed |
| SSO/SAML | PASS_INTERNAL — runtime implemented; WAITING_BUYER for IdP/domain activation + E2E validation |
| Backup restore | PASS_INTERNAL_REHEARSAL / WAITING_PROVIDER_FACT for safe customer-data restore evidence |
| DR tabletop | PASS_INTERNAL — non-destructive tabletop completed 2026-09-24 |
| DR measured RTO/RPO | WAITING_PROVIDER_FACT / technical execution evidence |
| Independent clean pentest/retest | WAITING_EXTERNAL_SECURITY |
| ISO 27001 certification | WAITING_EXTERNAL_SECURITY |
| SOC 2 audit | WAITING_EXTERNAL_SECURITY |
| Qualified legal opinion | WAITING_QUALIFIED_COUNSEL when required |
| Buyer-specific schedules/acceptance | WAITING_BUYER |
| Company registry/tax/CAE/VAT/signatory facts | WAITING_COMPANY_ADMINISTRATIVE_FACT / OUT_OF_SCOPE |

## Evidence reconciliation performed

- legacy enterprise trust manifest updated to RISCK COMPLY/current 2026-09-24 facts;
- pentest status corrected from “not completed” to completed assessment + clean retest pending;
- audit export corrected from roadmap-only to implemented signed evidence-pack export;
- audit immutability language corrected to tamper-evident hash chain without WORM claim;
- MFA language corrected to implemented protected step-up/AAL2 without overclaiming tenant-wide mandatory MFA;
- subprocessor and retention statuses reconciled to current registers and workflows;
- canonical buyer due-diligence Q&A added;
- canonical first-48-hours disclosure handoff added.

## Non-claims

No SOC 2, ISO 27001, clean independent pentest pass, legal opinion, buyer acceptance, customer revenue, customer logos, 24/7 staffed support, EU-only processing, WORM immutability or measured RTO/RPO is created by this reconciliation.
