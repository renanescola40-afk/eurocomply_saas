# P1 Step-up Evidence Builder

This helper writes the final P1 step-up evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-step-up-evidence.mjs input.json docs/security/evidence/p1/step-up-sensitive-actions.json
```

Then run the existing validator for the final file.

Only use reviewed production evidence. Do not mark the control complete with sample data.
