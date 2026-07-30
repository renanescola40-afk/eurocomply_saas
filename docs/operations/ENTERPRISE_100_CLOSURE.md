# Enterprise 100% Closure

The product must not be described as `Enterprise 100%` from repository preparation, merged pull requests or a successful deployment alone.

## Final decision rule

The command below returns `GO` only when every required evidence document:

- exists;
- is valid JSON;
- contains an explicitly accepted status;
- identifies the exact promoted commit SHA;
- belongs to the same release candidate.

```bash
ENTERPRISE_CLOSURE_EXPECTED_SHA=<promoted-sha> node scripts/release/check-enterprise-100-closure.mjs
```

The generated result is written to:

```text
release-validation/enterprise-100-closure.json
```

## Required domains

The closure contract currently requires evidence for:

1. repository quality;
2. production deployment;
3. production smoke tests;
4. Supabase RLS reconciliation;
5. live tenant isolation;
6. backup and isolated restore;
7. rollback rehearsal;
8. observability runtime;
9. billing runtime;
10. legal publication acceptance;
11. final Go/No-Go approval.

## Fail-closed behaviour

Missing, invalid, stale, failed or different-SHA evidence produces `NO_GO`. A CI variable, manual toggle, template, draft, placeholder or successful PR cannot replace runtime or human evidence.

The pull-request workflow validates the contract and verifier. On `main` or manual execution, the same workflow enforces the complete closure and uploads the exact-SHA result for 90 days.

## Current truthful status

Repository-controlled preparation is advanced and the current Vercel deployment is successful. Final Enterprise 100% remains blocked until the production, Supabase, operational and qualified legal evidence listed by `config/enterprise-100-closure.json` is attached for the same promoted SHA.
