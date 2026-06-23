# Daily Senior Agent Operating Model

This document defines how Renan and the EuroComply Senior Engineering Agent should work together during a normal workday.

## Goal

Renan should be able to add tasks during the day, keep working elsewhere, and review the agent's output at the end of the day.

The agent should continuously organize work, prepare implementation packets, open PRs through the connected coding provider, and surface blocked/high-risk items clearly.

## Daily rhythm

All times are local operating intent, not strict legal commitments.

| Time | Agent behavior | Owner behavior |
| --- | --- | --- |
| Morning | Inspect open `senior-agent` issues, failing checks, blocked PRs, security findings, and Vercel/GitHub status. | Add any tasks for the day as issues or comments. |
| During the day | Triage new tasks, mark clear work `agent:ready`, dispatch work packets, and let the connected coding agent open PRs. | Keep working; only interrupt for urgent `needs-owner` decisions. |
| End of day | Produce a daily handoff issue/comment summarizing PRs, issues, failures, blockers, and recommended next actions. | Review PRs, merge safe work, answer blockers, and add tomorrow's priorities. |

## How Renan should add tasks

Preferred format in a GitHub issue:

```text
Goal: What should change?
Context: Why now? Links/screenshots/logs if useful.
Acceptance criteria: What proves this is done?
Risk: Low / Medium / High.
Notes: Anything the agent must avoid.
```

Then comment:

```text
/agent run
```

For uncertain tasks, comment:

```text
/agent triage
```

For urgent incidents, use the `Senior Agent Incident` template.

## What the agent can do while Renan works

Allowed without interrupting Renan:

- classify and label tasks;
- prepare work packets;
- investigate failing checks;
- open or update issues for CI/security failures;
- implement low-risk fixes through a connected coding agent;
- open PRs with verification evidence;
- update docs/runbooks/templates;
- fix lint, typecheck, tests, build, and security-check regressions when root cause is clear.

The agent must interrupt or block for owner review before:

- auth/session changes;
- authorization, tenant isolation, or RLS changes;
- billing/Stripe changes;
- audit chain or compliance evidence changes;
- uploads/storage/security scanning changes;
- production secrets/config/deployment changes;
- destructive or non-backward-compatible migrations;
- merging anything into `main`.

## End-of-day review checklist

Renan should review:

1. Open PRs created by agent branches.
2. PRs labeled `risk:high` or `needs-owner`.
3. Failed or pending required checks.
4. Issues labeled `agent:blocked`.
5. Daily handoff issue/comment.
6. Any production/secrets/Vercel/Supabase configuration blockers.

## Merge policy

The agent may open PRs, but should not merge them.

Recommended safe policy:

```text
Agent works -> Agent opens PR -> checks run -> Renan reviews -> Renan merges
```

For low-risk docs/CI cleanup, Renan may choose to merge after checks pass.
For high-risk work, require manual review even if all checks pass.

## Daily report contents

The daily report should include:

- work queue summary;
- PRs opened or updated today;
- issues moved to `agent:ready`;
- blocked issues needing Renan;
- failing checks or deployments;
- security/compliance alerts;
- recommended next actions for tomorrow.

## Reality check

GitHub Actions can triage, dispatch, watch, and report. A connected coding-agent provider or self-hosted runner is still required for autonomous code implementation.

The repository must keep branch protection enabled so the agent cannot silently change production without review.
