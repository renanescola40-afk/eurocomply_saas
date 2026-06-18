# P1 Final Evidence Gate

The P1 final evidence gate validates the P1 evidence index, validates any final P1 evidence files that are present, reports the remaining evidence gap, and checks that the generated progress dashboard is committed.

On pull requests, it reports and validates structure without requiring all controls to be complete.

Manual `workflow_dispatch` runs execute strict mode:

```bash
node scripts/security/check-p1-evidence-index.mjs --strict
node scripts/security/check-p1-final-evidence-files.mjs --strict
node scripts/security/report-p1-evidence-gap.mjs --strict
```

Strict mode should only pass when the 10 final P1 evidence files exist, pass final evidence validation, and the index marks all controls complete.

The final evidence file checker does not create evidence. It only validates committed JSON files against the required final-evidence shape and rejects placeholder-like values.
