# RISCK COMPLY — DAT-01 reviewer case evidence intake (no automatic approval)

**Status: BLOCKED.** This file does not approve any source, exception, source mapping, SQL replay, protected merge or production release. The source artifact is the immutable 48-case matrix; reviewers must use current HEAD and exact case IDs.

## The first priority cases
- **DAT01-017 — provider version `20260726070000`**: permissions_catalog_rls_hotfix; applied SHA256 `51165bd874a1d55bc1d6d1f955ebd40c629f0b0a039c81cc331f93580351f23e`; risks: RLS_POLICY_DDL_PRESENT, POSSIBLE_BROAD_POLICY_USING_TRUE_REVIEW, ACL_CHANGE_PRESENT, DROP_DDL_PRESENT, HISTORICAL_RLS_DRIFT_REVIEW_REQUIRED. Review complete policy semantics, privilege scope and historical source provenance before deciding.
- **DAT01-101 — provider version `20260922112154`**: reconcile_transactional_email_delivery_logs_v1; applied SHA256 `3a4af676fb07d8f1565a22d657a888fb1d59f19f74b92a08057e71209ea33ae9`; risks: RLS_POLICY_DDL_PRESENT, POSSIBLE_BROAD_POLICY_USING_TRUE_REVIEW, ACL_CHANGE_PRESENT, DROP_DDL_PRESENT, DML_CHANGE_PRESENT. Review complete policy semantics, privilege scope and historical source provenance before deciding.

