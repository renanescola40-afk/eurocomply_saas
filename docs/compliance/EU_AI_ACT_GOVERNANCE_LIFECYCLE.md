# EU AI Act Governance Lifecycle

This package turns AI-system classification into a controlled lifecycle rather than a one-time questionnaire.

## Lifecycle

`draft -> assessment_pending -> evidence_pending -> approval_pending -> approved`

Exceptional terminal or blocking states:

- `blocked`: prohibited-practice or other blocking decision;
- `retired`: system removed from approved production use.

Production use is allowed only for an `approved` case with a recorded approval decision and timestamp. A blocked or retired case can never retain production approval.

## Controls

- GOV-01 intended purpose;
- GOV-02 data governance;
- GOV-03 technical documentation and Annex IV;
- GOV-04 automatic logging;
- GOV-05 human oversight;
- GOV-06 accuracy, robustness and cybersecurity;
- GOV-07 fundamental-rights impact assessment;
- GOV-08 conformity assessment;
- GOV-09 post-market monitoring;
- GOV-10 serious-incident process;
- GOV-11 accountable owner;
- GOV-12 independent approver.

High-risk-only controls become mandatory when the system risk tier is `high`. Intended purpose, accountable ownership and approval remain mandatory for every governed system.

## Separation of duties

The accountable owner and approver must be different organization members. Actor references are checked at the database boundary, including service-role writes.

## Evidence lifecycle

Evidence is versioned and can be `draft`, `submitted`, `accepted`, `rejected` or `superseded`. Accepted or rejected evidence requires a reviewer and review timestamp. Evidence stores a controlled storage reference or external reference, not arbitrary document contents in the governance decision history.

## Decision history

Material lifecycle, approval and production-use changes create immutable decision rows. Snapshots contain risk tier, assessment version, missing control identifiers and production permission, not raw evidence bodies or prohibited-practice answers.

## Annex IV

The completeness model covers twelve sections. A section is complete only when it has a summary, at least one evidence reference, an accountable owner and a review timestamp.

## Evidence boundary

The implementation demonstrates repository-level lifecycle logic, schema constraints, RLS boundaries and contract tests. It does not prove that production migrations were applied, that submitted evidence is legally sufficient, that a conformity assessment was completed by an authorized body, or that a system complies with the EU AI Act.