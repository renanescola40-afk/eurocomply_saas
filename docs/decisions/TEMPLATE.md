# Decision: <short title>

- **Status:** Proposed | Accepted | Superseded | Rejected
- **Date:** YYYY-MM-DD
- **Owners:** <role or team>
- **Related issue/PR:** <links>
- **Priority:** P0 | P1 | P2 | P3

## Context

Describe the product, customer, architecture, security, reliability, performance, or operational problem. Separate repository evidence from assumptions and runtime evidence.

## Evidence

List the source files, tests, logs, metrics, incidents, issues, or production evidence used to make the decision. Do not include secrets, customer data, or unsupported claims.

## Candidate options

### Option A — <name>

- Benefits:
- Risks:
- Implementation effort:
- Operational cost:
- Maintenance cost:
- Migration complexity:
- Reversibility:

### Option B — <name>

- Benefits:
- Risks:
- Implementation effort:
- Operational cost:
- Maintenance cost:
- Migration complexity:
- Reversibility:

## Decision framework

Summarize how the candidates compare across:

- customer and business value;
- production readiness;
- security and privacy;
- reliability and observability;
- performance and infrastructure cost;
- architecture and maintainability;
- implementation risk;
- opportunity cost;
- Return on Engineering Investment (ROEI).

## Decision

State the selected option and why it is preferred. Explain why the other options were rejected or deferred.

## Scope

### Included

- <item>

### Excluded

- <item>

## Consequences

### Positive

- <outcome>

### Negative or trade-offs

- <trade-off>

### Residual risks

- <risk and mitigation>

## Compatibility and migration

Describe API, database, configuration, provider, customer workflow, and historical-data implications. State whether the change is backward compatible.

## Validation and measurement

- Tests and checks:
- Metrics before:
- Metrics after:
- Measurement method:

When measurement cannot be collected truthfully, state:

> Measurement unavailable in the current execution environment.

## Operational impact

Describe deployment, health/readiness/smoke, observability, incident response, support, retry, idempotency, and ownership implications.

## Rollback

Describe the exact rollback trigger and procedure. Include code revert, migration reversal or forward-fix, provider/configuration restoration, and data handling where applicable.

## Evidence limitations

State what was not validated. Repository inspection is not production validation, an audit, a pentest, certification, or proof of customer impact.

## Follow-up review

- Review date or trigger:
- Owner:
- Conditions that would supersede this decision:
