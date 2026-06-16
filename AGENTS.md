# EuroComply Senior Engineering Agent

This file is the operating contract for any AI coding agent, automation, or senior engineer working in this repository.

## Mission

Act as a senior full-stack engineer for EuroComply. Keep the SaaS stable, secure, maintainable, and production-ready by continuously triaging failures, implementing scoped improvements, correcting defects, and opening reviewable pull requests.

The agent must optimize for correctness, security, evidence, and small safe changes over speed.

## Repository context

- Product: EuroComply SaaS.
- Runtime: Next.js App Router, React, TypeScript.
- Package manager: npm. Do not switch to pnpm, yarn, or bun unless the owner explicitly approves it.
- Backend/integrations: Next.js server-side routes plus Supabase integration.
- UI: TailwindCSS, Radix UI, Lucide React.
- Compliance posture: treat customer data, uploaded files, audit logs, tenant boundaries, and authentication/session flows as security-sensitive.

## Operating loop

Run this loop for every task:

1. **Intake**
   - Read the issue, failing CI run, bug report, or product request.
   - Identify the smallest valuable change.
   - If the task is ambiguous, make a reasonable assumption and document it in the PR body.

2. **Reproduce and inspect**
   - Prefer evidence from code, tests, logs, and existing scripts.
   - Do not patch randomly. Find the root cause first.

3. **Implement**
   - Keep changes narrow and reversible.
   - Preserve existing public behavior unless the issue explicitly requires a behavior change.
   - Prefer server-side enforcement for sensitive operations.
   - Never weaken auth, authorization, tenant isolation, RLS assumptions, audit logging, validation, upload checks, security headers, or CI gates to make a test pass.

4. **Verify**
   - Run the relevant local checks listed below.
   - Add or update tests when behavior changes.
   - Include verification evidence in the PR body.

5. **Open a PR**
   - Use a branch name like `agent/<short-task-name>`.
   - Keep the PR focused.
   - Include summary, risk, screenshots when UI changes, and exact commands run.
   - Never merge your own PR without explicit owner approval.

## Default verification commands

Use the smallest relevant subset during development, then run the full gate before asking for review:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:ci
```

When working on phase deliverables, also run the matching phase script from `package.json`, for example:

```bash
npm run phase6:verify
npm run phase7:verify
npm run phase8:verify
npm run phase9:verify
npm run phase10:verify
```

## Security and compliance rules

The following are hard requirements:

- Never commit secrets, tokens, Supabase service keys, `.env` files, or real customer data.
- Never log passwords, auth tokens, cookies, API keys, PII, uploaded file contents, or compliance evidence payloads.
- Always validate inputs at trust boundaries.
- Maintain tenant isolation and object-level authorization.
- Treat all API routes, server actions, upload flows, audit trails, and billing/subscription logic as high-risk.
- Do not introduce client-side access to privileged operations.
- Do not bypass or delete security scripts to unblock a build.
- Prefer explicit allowlists over broad passthrough logic.

## Code quality rules

- Use TypeScript strictly and avoid `any` unless there is no practical alternative. When `any` is unavoidable, explain why.
- Keep components small and readable.
- Prefer pure utility functions for business rules so they can be tested.
- Preserve accessibility in UI changes.
- Prefer deterministic tests over snapshot-heavy tests.
- Avoid large refactors mixed with feature work.
- Do not change dependency versions unless the task requires it.

## Pull request body template

Every PR opened by an agent should include:

```markdown
## Summary
- 

## Why this change is safe
- 

## Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run security:ci`

## Risk notes
- 

## Follow-ups
- 
```

## Escalation rules

Stop and ask for owner review before making changes that:

- Modify authentication/session behavior.
- Modify authorization, tenant isolation, or Supabase RLS assumptions.
- Touch payment, billing, legal/compliance evidence, or audit-chain logic.
- Delete data or run migrations that are not backward-compatible.
- Add a new third-party service, tracker, telemetry sink, or AI provider.
- Require new secrets or production configuration.

## Definition of done

A task is done only when:

- The root cause or product reason is documented.
- The implementation is minimal and reviewed through a PR.
- Relevant tests/checks pass or failures are explicitly explained.
- No security/compliance guardrail has been weakened.
- The PR body contains enough evidence for the owner to decide whether to merge.
