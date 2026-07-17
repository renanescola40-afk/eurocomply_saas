# EU AI Act Product Coverage Scorecard

Last verified: 2026-07-17

This score measures product workflow and evidence coverage. It is not a legal-compliance guarantee for customers.

## Current score

- Previous assessment: 47%
- Current branch assessment: 50%
- Change: +3 percentage points
- Remaining: 50 percentage points

The current branch routes role inference, risk classification, application dates and legal-rule provenance through one versioned decision engine. Existing compatibility entrypoints no longer maintain independent decision logic.

## Weighted coverage

| Workstream | Weight | Earned | Status |
|---|---:|---:|---|
| Versioned legal rules registry | 4 | 3 | IN_PROGRESS |
| Scope, role and classification engine | 10 | 8 | IN_PROGRESS |
| Prohibited practices | 7 | 2.5 | IN_PROGRESS |
| AI literacy | 6 | 0.5 | NOT_STARTED |
| Article 50 transparency | 8 | 6 | IN_PROGRESS |
| Readiness and evidence scoring | 8 | 6 | IN_PROGRESS |
| FRIA and fundamental rights | 6 | 1.5 | IN_PROGRESS |
| Deployer obligations | 7 | 3.5 | IN_PROGRESS |
| High-risk provider controls | 9 | 3.5 | IN_PROGRESS |
| Annex IV technical documentation | 6 | 2 | IN_PROGRESS |
| Quality management system | 5 | 1 | NOT_STARTED |
| Conformity, declaration, CE and EU registration | 5 | 1 | NOT_STARTED |
| Post-market monitoring and incidents | 6 | 4 | IN_PROGRESS |
| GPAI compliance | 5 | 1 | NOT_STARTED |
| Customer AI vendor assurance | 4 | 2.5 | IN_PROGRESS |
| Approvals, reports and platform controls | 4 | 4 | VERIFIED |
| **Total** | **100** | **50** | **IN_PROGRESS** |

## Evidence added in this branch

1. One canonical engine owns role, scope, risk and legal-rule applicability decisions.
2. Every result carries engine version, ruleset version, assessment date, registry freshness and matched rule identifiers.
3. Active, future and adopted-pending-effect rules are separated instead of being presented as equally applicable.
4. Ambiguous roles and stale registry review dates fail closed into legal review.
5. Legacy classifier and role-wizard entrypoints are compatibility adapters with regression contracts against duplicated logic.
6. AI inventory payloads receive one shared decision and expose qualified, non-certification evidence metadata.

## Next P0 work

1. Persist legal-rule versions and decision provenance with organisation-scoped history.
2. Implement complete prohibited-practice decision workflows and exception evidence.
3. Build AI literacy assignments, training records and evidence.
4. Replace Article 50 local-only state with organisation-scoped persistence.
5. Replace existence-based readiness with evidence-backed obligation scoring.
6. Add complete GPAI, Annex IV, QMS, conformity and registration workflows.

Only verified implementation, tests and evidence count toward 100%.
