# RISCK COMPLY: bounded Enterprise Skill adoption v1

Date: 2026-11-10. This is an isolated-branch candidate, not a production deployment, installed daemon or approved gate. No additional workflow, service, runner, credential or paid dependency is created.

Six project-specific Skills are placed in .agents/skills/ for compatible tool runtimes (including Codex CLI when supported). Ordinary ChatGPT sessions can read/use them with the existing connected tools but do not auto-load them from GitHub. These are newly authored narrow instructions, NOT third-party code copied or executed.

## Usage

From a full git checkout on a pinned HEAD:

    node scripts/agents/enterprise-gate-packet.mjs --gate A-18
    node --test tests/agents/enterprise-gate-packet.test.mjs

The packet is read-only/advisory; it does not query live providers, alter matrices, close gates, or start CI. On a provider-authorized execution run the ORIGINAL official validator:

    node scripts/enterprise-evidence/validate-evidence.mjs --report

Only the canonical source of acceptance plus provider proof, exact SHA, and qualified human approval may establish ACCEPTED. Any legacy source summary (including 2/24) may be stale. A merged PR alone never equals an accepted gate.

## Six consulted external skill sources (pinned file blob SHA)

These are **references** only, not executed or installed dependencies. Prior to any future runtime installation separately review all dependencies, hooks, privilege requests, licensing and prompt-injection risks.

- Evidence before completion: obra/superpowers, skills/verification-before-completion/SKILL.md; blob 7d45333cc4a49c57a80df6c1fe2fa777a207afbc
- Inline plan execution: obra/superpowers, skills/executing-plans/SKILL.md; blob ea23196d745043eefb0287387112825d2ca99f05
- Human-governed PR triage: trailofbits/skills, plugins/github-triage/skills/github-triage/SKILL.md; blob 526d882df6fb8eb27a9ea16ccc973772cfe58854
- Postgres/RLS safety: supabase/agent-skills, skills/supabase-postgres-best-practices/SKILL.md; blob 6400792389dfcc82c81953054e546bd72ebcd259
- Stripe best practices: stripe/ai, providers/agent-plugins/plugin/skills/stripe-best-practices/SKILL.md; blob 67412ead65464b49bd789a37869507877c99acd0
- Prompt optimizer: getsentry/skills, skills/prompt-optimizer/SKILL.md; blob b8132d287dbb6b3eac120514e9b5728dd431f7fc

## Assignment and scope

- risck-enterprise-gate-closer: coordinator, single gate, canonical validator
- risck-enterprise-pr-ci: CI/checks/review blockers
- risck-enterprise-qa-security: SEC/QAT authenticated runtime
- risck-enterprise-stripe-test: BIL TEST signed events
- risck-enterprise-supabase-rls: SEC-04/DAT-01 SQL/manifest
- risck-prompt-loop-breaker: objective prompt cases

Follow AGENTS.md and docs/ENGINEERING_CONSTITUTION.md, existing locks and docs/agents/DELEGATED_MERGE_POLICY.md. No merge, release, Production writes, Stripe LIVE, customer email, new costs, CI bypass, self-approval, fabricated evidence, scoring/denominator changes or alternative validator.

## Verification and rollback

Changes are only six instructions, a read-only source-registry work-packet CLI, its Node native tests, and this guide. Runtime/QA provider proof is not part of this PR. Review this diff, run the deterministic tests, and keep required GitHub checks/human approvals exact-head. Revert the single commit under normal governance to remove the package without touching app/DB/CI/acceptance data. A draft PR may trigger existing quota-consuming CI; check allowance before opening.
