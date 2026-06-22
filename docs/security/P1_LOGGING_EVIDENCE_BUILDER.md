# P1 Logging Evidence Builder

This helper writes the final P1 centralized logging and alerting evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-centralized-logging-evidence.mjs input.json docs/security/evidence/p1/centralized-logging-alerts.json
```

Then run the existing validator for the final file.

Only use reviewed operational evidence. Do not mark the control complete with sample data.
