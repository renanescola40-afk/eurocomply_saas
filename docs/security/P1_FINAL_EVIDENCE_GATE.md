# P1 Final Evidence Gate

The P1 final evidence gate validates the P1 evidence index, reports the remaining evidence gap, and checks that the generated progress dashboard is committed.

On pull requests, it reports and validates structure without requiring all controls to be complete.

Manual `workflow_dispatch` runs execute strict mode:

```bash
node scripts/security/check-p1-evidence-index.mjs --strict
node scripts/security/report-p1-evidence-gap.mjs --strict
```

Strict mode should only pass when the 10 final P1 evidence files exist and the index marks all controls complete.

This gate is governance-only. It must not be used as evidence that any P1 control is implemented, tested, or production-validated.
