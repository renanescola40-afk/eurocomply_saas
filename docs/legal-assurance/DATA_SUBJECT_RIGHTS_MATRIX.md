# RISCK COMPLY — Data Subject Rights Operational Matrix

Date: 2026-09-10  
Baseline: GDPR Chapter III. A written policy is not sufficient; each right is mapped to an operational path. Source implementation, exact-SHA runtime proof and qualified legal judgment are deliberately separated.

| Right / control | Current capability | State | Remaining gap |
|---|---|---|---|
| Intake | `comercial@risckcomply.com` remains the verified corporate intake channel; canonical `/api/gdpr/requests` creates a durable tenant-scoped request record before success | PASS_SOURCE_IMPLEMENTED_MERGED | Formal privacy ownership/SLA and final public notice reconciliation remain open |
| Identity verification | Canonical lifecycle records identity-verification state, request timestamp and verified timestamp; sensitive in-product privacy operations retain authenticated/step-up controls where applicable | PASS_SOURCE_IMPLEMENTED | Manual/email identity procedure and case-execution evidence remain to be completed |
| Access | Organisation-scoped GDPR export exists and canonical lifecycle supports access/export request types | PASS_SOURCE_IMPLEMENTED | Subject-vs-organisation scope and customer-controller routing require case-specific handling |
| Portability | Canonical lifecycle includes `portability`; structured organisation export capability exists | PARTIAL_SOURCE_READY | Applicability, exact portable data set/format and customer-controller allocation remain case-specific/legal |
| Rectification | Canonical lifecycle includes `rectification` and attributable decision/evidence fields | PARTIAL_SOURCE_READY | Downstream correction propagation and the concrete correction executor for each data source remain to be proven |
| Erasure | Existing destructive delete-request intake is bound to the same canonical request record before success; lifecycle supports decision/evidence/completion | PASS_INTAKE_SOURCE_IMPLEMENTED | Full downstream deletion/anonymisation completion and provider propagation remain unproven end-to-end |
| Restriction | Canonical lifecycle includes `restriction`, status, role routing, decision rationale and evidence references | PARTIAL_SOURCE_READY | Actual restriction effect across applicable stores/providers and legal exception judgment remain open |
| Objection | Canonical lifecycle includes `objection`, attributable routing/decision/evidence | PARTIAL_SOURCE_READY | Legal-basis decision and actual suppression/restriction effect remain open |
| Consent withdrawal | Canonical lifecycle includes `consent_withdrawal`; optional analytics independently defaults to consent-required, blocks PostHog capture without grant, exposes Cookie Policy controls and invokes opt-out/recording stop on withdrawal | PASS_ANALYTICS_SOURCE_IMPLEMENTED / BROADER_RIGHT_PARTIAL | Exact Production analytics configuration, ePrivacy/legal-basis acceptance and any other consent-based processing surfaces remain open |
| Automated-decision safeguards | Product position remains that website/account operations are not intended to make solely automated decisions with legal/similar effect | PASS_DOCUMENTED | Revalidate on product/decisioning change and qualified review where needed |
| Deadline tracking | Canonical source computes one-calendar-month initial deadlines and supports only bounded 1/2-month extensions with reason + notification evidence; exact-current-main Data Governance V2 proof validates the lifecycle/deadline schema authority on an isolated replay | PASS_SOURCE_AND_EXACT_SHA_RUNTIME_SCHEMA | Case execution, customer SLA and legal handling remain separate |
| Customer-controller routing | Canonical lifecycle records controller/processor/mixed/under-review role and customer-controller reference; admin API is tenant-scoped | PASS_SOURCE_IMPLEMENTED | Case-specific legal allocation, customer workflow/SLA and downstream evidence remain open |
| Exceptions/legal hold | Canonical lifecycle records decision reason/evidence; retention materials recognise billing, tax, fraud/security, audit and legal-hold constraints | PARTIAL | Software must not decide a legal exception automatically; attributable case decision/qualified review required where legal judgment applies |
| Terminal lifecycle integrity | Canonical V6 rejects mutation of `completed`, `rejected` and `cancelled` records at the lifecycle API boundary; the accepted exact-SHA release replay contains the merged V6 lifecycle schema and server-only mutation boundary | PASS_SOURCE_MERGED_EXACT_SHA_ACCEPTED | The Data Governance proof is a schema/boundary proof, not a synthetic legal decision or customer-row mutation transcript |
| Last-modified integrity | Canonical V6 refreshes `updated_at` on lifecycle mutation and restores the prior timestamp if audit compensation restores prior values; merged V6 is bound to the accepted exact-current-main release proof | PASS_SOURCE_MERGED_EXACT_SHA_ACCEPTED | Case-specific execution evidence remains separate from the release acceptance proof |
| Audit trail | Create/update flows are auditable without raw request payload content; lifecycle update is bound to the canonical audit path and the exact-SHA replay validates audit-integrity schema presence | PASS_SOURCE_AND_EXACT_SHA_SCHEMA_RUNTIME | Customer-specific audit events are not stored in the redacted proof artifact |

