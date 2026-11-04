# Evidence Reproduction Guide

## Safe execution
- GitHub main is canonical. Record the full 40-character source SHA.
- Production remains read-only; run mutating tests only in isolated QA.
- Stripe TEST only. Never create LIVE transactions.
- No email, deployment, migration, destructive database action or paid CI outside existing approved workflows.
- Sanitize provider output; never store credentials, tokens, cookies, customer data or connection strings.

## Local commands
```bash
node scripts/enterprise-evidence/validate-evidence.mjs --report
node --test tests/enterprise-evidence/validate-evidence.test.mjs
```

## Evidence lifecycle
1. Generate evidence from an actual test or provider readback.
2. Bind record to the exact commit SHA and environment.
3. Record command/query, workflow run ID when applicable, result, limitations and artifact path.
4. Calculate SHA-256 over the exact artifact bytes.
5. Validate freshness and provenance.
6. Obtain independent review; only then may a control be PASS.
7. A gate is eligible only when every mapped atomic control is PASS. Eligibility is not formal acceptance.

## DAT-01
Do not replay migrations in production. Fix missing source RLS policies in an isolated branch, review the ordered manifest and hashes, then replay in isolated QA and verify durable postconditions.
