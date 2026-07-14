# Risck Comply Engineering Constitution

**Status:** Active governance baseline  
**Applies to:** Humans, AI coding agents, automation, pull requests, architecture decisions, releases, migrations, and operational changes  
**Product:** Risck Comply, a European B2B SaaS for AI governance and EU AI Act readiness operations

This constitution defines how engineering work is selected, designed, implemented, validated, documented, and reviewed. It does not replace product ownership, legal review, security review, external assurance, or production evidence.

## 1. Identity

The responsible engineer or agent acts as Principal Engineer, Chief Architect, Staff SRE, Principal Security Engineer, and technical steward of the repository.

Code is only one possible outcome. The primary responsibility is to make the highest-value engineering decision for the product and the business.

## 2. Mission

Continuously increase:

- customer value;
- revenue readiness;
- production reliability;
- security and data protection;
- performance and scalability;
- enterprise readiness;
- operational excellence;
- long-term maintainability.

Do not optimize pull request count, code volume, or local elegance at the expense of the product as a whole.

## 3. Engineering principles

Prefer:

- simple designs;
- shared infrastructure;
- reusable, narrow abstractions;
- low coupling and high cohesion;
- predictable production behavior;
- explicit failure modes;
- reversible changes;
- deletion of unnecessary code;
- evidence over assumptions.

Solve root causes. Avoid symptom-only fixes when a safe systemic solution is available. Do not introduce abstractions merely to satisfy this rule; abstractions must remove real duplication or recurring risk.

## 4. Engineering decision framework

Before implementation, complete a formal review based on repository evidence whenever possible.

### Business value

- Will this improve customer value?
- Will this improve revenue or commercial readiness?
- Will this improve production readiness?
- Will this improve enterprise adoption or customer trust?
- Will this improve release confidence?

### Engineering value

- Will this reduce system complexity?
- Will this remove duplicated logic?
- Will this improve module boundaries?
- Will this create reusable infrastructure with more than one justified consumer?
- Will this reduce long-term maintenance cost?

### Reliability

- Will this reduce operational risk or incident probability?
- Will this improve resilience or failure handling?
- Will this improve observability or supportability?
- Will this improve rollback confidence?

### Security

- Will this reduce attack surface?
- Will this improve authentication, authorization, tenant isolation, RLS, or data protection?
- Will this reduce sensitive-data exposure or supply-chain risk?

### Performance and cost

- Will this reduce latency, database round trips, network operations, memory, build time, CI time, or infrastructure cost?
- Does the expected gain justify the implementation and maintenance cost?

### Long-term value

- Does this solve the root cause?
- Does this prevent a class of future defects?
- Will future engineers understand and change the system more safely?

### Implementation quality

The proposed solution must be reviewable, testable, maintainable, observable where relevant, rollback-safe, and backward compatible unless a documented migration requires otherwise.

### Trade-offs

Record:

- expected measurable benefits;
- expected risks;
- estimated implementation effort;
- operational and maintenance cost;
- migration complexity;
- opportunity cost;
- rejected alternatives.

Choose the highest Return on Engineering Investment (ROEI). If the work does not create clear engineering or business value, continue auditing and do not open a pull request.

## 5. Priority model

Prioritize work in this order, while considering dependencies and actual customer impact.

### P0 — Immediate

- production outage or production-breaking defect;
- data exposure, corruption, or loss;
- broken authentication or authorization;
- cross-tenant access or RLS failure;
- exposed secrets or remote code execution;
- broken payment, subscription, or billing authority;
- unsafe release or rollback condition with imminent impact.

### P1 — High

- revenue-blocking customer flow;
- reliability, scalability, or performance bottleneck;
- release, rollback, observability, or incident-readiness weakness;
- material API consistency, cache correctness, webhook, background-job, or provider reliability issue;
- enterprise adoption blocker supported by product evidence.

### P2 — Meaningful

- architectural improvement;
- repeated technical debt or duplicated implementation;
- developer productivity or CI improvement;
- meaningful test or documentation gap;
- maintainability improvement with demonstrated recurring cost.

### P3 — Low

- isolated hardening with low practical impact;
- minor refactor;
- cosmetic improvement.

Do not spend an iteration exclusively on P3 while meaningful P0–P2 work exists. Customer-facing production and revenue blockers take precedence over internal perfection.

## 6. Continuous audit and backlog

Before implementing work:

1. Inspect the repository across product, architecture, frontend, backend, database, Supabase, Stripe, authentication, authorization, RLS, caching, CI/CD, observability, analytics, email, webhooks, performance, release engineering, operations, and AI governance.
2. Inspect open pull requests and recent merged-but-unreleased work.
3. Identify every meaningful P0, P1, and P2 candidate supported by evidence.
4. Record for each candidate: title, category, priority, customer impact, production impact, effort, risk, dependencies, blockers, expected outcome, and overlap.
5. Rank candidates by ROEI.
6. Select one coherent work package.

Do not stop at the first issue found. Do not duplicate an open pull request. When several narrow issues share one cause, group them into one systemic work package.

The backlog may be maintained in issues, a decision record, or the pull request body. It must not contain fabricated runtime facts.

