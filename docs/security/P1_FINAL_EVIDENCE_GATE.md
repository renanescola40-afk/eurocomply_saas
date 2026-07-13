# P1 Final Evidence Gate

The P1 final evidence gate validates the P1 evidence index, validates any final P1 evidence files that are present, reports the remaining evidence gap, and checks that the generated progress dashboard is committed.

On pull requests, it validates the structure and truthfulness of the evidence state without requiring all controls to be complete. Missing final evidence remains allowed in non-strict mode, but a generated `P1_PROGRESS.md` that differs from the canonical evidence index is always a blocking failure.

Use the same runner locally or in CI:

```bash
node scripts/security/run-p1-final-evidence-gate.mjs
```

Manual `workflow_dispatch` runs execute strict mode:

```bash
node scripts/security/run-p1-final-evidence-gate.mjs --strict
```

Strict mode should only pass when the 10 final P1 evidence files exist, pass final evidence validation, and the index marks all controls complete.

The final evidence file checker does not create evidence. It only validates committed JSON files against the required final-evidence shape and rejects placeholder-like values.

## Strict index contract

The index validator accepts an optional index path and an order-independent `--strict` flag:

```bash
node scripts/security/check-p1-evidence-index.mjs [index-path] [--strict]
```

In strict mode, the canonical index must have `status: Complete`, `generatedFromRealEvidence: true`, and all 10 control entries marked `Complete`. Every completed entry must reference an existing evidence file and include non-empty reviewer, review timestamp, and next-review metadata.

The validator never generates evidence or changes control status. A strict failure means the enterprise evidence package is incomplete or internally inconsistent; it must not be bypassed.

## Dashboard integrity rule

`docs/security/evidence/p1/P1_EVIDENCE_INDEX.json` is the canonical status source. The gate regenerates `docs/security/evidence/p1/P1_PROGRESS.md` and then requires a clean Git diff in both normal and strict modes. Any status change must therefore commit the matching generated dashboard in the same pull request.
