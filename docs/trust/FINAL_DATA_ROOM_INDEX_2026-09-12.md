# RISCK COMPLY — Final Procurement Data Room Index

Date: 2026-09-12  
Classification: `CONTROLLED_INDEX / PUBLIC_REPOSITORY_SAFE`  
Status: `INDEX_READY / TERMINAL_EXTERNAL_EVIDENCE_OPEN`

This file is an index, not a substitute for the underlying evidence. Confidential third-party reports, customer records, credentials, privileged legal material, tax records and provider-account secrets must not be committed to the public repository. For those artifacts, retain only safe references and cryptographic digests here.

## 1. Company and contracting facts

| Evidence family | Canonical repository/reference | State |
| --- | --- | --- |
| owner Legal Package V1 | `docs/legal-assurance/OWNER_LEGAL_DECISIONS_V1_2026-09-12.md` | OWNER_APPROVED |
| seller/operator model | same owner package + procurement packet | OWNER_DECISION_CLOSED |
| current authoritative commercial-registry proof | controlled owner evidence | OPEN |
| current VAT/tax-regime proof | controlled owner/accountant/authority evidence | OPEN |
| final officer/founder facts bound to release | controlled signed artifact | OPEN |

## 2. Product and architecture

- `README.md`
- `docs/trust/ARCHITECTURE_OVERVIEW.md`
- `docs/trust/SECURITY_OVERVIEW.md`
- canonical route/feature and AI-governance evidence under `docs/legal-review-preparation/` and `docs/compliance/`

Current product/source evidence is substantial. Buyer material must remain release-aware and must not claim that source readiness equals Production acceptance.

## 3. Data flow, privacy and GDPR

- `docs/trust/DATA_PROTECTION.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/legal-assurance/PRIVACY_ART13_14_MATRIX.md`
- public Privacy/DPA review surfaces
- provider factual register and current overlay

Terminal qualified GDPR acceptance remains open where legal judgment is required.

## 4. IAM, RBAC, multi-tenancy and RLS

- `docs/trust/ACCESS_CONTROL.md`
- tenant/RLS implementation and migrations in repository
- Production Supabase runtime inspection retained in controller evidence
- authenticated synthetic tenant matrix and final exact-SHA tenant-isolation proof remain release-bound evidence

## 5. SDLC, CI/CD and release provenance

- `.github/workflows/`
- release and deployment governance evidence under `docs/enterprise/`, `docs/evidence/` and `docs/security/`
- Vercel Production deployment reference retained in the Enterprise Closure Controller

Current exact-current-main Production acceptance is open. Do not freeze a buyer pack to an unaccepted lineage.

## 6. Security and vulnerability management

- `docs/trust/SECURITY_OVERVIEW.md`
- `docs/trust/INCIDENT_RESPONSE.md`
- `docs/security/`
- `docs/evidence/pentest-closure.md`
- responsible-disclosure public surface

### Confidential third-party external security report

- completed: 2026-09-12
- artifact location: controlled owner mailbox/provider evidence; not stored in this public repository
- SHA-256: `5a71077f20000047a5d5b3b2865e5ba13760683cf1052a2f0e69326aa37ff281`
- status: `REPORT_RECEIVED / REMEDIATION_AND_RETEST_OPEN`

Do not publish the report body, technical reproduction details, vulnerable routes or provider-confidential content from this index.

## 7. Incident response, BC/DR, backup/recovery

- `docs/trust/INCIDENT_RESPONSE.md`
- `docs/trust/BACKUP_AND_RECOVERY.md`
- status/incident authority documented in Trust Center materials

Formal RTO/RPO or contractual recovery guarantees must be disclosed only where actually established and supported by evidence.

## 8. EU AI Act and legal assurance

Qualified review package workstreams:

1. `LEGAL_RULES`
2. `ARTICLE_5`
3. `ARTICLE_50`
4. `FRIA`
5. `DEPLOYER`
6. `HIGH_RISK_PROVIDER`
7. `CONFORMITY`
8. `GPAI`

Current accepted qualified outcomes: `0/8`.

- free-counsel review pack: `docs/legal-review-preparation/free-counsel/FREE_COUNSEL_REVIEW_PACK.md`
- master opinion handoff: `docs/legal-review-preparation/legal-pack/MASTER_LEGAL_OPINION_HANDOFF.md`
- owner decisions: `docs/legal-assurance/OWNER_LEGAL_DECISIONS_V1_2026-09-12.md`

`MASTER_LEGAL_OPINION=OPEN`.

## 9. Terms, Privacy, DPA, subprocessors and transfers

- current review drafts under `docs/legal-review-preparation/legal-pack/`
- public legal surfaces under `src/app/[locale]/`
- provider evidence register under `docs/trust/`

Owner commercial choices may be closed while qualified legal acceptance remains open. Do not conflate them.

## 10. Billing, VAT and commercial evidence

Live-provider evidence observed by the controller includes active canonical product/price configuration and an enabled Production webhook endpoint. At the audit snapshot there was no legitimate LIVE customer/subscription/invoice evidence and no Stripe Tax registration evidence.

Controlled buyer evidence should include, when it genuinely exists:

- seller authoritative registry/tax facts;
- checkout and tax configuration proof;
- signed-webhook receipt;
- legitimate subscription/invoice lifecycle;
- entitlement activation;
- upgrade/downgrade/cancellation/payment-failure proof.

Synthetic or seeded records must not be represented as a real customer.

## 11. SLA and support posture

- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
- Trust Center SLA/support surfaces
- public status authority

No numeric uptime, 24/7 human support, service credit or recovery commitment may be asserted unless contractually established and operationally supported.

## 12. Trust Center and buyer questionnaire

- `docs/trust/PROCUREMENT_CHECKLIST.md`
- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
- `docs/trust/SECURITY_FAQ.md`
- `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`
- public Trust Center source under `src/lib/trust-center/`

These are diligence materials, not certifications.

## 13. Exact release and evidence binding

Before final buyer sharing, freeze one accepted release and record:

- final main SHA;
- final Production SHA;
- final Vercel deployment;
- Production database/migration head;
- successful exact-SHA runtime/tenant tests;
- security retest closure;
- legal 8/8 accepted decisions;
- master legal conclusion;
- final registry/VAT facts;
- data-room index digest/version.

Until those fields converge, the data room remains `PROCUREMENT_READY_FOR_DILIGENCE` but not `ENTERPRISE_100_ACCEPTED`.

## 14. Current hard boundary

`PROCUREMENT_DATA_ROOM_INDEX=PASS_INTERNAL`  
`BUYER_ACCEPTANCE=EXTERNAL`  
`ENTERPRISE_100=NO_PASS`  
`PRODUCTION_GO=NO_GO`
