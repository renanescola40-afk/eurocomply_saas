## Summary

Describe what changed and why.

## Security impact

Check every item that applies before requesting review:

- [ ] This change does not expose secrets, private keys, service-role credentials, access credentials, cookies or personal data.
- [ ] Server-only environment variables remain server-only and are not referenced from client components.
- [ ] New or changed API routes authenticate the user or are explicitly documented as public.
- [ ] Resource identifiers are checked server-side against the authenticated user and organization context.
- [ ] Mutating routes use trusted-origin protection.
- [ ] Sensitive routes return no-store responses.
- [ ] Inputs from requests, query strings or form data are schema validated before use.
- [ ] High-risk actions use the current step-up authentication standard where required.
- [ ] Role, plan and organization authorization checks were reviewed.
- [ ] Database changes preserve RLS and tenant isolation.
- [ ] Storage changes keep sensitive buckets private and tenant-scoped.
- [ ] Logs do not include secrets, raw credentials, full personal data, cookies or authorization headers.
- [ ] Security headers, CSP and CORS behavior are not weakened.
- [ ] Dependencies and GitHub Actions changes were reviewed for supply-chain risk.

## Required evidence

Paste or link relevant output:

```txt
npm run security:ci
npm run typecheck
npm run test
npm run build
```

## Release / rollback notes

- Rollback plan:
- Operational owner:
- Customer-impact notes:
- Accepted risk or exception, with expiry date:
