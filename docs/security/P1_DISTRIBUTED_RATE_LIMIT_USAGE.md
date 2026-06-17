# P1 Distributed Rate Limit Evidence Workflow

This control tracks distributed rate limiting for sensitive endpoints.

## Files

- Template: `docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.template.json`
- Final evidence: `docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json`
- Checker: `scripts/security/check-p1-distributed-rate-limit-evidence.mjs`

## Workflow

1. Collect redacted evidence from the distributed throttling backend.
2. Copy the template to the final evidence path.
3. Replace placeholders with reviewed, redacted references.
4. Run the checker.
5. Update the P1 enterprise security register.
6. Open a final evidence PR.

## Completion criteria

The evidence must show:

- rate limit state is shared across instances;
- sensitive endpoints have explicit policies;
- bypass paths are documented or blocked;
- alerting exists for sustained throttling or abuse;
- evidence is redacted.

This preparation PR does not close the control by itself.
