# Risck Comply Product Dossier

## Document control

- Status: `AI_PRE_REVIEW_COMPLETE`
- Legal review status: `HUMAN_REVIEW_REQUIRED`
- Product: Risck Comply
- Legacy repository: `renanescola40-afk/eurocomply_saas`
- Source baseline: `fbc61f3a5f069c23f9bc307789d12a53b5f87d34`
- Prepared: 30 July 2026

## Product description

Risck Comply is a multi-tenant B2B SaaS platform for European organisations that need to organise AI governance, EU AI Act readiness work, evidence, responsibilities and internal decisions. It is an operational support platform, not a law firm, notified body, regulator, certification authority or automatic compliance guarantee.

## Intended users

Primary users include founders, CTOs, compliance teams, security teams, legal operations teams, AI governance owners, procurement teams and organisations that develop, procure, integrate, deploy or monitor AI-enabled systems.

## Supported operational areas

The repository contains or references workflows for:

- organisation onboarding, membership and role-based access;
- AI-system inventory and lifecycle records;
- role and risk classification support;
- prohibited-practice screening and escalation;
- AI literacy programmes and evidence;
- Article 50 transparency workflows;
- evidence-backed readiness scoring;
- FRIA preparation and decision records;
- deployer-obligation workspaces;
- high-risk-provider controls;
- Annex IV technical-documentation preparation;
- quality-management-system records;
- conformity-path preparation without auto-approval;
- post-market monitoring and incident operations;
- GPAI role and obligation support;
- vendor assurance;
- documents, tasks, approvals, reports and audit logs;
- qualified-review preparation and evidence packages;
- billing, subscriptions and enterprise licensing.

## Core technical architecture

- Next.js App Router and TypeScript.
- React user interface with Tailwind/Radix-based components.
- Supabase Auth as the active identity stack.
- Supabase/Postgres with tenant-scoped data and RLS.
- Server-side membership and RBAC checks.
- Stripe for billing and subscription operations.
- Zod validation.
- Vitest and Playwright testing.
- Optional Sentry and PostHog configuration when enabled.
- Security, release, runtime-evidence and readiness scripts.

## Product behaviour

The platform can collect facts, apply versioned deterministic rules, calculate operational indicators, identify missing evidence, generate or organise documents, create tasks, maintain decision records and prepare material for internal or independent review.

The platform must not be represented as making the final legal decision for a customer. Outputs depend on supplied facts, configuration, legal role, intended purpose, deployment context, applicable national law and the quality of evidence.

## Legal boundaries

Risck Comply does not:

- provide a universal legal opinion;
- guarantee EU AI Act or GDPR compliance;
- replace independent legal counsel;
- classify every customer system conclusively;
- authorise CE marking;
- replace a notified body or conformity-assessment procedure;
- certify operational adoption or effectiveness;
- represent customers before authorities;
- determine customer-specific compliance without customer facts and review.

## Product identity and claims

The customer-facing product name is **Risck Comply**. `eurocomply_saas` is a legacy repository name. Safe positioning includes AI Act readiness support, governance workflows, evidence preparation, risk visibility and compliance operations support. Claims such as fully compliant, guaranteed compliance, regulator approved, EU certified, automatic compliance or replaces lawyers are prohibited unless a future formal basis specifically supports them.

## Geographic and language scope

The product is designed for European B2B use. Localised routes and content exist or are supported. Country-specific legal conclusions require separate applicability analysis. The platform must not imply that one EU-level workflow automatically resolves every national, sectoral, employment, consumer, privacy or professional-rule overlay.

## Known limitations

- Eight qualified legal-review evidence files are absent and remain `HUMAN_REVIEW_REQUIRED`.
- Customer-specific facts are not part of the repository baseline.
- Founder legal-entity and commercial facts remain incomplete.
- Runtime evidence must be bound to the exact assessed deployment SHA.
- Some modules organise evidence without proving operational execution.
- Supported provider configurations do not prove that every provider is active.
- Formal conformity status is not assessed.

## Review questions

1. Is this product characterisation accurate and sufficiently narrow?
2. Does any module itself constitute an AI system under the current definition?
3. For each AI-enabled module, what role does Risck Comply hold?
4. Could integration, rebranding, fine-tuning or intended-purpose changes make Risck Comply a provider or downstream provider?
5. Which disclaimers must appear in the app, reports, sales material and contracts?
6. Which functions require hard limits, escalation or customer-specific professional review?