## Canonical operational record

The existing `public.data_subject_requests` data plane now carries the canonical operational record. V5 did **not** create a competing DSAR/DSR table.

The source model records, as applicable:

- organization scope;
- requester reference;
- request type;
- received date;
- initial and effective due date;
- identity-verification state/timestamps;
- controller / processor / mixed / under-review role route;
- customer-controller reference;
- status;
- extension reason, notification timestamp/evidence and revised due date;
- decision and rationale;
- evidence references;
- completion timestamp and resolution summary;
- created/updated timestamps;
- attributable audit event context.

## Issue #2009 status

`GDPR-RIGHTS-01` remains bound to GitHub issue **#2009 — GDPR: canonical data-subject rights request register + deadline workflow**.

The source implementation requested by that issue was merged through PR #2014. V6 lifecycle-integrity corrections subsequently merged through PR #2025, the canonical data-governance foundation reconciliation merged through PR #2026, and PR #2029 corrected the proof contract so it reflects RISCK COMPLY's category-specific retention model without inventing a universal retention period.

The issue's exact-current-main runtime evidence gate was satisfied by protected workflow run **34448768687** against protected `main` SHA **`a921445a675bf3652568603535c148eb4e977914`**. The retained artifact is **`data-governance-runtime-proof-a921445a675bf3652568603535c148eb4e977914`** (artifact ID **10140768157**, digest **`sha256:361aa2f26da1cb1641b33fc2e4a638f576f12968aa0545cb80f7e1d0f765a299`**). Following canonical reconciliation, issue #2009 is now closed as completed.

```text
PR_2014_SOURCE_IMPLEMENTATION=MERGED
PR_2025_V6_LIFECYCLE_INTEGRITY=MERGED
PR_2026_DATA_GOVERNANCE_FOUNDATION=MERGED
PR_2029_V7_PROOF_RECONCILIATION=MERGED
CANONICAL_RIGHTS_REQUEST_REGISTER=PASS_SOURCE_IMPLEMENTED_MERGED
DEADLINE_TRACKING_SOURCE=PASS_IMPLEMENTED
ROLE_ROUTING_SOURCE=PASS_IMPLEMENTED
ANALYTICS_CONSENT_WITHDRAWAL_SOURCE=PASS_IMPLEMENTED
V6_TERMINAL_IMMUTABILITY=PASS_SOURCE_MERGED
V6_UPDATED_AT_INTEGRITY=PASS_SOURCE_MERGED
DATA_GOVERNANCE_RUNTIME_V2=PASS_EXACT_SHA
DATA_GOVERNANCE_RUNTIME_RUN=34448768687
DATA_GOVERNANCE_RUNTIME_SHA=a921445a675bf3652568603535c148eb4e977914
ISSUE_2009=CLOSED_COMPLETED
```

Downstream provider actions and legal judgments remain separate from the technical acceptance of #2009 and are not converted into Chapter III legal completion by this proof.

## Exact-SHA runtime gate — accepted

The protected data-governance evidence path uses schema `risck-comply.data-governance-evidence.v2` and is retained as `Complete/passed` for the exact accepted release SHA with all required checks true.

Accepted evidence:

