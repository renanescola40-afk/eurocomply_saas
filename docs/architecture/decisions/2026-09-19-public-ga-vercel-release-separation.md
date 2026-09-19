# ADR — Separate Public Commercial GA deployment from Enterprise assurance

**Date:** 2026-09-19  
**Status:** Accepted for implementation  
**Scope:** GitHub Actions / Vercel production release architecture

## Context

The workflow `.github/workflows/vercel-production.yml` accumulated responsibilities beyond Vercel deployment. It currently hydrates exact-SHA audit-chain and Supabase RLS evidence, runs broad Enterprise release gates, validates rollback and incident-response controls, and only later reaches Vercel authentication, pull, build and deploy.

Historical inspection of Vercel Production Deploy runs showed that most red runs were upstream assurance failures rather than provider failures. This made the status name operationally misleading and created a repeated invalidation loop: a new main SHA invalidated exact-SHA Enterprise runtime evidence even when the change was unrelated to those controls.

Actual provider-specific failures observed separately included Vercel token scope/authentication and CLI project-link resolution. The current production deployment code explicitly binds `.vercel/project.json` and passes project, scope and token to the Vercel CLI.

## Decision

Keep the existing strict Enterprise deployment/assurance workflow intact.

Add a separate canonical Public Commercial GA deployment lane:

`.github/workflows/public-commercial-production.yml`

The Public GA lane remains fail-closed for:

- exact current-main SHA authorization;
- deterministic dependency installation;
- lint, typecheck, tests and application build;
- critical public security controls for authentication, authorization/BOLA, protected routes, origin guards, webhook body handling, public secret leakage, error sanitization, headers, no-store and storage;
- public production environment readiness, including Stripe Essential/Professional configuration and rollback metadata;
- Vercel token, team and project binding;
- Vercel pull, production build and prebuilt production deploy;
- production smoke validation;
- exact deployed runtime SHA verification.

The Public GA lane does not hydrate or depend on Enterprise-only exact-SHA audit-chain evidence, Enterprise Supabase RLS evidence aggregation, Recovery Resilience Proof, procurement assurance or Enterprise 100 scorecards before reaching Vercel.

This separation does not remove, relax or mark any Enterprise control as passed. The Enterprise lane remains the authority for Enterprise assurance.

## Security boundary

Public GA must still fail closed on any defect that directly affects paying public customers, including authentication, tenant authorization, billing configuration, build failures, Vercel binding failures, production health failures and runtime SHA mismatch.

No `continue-on-error`, `|| true`, synthetic PASS artifact or branch-protection bypass is introduced.

## Operational effect

The status of the Public Commercial GA deployment now represents whether the public production artifact can safely build, deploy and serve the exact authorized SHA.

Enterprise evidence freshness is reported by the Enterprise assurance lane rather than being mislabeled as a Vercel provider failure.

## Rollback

If this separation causes unsafe release behavior:

1. stop dispatching `Public Commercial GA Production`;
2. keep the existing strict Enterprise workflow as the only production authority;
3. revert this ADR, workflow and regression test;
4. investigate the failed public gate before any further production promotion.
