# Enterprise progress

Current main: `c7ba4ce2f932e00b3a77b4353ba39ab9bacfd9f9`
Decision: **NO_GO**

## Official evidence-backed score

- Last verified completion: **45%**
- Remaining: **55%**
- Score: **4.5 / 10**
- Classification: **MVP**
- Publish recommendation: **DO_NOT_PUBLISH**
- Last verified score SHA: `d20775c00812dc5ba08a3bcf0d987a54f2cb638f`
- Control counts: **45 PASS**, **1 BLOCKED**, **54 NOT_VERIFIED**
- Critical controls not PASS: **48**

Enterprise Readiness Scorecard validated IAM-08 on exact PR #1167 head `d20775c00812dc5ba08a3bcf0d987a54f2cb638f`. Current `main` contains that assessed tree and the later fail-closed team-role audit compensation through merge commit `c7ba4ce2f932e00b3a77b4353ba39ab9bacfd9f9`. No additional point is inferred from the later merge or from unmerged distributed-rate-limit work.

## Domain scores

| Domain | Score |
| --- | ---: |
| Engineering | 100% |
| Security | 70% |
| Identity | 20% |
| Tenancy | 20% |
| Platform | 10% |
| Release | 10% |
| Operations | 80% |
| Recovery | 0% |
| Product | 100% |
| Trust | 40% |

## Active repository work

- Sensitive-action step-up has exact-SHA IAM-08 evidence for billing, exports, team administration, GDPR, audit and security settings without claiming production AAL2, administrator MFA or SSO.
- Team-role changes now attempt atomic compensation and return 503 when durable audit persistence is unavailable; no score increase is inferred without a mapped control.
- SEC-05 and SEC-06 remain dependent on fresh deployed-host evidence and protected runtime SHA binding; their requirements are not weakened for CI.
- Current branch `agent/distributed-rate-limit-runtime-proof` adds a protected exact-main-SHA Upstash proof for PLT-09. It executes the real helper in independent processes, validates shared state, threshold blocking, subject isolation, production fail-closed behavior and synthetic-key cleanup. PLT-09 remains `NOT_VERIFIED` until that protected runtime workflow succeeds and the scorecard consumes its exact-SHA artifact.

## Evidence lanes

| Lane | Completion | Basis |
| --- | ---: | --- |
| Official enterprise score | 45% | Successful 100-control weighted scorecard on exact head `d20775c00812dc5ba08a3bcf0d987a54f2cb638f`, contained in current main |
| Technical repository completion | Not measured | No separate versioned technical-lane score is inferred |
| Runtime/provider evidence | Not recalculated | Live Vercel, Supabase, Stripe, Redis, Sentry, rollback, DAST and external-review evidence remains independent |
| Owner actions | Not measured | Only unavoidable external actions are tracked |

No pull request, unmerged implementation, local-only test, placeholder, draft artifact, provider workflow that did not execute runtime checks, or merge commit without an accepted exact-head scorecard increases these values.
