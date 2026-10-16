# RISCK COMPLY — Multi-Agent Team

Nine specialist definitions are stored in `.github/agents/*.agent.md` for use by compatible coding-agent runtimes. These files define roles; they do **not** start agents, grant permissions, create an always-on scheduler, or prove any model invocation.

## Workflow
1. **master-cto** reads AGENTS.md, the Engineering Constitution, open issues and PRs, operational notices, and active work locks.
2. Route work by domain: developer, security, devops, database, billing, qa-automation, compliance.
3. For any proposed release, **release-manager** independently reviews exact head SHA, checks, evidence and rollback.
4. Operate only on authorized isolated branches; create draft PRs. Protected files, live billing, production DB, production deployment and release merges must follow the existing human approval rules.
5. A second specialist verifies any high-risk patch before asking for human review. A model's claim that another agent ran is not evidence: retain actual run IDs, logs or PR comments where available.

## Skill routing
- Coding: OpenAI/Codex instructions, Next.js and TypeScript repository checks.
- Agent orchestration: OpenAI Agents SDK or a separately approved Vercel eve runtime.
- DevOps: Vercel deployments-cicd, verification and env-vars guidance.
- Database: Supabase access and RLS guidance.
- Payments: Stripe best practices.
- QA: Vitest/Playwright and end-to-end verification.
- Security: least privilege, evidence-first review, isolated testing.
- Compliance: documented claims and legal-review escalation.

Skills and runtimes are **not installed by this PR**. Evaluate availability, licensing, API spend and permission scope before enabling any new runtime.

## Non-negotiable owner controls
- No outbound email without owner approval.
- Zero new costs without explicit approval.
- No automatic merges, automatic production deployments, destructive production operations, security bypass or invented evidence.
- Preserve the demo and all existing branch protection.
- Unknown status is NOT VERIFIED, not PASS.

## Activation checklist
- Confirm supported agent-profile syntax and enabled runtime on GitHub/Codex.
- Confirm connected GitHub permissions and quotas.
- Audit existing automated workflows for overlaps and scheduler triggers.
- Test one low-risk development task with real run evidence on a disposable branch.
- Record precise runtime costs before considering persistent autonomous scheduling.

## Current deployment status
Definitions only. Agents have **not** been launched. No production changes or external automation activated.
