# P1 DAST Evidence Builder

This helper writes the final P1 DAST evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-dast-evidence.mjs input.json docs/security/evidence/p1/dast-automated.json
```

Then run the existing validator for the final file.

Only use reviewed scan evidence. Do not mark the control complete with sample data.
