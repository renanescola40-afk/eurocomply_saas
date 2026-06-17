# P1 Restore Test Evidence Workflow

This control tracks tested restore capability for critical systems.

## Files

- Template: `docs/security/evidence/p1/backup-restore-tested.template.json`
- Final evidence: `docs/security/evidence/p1/backup-restore-tested.json`
- Checker: `scripts/security/check-p1-restore-test-evidence.mjs`

## Workflow

1. Run restore tests for systems in scope.
2. Copy the template to the final evidence path.
3. Replace placeholders with reviewed references.
4. Run:

```bash
node scripts/security/check-p1-restore-test-evidence.mjs
```

5. Update the P1 enterprise security register.
6. Open a final evidence PR.

This preparation PR does not close the control by itself.
