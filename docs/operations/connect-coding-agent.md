# Connect a Coding Agent to EuroComply

EuroComply now has the repository-side control plane for a 24/7 senior engineering agent:

- `AGENTS.md` defines the engineering contract.
- `.github/senior-agent.yml` defines queue labels, autonomy boundaries, and verification gates.
- `.github/workflows/senior-agent-triage.yml` classifies issues and supports `/agent ...` commands.
- `.github/workflows/senior-agent-dispatch.yml` creates a work packet when an issue is ready.
- `.github/workflows/senior-agent-watchdog.yml` detects quality/security regressions.

A real code-writing provider is still required to read ready issues, modify files in branches, and open PRs.

## Recommended autonomy model

Use this model first:

```text
Agent may work alone -> Agent opens PR -> GitHub checks run -> Owner reviews -> Owner merges
```

Do not allow direct push to `main`. Do not allow automatic production deploys from agent branches.

## Minimum provider permissions

Grant the provider only what it needs:

- Repository: `renanescola40-afk/eurocomply_saas` only.
- Contents: read/write on branches.
- Pull requests: read/write.
- Issues: read/write.
- Checks/actions: read.
- Secrets: no access by default.
- Deployments: no production deployment permission by default.

## Provider instructions

Paste or configure this instruction block in the provider:

```text
You are the EuroComply Senior Engineering Agent.

Before making changes, read AGENTS.md, .github/senior-agent.yml, and docs/operations/senior-agent-24-7.md.

Work only on GitHub issues labeled senior-agent and agent:ready, or issues where the owner commented /agent run.

For each task:
1. Reproduce or inspect the issue.
2. Identify the root cause or product reason.
3. Implement the smallest safe change.
4. Run relevant verification commands.
5. Open a PR from branch agent/<issue-number>-<short-slug> into main.
6. Include summary, root cause, safety notes, verification, risk notes, and follow-ups.

Never merge your own PR.
Never weaken auth, authorization, tenant isolation, Supabase RLS assumptions, audit logging, upload checks, validation, security headers, or CI/security gates to make a check pass.
Stop and ask for owner review before touching auth, RLS, billing, audit chain, uploads/storage, production secrets, deployment config, or destructive migrations.
```

## GitHub setup checklist

1. Keep branch protection enabled on `main`.
2. Require CI/security checks before merge.
3. Require at least one owner review for `risk:high` or `needs-owner` PRs.
4. Keep Vercel production deployments limited to `main`.
5. Configure `security-ci` environment secrets separately from provider credentials.
6. Do not store Supabase service-role keys in provider prompts.

## First test task

Create a low-risk issue with this title:

```text
[Agent Task]: Validate footer links and broken internal routes
```

Body:

```text
Goal: Find broken internal links or route references and open a minimal PR with fixes.
Acceptance criteria: npm run quality:routes passes, no auth/security behavior changes.
Risk: Low.
```

Then comment:

```text
/agent run
```

Expected result:

- Triage labels the issue.
- Dispatch posts a work packet.
- Connected coding agent creates an `agent/<issue>-...` branch and PR.

## Safe first task categories

Start with these before allowing deeper autonomy:

- documentation cleanup;
- route/link validation;
- lint/typecheck fixes;
- small test additions;
- CI workflow hardening that does not remove gates;
- non-production runbook updates.

Avoid these until trust is established:

- auth/session changes;
- RLS or Supabase service-role usage;
- billing/Stripe;
- uploads/storage;
- audit-chain/compliance evidence;
- production deployment automation.
