# Release Evidence Checklist

This checklist defines the evidence package that must be attached before a Risck comply release is represented as production-ready or enterprise-ready. It is intentionally evidence-bound and must not be used to imply certification, external assurance, tested recovery, or monitoring maturity that has not been proven.

## Current release assessment

- Release owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Target environment: production / enterprise candidate
- Final decision: **No-Go** until all blocker evidence is attached.

## Command validation evidence

| Command | Status | Evidence required | Required before Go |
| --- | --- | --- | --- |
| `npm ci` | Missing evidence | Preserved install log | Yes |
| `npm run lint` | Missing evidence | Preserved lint log | Yes |
| `npm run typecheck` | Missing evidence | Preserved typecheck log | Yes |
| `npm run test` | Missing evidence | Preserved unit-test log | Yes |
| `npm run build` | Missing evidence | Successful build log and deployment URL | Yes |
| `npm run security:ci` | Missing evidence | Preserved security gate log | Yes |
| `npm run security:trust-package` | Required | Trust Center package gate output | Yes |
| `npm run release:readiness` | Missing evidence | Preserved readiness log | Yes |

## Trust Center readiness

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Public Trust Center route | Complete as repository evidence | `src/app/[locale]/trust/page.tsx`; `/trust` redirects to localized route through middleware | Required for enterprise buyer evaluation |
| Public security route | Complete as repository evidence | `src/app/[locale]/security/page.tsx`; `/security` redirects to localized route through middleware | Required for enterprise buyer evaluation |
| Footer Trust Center link | Complete as repository evidence | `src/components/marketing/public-footer.tsx` | Required for discoverability |
| Landing page Trust Center link | Complete as repository evidence | `src/components/marketing/enterprise-home.tsx` | Required for buyer flow |
| Pricing page Trust Center link | Complete as repository evidence | `src/app/[locale]/pricing/page.tsx` | Required for pricing/procurement flow |
| Required trust docs | Complete as repository evidence | `docs/trust/*`; enforced by `scripts/security/check-trust-package.mjs` | Required for buyer review |
| Procurement checklist | Complete as repository evidence | `docs/trust/PROCUREMENT_CHECKLIST.md` | Required for enterprise questionnaire workflow |
| Non-claim guardrail | Complete as repository evidence | Trust docs disclose no SOC 2 report and no ISO 27001 certification claim | Prevents unsupported assurance language |

## Evidence still blocking Go

| Area | Current gap | Release impact |
| --- | --- | --- |
| CI/build | Preserved command logs and successful deployment URL are not attached | Blocks Go |
| RLS live validation | Target-environment tenant-isolation evidence is not attached | Blocks enterprise Go |
| External review | Independent review evidence is not attached | Blocks stronger assurance claims |
| Continuity | Target-environment continuity and restore evidence is not attached | Blocks contractual recovery commitments |
| Owners | Incident, rollback and support owner sign-off must be confirmed | Blocks Go |

## Release decision

**Final decision: No-Go.**

Rationale: Trust Center materials are now part of the release evidence package, but public production and enterprise readiness still require preserved CI/build evidence, target-environment RLS evidence, external review evidence where claimed, continuity evidence, and owner sign-off.
