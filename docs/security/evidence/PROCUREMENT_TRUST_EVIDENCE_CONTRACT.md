# Procurement & Trust Evidence Contract

## Schema
`risck-comply.procurement-trust-evidence.v1`

## Required outcome
- `status: Complete`
- `outcome: passed`
- exact 40-character `targetSha`
- empty `failures`
- all required checks equal `true`

## Required checks
- protected main execution;
- exact SHA binding;
- explicit confirmation;
- procurement tables present;
- RLS enabled;
- complete CRUD policies present;
- trust package integrity enforced;
- procurement SLA configured;
- encrypted evidence packages required;
- subprocessor register reviewed;
- public Trust Center configured.

## Prohibited evidence content
The artifact must not contain:
- database URLs;
- customer data;
- vendor names;
- questionnaire answers;
- DPA or SLA document contents;
- evidence-package payloads;
- tokens or authorization material.

## Promotion boundary
Merge or migration presence alone is not sufficient. Promotion requires a protected workflow run on the exact merged `main` SHA and successful execution of the independent evidence checker.

A passing artifact does not represent legal approval, certification, completed customer procurement, penetration-test completion or contractual SLA compliance.
