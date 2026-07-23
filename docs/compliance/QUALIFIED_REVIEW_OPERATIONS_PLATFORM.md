# Qualified Review Operations Platform

## Objective

Turn the final 51-point qualified human-review boundary into an operational, tenant-scoped workflow without pretending that a review occurred.

The product, CI and technical runtime layers can reach 100%. Enterprise completion remains 49% until eight real independent review families are accepted for the exact release SHA.

## Review families

| Workstream | Weight |
| --- | ---: |
| Legal rules registry | 4 |
| Prohibited practices | 7 |
| Article 50 copy | 8 |
| FRIA methodology | 6 |
| Deployer obligations | 7 |
| High-risk provider methodology | 9 |
| Conformity assessment | 5 |
| GPAI legal review | 5 |

Total qualified-review weight: **51 points**.

## Operational model

The migration creates exact-SHA campaigns, verified reviewers, assignments, integrity-protected submissions, explicit decisions and append-only events. Reads are tenant-scoped with forced RLS; authenticated writes remain revoked behind the backend boundary.

## Acceptance boundary

A package contributes weight only when reviewer identity and qualifications are verified, independence is declared, no conflict exists, the opinion is substantive, scope and evidence are present, the exact release SHA matches, the review remains valid and the conclusion is accepted. Missing, expired, conflicted, weak, synthetic or cross-SHA evidence contributes zero points.

## Assignment lifecycle

`assigned → in_review → submitted → accepted`

Changes requested, rejection, expiry and revocation remain explicit fail-closed paths. Direct `assigned → accepted` transitions are forbidden.

## Security

- organization-bound records;
- forced RLS on every table;
- authenticated writes revoked;
- backend write boundary;
- exact-SHA validation;
- bounded text and JSON fields;
- integrity digests;
- append-only events;
- no customer secrets or credentials in retained CI reports.

## CI report

A green platform workflow means the platform contracts are valid. It does not mean reviewers approved anything.

## Truth boundary

This platform organises and validates independent review evidence. It is not legal advice, certification, conformity assessment by a notified body, regulator approval or a guarantee of EU AI Act compliance.
