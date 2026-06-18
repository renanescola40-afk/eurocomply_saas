# P1 Restore Test Evidence Builder

This helper writes the final P1 backup/restore evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-restore-test-evidence.mjs input.json docs/security/evidence/p1/backup-restore-tested.json
```

Then run the existing validator for the final file.

Only use reviewed restore-test evidence. Do not mark the control complete with sample data.
