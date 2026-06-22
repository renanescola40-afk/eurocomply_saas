# P1 DAST Evidence Workflow

This control tracks automated dynamic application security testing evidence.

## Files

- Template: `docs/security/evidence/p1/dast-automated.template.json`
- Final evidence: `docs/security/evidence/p1/dast-automated.json`
- Checker: `scripts/security/check-p1-dast-evidence.mjs`

## Workflow

1. Run an approved DAST scanner against a production-like target.
2. Export or reference redacted scan evidence.
3. Copy the template to the final evidence path.
4. Replace placeholders with reviewed, redacted references.
5. Run:

```bash
node scripts/security/check-p1-dast-evidence.mjs
```

6. Update `docs/security/P1_ENTERPRISE_SECURITY_REGISTER.md` from `Open` to `Complete` or approved `Exception`.
7. Open a final evidence PR.

## Completion criteria

The evidence must show:

- DAST runs automatically or on demand in CI;
- a production-like target was scanned;
- critical and high findings are zero or formally excepted;
- findings are triaged with durable references;
- no secrets or access-granting values are committed.

This preparation PR does not close the control by itself.
