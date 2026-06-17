# P1 Distributed Rate Limit Evidence Workflow

This control tracks distributed rate limiting for sensitive endpoints.

## Files

- Template: `docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.template.json`
- Final evidence: `docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json`
- Checker: `scripts/security/check-p1-distributed-rate-limit-evidence.mjs`

## Workflow

1. Collect redacted evidence for the shared rate-limit backend.
2. List sensitive endpoints and their policies.
3. Copy the template to the final evidence path.
4. Replace placeholders with reviewed, redacted references.
5. Run:

```bash
node scripts/security/check-p1-distributed-rate-limit-evidence.mjs
```

6. Update `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md` from `Open` to `Complete` or approved `Exception`.
7. Open a final evidence PR.

## Completion criteria

The evidence must show:

- rate-limit state is shared across app instances;
- sensitive endpoints have explicit policies;
- bypass paths are documented or blocked;
- alerting exists for sustained throttling or abuse;
- no secrets or access-granting values are committed.

This preparation PR does not close the control by itself.
