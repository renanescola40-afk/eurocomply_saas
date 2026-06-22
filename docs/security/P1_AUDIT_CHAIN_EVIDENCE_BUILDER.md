# P1 Audit Chain Evidence Builder

This helper writes the final P1 audit chain evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-audit-chain-evidence.mjs input.json docs/security/evidence/p1/verifiable-production-audit-chain.json
```

Then run the existing validator for the final file.

Only use reviewed production evidence. Do not mark the control complete with sample data.
