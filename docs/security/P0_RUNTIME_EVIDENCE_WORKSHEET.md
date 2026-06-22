# P0 Runtime Evidence Worksheet

Use this worksheet before creating the final runtime evidence JSON files.

The worksheet is intentionally text-only and must not contain secret values, credentials, tokens, connection strings, private customer data, raw production rows, screenshots with unredacted values, or private report contents.

## Release metadata

- Release owner:
- Evidence reviewer:
- Review date:
- Target environment:
- Private evidence storage location:
- Public repository evidence PR:

## Item 1 — Production provider configuration evidence

Runtime evidence file to create after review:

```text
docs/security/evidence/runtime/production-secrets-provider-stores.json
```

Template source:

```text
docs/security/evidence/templates/production-secrets-provider-stores.template.json
```

Reviewer confirmations:

- [ ] GitHub production settings reviewed.
- [ ] Vercel Production settings reviewed.
- [ ] Supabase production-like project settings reviewed.
- [ ] Payment provider reviewed or marked not applicable.
- [ ] Cache or queue provider reviewed or marked not applicable.
- [ ] Email, analytics, storage, monitoring, and error reporting providers reviewed or marked not applicable.
- [ ] No sensitive values appear in committed files, issue text, PR text, comments, logs, screenshots, or artifacts.
- [ ] Rotation owner documented.
- [ ] Next review date documented.

Evidence references:

- GitHub:
- Vercel:
- Supabase:
- Payment provider:
- Cache or queue provider:
- Other providers:

## Item 2 — Supabase live RLS validation

Runtime evidence file to create after review:

```text
docs/security/evidence/runtime/supabase-live-rls-validation.json
```

Template source:

```text
docs/security/evidence/templates/supabase-live-rls-validation.template.json
```

Reviewer confirmations:

- [ ] Cross-tenant read denial tested.
- [ ] Cross-tenant write denial tested.
- [ ] Same-tenant expected access tested.
- [ ] Anonymous access behavior reviewed.
- [ ] Service-role paths reviewed separately.
- [ ] Tenant-scoped tables have RLS enabled or documented rationale.
- [ ] Redacted test output stored in durable evidence location.

Evidence references:

- Test output:
- Policy listing:
- Table coverage:
- Service-role review:

Table coverage:

| Table | Tenant key | Status | Evidence reference | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Item 3 — External review, pentest, or private-beta exception

Runtime evidence file to create after review:

```text
docs/security/evidence/runtime/external-security-review-or-pentest.json
```

Template source:

```text
docs/security/evidence/templates/external-security-review-or-pentest.template.json
```

Reviewer confirmations:

- [ ] Independent release review, assessment, or private-beta exception exists.
- [ ] Scope included sign-in, permissions, tenant boundaries, API routes, and deployment configuration where applicable.
- [ ] Release-blocking observations are zero, accepted by a risk owner, or covered by approved exception.
- [ ] Non-blocking observations have owners and due dates.
- [ ] Durable evidence reference exists.
- [ ] Next review date documented.

Evidence references:

- Review or report reference:
- Tracker reference:
- Approval reference:
- Exception reference, if applicable:

## Final conversion steps

After completing the worksheet:

1. Copy each template into `docs/security/evidence/runtime/`.
2. Replace every placeholder with redacted durable evidence references.
3. Run these checks locally:

```bash
node scripts/security/check-p0-production-secrets-evidence.mjs
node scripts/security/check-p0-supabase-rls-evidence.mjs
node scripts/security/check-p0-external-review-evidence.mjs
node scripts/security/check-p0-runtime-evidence-files.mjs
node scripts/security/check-p0-runtime-evidence-register.mjs
```

4. Update `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` from `Open` to `Complete` or approved `Exception` only for validated items.
5. Open a PR and require `P0 Runtime Evidence` to pass before merge.

## 100% criteria

P0 reaches 100% only when all runtime evidence items are closed with valid evidence files and the register shows no open P0 runtime item.
