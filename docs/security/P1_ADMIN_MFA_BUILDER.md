# P1 MFA Builder

This helper writes the final P1 MFA evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-admin-mfa-evidence.mjs input.json docs/security/evidence/p1/admin-mfa-required.json
```

Then run the existing validator for the final file.
