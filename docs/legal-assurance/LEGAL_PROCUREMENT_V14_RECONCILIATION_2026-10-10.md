# RISCK COMPLY — Legal / Corporate / Procurement V14 reconciliation

Date: 2026-10-10  
Source baseline: `348a5316f1e04629f37e11928cb0ccba9ce0318a`  
Production evidence: Vercel Production deployment `dpl_GVHXPbSNUF3NvLSNoBwuncd9L6qD` observed `READY` on the same Git SHA.  
Classification: `INTERNAL / REVIEW / EVIDENCE-BOUND`. This is not a signed agreement, legal opinion, tax opinion, corporate filing or release authorization.

## Supersession

This document supersedes the operational status statements in:
- `LEGAL_PROCUREMENT_V13_RECONCILIATION_2026-10-09.md`
- `LEGAL_V13_EFFECTIVE_GATE_TRACKER_2026-10-09.md`

Those files remain historical evidence and must not be rewritten to imply facts that were not true on 2026-10-09.

## What changed since V13

1. Vercel billing restriction is no longer blocking builds or deployments.
2. Current `main` SHA `348a5316f1e04629f37e11928cb0ccba9ce0318a` has an attributable Production deployment in `READY` state.
3. Repository source and the observed current Production deployment are aligned to the same SHA for this snapshot.
4. PR #2415 was approved and merged.
5. The legal review pack now includes:
   - `MASTER_SERVICES_AGREEMENT_REVIEW_DRAFT.md`
   - `ENTERPRISE_ORDER_FORM_REVIEW_DRAFT.md`
6. The expanded counsel pack remains review-only and does not receive legal-effect credit merely because the documents exist or have passed repository validation.

## Internal documentation coverage

| Area | V14 status | Boundary |
| --- | --- | --- |
| Terms of Service | PRESENT / REVIEW | Not effective |
| Privacy Notice | PRESENT / REVIEW | Not final Article 13/14 publication |
| Data Processing Addendum | PRESENT / REVIEW | Not executed |
| Subprocessor register | PRESENT / PARTIAL FACTS | Account-specific revalidation still required |
| Retention / deletion | PRESENT / PARTIAL FACTS | Final periods/provider lifecycle still fact-dependent |
| Security overview / incident / support | PRESENT / EVIDENCE-BOUND | No unsupported assurance expansion |
| Master Services Agreement | PRESENT / REVIEW | Added by merged PR #2415; not effective |
| Enterprise Order Form | PRESENT / CUSTOMER-SPECIFIC REVIEW | Template only; not a quote or contract |
| Procurement packet / questionnaire | PRESENT / INTERNAL READY | Buyer acceptance external |
| Corporate / IP diligence | PRESENT / GAPS TRACKED | Evidence does not itself create title |

```text
DOCUMENT_CATEGORY_PRESENCE=PASS
CORE_CONTRACT_TEMPLATE_COVERAGE=PASS_INTERNAL
PROCUREMENT_INTERNAL_PACKET=PASS_PREPARED
BUYER_ACCEPTANCE=EXTERNAL
SIGNED_CUSTOMER_CONTRACT=EXTERNAL
```

## Release / runtime reconciliation

Observed facts for this V14 snapshot:

```text
MAIN_SHA=348a5316f1e04629f37e11928cb0ccba9ce0318a
PRODUCTION_DEPLOYMENT=dpl_GVHXPbSNUF3NvLSNoBwuncd9L6qD
PRODUCTION_STATE=READY
PRODUCTION_GIT_SHA=348a5316f1e04629f37e11928cb0ccba9ce0318a
MAIN_PRODUCTION_SHA_PARITY=PASS_OBSERVED
VERCEL_BILLING_DEPLOY_BLOCKER=CLOSED
```

This closes the V13 source/deployment-parity blocker for the observed snapshot. It does not convert every separate enterprise runtime, migration, legal-publication or external-assurance gate into PASS.

Repository checks on current main include a mixture of success, in-progress, waiting, skipped and some failed enterprise/evidence jobs. Those outcomes must be evaluated by their own contracts. A `READY` Vercel deployment is deployment evidence, not proof that all legal or enterprise gates are complete.

## Remaining effective legal/corporate gates