## 7. Architecture

Continuously reduce architectural entropy.

Prefer:

- clear ownership and module boundaries;
- server-side enforcement at trust boundaries;
- shared primitives for authentication, authorization, validation, error handling, rate limiting, caching, logging, and observability when multiple consumers justify them;
- fewer database and network round trips;
- explicit data and failure flows;
- backward-compatible migrations;
- idempotent external side effects.

Avoid:

- global abstractions without proven consumers;
- parallel identity or billing authorities;
- client-side authorization;
- hidden fallbacks that turn infrastructure failure into apparent success;
- large refactors mixed with unrelated product changes.

## 8. Security

Security controls are product behavior, not optional polish.

Never weaken authentication, authorization, tenant isolation, RLS, origin protection, rate limiting, validation, auditability, upload controls, secret handling, security headers, no-store behavior, or security CI to make a change pass.

Hard requirements:

- validate identity and permissions server-side;
- treat client-provided tenant and resource identifiers as untrusted;
- keep service-role and provider credentials server-only;
- sanitize errors and logs;
- protect sensitive responses from caching;
- preserve least privilege;
- avoid storing unnecessary personal data;
- document security trade-offs and fail-open/fail-closed decisions;
- never claim an audit, pentest, certification, compliance status, or production validation without evidence.

## 9. Performance and cost

Continuously inspect:

- duplicate and N+1 queries;
- repeated Supabase or third-party calls;
- missing pagination or indexes;
- incorrect caching and invalidation;
- unnecessary client components, hydration, renders, and bundle weight;
- middleware and server-action cost;
- image and asset optimization;
- webhook and background-job fan-out;
- build and CI duration;
- memory, retry, logging, and provider overhead.

Do not increase bundle size, latency, database round trips, memory, cold-start cost, CI duration, or infrastructure cost without documented justification.

## 10. Enterprise readiness and AI governance

Continuously improve:

- tenant isolation and RBAC;
- auditability and traceability;
- evidence integrity and provenance;
- billing and entitlement correctness;
- deployment, rollback, and disaster-recovery readiness;
- operational documentation and supportability;
- privacy and data lifecycle controls;
- AI-system inventory, risk classification, governance workflows, human review, and evidence preparation.

Product claims must remain narrower than the available evidence. Risck Comply supports compliance operations and readiness; it does not replace legal counsel, certification, regulatory authority, or external assurance.

## 11. Release engineering and operations

Every change must preserve or improve release confidence.

Required considerations:

- deployment prerequisites;
- database and configuration compatibility;
- rollback path;
- health, readiness, and smoke-test impact;
- observability and incident diagnostics;
- partial failure and retry behavior;
- operational ownership;
- customer communication when relevant.

Do not represent repository checks as proof of production behavior. Runtime evidence must come from the target environment and must not expose secrets or customer data.

## 12. Pull request operating model

One pull request should solve one engineering problem completely.

Preferred size is approximately 150–600 changed lines. Up to approximately 1,000 lines is acceptable when the scope remains coherent and reviewable. P0 fixes may be smaller. Do not split work merely to increase pull request count.

Every pull request must include:

- objective and customer or production motivation;
- candidate ranking or explanation of why this work had the highest ROEI;
- overlap review against open pull requests;
- architecture and technical approach;
- impact and measurable outcome;
- risks and trade-offs;
- tests and exact checks run;
- truthful evidence and evidence limitations;
- rollback;
- documentation and decision-record updates;
- follow-ups that are explicitly out of scope.

Open pull requests as drafts. Never merge automatically.

## 13. Quality gates

Never disable or bypass lint, typecheck, tests, E2E, build, security scans, CodeQL, Semgrep, Gitleaks, dependency review, or enterprise/release gates.

Run the smallest relevant checks during implementation and all applicable repository gates before requesting review.

A failed or unavailable check must be reported accurately. Do not mark work complete without green required CI. External provider rate limits or unavailable runtime credentials are blockers or limitations, not successful validation.

## 14. Measurement and no-regression rule

Whenever possible measure before and after:

- API or server latency;
- query and network-operation count;
- bundle or build size;
- memory and CPU usage;
- CI or build duration;
- duplicate code or complexity;
- test coverage;
- incident, retry, or failure visibility.

If measurement cannot be collected truthfully, state:

> Measurement unavailable in the current execution environment.

Never estimate or fabricate metrics.

Every implementation must preserve or improve security, reliability, performance, test coverage, production readiness, and maintainability. If a dimension must become worse, the trade-off requires explicit justification, bounded impact, mitigation, and owner review.

## 15. Stop and escalation conditions

Stop implementation and request owner review when work requires:

- a product or legal decision;
- new identity, payment, analytics, telemetry, or AI provider authority;
- new production secrets or infrastructure;
- destructive or backward-incompatible migration;
- reduced security or privacy protection;
- acceptance of material residual risk;
- unverifiable production claims.

Do not create a pull request merely because code can be changed. If no meaningful production improvement exists, continue auditing or document the blocked decision.

Engineering excellence is measured by long-term product quality, customer value, and production confidence—not by code volume or pull request count.
