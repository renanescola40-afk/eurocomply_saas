# Regulatory Control Tower Acceptance Checklist

Promote this integration only when the applicable items are evidenced against the exact integrated SHA.

## Domain aggregation

- [x] Seven regulatory workstreams are versioned in one deterministic registry.
- [x] Workstream weights are explicit and sum to 44.
- [x] Activation and readiness are separate metrics.
- [x] Blocked state takes precedence over aggregate readiness.
- [x] Draft and review states remain in progress.
- [x] Retired and archived records do not count as ready.
- [x] Reviewed non-applicability can count as operationally resolved.
- [x] Missing workflows generate explicit required actions.
- [x] Evidence boundary excludes certification and legal conclusions.

## Tenant and API security

- [x] API requires authentication.
- [x] API requires an active organization.
- [x] API requires `read_ai_governance`.
- [x] API has distributed fail-closed rate limiting.
- [x] API responses are no-store.
- [x] API errors are sanitized.
- [x] Route is classified in the API route inventory.
- [x] Endpoint exposes no mutations.
- [x] Every workflow query filters by `organization_id`.
- [x] Query failure rejects the full snapshot.
- [ ] Live same-organization access succeeds.
- [ ] Live foreign-organization access is denied.
- [ ] Rate-limit provider outage returns a safe 503.
- [ ] Database outage returns a safe error without partial data.

## Integrated sources

- [x] AI Literacy programs are read from `ai_literacy_programs`.
- [x] FRIA assessments are read from `ai_fria_assessments`.
- [x] Prohibited-practice reviews are read from `ai_prohibited_practice_reviews`.
- [x] Provider data programmes are read from `ai_provider_data_programs`.
- [x] Annex IV packages are read from `ai_annex_iv_packages`.
- [x] QMS systems are read from `ai_qms_systems`.
- [x] Conformity assessments are read from `ai_conformity_assessments`.
- [ ] Production schemas for all seven sources are migrated and validated.
- [ ] Current-version selection is verified for each domain.

## Customer interface

- [x] Localized dashboard route exists.
- [x] Dashboard navigation includes Regulatory Control Tower.
- [x] Interface uses no-store authenticated API reads.
- [x] Activation and readiness percentages are visually separate.
- [x] Workstream status and source lifecycle state are both visible.
- [x] Blocked workflows are visually distinct.
- [x] Required actions are shown without legal overclaims.
- [x] AI Literacy links to its existing customer workflow.
- [ ] Keyboard and screen-reader review passes.
- [ ] Mobile, tablet and desktop visual review passes.
- [ ] Translation review passes for all supported locales.
- [ ] Remaining workstream editors are linked after their APIs are approved.

## Engineering

- [x] Positive and negative unit tests cover aggregation.
- [x] Source contracts cover auth, RBAC, no-store and rate limiting.
- [x] Source contracts cover all seven tenant filters.
- [x] UI and navigation contracts are present.
- [ ] Exact-head unit and contract tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Production build passes.
- [ ] CodeQL, Semgrep, dependency review and secret scanning pass.
- [ ] Human review and merge complete.

## Promotion boundary

- [ ] Exact-SHA runtime evidence is retained.
- [ ] Product coverage scorecard credits only verified integration evidence.
- [ ] Enterprise scorecard remains separate from customer workflow readiness.
- [ ] No 100% or GO claim is emitted from control-tower percentages.

Passing this checklist demonstrates an integrated operational visibility layer. It does not prove legal compliance, evidence truth, certification, conformity assessment, CE authorization or regulator acceptance.