### P0 — authoritative company facts
Still required before final effective public contracting where applicable:
- current commercial registration extract;
- current registered office;
- current NIPC / company identifiers;
- current officer/signatory authority.

Status: `EXTERNAL_FACT_OPEN`.

### P0 — corporate activity / CAE / tax
Still required:
- current corporate-purpose / CAE position for software/SaaS activity;
- Portuguese VAT/IVA treatment;
- intra-EU VIES applicability where relevant;
- invoice-field and tax-treatment determination.

Status: `EXTERNAL_FACT_OPEN`.

### P0 — software/IP chain of title
Repository history and asset mapping are documented, but no repository document can itself transfer title.

Still required:
- legally sufficient creator-to-seller assignment or licence, as appropriate;
- contributor/legacy-account relationship evidence where material;
- domain/brand/title evidence where relied upon;
- third-party/open-source carve-outs preserved.

Status: `IP_CHAIN_OPEN`.

### P0 — final contract approval and effect
The MSA, Terms, Privacy, DPA, service/support schedule and Order Form remain review material.

Still required:
- exact-version company approval;
- final party identifiers and effective dates;
- valid acceptance/signature/incorporation mechanism;
- buyer-specific negotiated terms where applicable;
- DPA execution/acceptance for applicable processing.

Status: `FINAL_CONTRACT_EFFECT_OPEN`.

### P1 — provider/privacy facts
Still required where applicable:
- provider-account-specific DPA/terms;
- current subprocessors;
- transfer mechanism analysis;
- retention/backup/deletion lifecycle;
- current data-flow and region facts.

Status: `PROVIDER_PRIVACY_REVALIDATION_OPEN`.

### External — buyer-specific procurement
Buyer questionnaires, negotiated security/legal schedules, counterparty acceptance and any buyer-imposed assurance remain external events.

Status: `BUYER_ACCEPTANCE_EXTERNAL`.

## Legal publication posture

The public legal surfaces must remain review/fail-closed until the effective-contract prerequisites are deliberately satisfied.

```text
PUBLIC_TERMS_EFFECTIVE=NO
PUBLIC_PRIVACY_EFFECTIVE=NO
PUBLIC_DPA_EXECUTED=NO
PUBLIC_SELF_SERVE_LEGAL_GATE=FAIL_CLOSED_AS_DESIGNED
LEGAL_INTERNAL_DOCUMENTATION=PASS_EVIDENCE_BOUND
LEGAL_INTERNAL_GO=BLOCKED_ON_EXTERNAL_FACTS_AND_APPROVAL
PROCUREMENT_INTERNAL_GO=PASS_PREPARED
PROCUREMENT_EFFECTIVE_GO=BLOCKED_ON_EXTERNAL_FACTS_AND_COUNTERPARTY_EVENTS
```

Do not flip review documents to `EFFECTIVE` merely to increase a readiness score.

## Owner action boundary

The remaining blockers cannot be truthfully closed by repository edits alone.

Authoritative corporate/tax/IP documents should be retained in a restricted data room, not committed to the public repository. Repository records may reference verification outcomes without exposing personal identifiers, signatures, tax records, credentials or privileged legal material.

## V14 conclusion

The internally addressable documentation gap identified in V13 is closed for core contract-template coverage, and the Vercel billing/deployment blocker is closed. Current source-to-production SHA parity is observed on the V14 baseline.

The remaining material blockers are external facts, legally effective IP/title acts, exact-version contractual approval/execution, provider-specific privacy evidence and buyer-specific acceptance.

```text
LEGAL_V14_INTERNAL_DOCUMENTATION=PASS
CORE_CONTRACT_TEMPLATE_COVERAGE=PASS
MSA_REVIEW_DRAFT=PRESENT
ENTERPRISE_ORDER_FORM_REVIEW_DRAFT=PRESENT
MAIN_PRODUCTION_SHA_PARITY=PASS_OBSERVED
VERCEL_BLOCKER=CLOSED
LEGAL_EFFECTIVE_LAUNCH=BLOCKED
PROCUREMENT_INTERNAL_PACKET=PASS
PROCUREMENT_COUNTERPARTY_ACCEPTANCE=EXTERNAL
EMAILS_SENT=0
EXTERNAL_SUBMISSIONS=0
CONTRACTS_SIGNED_BY_THIS_WORK=0
```
