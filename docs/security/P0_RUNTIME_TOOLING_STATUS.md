# P0 Runtime Tooling Status

This document tracks preparation work separately from real runtime evidence.

## Real P0 runtime evidence

| Item | Current state | Counts toward runtime percentage |
| --- | --- | --- |
| Branch protection applied on `main` | Complete | Yes |
| Required status checks configured | Complete | Yes |
| Provider configuration evidence | Open | No |
| Supabase live RLS validation | Open | No |
| Independent review or approved exception | Open | No |

## Prepared tooling for open runtime items

| Open runtime item | Runbook | Template | Checker | Worksheet |
| --- | --- | --- | --- | --- |
| Provider configuration evidence | `docs/security/P0_PRODUCTION_SECRETS_EVIDENCE_RUNBOOK.md` | `docs/security/evidence/templates/production-secrets-provider-stores.template.json` | `scripts/security/check-p0-production-secrets-evidence.mjs` | `docs/security/P0_RUNTIME_EVIDENCE_WORKSHEET.md` |
| Supabase live RLS validation | `docs/security/P0_SUPABASE_RLS_EVIDENCE_RUNBOOK.md` | `docs/security/evidence/templates/supabase-live-rls-validation.template.json` | `scripts/security/check-p0-supabase-rls-evidence.mjs` | `docs/security/P0_RUNTIME_EVIDENCE_WORKSHEET.md` |
| Independent review or approved exception | `docs/security/P0_EXTERNAL_REVIEW_EVIDENCE_RUNBOOK.md` | `docs/security/evidence/templates/external-security-review-or-pentest.template.json` | `scripts/security/check-p0-external-review-evidence.mjs` | `docs/security/P0_RUNTIME_EVIDENCE_WORKSHEET.md` |

## Current percentage

Repository readiness remains 7/7.

Runtime evidence remains 2/5 until the three open runtime items have real reviewed evidence files under `docs/security/evidence/runtime/` and the register is updated.

Combined P0 remains 9/12 until then.

## Next release-owner action

Open a pull request from `p0-production-secrets-evidence` into `main`, then use the worksheet to collect real evidence for the three open runtime items.
