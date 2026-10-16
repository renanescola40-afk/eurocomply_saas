# RISCK COMPLY — Nine-specialist dispatch contract

**State:** deterministic routing and GitHub work-packet preparation only. This does **not** install, execute, schedule or pay for any LLM or autonomous coding runtime.

## Activation and routing

1. GitHub issue must be marked `senior-agent` and `agent:ready`; `agent:blocked` and `needs-owner` always stop dispatch.
2. An authorized owner can include a single line `Agent: security` (or `Agent Profile: billing`) in the issue body. Alternatively set exactly one `agent:role:security`-style label **once that label is created**. Conflicting or unknown roles fail closed. Without explicit assignment: `type:ci` routes to DevOps, `type:security` to Security, `type:bug` and `type:feature` to Developer; everything else defaults to Master CTO.
3. The workflow checks out trusted `main`, computes a bounded work packet, and comments on the issue. Reviewer profiles are suggestions for subsequent **real, independently evidenced** review, not claims that any agent has been invoked.
4. Coding runtime must be selected and connected separately with legitimate GitHub identity, access, fixed scope, cost controls and per-run evidence. Until that step, agents remain **PROFILE_ONLY**, not **RUNNING**.
5. High-risk tasks must retain separate review and release authority. The Release Manager profile is review-only, never an auto-merge/auto-deploy principal.

## Nine profiles

| Profile | Role |
| --- | --- |
| `master-cto` | Queue, prioritization and coordination |
| `developer` | Application code |
| `security` | Security and tenant boundaries |
| `devops` | Build, release pipelines and observability |
| `database` | Supabase, schemas and RLS |
| `billing` | Stripe, plans and entitlements |
| `qa-automation` | Tests and QA |
| `compliance` | Regulatory evidence and claims |
| `release-manager` | Independent release GO/NO-GO review only |

## CircleCI and costs

The existing CircleCI `validar-risck` job on branch `circleci-project-setup` reported GitHub commit status SUCCESS at `f578c6b931e41f8b1cd5d1d8b29baf04426720f3`. That is evidence for an isolated code-validation workflow only: it does not execute specialist models, resolve all GitHub required checks, or authorize Vercel production promotion. The CircleCI configuration has not yet been merged into `main`; its present branch filter only includes `circleci-project-setup`.

Until GitHub Actions free runner access is restored, dispatch workflows may not start. Do not retry paid workflows, create provider credentials in repository files, create paid Vercel seats, or enable continuous model invocations without separate explicit budget authorization.

## Non-negotiable

No emails without owner approval; no paid resources without approval; no push to `main`, auto-merge, auto-approval, deploy, production database mutation, bypass of CI/review, or disclosure of secrets. Protect the DataGuard demo. The agent profile files, routing code and any CircleCI success are **not** evidence of Enterprise 100 / Production GO.

## Local unit tests

```bash
node --test tests/agents/specialist-routing.test.cjs
```

Keep actual test command, exit status, exact SHA and log. This draft-PR source change cannot be reported as CI PASS before its own tests execute.
