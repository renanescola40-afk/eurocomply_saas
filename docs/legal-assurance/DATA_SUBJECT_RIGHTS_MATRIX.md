# RISCK COMPLY — Data Subject Rights Operational Matrix

Date: 2026-09-09  
Baseline: GDPR Chapter III. A written policy is not sufficient; each right is mapped to an operational path. Source implementation, exact-SHA runtime proof and qualified legal judgment are deliberately separated.

| Right / control | Current capability | State | Remaining gap |
|---|---|---|---|
| Intake | `comercial@risckcomply.com` remains the verified corporate intake channel; canonical `/api/gdpr/requests` creates a durable tenant-scoped request record before success | PASS_SOURCE_IMPLEMENTED_MERGED | Formal privacy ownership/SLA and final public notice reconciliation remain open |
| Identity verification | Canonical lifecycle records identity-verification state, request timestamp and verified timestamp; sensitive in-product privacy operations retain authenticated/step-up controls where applicable | PASS_SOURCE_IMPLEMENTED | Manual/email identity procedure and exact-SHA runtime acceptance remain to be evidenced |
| Access | Organisation-scoped GDPR export exists and canonical lifecycle supports access/export request types | PASS_SOURCE_IMPLEMENTED | Subject-vs-organisation scope and customer-controller routing require case-specific handling/runtime evidence |
| Portability | Canonical lifecycle includes `portability`; structured organisation export capability exists | PARTIAL_SOURCE_READY | Applicability, exact portable data set/format and customer-controller allocation remain case-specific/legal |
| Rectification | Canonical lifecycle includes `rectification` and attributable decision/evidence fields | PARTIAL_SOURCE_READY | Downstream correction propagation and the concrete correction executor for each data source remain to be proven |
| Erasure | Existing destructive delete-request intake is bound to the same canonical request record before success; lifecycle supports decision/evidence/completion | PASS_INTAKE_SOURCE_IMPLEMENTED | Full downstream deletion/anonymisation completion and provider propagation remain unproven end-to-end |
| Restriction | Canonical lifecycle includes `restriction`, status, role routing, decision rationale and evidence references | PARTIAL_SOURCE_READY | Actual restriction effect across applicable stores/providers and legal exception judgment remain open |
| Objection | Canonical lifecycle includes `objection`, attributable routing/decision/evidence | PARTIAL_SOURCE_READY | Legal-basis decision and actual suppression/restriction effect remain open |
| Consent withdrawal | Canonical lifecycle includes `consent_withdrawal`; optional analytics independently defaults to consent-required, blocks PostHog capture without grant, exposes Cookie Policy controls and invokes opt-out/recording stop on withdrawal | PASS_ANALYTICS_SOURCE_IMPLEMENTED / BROADER_RIGHT_PARTIAL | Exact Production analytics configuration/runtime evidence, ePrivacy/legal-basis acceptance and any other consent-based processing surfaces remain open |
| Automated-decision safeguards | Product position remains that website/account operations are not intended to make solely automated decisions with legal/similar effect | PASS_DOCUMENTED | Revalidate on product/decisioning change and qualified review where needed |
| Deadline tracking | Canonical source computes one-calendar-month initial deadlines and supports only bounded 1/2-month extensions with reason + notification evidence | PASS_SOURCE_IMPLEMENTED / RUNTIME_PENDING | Protected Data Governance Runtime Proof must validate exact current main SHA before runtime PASS credit |
| Customer-controller routing | Canonical lifecycle records controller/processor/mixed/under-review role and customer-controller reference; admin API is tenant-scoped | PASS_SOURCE_IMPLEMENTED | Case-specific legal allocation, customer workflow/SLA and downstream evidence remain open |
| Exceptions/legal hold | Canonical lifecycle records decision reason/evidence; retention materials recognise billing, tax, fraud/security, audit and legal-hold constraints | PARTIAL | Software must not decide a legal exception automatically; attributable case decision/qualified review required where legal judgment applies |
| Terminal lifecycle integrity | Canonical V6 rejects mutation of `completed`, `rejected` and `cancelled` records at the lifecycle API boundary | PASS_SOURCE_MERGED | Exact-current-main protected runtime evidence remains required before runtime PASS credit |
| Last-modified integrity | Canonical V6 refreshes `updated_at` on lifecycle mutation and restores the prior timestamp if audit compensation restores prior values | PASS_SOURCE_MERGED | Exact-current-main protected runtime evidence remains required before runtime PASS credit |
| Audit trail | Create/update flows are auditable without raw request payload content; lifecycle update compensates if audit persistence fails | PASS_SOURCE_IMPLEMENTED | Exact-SHA runtime evidence must be retained |

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

