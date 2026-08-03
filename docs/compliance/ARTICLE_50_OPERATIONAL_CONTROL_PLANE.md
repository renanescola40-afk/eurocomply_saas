# Article 50 Operational Control Plane

## Purpose

This control plane converts the effective-date resolver into a tenant-scoped customer workflow. It does not present a proposal, voluntary code of practice or political agreement as binding law, and it does not convert a completed form into legal certification.

## Product architecture

The operational path is:

1. authenticated customer opens `/{locale}/dashboard/transparencia`;
2. the client reads only through `GET /api/ai-governance/article-50`;
3. the server derives the user and current organization;
4. RBAC checks `read_ai_governance` or `manage_ai_governance`;
5. mutations require trusted origin, bounded JSON, Zod validation and distributed rate limiting;
6. the server verifies that the selected AI system belongs to the derived organization;
7. the legal-date resolver and Article 50 control plane evaluate the submitted facts;
8. PostgreSQL creates a new immutable assessment version under an advisory lock;
9. a product audit event must be persisted or the assessment is compensated;
10. evidence remains `submitted` until an actual reviewer accepts or rejects it.

The previous browser-local checklist and direct client-side writes were removed from the primary route. `localStorage` is not accepted as compliance evidence, and browser payloads cannot select an organization.

## Consolidated capabilities

1. binding base-date resolution;
2. limited pre-existing-system transition handling;
3. provider/deployer duty separation;
4. retained Official Journal evidence requirement;
5. machine-readable marking gate;
6. human-readable disclosure and proof-of-display gate;
7. unknown placement-date escalation;
8. portfolio aggregation;
9. immutable assessment versions and evidence history;
10. CI regression enforcement across API, UI, migration, RLS and scorecard contracts.

## Status semantics

- `READY`: the workflow contains the required technical declarations and references, and no warning remains.
- `NEEDS_REVIEW`: no technical blocker is detected, but a material fact remains uncertain.
- `BLOCKED`: a mandatory control or retained source/evidence reference is missing.

A `READY` result is not a legal opinion, certification, regulator approval, evidence acceptance or guarantee of compliance.

## Legal source baseline

The customer workspace uses legal source version `commission-guidelines-2026-07-20`.

The Commission's final Article 50 guidelines state that the transparency obligations apply from **2 August 2026**. The base Regulation remains Regulation (EU) 2024/1689. A transition ending on **2 December 2026** is restricted to qualifying systems placed on the market before 2 August 2026 and the relevant Article 50(2) marking/detection obligation. The transition must not be inherited by Article 50(4) deployer disclosure duties.

The product requires an Official Journal evidence identifier before a user can claim that a final amending act has been verified. A FAQ, code of practice, press release or political agreement alone is not sufficient.

## Persistence model

### `ai_article50_assessments`

- organization and AI-system scope;
- monotonically increasing version per system;
- placement date;
- provider marking and deployer disclosure declarations;
- exact disclosure copy, language and channel;
- display and marking evidence references;
- legal source version;
- deterministic evaluation, blockers and warnings;
- actor and timestamp.

Assessment versions are append-only in the product flow. New facts create a new version rather than changing history.

### `ai_article50_evidence`

Evidence metadata includes type, storage reference, digest, source URL, environment, limitations, validity and review state. Submission does not equal acceptance.

### `ai_article50_events`

Lifecycle events record assessment creation, evidence submission, review requests and legal-source changes. The application also writes to the platform audit trail.

All three tables have RLS enabled and forced. Authenticated members may read only their organizations. Browser insert/update/delete permissions are revoked; writes are performed by the protected server route.

## Evidence requirements

Every production decision should retain:

- organization, system and assessment version;
- placement-on-market or put-into-service date evidence;
- applicable role and obligation;
- exact legal source version and source URL;
- Official Journal evidence identifier when a transition is claimed;
- exact disclosure copy, language, channel and proof of display;
- machine-readable marking validation where applicable;
- accessibility and translation review where applicable;
- deployment SHA and environment;
- limitations, validity and reviewer status.

A document template, local file, generated copy or unchecked URL is not production evidence.

## Runtime promotion

Repository tests and CI prove deterministic implementation and security contracts only. Staging or production evidence must be generated against the exact deployed SHA and retained separately. It may not be substituted by this document, a migration file, a screenshot template or a local test result.

## Rollback

If the migration or API deployment fails:

1. stop Article 50 writes;
2. keep the dashboard read-only or return a sanitized service-unavailable response;
3. roll back application code to the last known good deployment;
4. do not delete accepted customer evidence;
5. reconcile migration state before retrying;
6. create an audit event describing the interruption and recovery.

## Human review

The Article 50 qualified review remains `HUMAN_REVIEW_REQUIRED`. A real qualified and independent reviewer must assess legal accuracy, scope, exceptions, language equivalence, accessibility and the use of the 2026 guidelines/code. Identity, qualification, independence, signature and acceptance must not be synthesized.
