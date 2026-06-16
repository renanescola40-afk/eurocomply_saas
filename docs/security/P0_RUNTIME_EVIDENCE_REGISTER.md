# P0 Runtime Evidence Register

This register separates repository readiness from real production/security execution evidence.

Repository gates can prove that controls are documented and wired into CI. Runtime evidence proves that the controls were actually applied in GitHub, Vercel, Supabase, and the production-like environment.

## Evidence status

| Evidence item | Status | Required evidence | Owner |
| --- | --- | --- | --- |
| Branch protection applied on `main` | Open | Screenshot or exported settings showing pull request requirement, CODEOWNERS review, required checks, force-push block, deletion block, and conversation resolution | Release owner |
| Required status checks configured | Open | Screenshot or exported settings showing Full Security Suite, Semgrep, Gitleaks, Actionlint, OSSF Scorecard, CodeQL, Dependency Review, and P0 Runtime Evidence as required checks | Release owner |
| Production secrets configured in provider secret stores | Open | Redacted screenshot or provider export showing variables configured without revealing values | Release owner |
| Supabase live RLS validation completed | Open | Test output proving cross-tenant read/write denial and service-role path review | Security reviewer |
| External security review or pentest completed | Open | Pentest report, finding triage, critical/high resolution evidence, and retest evidence where applicable | Security reviewer |
| Deterministic npm lockfile committed | Complete | `package-lock.json` committed with npm lockfile version 3 after P0 Commit Lockfile workflow | Engineering owner |
| Floating dependency specs removed | Complete | `node scripts/security/list-floating-dependencies.mjs` output showing no forbidden specs | Engineering owner |

## Evidence storage rule

Do not commit screenshots containing secret values. Redact all secret values before storing evidence.

Private evidence can be stored outside the repository, but the release approval must reference where it is stored and who reviewed it.

## Go/No-Go rule

Public production or enterprise procurement is blocked while any P0 runtime evidence item remains open, unless the release is explicitly private beta and the release owner documents the exception.
