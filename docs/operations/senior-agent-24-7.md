# EuroComply 24/7 Senior Agent Runbook

This runbook explains how the EuroComply senior engineering agent should operate once a coding-agent provider or self-hosted runner is connected to GitHub.

The repository already has the agent contract in `AGENTS.md`. This document defines the operational queue, labels, escalation model, safe autonomy boundaries, and the guarded PR Autopilot handoff.

## Operating goal

Keep EuroComply production-ready by continuously:

- triaging failing checks and production-readiness regressions;
- converting actionable reports into scoped engineering issues;
- implementing small, reviewable fixes in agent branches;
- opening pull requests with clear evidence;
- repairing bounded low-risk CI failures on the same PR branch;
- never weakening security, tenant isolation, auditability, branch protection, or compliance gates to make a build pass.

## Architecture

The 24/7 system has five layers:

1. **GitHub issues as the work queue**
   - Every task is represented as an issue.
   - The agent only works on issues marked with `agent:ready` or explicitly invoked with `/agent run`.

2. **GitHub Actions as watchdog and triage automation**
   - Scheduled workflows detect broken quality/security gates.
   - Triage automation labels work and posts checklists.

3. **Coding agent provider or runner**
   - The external coding agent reads the repo, issues, checks, and `AGENTS.md`.
   - It creates branches named `agent/<issue-number>-<short-slug>`.
   - It opens PRs and responds to review feedback; it does not merge directly.

4. **Codex CI repair loop**
   - `Codex PR Auto-Fix` reads failed CI logs only for trusted same-repository PRs labeled `autofix:allowed`.
   - It applies at most two policy-bounded attempts on the existing branch.
   - It verifies package-lock alignment, lint, typecheck, unit tests, and build before pushing.
   - It never receives the merge token during analysis or verification.

5. **Owner-approved PR Autopilot merge gate**
   - The owner reviews risk notes and provides the approval required by branch protection.
   - The default-branch controller may synchronize and merge only policy-eligible PRs after exact-head checks, approval, resolved conversations, and a clean merge state.
   - High-risk changes remain manual even when checks pass.

## Required labels

Create these labels in GitHub when labels are not auto-created by workflow automation:

| Label | Meaning |
| --- | --- |
| `senior-agent` | Work belongs to the senior engineering agent queue. |
| `agent:ready` | Agent may start implementation. |
| `agent:triage` | Needs investigation or scoping before implementation. |
| `agent:blocked` | Agent must not continue until owner input or external config is provided. |
| `priority:p0` | Production/security/compliance blocking issue. |
| `priority:p1` | Important reliability, correctness, or launch-readiness issue. |
| `priority:p2` | Normal product or engineering improvement. |
| `risk:high` | Touches auth, authorization, tenant isolation, billing, audit chain, uploads, secrets, or compliance evidence. |
| `type:bug` | Defect or failing behavior. |
| `type:ci` | CI/check/workflow problem. |
| `type:security` | Security hardening, security regression, or scanner finding. |
| `type:feature` | Product capability or enhancement. |
| `needs-owner` | Owner decision required. |
| `autofix:allowed` | Current file set is eligible for bounded Codex CI repair. |
| `autopilot:eligible` | Current file set may enter the guarded merge controller. |
| `autopilot:merge` | Owner opt-in for a standard-risk, non-protected PR. |
| `autopilot:blocked` | Autopilot stopped on trust, risk, conflict, size, or configuration. |

## Issue lifecycle

1. **New issue**
   - Workflow applies `senior-agent` and `agent:triage` when the issue matches agent keywords or uses the agent issue template.

2. **Triaged issue**
   - Human or automation adds priority, type, and risk labels.
   - If the issue is clear, add `agent:ready` and remove `agent:triage`.

3. **Agent implementation**
   - Agent claims the issue by commenting with its branch name and plan.
   - Agent opens a PR linked to the issue.
   - Agent keeps the PR narrow and evidence-based.

