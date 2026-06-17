# P0 Final Runtime Evidence Checklist

This checklist is the release-owner handoff for moving P0 runtime evidence from 2/5 to 5/5.

Repository readiness is already separate from runtime evidence. Do not mark runtime items complete until the real provider-side or reviewer-side evidence exists.

## Current runtime evidence status

| Runtime item | Status | Prepared by repo tooling | Completion source |
| --- | --- | --- | --- |
| Branch protection applied on `main` | Complete | Yes | Merged PR evidence |
| Required status checks configured | Complete | Yes | Merged PR evidence |
| Production provider configuration evidence | Open | Yes | Redacted provider review evidence |
| Supabase live RLS validation | Open | Yes | Redacted live RLS test output |
| External review, pentest, or private-beta exception | Open | Yes | Redacted report, tracker, approval, or exception |

## Close item 3: production provider configuration evidence

1. Review production settings in GitHub, Vercel, Supabase, and every production provider in use.
2. Store redacted screenshots or exports in the approved private evidence location.
3. Copy `docs/security/evidence/templates/production-secrets-provider-stores.template.json` to `docs/security/evidence/runtime/production-secrets-provider-stores.json`.
4. Replace every placeholder with durable redacted references.
5. Run `node scripts/security/check-p0-production-secrets-evidence.mjs`.
6. Open a PR and wait for `P0 Runtime Evidence` to pass.

## Close item 4: Supabase live RLS validation

1. Run live or production-like tenant-isolation tests against Supabase.
2. Confirm cross-tenant read and write attempts are denied.
3. Confirm same-tenant expected access works.
4. Confirm service-role access is reviewed separately and not exposed to client code.
5. Store redacted test output in the approved private evidence location.
6. Copy `docs/security/evidence/templates/supabase-live-rls-validation.template.json` to `docs/security/evidence/runtime/supabase-live-rls-validation.json`.
7. Replace every placeholder with durable redacted references.
8. Run `node scripts/security/check-p0-supabase-rls-evidence.mjs`.
9. Open a PR and wait for `P0 Runtime Evidence` to pass.

## Close item 5: external review, pentest, or private-beta exception

1. Complete an external review or pentest, or document a formal private-beta exception.
2. Confirm release-blocking observations are zero, accepted by a risk owner, or covered by an approved exception.
3. Store redacted report/tracker/approval evidence in the approved private evidence location.
4. Copy `docs/security/evidence/templates/external-security-review-or-pentest.template.json` to `docs/security/evidence/runtime/external-security-review-or-pentest.json`.
5. Replace every placeholder with durable redacted references.
6. Run `node scripts/security/check-p0-external-review-evidence.mjs`.
7. Open a PR and wait for `P0 Runtime Evidence` to pass.

## Final 100% rule

P0 reaches 100% only when all three runtime JSON files exist under `docs/security/evidence/runtime/`, contain no placeholders, pass their checkers, and the P0 runtime evidence register is updated to `Complete` or approved `Exception` for every runtime item.

Until then, the app is not fully P0 runtime-ready for public production or enterprise procurement.
