# External Security Assurance Contract

## Purpose

Define the minimum evidence required to promote an independent security review or penetration test into the enterprise release decision.

## Required evidence

The canonical JSON must identify the independent reviewer and organization, reviewed `main` SHA, completion time, scope version, outcome, independence attestation and complete finding register.

Every finding requires a stable identifier, severity, status and remediation state. Critical and high findings block release unless independently retested as remediated or documented as false positives by the assessor.

## Truth boundary

Repository implementation, automated tests, CodeQL, Semgrep and internal security review do not constitute independent assurance. This contract validates externally supplied evidence; it does not create a pentest or certify the product.

## Acceptance

Evidence is accepted only when it is:

- bound to the exact current `main` SHA;
- no older than the configured maximum age;
- supplied by an independent organizational identity;
- passing;
- free from open critical or high findings;
- accompanied by retest confirmation for remediated severe findings;
- free from secret-bearing fields;
- validated through the protected workflow.

Missing or malformed evidence remains `NO_GO`.
