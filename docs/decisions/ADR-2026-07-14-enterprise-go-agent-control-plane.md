# Decision: Enterprise GO agent control plane

- **Status:** Proposed
- **Date:** 2026-07-14
- **Owners:** Repository owner and Platform Engineering
- **Related issue/PR:** #1032 and the control-plane pull request
- **Priority:** P1

## Context

The repository already contained a strong agent contract, machine-readable policy, runbooks, and three named senior-agent workflows. However, the triage, dispatch, and watchdog workflows were manual placeholders that only printed explanatory text. There was no repository-native custom-agent profile, no trusted ChatOps authorization flow, no generated work packet, and no scheduled issue lifecycle for repository gate failures.

The product needs a durable owner for Enterprise GO closure, but granting unrestricted autonomous code, merge, deployment, or production-secret access would create unacceptable security and operational risk.

## Evidence

- `AGENTS.md` defines issue authorization, safe autonomy, verification, owner escalation, and owner-controlled merge.
- `.github/senior-agent.yml` defined queue labels and safety boundaries but had `draft_by_default: false`, conflicting with the repository agent contract.
- `.github/workflows/senior-agent-triage.yml`, `.github/workflows/senior-agent-dispatch.yml`, and `.github/workflows/senior-agent-watchdog.yml` were non-operational placeholders.
- `docs/operations/senior-agent-24-7.md` describes an issue queue, watchdog, coding-agent provider, and owner merge gate.
- Open PR review at decision time found duplicated public/enterprise release-profile work in #1028 and #1029, demonstrating the need for mandatory overlap review.

No production runtime, customer impact, provider health, or enterprise-control completion was validated by this decision.

## Candidate options

### Option A — Documentation-only operating prompt

- Benefits: lowest implementation risk and cost.
- Risks: no enforceable queue, authorization, dispatch, or failure tracking.
- Implementation effort: low.
- Operational cost: manual and repetitive.
- Maintenance cost: low but ineffective.
- Migration complexity: none.
- Reversibility: immediate.

### Option B — Fully autonomous code, merge, deploy, and production-validation agent

- Benefits: maximum automation.
- Risks: excessive privileges, secret exposure, unsafe production changes, false evidence, and loss of owner-controlled release decisions.
- Implementation effort: high.
- Operational cost: high.
- Maintenance cost: high.
- Migration complexity: high.
- Reversibility: difficult after production effects.

### Option C — Issue-based custom agent with guarded orchestration

- Benefits: a named accountable agent, trusted commands, work packets, scheduled repository checks, durable issue history, draft PRs, and owner-controlled merge.
- Risks: workflows can still be misconfigured; a Copilot/custom-agent plan and explicit assignment are required for code-writing execution.
- Implementation effort: medium.
- Operational cost: bounded GitHub Actions usage every six hours.
- Maintenance cost: moderate and centralized.
- Migration complexity: low; no application runtime, database, or provider migration.
- Reversibility: disable workflows and revert one PR.

## Decision framework

Option C provides the best ROEI. It turns existing governance into an operational control plane while preserving least privilege and owner authority. It directly reduces duplicated work, hidden CI regressions, and ambiguous authorization without touching customer runtime, billing, identity, or data.

Option A was rejected because it leaves the repository dependent on ad hoc prompts. Option B was rejected because the risk and evidence integrity cost outweigh the automation benefit.

## Decision

Adopt an issue-based Enterprise GO custom agent and guarded GitHub Actions control plane.

The custom agent is manually selectable and may edit repository branches, run checks, and open draft PRs. It may not merge, deploy, access production secrets by default, claim runtime health without evidence, or proceed through explicit owner blockers.

The workflows may manage labels, commands, work packets, repository gate reports, and failure issues. They do not write application code or declare Enterprise Production GO.

## Scope

### Included

- repository custom-agent profile;
- trusted `/agent ...` issue commands;
- issue intake and queue labels;
- work-packet generation with current SHA and open-PR overlap snapshot;
- scheduled repository lint, typecheck, test, build, and security gate watchdog;
- one durable watchdog issue and report artifact;
- Enterprise GO evidence states, stop conditions, and operating runbook;
- owner-controlled draft PR and merge boundary.

