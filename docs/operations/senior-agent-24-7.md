# Risck Comply 24/7 Senior Agent Runbook

This runbook defines the operational queue, labels, escalation model, and safe autonomy boundaries for the senior engineering agent.

The executable contract is `AGENTS.md`. The safer rule wins if documents temporarily disagree.

## Operating goal

Keep Risck Comply production-ready by continuously:

- triaging failing checks and production-readiness regressions;
- converting actionable reports into scoped engineering issues;
- implementing small, reviewable fixes in agent branches;
- opening pull requests with clear evidence even when Vercel is externally rate-limited;
- never weakening security, tenancy, auditability, review, or compliance gates;
- leaving every final merge action human-controlled.

## Architecture

The 24/7 system has five layers:

1. **GitHub issues as the work queue**
   - Every task is represented as an issue.
   - The agent works only on ready or explicitly authorized items.

2. **GitHub Actions watchdog and triage**
   - Scheduled workflows detect broken quality/security gates.
   - Triage automation labels work and posts evidence checklists.

3. **Coding agent provider or runner**
   - Reads the repository, issue, checks, and `AGENTS.md`.
   - Creates branches such as `agent/<issue-number>-<short-slug>`.
   - Opens draft PRs and responds to review feedback.
   - Does not merge or update branches automatically.

4. **Read-only PR risk classifier**
   - Loads policy from the trusted default branch.
   - Never checks out PR code.
   - May maintain risk and autofix-eligibility labels.
   - Cannot approve, sync, resolve conversations, enable auto-merge, or merge.

5. **Human owner merge**
   - Reviews risk and evidence.
   - Requires independent approval, resolved conversations, exact-head green checks, and a clean merge state.
   - Performs the final SHA-bound merge explicitly.

## Required labels

| Label | Meaning |
| --- | --- |
| `senior-agent` | Work belongs to the senior engineering agent queue. |
| `agent:ready` | Agent may start implementation. |
| `agent:triage` | Needs investigation or scoping. |
| `agent:blocked` | Agent must stop until owner input or external configuration exists. |
| `priority:p0` | Production/security/compliance blocking issue. |
| `priority:p1` | Important reliability, correctness, or launch-readiness issue. |
| `priority:p2` | Normal product or engineering improvement. |
| `risk:high` | Touches a protected product or operational boundary. |
| `needs-owner` | Human owner decision or review required. |
| `autofix:allowed` | Same-branch bounded Codex repair is policy-eligible. |
| `autopilot:blocked` | Automation stopped at a trust, risk, size, or protected-path boundary. |

No label grants merge or branch-synchronization authority.

## Issue lifecycle

1. **New issue**
   - Automation may apply queue and triage labels.

2. **Triaged issue**
   - Human or automation adds priority, type, and risk labels.
   - Clear work receives `agent:ready`.

3. **Agent implementation**
   - Agent records its branch and plan.
   - Agent opens a linked draft PR.
   - Change remains narrow and evidence-backed.

4. **Review and checks**
   - Agent responds with follow-up commits rather than force-pushing away evidence.
   - Every new push requires fresh checks and may invalidate approval.
   - Review conversations remain human-visible until genuinely resolved.

5. **Human merge**
   - PR becomes non-draft only when reviewable.
   - Eligible reviewer other than the latest pusher approves.
   - All required checks pass on the exact current head.
   - All conversations are resolved and GitHub reports a clean state.
   - Human owner performs the final SHA-bound merge.

## Vercel rate-limit handling

A Vercel rate limit, quota, plan-capacity message, or temporary deployment-provider blocker must not prevent a reviewable code PR from being created or updated.

When the provider signal is `Deployment rate limited`, `build-rate-limit`, `retry in 24 hours`, `upgradeToPro=build-rate-limit`, or equivalent:

1. Continue authorized implementation, branch creation, commits, push, and PR creation.
2. Continue all available GitHub quality and security checks.
3. Do not infer a code defect from the provider-only signal.
4. Do not run Codex autofix merely to change Vercel quota status.
5. Use `.github/agents/pr-creation-with-vercel-limit.prompt.md`.
6. Complete the PR template's `External deployment status` section.
7. Mark deployment `BLOCKED — external provider quota/rate limit` and production validation `NOT VERIFIED` for the exact SHA.
8. Keep branch protection and the human final merge authoritative.

A required failed provider check cannot be bypassed. A non-required quota status does not block PR creation, but it is never deployment proof.

## ChatOps commands

| Command | Expected behavior |
| --- | --- |
| `/agent triage` | Classify scope and risk. |
| `/agent run` | Mark the issue ready for implementation. |
| `/agent block` | Stop agent work. |
| `/agent p0` | Mark a production/security/compliance blocker. |
| `/agent explain` | Summarize understanding, evidence, and next step. |

ChatOps never grants merge, approval, branch-sync, production-deployment, or administrator authority.

## Safe autonomy boundaries

The agent may autonomously open PRs for:

- clear lint/typecheck/test/build/security failures;
- small bug fixes with tests;
- documentation, runbook, and template improvements;
- low-risk refactors that reduce real duplication;
- CI hardening that preserves or strengthens controls;
- Vercel-rate-limited work whose repository change is complete and reviewable.

The agent may perform bounded same-branch CI repair only under trusted default-branch policy, with workspace-write/no-sudo, path enforcement, local verification, and remote-head comparison.

The agent must never:

- merge a PR automatically;
- synchronize a branch automatically;
- self-approve or fabricate review;
- resolve review threads automatically;
- bypass required checks or branch protection;
- use administrator bypass;
- represent repository checks as production evidence.

The agent must stop and request owner review before changing authentication, authorization, tenancy/RLS, billing/Stripe, audit evidence, trust/legal material, uploads/storage, production configuration, destructive migrations, rollback/restore, SSO, WAF, or risk acceptance.

## Minimum PR evidence

Every agent PR must include:

```markdown
## Summary
- What changed and why.

## Root cause / product reason
- Evidence from code, logs, checks, or issue details.

## Why this is safe
- Security, tenant isolation, and behavior notes.

## Verification
- Exact commands and truthful results.

## External deployment status
- Provider result, code implication, PR outcome, merge implication, and exact-SHA production state.

## Risk notes
- Remaining risk or owner decision.

## Rollback
- Exact reversal path.
```

## Provider connection checklist

- grant repository access only to `renanescola40-afk/eurocomply_saas`;
- allow issue and PR writes only where operationally necessary;
- restrict contents write to authorized same-branch repair pushes;
- do not grant merge, branch-sync, administrator, production-provider, or organization-wide authority;
- keep branch protection, required checks, independent reviews, and conversation resolution enabled;
- never expose Supabase service-role keys, Stripe secrets, or production customer data.

## Recommended scheduled loops

| Loop | Cadence | Purpose |
| --- | --- | --- |
| Watchdog | Every 6 hours | Run quality/security gates and open or update failure issues. |
| Triage | Every 6 hours | Classify agent issues and stale blockers. |
| PR classifier | Hourly and on PR events | Maintain risk/autofix labels without executing PR code. |
| Dependency review | On PR | Detect risky dependency or licence changes. |
| Secret scan | On PR and push | Detect accidental secret exposure. |
| Security suite | On PR and schedule | Validate repository-specific security gates. |

## Emergency behavior

For P0 security/compliance incidents:

1. Apply `priority:p0`, `risk:high`, and `needs-owner`.
2. Agent may investigate and propose a minimal PR.
3. Agent must not deploy, synchronize, approve, or merge.
4. PR body must include impact, affected surface, verification, rollback, and assumptions.
5. Human incident owner controls final approval, merge, deployment, and rollback.