4. **Review and repair**
   - Required checks must pass.
   - Owner reviews risk notes and verification evidence.
   - Agent responds to review comments with follow-up commits, not force-pushes that erase evidence.
   - For eligible low-risk failures, Codex may push a bounded repair to the same branch.

5. **Done**
   - PR is merged by the owner or by the guarded controller after the owner approval and every configured merge requirement are satisfied.
   - Issue is closed with the PR reference and verification summary.

## ChatOps commands

These commands are intended for GitHub issue comments:

| Command | Expected behavior |
| --- | --- |
| `/agent triage` | Mark issue for triage and ask the agent to classify scope/risk. |
| `/agent run` | Mark issue as ready for the agent to implement. |
| `/agent block` | Stop agent work and mark as blocked. |
| `/agent p0` | Mark as P0; use only for production/security/compliance blockers. |
| `/agent explain` | Ask the agent to summarize current understanding and next step. |

The triage workflow can label and comment. Actual code implementation requires a connected coding-agent provider or runner.

## Safe autonomy boundaries

The agent may autonomously open PRs for:

- failing lint/typecheck/test/build/security gates where the root cause is clear;
- small bug fixes with existing tests or obvious missing tests;
- documentation/runbook/template improvements;
- low-risk refactors that reduce duplication without changing behavior;
- CI hardening that preserves or strengthens security.

The agent and Autopilot must stop and request owner review before changing or merging:

- authentication, session, cookies, middleware auth, or step-up auth;
- authorization, tenant isolation, object-level access, or Supabase RLS assumptions;
- billing, subscriptions, Stripe webhooks, or pricing behavior;
- audit chain, compliance evidence, trust package, or legal records;
- upload security, malware scanning, storage buckets, signed URLs;
- production secrets, environment configuration, or external integrations;
- database migrations that delete data or are not backward-compatible;
- GitHub workflow, security gate, release script, package-manifest, or agent-governance changes.

The canonical implementation boundary is `.github/pr-autopilot-policy.json`. Labels cannot override protected paths.

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
- Exact commands run and results.

## Risk notes
- Any remaining risk or owner decision.

## Follow-ups
- Work intentionally left out of scope.
```

## Provider connection checklist

When connecting a real coding-agent provider, use least privilege:

- grant repository access only to `renanescola40-afk/eurocomply_saas`;
- allow issue and pull request read/write;
- allow contents write only for branches, not direct pushes to `main`;
- keep branch protection on `main`;
- require PR reviews and required checks;
- configure `OPENAI_API_KEY` and a repository-scoped `PR_AUTOPILOT_TOKEN` in Actions secrets;
- do not expose the Autopilot token to Codex, PR code, tests, or build commands;
- do not give the provider Supabase service role keys unless a specific task requires a temporary secret in a locked environment;
- do not expose production customer data to the agent.

## Recommended scheduled loops

| Loop | Cadence | Purpose |
| --- | --- | --- |
| Watchdog | Every 6 hours | Run quality/security gates and open/update issue on failure. |
| Triage | Every 6 hours | Classify agent issues, mark stale blocked items, and keep queue tidy. |
| PR Autopilot reconciliation | Hourly plus PR/check/review events | Reclassify, synchronize, and merge eligible exact-head PRs. |
| Dependency review | On PR | Detect risky dependency/license changes. |
| Secret scan | On PR and push | Detect accidental secret exposure. |
| Security suite | On PR and schedule | Validate EuroComply-specific security gates. |

## Emergency behavior

For P0 security/compliance incidents:

1. Label issue `priority:p0`, `risk:high`, and `needs-owner`.
2. Agent may investigate and propose a minimal PR.
3. Agent and PR Autopilot must not deploy or merge without owner approval.
4. Protected-path policy keeps the PR outside autonomous repair and merge.
5. PR body must include impact, affected surface, verification, rollback plan, and assumptions.

See `docs/operations/pr-autopilot.md` for token setup, merge requirements, failure handling, and rollback.
