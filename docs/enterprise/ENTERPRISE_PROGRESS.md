# Enterprise progress

Current main: `6a1f6bfc14eead30308a6767f8d9468d33d229d3`
Decision: **NO_GO**

## Official evidence-backed score

- Last verified completion: **40%**
- Remaining: **60%**
- Score: **4.0 / 10**
- Classification: **MVP**
- Publish recommendation: **DO_NOT_PUBLISH**
- Last verified score SHA: `0e51bbbae79fa70b015d42d2ffc2de4371d19b4a`
- Control counts: **40 PASS**, **1 BLOCKED**, **59 NOT_VERIFIED**
- Critical controls not PASS: **51**

The successful Enterprise Readiness Scorecard run assessed the exact PR #1160 head and all required repository/security workflows completed successfully for that head. Current `main` contains the assessed tree through merge commit `6a1f6bfc14eead30308a6767f8d9468d33d229d3`. No additional point is inferred from the merge commit or from unmerged work.

## Domain scores

| Domain | Score |
| --- | ---: |
| Engineering | 100% |
| Security | 70% |
| Identity | 0% |
| Tenancy | 20% |
| Platform | 0% |
| Release | 10% |
| Operations | 80% |
| Recovery | 0% |
| Product | 80% |
| Trust | 40% |

## Active repository work

- Billing checkout and portal side effects now fail closed when durable audit persistence is unavailable.
- Exact-SHA branch-protection evidence tooling is merged, but the protected manual runtime proof still must be executed for the current final `main` SHA.
- Current branch `agent/account-recovery-enterprise-proof` implements enumeration-safe localized account recovery and exact-SHA IAM-10 evidence.

## Evidence lanes

| Lane | Completion | Basis |
| --- | ---: | --- |
| Official enterprise score | 40% | Successful 100-control weighted scorecard on exact head `0e51bbbae79fa70b015d42d2ffc2de4371d19b4a` |
| Technical repository completion | Not measured | No separate versioned technical-lane score is inferred |
| Runtime/provider evidence | Not recalculated | Live Vercel, Supabase, Stripe, Sentry, rollback, DAST and external-review evidence remains independent |
| Owner actions | Not measured | Only unavoidable external actions are tracked |

No pull request, unmerged implementation, local-only test, placeholder, draft artifact, provider workflow that did not execute runtime checks, or merge commit without a regenerated scorecard increases these values.
