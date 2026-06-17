# P1 Centralized Logging Evidence Workflow

This control tracks centralized event collection and alerting.

## Files

- Template: `docs/security/evidence/p1/centralized-logging-alerts.template.json`
- Final evidence: `docs/security/evidence/p1/centralized-logging-alerts.json`
- Checker: `scripts/security/check-p1-centralized-logging-evidence.mjs`

## Workflow

1. Collect reviewed, redacted evidence from the central event backend.
2. Copy the template to the final evidence path.
3. Replace placeholders with reviewed references.
4. Run:

```bash
node scripts/security/check-p1-centralized-logging-evidence.mjs
```

5. Update `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md` from `Open` to `Complete` or approved `Exception`.
6. Open a final evidence PR.

This preparation PR does not close the control by itself.