```text
WORKFLOW=Data Governance Privacy Audit Proof
RUN_ID=34448768687
TARGET_SHA=a921445a675bf3652568603535c148eb4e977914
ARTIFACT_ID=10140768157
ARTIFACT_NAME=data-governance-runtime-proof-a921445a675bf3652568603535c148eb4e977914
ARTIFACT_DIGEST=sha256:361aa2f26da1cb1641b33fc2e4a638f576f12968aa0545cb80f7e1d0f765a299
EVIDENCE_SCHEMA=risck-comply.data-governance-evidence.v2
EVIDENCE_STATUS=Complete
EVIDENCE_OUTCOME=passed
FAILURES=0
ALL_REQUIRED_CHECKS=true
```

The proof validated the protected exact-main execution envelope, declared Production residency (`eu-west-1`), category-specific retention schema bounds, export-encryption operating requirement, governance tables, RLS/FORCE RLS, tenant policies, data-minimisation constraints, GDPR request lifecycle/deadline schema authority, Chapter III request types, server-only request mutation privileges and audit-integrity schema against an isolated disposable database replay. No customer rows, identifiers or export payloads were retained in the artifact.

This is deliberately a **schema, security-boundary and release-acceptance proof**. It is not a legal opinion, a customer-row transaction transcript, evidence that every downstream provider completed a deletion, or evidence that every Chapter III legal judgment is resolved.

The earlier failed run `34413535220` targeted superseded SHA `3349c1bf51c696e5d77106e3753c4a26cea8c033` and continues to receive zero acceptance credit.

## Consent-withdrawal source boundary

For optional analytics, source implementation is no longer an unknown configuration gap:

- consent is required by default unless the public build variable explicitly disables the requirement;
- PostHog does not initialize/capture while required consent is absent;
- grant/decline controls exist in the initial banner;
- Cookie Policy rendering exposes persistent analytics consent controls for later withdrawal;
- withdrawal stores the denied state, stops session recording and calls PostHog opt-out;
- fail-closed and public-control tests exist.

This closes the **analytics source-control** portion only. It does not prove the exact Production build/configuration, settle ePrivacy/GDPR legal-basis review, or prove withdrawal for unrelated consent-based processing.

## Legal and downstream boundary

The lifecycle is a system of record and workflow authority. It does not itself decide law.

RISCK COMPLY must not automatically conclude:

- whether an erasure exception applies;
- whether an objection must prevail;
- whether processing must be restricted in a particular legal scenario;
- whether a portability request covers a given field/data set;
- whether RISCK COMPLY or the customer is controller for a particular processing operation;
- whether a legal hold, statutory retention or other exception overrides deletion;
- whether downstream provider action is complete without actual evidence.

Where legal judgment is required, the record stores the attributable decision/rationale/evidence and the matter is routed for qualified review rather than synthesized by software or AI.

## Terminal state

```text
ACCESS_EXPORT=PASS_SOURCE_IMPLEMENTED
ERASURE_INTAKE=PASS_SOURCE_IMPLEMENTED
RECTIFICATION=PARTIAL_SOURCE_READY
RESTRICTION=PARTIAL_SOURCE_READY_DOWNSTREAM_OPEN
OBJECTION=PARTIAL_SOURCE_READY_LEGAL_EFFECT_OPEN
PORTABILITY=PARTIAL_SOURCE_READY
CONSENT_WITHDRAWAL_ANALYTICS=PASS_SOURCE_IMPLEMENTED_RUNTIME_AND_LEGAL_REVIEW_OPEN
CONSENT_WITHDRAWAL_OTHER_SURFACES=PARTIAL
DEADLINE_TRACKING=PASS_SOURCE_AND_EXACT_SHA_RUNTIME_SCHEMA
CUSTOMER_CONTROLLER_ROUTING=PASS_SOURCE_IMPLEMENTED_CASE_DECISION_OPEN
TERMINAL_STATE_INTEGRITY=PASS_SOURCE_MERGED_EXACT_SHA_ACCEPTED
UPDATED_AT_INTEGRITY=PASS_SOURCE_MERGED_EXACT_SHA_ACCEPTED
DATA_GOVERNANCE_RUNTIME_V2=PASS_EXACT_SHA
ISSUE_2009=CLOSED_COMPLETED
DATA_SUBJECT_RIGHTS=PARTIAL_DOWNSTREAM_AND_LEGAL
```

No all-Chapter-III PASS is claimed. The exact-SHA technical runtime gate is closed, while remaining downstream effects, case-specific allocations and qualified legal decisions stay open until genuinely evidenced.