## How to submit native GitHub reviews
1. Open the current PR and identify the **CURRENT HEAD commit SHA** in Commits. Do not reuse the review SHA after a new push.
2. Open the full [48-case triage JSON](https://github.com/renanescola40-afk/eurocomply_saas/blob/617649987c8546a9dde0348adfbbd151214de9f1/docs/enterprise/phase1-v22/recovered-provider-statements/case-review-triage-48.json) or the updated path on the current PR branch. Match case ID, version and full 64-character applied SQL SHA256.
3. Have a genuinely independent qualified reviewer inspect the underlying SQL and evidence, including the known RLS and SECURITY DEFINER flags, and decide with actual technical rationale. Do not just copy template placeholders.
4. Paste the form below into a native GitHub PR review. Use a **real disposition** (including BLOCKED when evidence is insufficient) and include sufficient technical detail. One native review per case is supported by the source-only preflight.
5. If the reviewer has not actually completed the case analysis, use a normal comment describing what remains; do not submit an APPROVED review. A native APPROVED state alone never closes A-12.
6. The automation checks only **syntactic/identity completeness** and always reports A-12=BLOCKED. Qualified source, security and replay acceptance must be independently assessed and recorded under project governance.

### Case-specific form — fill all fields from verified evidence

```text
Review target SHA: <CURRENT_EXACT_PR_HEAD_SHA>
Case ID: DAT01-017
Provider migration version: 20260726070000
Source provenance: <actual source/exception analysis, at least 45 characters>
Version mapping: <actual provider-to-source mapping conclusion, at least 35 characters>
Security assessment: <actual RLS/ACL/SECURITY DEFINER findings, at least 50 characters>
Evidence references: <actual immutable provider SHA256 51165bd874a1d55bc1d6d1f955ebd40c629f0b0a039c81cc331f93580351f23e and exact GitHub link>
Independent disposition: REMEDIATION REQUIRED
Technical rationale: <reviewer's original substantiated reasoning, at least 75 characters>
Reviewer: <REAL_INDEPENDENT_GITHUB_LOGIN>
Review date: <YYYY-MM-DD>
Replay authorization: NOT GRANTED
Formal A-12 acceptance: PENDING
```

**Do not submit the example above as an approval.** Replace the case identity and SHA256 for each case; the example disposition is not a recommended decision.

## Full reviewer queue (48 unique migrations)

| Case | Provider version | Priority | Unresolved proof | Applied SHA256 |
|---|---|---|---|---|
| DAT01-017 | `20260726070000` | P0 | source | `51165bd874a1d5…` |
| DAT01-018 | `20260804224915` | P2 | source | `db0054e387bdc8…` |
| DAT01-019 | `20260804230433` | P1 | source | `31426eb2a17a61…` |
| DAT01-020 | `20260805223500` | P1 | source | `5461708cb3e8f1…` |
| DAT01-021 | `20260807091341` | P1 | source | `8130b5fc8c8424…` |
| DAT01-028 | `20260812230229` | P1 | source | `d541750f96365f…` |
| DAT01-033 | `20260813124224` | P1 | source | `195d4560e2b9ca…` |
| DAT01-034 | `20260822120617` | P1 | source | `0c72e61ac821d9…` |
| DAT01-068 | `20260831115851` | P1 | mapping | `821d15c0ae6c0a…` |
| DAT01-069 | `20260902193810` | P1 | mapping | `894ca7297890ae…` |
| DAT01-070 | `20260902193849` | P2 | mapping | `494631c9521dc2…` |
| DAT01-071 | `20260902202558` | P1 | source + mapping | `88ad165648dcaf…` |
| DAT01-077 | `20260905075429` | P1 | source | `0b32cd5b0ebd5c…` |
| DAT01-078 | `20260907142133` | P1 | source | `3bd65011f7b282…` |
| DAT01-091 | `20260909006900` | P1 | source | `d476e7bccc26e3…` |
| DAT01-092 | `20260909230946` | P1 | source + mapping | `0b27879c8931dd…` |
| DAT01-093 | `20260909231011` | P1 | source + mapping | `de6ce60712a805…` |
| DAT01-094 | `20260909232229` | P2 | source + mapping | `1bc1f8f133c138…` |
| DAT01-101 | `20260922112154` | P0 | source | `3a4af676fb07d8…` |
| DAT01-102 | `20260922112907` | P1 | source | `8bb11aa94e4862…` |
| DAT01-103 | `20260922203500` | P1 | source | `ec8b6213e5a1b7…` |
| DAT01-104 | `20260924141739` | P2 | mapping | `023fc0af949877…` |
| DAT01-105 | `20260924142553` | P2 | mapping | `47c93b26e13524…` |
| DAT01-106 | `20260924143358` | P2 | source + mapping | `66fcbd24e98103…` |
| DAT01-107 | `20260929101551` | P1 | source | `bb40fccf46f8dc…` |
| DAT01-108 | `20260929101638` | P2 | source | `d329f40a847a60…` |
| DAT01-109 | `20260929102134` | P1 | source | `626cabba53ffb1…` |
| DAT01-111 | `20261003134528` | P1 | source | `dea017549e2569…` |
| DAT01-112 | `20261003171225` | P2 | source | `1186770ebdef08…` |
| DAT01-113 | `20261003173930` | P1 | source | `1112bfa0b431e9…` |
| DAT01-114 | `20261003205557` | P2 | source | `5371aab27e28df…` |
| DAT01-115 | `20261003220421` | P2 | mapping | `33937e182c16a8…` |
| DAT01-116 | `20261003220519` | P2 | source + mapping | `2cdf4141ab8bec…` |
| DAT01-117 | `20261004082501` | P2 | source + mapping | `db12bfe5613df5…` |
| DAT01-118 | `20261004103137` | P2 | source + mapping | `85db3506d8a55a…` |
| DAT01-119 | `20261004110936` | P2 | source | `561206132e6a30…` |
| DAT01-120 | `20261005001641` | P2 | source | `83df4db3bbb839…` |
| DAT01-121 | `20261006125506` | P2 | mapping | `652786fda5b8b9…` |
| DAT01-122 | `20261006125509` | P2 | mapping | `a984d66947fe8c…` |
| DAT01-123 | `20261006125511` | P2 | mapping | `ea03f251ec326c…` |
| DAT01-124 | `20261006125514` | P2 | mapping | `d56475e7132fb8…` |
| DAT01-125 | `20261006125518` | P2 | mapping | `3608522681bf77…` |
| DAT01-126 | `20261006125623` | P2 | mapping | `d5465b63bbce5d…` |
| DAT01-127 | `20261006130430` | P2 | mapping | `a6e961666eacd8…` |
| DAT01-128 | `20261010075142` | P1 | source + mapping | `29bad3ef3fbb77…` |
| DAT01-129 | `20261013133323` | P1 | source + mapping | `6eb4f7dfe92915…` |
| DAT01-130 | `20261013133341` | P1 | source + mapping | `8e29bd0e1ec7f1…` |
| DAT01-131 | `20261015205458` | P2 | mapping | `e9c82b1680d172…` |

## Outstanding objective gates
- Original complete historical files or acceptable documented exceptions for the 34 source cases.
- Qualified independent evidence-based decisions for the 25 nonexact mappings; 11 cases overlap.
- Explicit assessment of permissive historic/current global catalog RLS, tenant isolation and the SECURITY DEFINER consolidation semantics.
- A separate, authorized, isolated fresh PostgreSQL 17 replay with synthetic data, ordered version history, negative RLS tests and rollback proof.
- Exact-SHA security CI and genuinely independent formal reviewer decision; protected main must remain unchanged until then.
