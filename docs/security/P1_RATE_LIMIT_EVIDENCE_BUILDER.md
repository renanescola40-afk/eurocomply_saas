# P1 Rate Limit Evidence Builder

This helper writes the final P1 distributed rate limit evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-rate-limit-evidence.mjs input.json docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json
```

Then run the existing validator for the final file.

Only use reviewed production evidence. Do not mark the control complete with sample data.
