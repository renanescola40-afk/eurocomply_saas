# Release Approval Record

This document is the release owner record used to approve or reject a RISCK COMPLY release candidate. It records observed evidence only. It must not infer approval from incomplete runtime proof.

## Release identity

- Release name: RISCK COMPLY Enterprise Production Final Gate
- Date: 2026-07-10
- Repository: `renanescola40-afk/eurocomply_saas`
- Evidence update branch: `fix-final-gate-runtime-followup`
- Target environment: Production / enterprise candidate
- Release owner: @renansilva2002 / renanescola40-afk
- Incident owner: @renansilva2002 / renanescola40-afk
- Rollback owner: @renansilva2002 / renanescola40-afk
- Customer communication owner: @renansilva2002 / renanescola40-afk
- Support owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Escalation path: Support owner -> Incident owner -> Rollback owner -> Security owner -> Release owner / Approver
- Approver: **Not granted**; blocked by open P0 runtime evidence and missing final validation runner proof.
- Final decision: **No-Go**

## Candidate deployment

- Deployment URL: `https://www.risckcomply.com`
- Assessed commit SHA: current PR merge commit / promoted deployment candidate.
- Build SHA: current PR merge commit / promoted deployment candidate.
- Deployment URL functional verification: **Open**
- The runtime URL was not functionally verified for final Enterprise Production Go in this approval record.
- Functional verification and dry-run evidence not attached means the release remains blocked.

## Runtime evidence status

| Evidence item | Status | Notes |
| --- | --- | --- |
| Deployment URL functional verification | **Open** | Production URL still needs a passing final smoke/readiness run for the assessed commit. |
| Supabase RLS live validation | **Open** | Supabase RLS live validation is Open/not_run for this approval decision. |
| External review/pentest | **Open** | External review/pentest is Open/not_started and cannot be replaced by code-only changes. |
| Final validation runner proof | **Open** | The runner contract exists, but production-secret runtime evidence is not attached here. |
| Branch protection evidence | **Exception** | Must remain visible as exception until complete branch protection proof is attached. |

Approval is intentionally withheld while P0 blockers remain open. This record is safe for repo-side CI because it documents the blockers instead of marking incomplete runtime evidence as passed.

## Rollback target

- Previous known-good deployment URL candidate: `https://www.risckcomply.com`
- Rollback target is candidate-only until a previous deployment is functionally verified and attached as runtime evidence.
- Candidate rollback runtime URL was not functionally verified in this approval record.
- Rollback trigger criteria:
  - `/api/health` fails or returns unexpected status for the promoted deployment.
  - `/api/ready` fails critical dependency checks.
  - Deployment smoke, observability smoke or rollback dry-run fails for the assessed commit.
  - Auth, billing, audit logging, tenant isolation or security headers regress in production.
  - Suspected data exposure, secret exposure or material security incident.

## exceptions

No Enterprise Production exception is approved. Controlled beta exceptions require owner, expiry, mitigation, claim restrictions and evidence that stays Open or Exception rather than being falsely marked passed.

## Approval decision

- [ ] Private Beta Go
- [ ] Public Production Go
- [ ] Enterprise Pilot Go
- [ ] Enterprise Procurement Go
- [ ] Conditional Go
- [x] **No-Go**

## Decision

**No-Go.**

The release gate has been hardened, but approval is withheld because the final enterprise production runner has not produced complete runtime evidence for the current promoted target and commit. Enterprise claims, enterprise procurement readiness, paid production launch and customer-facing Go messaging remain blocked.

## Final sign-off

- Release owner: @renansilva2002 / renanescola40-afk
- Incident owner: @renansilva2002 / renanescola40-afk
- Rollback owner: @renansilva2002 / renanescola40-afk
- Customer communication owner: @renansilva2002 / renanescola40-afk
- Support owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Approver: Not granted
- Date: 2026-07-10
- Final notes: Release remains blocked. Do not present this package to customers, procurement or enterprise buyers as approved production/enterprise evidence until the final runner produces complete passing evidence.
