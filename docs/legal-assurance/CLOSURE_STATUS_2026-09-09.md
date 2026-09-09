# RISCK COMPLY — Legal + GDPR + EU AI Act Regulatory Closure Status

Date: 2026-09-09  
Mode: `FINAL_LEGAL_REGULATORY_ASSURANCE_CLOSURE_V2`

## Terminal truth

```text
AI_IMPLEMENTATION=100_PERCENT_ON_CANONICAL_MAIN
AI_ACT_QUALIFIED_COMPLETION=0/8_ACCEPTED
QUALIFIED_REVIEW_STAGE_REMAINING=100_PERCENT
QUALIFIED_REVIEW_WEIGHT_REMAINING=51/100
LEGAL_RULES_REVIEW=PENDING_EXTERNAL_REVIEW
ARTICLE_5_REVIEW=PENDING_EXTERNAL_REVIEW
ARTICLE_50_REVIEW=PENDING_EXTERNAL_REVIEW
FRIA_REVIEW=PENDING_EXTERNAL_REVIEW
DEPLOYER_OBLIGATIONS_REVIEW=PENDING_EXTERNAL_REVIEW
HIGH_RISK_PROVIDER_REVIEW=PENDING_EXTERNAL_REVIEW
CONFORMITY_REVIEW=PENDING_EXTERNAL_REVIEW
GPAI_REVIEW=PENDING_EXTERNAL_REVIEW
TERMS_FINAL=BLOCKED_COUNSEL_AND_FOUNDER_FACTS
PRIVACY_FINAL=BLOCKED_FOUNDER_FACTS_AND_LEGAL_BASIS_DECISIONS
DPA_FINAL=BLOCKED_FOUNDER_PROVIDER_AND_CONTRACT_DECISIONS
SUBPROCESSORS_FINAL=BLOCKED_PROVIDER_CONTRACT_AND_TRANSFER_FACTS
PR_2005=MERGED
CANONICAL_PRODUCT_SHA=a576db333aa2b1dacbbf0460dfa77f41391c570d
ENTERPRISE_PRODUCTION_GATE_RUN=34346125823
ENTERPRISE_PRODUCTION_GATE_RUN_NUMBER=7628
EXACT_SHA_RUNTIME=WAITING_PRODUCTION_ENVIRONMENT_APPROVAL
EXACT_SHA_RUNTIME_CREDIT=NOT_YET_AVAILABLE
QUALIFIED_PACKAGE_FREEZE=PENDING_RUNTIME_AND_V2_DOCUMENT_RECONCILIATION
LEGAL_FINAL=BLOCKED
ENTERPRISE_100=NO
```

No software check, AI-generated opinion, CI result, internal self-review or synthetic signature can change a qualified external workstream to `PASS`.

## What changed in V2

PR #2005 is no longer an open gate. It was merged on 2026-09-09 and produced canonical `main` SHA:

`a576db333aa2b1dacbbf0460dfa77f41391c570d`

The protected merge gate is therefore closed. The next technical gate is the existing exact-SHA Enterprise Production Gate run `#7628` / run id `34346125823`, whose head SHA is the canonical product SHA. At this reconciliation point the run is waiting at the protected `Production` environment before `Production runtime validation` can execute. Runtime credit remains fail-closed until that job actually succeeds and retained evidence is verified.

## Product-coverage interpretation

The canonical coverage model keeps two different dimensions separate:

- engineering/CI/runtime evidence that can be closed through implementation and operations;
- genuine qualified external review that cannot be self-issued.

The eight qualified AI Act review tracks have total weight **51/100** and remain **0/8 accepted**. Their packages may be prepared internally, but preparation is not human acceptance.

## Official-source baseline

The AI Act legal-source baseline remains `2026-09-09.1`. GDPR source mapping is now being expanded under V2 using the binding GDPR text first, including Articles 13/14 for transparency and Article 28 for controller/processor contracting.

For Article 28 drafting, Commission Implementing Decision (EU) 2021/915 is the official controller/processor SCC baseline where appropriate. It must not be confused with the separate international-transfer SCC framework.

## Founder/company identity — fail closed

Current usable review facts:

- brand/product: `RISCK COMPLY`;
- contracting entity name: `SAMUEL CERQUEIRA, UNIPESSOAL LDA` (owner-supplied, suitable for review drafts pending authoritative verification where legally material);
- website: `https://www.risckcomply.com`;
- verified reachable corporate intake mailbox: `comercial@risckcomply.com`;
- owner-supplied correspondence/operating address: `Avenida de Roma 112-A, 1700-353 Lisboa, Portugal`.

Still blocked:

```text
REGISTERED_OFFICE=BLOCKED_OFFICIAL_REGISTRY_CONFIRMATION
NIF_NIPC=BLOCKED_AUTHORITATIVE_CONFIRMATION_DUE_TO_CONFLICT
```

The owner-supplied Lisbon address must not be represented as the registered office until authoritative Portuguese registry evidence confirms it. No NIF/NIPC is selected by inference.

## Privacy truth boundary