The source implementation requested by that issue was merged through PR #2014. V6 lifecycle-integrity corrections subsequently merged through PR #2025, and the canonical data-governance foundation reconciliation merged through PR #2026. The issue remains legitimately open because its acceptance contract also requires exact-current-main runtime evidence and because downstream/provider/legal-effect completion remains separate from source implementation.

```text
PR_2014_SOURCE_IMPLEMENTATION=MERGED
PR_2025_V6_LIFECYCLE_INTEGRITY=MERGED
PR_2026_DATA_GOVERNANCE_FOUNDATION=MERGED
CANONICAL_RIGHTS_REQUEST_REGISTER=PASS_SOURCE_IMPLEMENTED_MERGED
DEADLINE_TRACKING_SOURCE=PASS_IMPLEMENTED
ROLE_ROUTING_SOURCE=PASS_IMPLEMENTED
ANALYTICS_CONSENT_WITHDRAWAL_SOURCE=PASS_IMPLEMENTED
V6_TERMINAL_IMMUTABILITY=PASS_SOURCE_MERGED
V6_UPDATED_AT_INTEGRITY=PASS_SOURCE_MERGED
DATA_GOVERNANCE_RUNTIME_V2=PENDING_EXACT_CURRENT_MAIN_PROOF
ISSUE_2009=OPEN_UNTIL_ACCEPTANCE_EVIDENCE
```

Creating or merging source alone does not satisfy the issue's terminal acceptance contract.

## Exact-SHA runtime gate

The protected data-governance evidence path uses schema `risck-comply.data-governance-evidence.v2` and must be retained as `Complete/passed` for the exact current `main` SHA with all required checks true.

Current required order:

1. PR #2029 protected checks pass and the proof-contract reconciliation is merged only through the authorized protected-main path;
2. protected GitHub Environment `production-data-governance-proof` contains the attributable Production residency declaration `DATA_RESIDENCY_REGION=eu-west-1`;
3. run a **new** Data Governance Runtime Proof for the exact protected `main` SHA current at execution time;
4. validate and retain the exact-SHA evidence artifact;
5. only then convert runtime-dependent controls from `RUNTIME_PENDING` to runtime PASS.

The failed run `34413535220` targeted superseded SHA `3349c1bf51c696e5d77106e3753c4a26cea8c033` and receives no exact-current-main acceptance credit.

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
DEADLINE_TRACKING=PASS_SOURCE_IMPLEMENTED_RUNTIME_PENDING
CUSTOMER_CONTROLLER_ROUTING=PASS_SOURCE_IMPLEMENTED_CASE_DECISION_OPEN
TERMINAL_STATE_INTEGRITY=PASS_SOURCE_MERGED_RUNTIME_PENDING
UPDATED_AT_INTEGRITY=PASS_SOURCE_MERGED_RUNTIME_PENDING
DATA_SUBJECT_RIGHTS=PARTIAL_RUNTIME_AND_DOWNSTREAM
```

No all-Chapter-III PASS is claimed until protected runtime evidence and the remaining downstream/legal decision surfaces are genuinely closed.