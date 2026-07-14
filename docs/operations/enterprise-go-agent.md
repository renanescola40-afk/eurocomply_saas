# Enterprise GO Agent Operations

This runbook operates the repository's custom GitHub agent and its issue-based control plane.

## Components

- `.github/agents/enterprise-go.agent.md` — GitHub custom-agent profile and execution contract.
- `AGENTS.md` — repository-wide engineering rules.
- `.github/senior-agent.yml` — machine-readable queue, verification, autonomy, and Enterprise GO policy.
- `.github/workflows/senior-agent-triage.yml` — trusted ChatOps commands and issue intake.
- `.github/workflows/senior-agent-dispatch.yml` — generates a current work packet for an authorized issue.
- `.github/workflows/senior-agent-watchdog.yml` — audits `main` repository gates every six hours and opens or updates one failure issue.
- `.github/ISSUE_TEMPLATE/enterprise-go.yml` — structured Enterprise GO work intake.

## What the control plane does

The workflows can:

- create and maintain queue labels;
- place matching issues into triage;
- process trusted `/agent ...` commands;
- generate an evidence-aware work packet;
- run repository quality and security gates on `main`;
- open, update, and close a single watchdog failure issue;
- upload a repository-gate report artifact.

The workflows do not:

- write application code;
- select or start a cloud coding agent by themselves;
- access production secrets or customer data;
- deploy or merge;
- validate SSO, MFA, Stripe, Sentry, Supabase RLS, rollback, restore, DAST, WAF, or pentest without the required runtime access and evidence;
- declare Enterprise Production GO.

A GitHub Copilot plan and repository access that supports custom cloud agents are required before `.github/agents/enterprise-go.agent.md` can be selected as an executing coding agent.

## Starting work

1. Create an issue with the **Enterprise GO work item** form.
2. Add enough code, check, log, SHA, PR, or reproduction evidence for triage.
3. Use `/agent triage` when the issue needs investigation.
4. Remove `needs-owner` or `agent:blocked` only after the required decision or external action exists.
5. The repository owner or trusted collaborator comments `/agent run`.
6. Triage applies `senior-agent` and `agent:ready`, then starts the dispatch workflow.
7. Dispatch creates or updates one work packet with the current `main` SHA, open-PR overlap snapshot, expected branch, safety rules, and completion contract.
8. Assign **Risck Comply Enterprise GO** from GitHub's agent interface to the authorized issue.
9. Review the draft PR and every required check. The agent never merges.

## Commands

| Command | Result |
| --- | --- |
| `/agent triage` | Adds the issue to senior-agent triage and removes ready/blocked labels. |
| `/agent run` | Authorizes work, clears triage/blocked, and requests a work packet. |
| `/agent block` | Stops implementation and removes ready. |
| `/agent p0` | Marks P0/high-risk and requires owner review. |
| `/agent explain` | Posts the current queue and blocker state. |

Commands are accepted only from the repository owner or trusted collaborators. Commands in pull-request comments are ignored.

## Watchdog behavior

The watchdog runs every six hours and can also be started manually. It executes:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:ci
```

Each gate is collected independently so one failure does not hide later outcomes. A final enforcement step still fails the workflow when any gate did not pass.

On failure, the workflow creates or updates one issue named `Senior Agent Watchdog: main gate failure`. The issue contains the exact commit, run URL, gate outcomes, and next-action rules.

On a later fully green run, the workflow posts recovery evidence and closes that watchdog issue.

This is repository validation only. It does not prove production health, authenticated behavior, provider availability, tenant isolation, rollback, or restoration.

## Enterprise GO decision boundary

The agent may recommend a narrower release classification when repository and runtime evidence supports it:

- Controlled Beta GO;
- Early Access GO;
- Production GO with Enterprise Limitations;
- Enterprise No-Go.

`Enterprise Production GO` requires one exact deployed SHA with accepted evidence for all mandatory controls and no unresolved critical blocker. Missing or inaccessible proof must remain `NOT VERIFIED` or `BLOCKED`.

## Owner-only actions

The agent must stop before:

- configuring or reading production secrets;
- changing production provider settings;
- deploying, rolling back, or restoring production;
- accepting material risk;
- approving legal, regulatory, pricing, or product-policy claims;
- adding a new identity, billing, telemetry, email, storage, or AI provider;
- authorizing a destructive migration;
- representing external pentest, SSO, WAF, DAST, backup, or provider-console work as complete without evidence.

## Safe rollout

1. Merge the control-plane PR after Actionlint, CI, security, and workflow checks pass.
2. Manually run **Senior Agent Triage** against a low-risk test issue.
3. Comment `/agent explain`, then `/agent run` as the repository owner.
4. Confirm the dispatch work packet is created once and updated rather than duplicated.
5. Manually run **Senior Agent Watchdog** and inspect its artifact and issue behavior.
6. Assign the custom agent to a documentation or route-quality issue before authorizing high-risk work.
7. Keep branch protection and owner-controlled merge enabled.

## Rollback

If the control plane behaves incorrectly:

1. disable the three senior-agent workflows in GitHub Actions;
2. add `agent:blocked` to active queue issues;
3. revert the control-plane PR;
4. remove or correct the agent profile only through a reviewed PR;
5. preserve workflow artifacts and issue comments as diagnostic evidence.