### Excluded

- automatic code assignment from GitHub Actions;
- automatic merge or production deployment;
- production secrets or customer-data access;
- runtime SSO, MFA, Stripe, Sentry, Supabase, WAF, DAST, rollback, restore, or pentest execution;
- automatic acceptance of legal, pricing, product, or material-risk decisions.

## Consequences

### Positive

- One explicit agent owns Enterprise GO repository work.
- Queue authorization and stop conditions are versioned and reviewable.
- Work packets reduce stale-base and duplicate-PR risk.
- Scheduled failures create actionable, SHA-bound issue evidence.
- Repository recovery is recorded without being misrepresented as production recovery.
- The agent remains unable to merge or deploy automatically.

### Negative or trade-offs

- The watchdog consumes GitHub Actions minutes every six hours.
- Issue and workflow automation requires maintenance as GitHub APIs and repository gates evolve.
- Code-writing execution still depends on an enabled and assigned custom-agent provider.
- High-risk runtime evidence remains owner-controlled and partly manual.

### Residual risks

- A trusted collaborator could issue `/agent run` on an insufficiently scoped issue. Mitigation: dispatch still blocks `agent:blocked` and `needs-owner`, and the agent must perform mandatory overlap and evidence review.
- Repository gates may be flaky. Mitigation: preserve exact run URLs and outcomes; do not infer root cause from workflow names.
- A scheduled green run could close a transient failure issue. Mitigation: recovery is recorded and the issue history remains available; production claims are explicitly prohibited.

## Compatibility and migration

The change is backward compatible with application runtime and data. It modifies repository governance and GitHub Actions only. No API, database, Supabase, Stripe, Sentry, customer workflow, or historical production evidence is migrated.

The existing queue labels and commands remain compatible. Draft PR behavior is aligned with `AGENTS.md`.

## Validation and measurement

- Tests and checks: Actionlint, repository CI, security workflow checks, secret scanning, and manual workflow-dispatch tests after merge.
- Metrics before: three named senior-agent workflows were placeholders; no repository custom-agent profile existed.
- Metrics after: one custom-agent profile, three active guarded workflows, one issue intake form, one control-tower issue, and one operations runbook.
- Measurement method: repository diff, GitHub workflow runs, issue comments, generated work packet, and watchdog artifact.

> Measurement unavailable in the current execution environment for post-merge workflow execution and custom-agent assignment.

## Operational impact

The watchdog runs on `main` every six hours and manually. It executes locked dependency installation, lint, typecheck, tests, production build, and repository security gates. It uploads a report and maintains one failure issue.

The triage workflow accepts commands only from the repository owner or trusted collaborators and ignores pull-request conversations. The dispatch workflow publishes a work packet but does not create a branch, edit code, merge, or deploy.

Production health, readiness, provider status, rollback, and restore remain separate runtime validations.

## Rollback

Rollback triggers include unauthorized command execution, duplicate issue/comment storms, excessive Actions cost, incorrect issue closure, malformed work packets, or any weakening of repository protections.

Procedure:

1. disable the three senior-agent workflows;
2. add `agent:blocked` to active queue issues;
3. revert the control-plane PR;
4. preserve issue comments and workflow artifacts for diagnosis;
5. correct the workflow or agent profile in a new reviewed PR;
6. re-enable only after manual low-risk workflow-dispatch validation.

No database or runtime rollback is required.

## Evidence limitations

This decision validates repository design and implementation intent only. It is not production validation, an audit, a pentest, certification, proof of customer impact, or proof that GitHub custom-agent execution is enabled for the account.

The workflows and custom agent must pass required PR checks and post-merge manual exercises before being considered operational.

## Follow-up review

- Review trigger: after the first successful triage, dispatch, watchdog failure/recovery cycle, and custom-agent draft PR.
- Owner: Repository owner and Platform Engineering.
- Conditions that would supersede this decision: a safer native GitHub orchestration mechanism, a change in custom-agent permissions, recurring workflow abuse/flakiness, or a requirement for controlled production-runtime automation.
