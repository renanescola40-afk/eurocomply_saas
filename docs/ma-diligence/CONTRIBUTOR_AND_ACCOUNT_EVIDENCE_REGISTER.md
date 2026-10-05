# RISCK COMPLY — Contributor and Account Evidence Register

Date: 2026-10-05  
Purpose: supplemental M&A factual evidence register  
Status: `SUPPLEMENTAL_EVIDENCE=PASS / LEGAL_TITLE_NOT_INFERRED`

## Git contributor history review

The initial 300-commit sample was expanded on 2026-10-05 through exact review cutoff SHA `ad5ae2b99875659c54b6139d35addbbc2a9cfad9`. The earlier baseline SHA `6219f52c463c367848c1139158e5389d35298ca2` had 17,959 reachable commits and the cutoff is 76 commits ahead, supporting at least **18,035 reachable commits** at that snapshot. This remains a bounded factual review because the API walk had not yet reached an empty final page at the time of this update.

| Identity | Count | Classification |
|---|---:|---|
| `renanescola40-afk` | dominant across reviewed history | Primary owner-linked GitHub account |
| `sastestezoer-commits` | recurring | Commit/merge account; control/relationship documentation required |
| `renansilva2002-tech` | recurring historical identity | Separate GitHub identity; sample commits are merge commits into the same repository. Relationship/title must be documented rather than inferred. |
| `soltomstorevendas-web` | recurring historical identity | Separate GitHub identity; sample commits are merge/branch integration activity. Relationship/title must be documented rather than inferred. |
| `dependabot[bot]` | recurring bot | GitHub dependency automation |
| `github-actions[bot]` | recurring bot | GitHub Actions automation |
| `actions` / `security-bot` / PR-specific noreply identities | sparse automation/service identities | Treat as automation unless underlying evidence shows a human author relationship |

The review therefore disproves the earlier implication that only three identities existed in the repository history. It does **not** prove that the additional account identities are third-party contributors.

Boundary: this is factual attribution only. It does not establish employment status, authorship law, assignment, work-for-hire status or seller ownership.

## Corporate/account mailbox evidence

| Evidence | Date | Fact credited | Fact not credited |
|---|---|---|---|
| PandaDoc completion notice: `PostHog DPA — Samuel Cerqueira, Unipessoal, Lda` | 2026-09-01 | DPA completed by all participants for named entity | Production project ownership, transferability, retention or final transfer-law conclusion |
| Stripe corporate notification referencing `RISCK COMPLY SAAS` | 2026-08-20 | Live Stripe account identity is independently corroborated | Final legal account entity, representative identity, bank/tax status, transferability |
| Google corporate-domain service notification for `risckcomply.com` | 2026-08-30 | Operational Google-domain service use | Registrar/domain title |
| Seller communications using NIPC `515099899` | prior seller correspondence | Candidate identifier for official lookup | Official NIPC verification |

## M&A use rule

Buyer-facing representations must prefer:
1. official registry/provider export;
2. executed agreement;
3. provider-originated notice;
4. repository evidence;
5. seller assertion.

A lower-ranked source must never be upgraded into a higher-ranked fact.

```text
CONTRIBUTOR_HISTORY_REVIEW_CUTOFF_SHA=ad5ae2b99875659c54b6139d35addbbc2a9cfad9
CONTRIBUTOR_HISTORY_REACHABLE_AT_CUTOFF_GTE=18035_COMMITS
CONTRIBUTOR_HISTORY_FINAL_EMPTY_PAGE=NOT_YET_REACHED
POSTHOG_DPA_COMPLETION_EMAIL=PASS
STRIPE_LIVE_ACCOUNT_MAIL_EVIDENCE=PASS_LIMITED
GOOGLE_DOMAIN_OPERATIONAL_EVIDENCE=PASS_LIMITED
NIPC_CANDIDATE=NOT_OFFICIALLY_VERIFIED
LEGAL_TITLE_CONCLUSION=NOT_CLAIMED
```