The public `/privacy` route currently exposes a concise Trust Center summary. It is not, by itself, a complete GDPR Articles 13/14 information notice.

The internal Privacy Policy review draft contains substantially more material, but final publication remains blocked by factual and decision gaps including legal bases, registered-office/NIF facts, transfer mechanisms/locations, retention periods, DPO position where applicable and authority/cross-border details.

V2 therefore tracks a requirement-by-requirement `PRIVACY_ART13_14_MATRIX.md`. A missing fact remains `BLOCKED`; a matter requiring qualified legal interpretation remains `PENDING_EXTERNAL_REVIEW`; an implemented and evidenced requirement may be `PASS` without inventing counsel approval.

## DPA truth boundary

The internal DPA review draft covers the principal Article 28 subject areas, including processing instructions, confidentiality, security, subprocessors, data-subject assistance, DPIA/prior-consultation assistance, breach handling, deletion/return, audit/information rights and annexes.

It is not final. Open gates include authoritative entity facts, subprocessor authorisation model and notice/objection mechanics, actual transfer locations/mechanisms, customer-specific Annex 1 details, breach service levels, deletion/export windows, audit limits and liability allocation.

V2 tracks these independently in `DPA_ARTICLE_28_CONTROL_MATRIX.md` rather than treating the existence of the draft as `PASS`.

## Retention truth

Current retention truth remains:

```text
RETENTION_TARGETS=DRAFT
RETENTION_ENFORCEMENT=NOT_PROVEN
RETENTION_ENTERPRISE_READY=0/8_CATEGORIES
RETENTION_READINESS=0_PERCENT
```

Static target periods are not contractual commitments and cannot be promoted until attributable business/legal decisions and implementation/provider evidence exist.

## Provider/subprocessor truth

Public Trust Center provider entries currently include Vercel, Supabase, Stripe and optional/configuration-dependent Sentry/PostHog entries. Presence in code or a generic public list is not sufficient to prove active production processing, exact region, transfer mechanism or DPA/SCC status.

The subprocessor register must be reconciled against actual Production configuration and provider contractual evidence before `SUBPROCESSORS=PASS` or `INTERNATIONAL_TRANSFERS=PASS` can be claimed.

## Qualified review model

Eight canonical review-package tracks remain prepared for qualified review:

| Workstream | Weight | Package preparation | Human acceptance |
|---|---:|---|---|
| LEGAL_RULES | 4 | READY | PENDING_EXTERNAL_REVIEW |
| ARTICLE_5 | 7 | READY | PENDING_EXTERNAL_REVIEW |
| ARTICLE_50 | 8 | READY | PENDING_EXTERNAL_REVIEW |
| FRIA | 6 | READY | PENDING_EXTERNAL_REVIEW |
| DEPLOYER_OBLIGATIONS | 7 | READY | PENDING_EXTERNAL_REVIEW |
| HIGH_RISK_PROVIDER | 9 | READY | PENDING_EXTERNAL_REVIEW |
| CONFORMITY | 5 | READY | PENDING_EXTERNAL_REVIEW |
| GPAI | 5 | READY | PENDING_EXTERNAL_REVIEW |

A workstream closes only with attributable evidence of reviewer identity, qualification/expertise, scope, independence/conflict position, reviewed version/SHA where relevant, date, findings, severity/remediation, limitations and final disposition.

## Counsel escalation boundary

Counsel is not a blanket prerequisite for every GDPR or AI Act documentation control. V2 escalates to counsel where material legal interpretation, Portuguese commercial/corporate law, contractual liability, governing-law/forum choices, disputed interpretation, IP/chain-of-title, regulator/customer-required counsel signoff or unresolved material exposure actually requires legal judgment.

Qualified privacy/DPO, AI governance, fundamental-rights, conformity or other domain specialists may independently review subject matter appropriate to their qualifications. Their review must not be misrepresented as a commercial-law opinion.

## Current critical path

1. approve the protected `Production` environment for Enterprise Production Gate run #7628;
2. execute and verify exact-SHA Production runtime validation for `a576db333aa2b1dacbbf0460dfa77f41391c570d`;
3. verify retained runtime evidence and Vercel exact-SHA deployment proof;
4. complete V2 GDPR control matrices and data-role mapping;
5. confirm registered office/legal address and NIF/NIPC from an authoritative source;
6. reconcile active production subprocessors, regions, DPAs and transfer mechanisms;
7. make the minimum owner/commercial decisions for retention, cancellation/refund, notice, export/deletion and related contractual mechanics;
8. freeze the final evidence-package digests after the relevant documentation and runtime state are canonical;
9. appoint appropriately qualified independent reviewers for the genuinely external workstreams;
10. remediate findings and obtain re-review where required;
11. obtain counsel approval only for the matters that actually require counsel;
12. only then promote `LEGAL_FINAL` / qualified Enterprise legal gates to `PASS`.

## External communication boundary

```text
EMAIL_SEND_AUTHORIZED=false
```

No Service Desk submission, reviewer outreach, DPO contact, specialist outreach, lawyer contact or meeting booking is sent without explicit owner authorization.
