# Enterprise readiness export response contract

Enterprise readiness exports are privileged JSON attachments and must follow the same public-response minimization rules as interactive high-risk actions.

Required behavior:

- require authenticated organization context and `export_data` permission;
- require a valid high-risk-action verification before generating the export;
- include only the public step-up summary in the exported JSON payload;
- keep detailed verification assessment fields in server-side audit metadata only;
- generate JSON attachments with the centralized no-store download helper;
- return sanitized no-store JSON errors with stable public error codes.

The regression gate is:

```bash
node scripts/security/check-enterprise-readiness-export-contract.mjs
```

It is delegated by `scripts/security/check-enterprise-api-security.mjs`, so it runs as part of `npm run security:ci`.
