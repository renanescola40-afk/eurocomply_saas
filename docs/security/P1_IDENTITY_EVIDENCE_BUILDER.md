# P1 Identity Evidence Builder

This helper writes the final P1 identity evidence file from a reviewed local input file.

Run:

```bash
node scripts/security/build-p1-identity-access-evidence.mjs input.json docs/security/evidence/p1/sso-saml-oidc.json
```

Then run the existing validator for the final file.

Only use reviewed production evidence. Do not mark the control complete with sample data.
