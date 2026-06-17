# Provider Runtime Plan Usage

Use this plan before creating the final provider runtime evidence file.

## Files

- Template: `docs/security/evidence/templates/provider-runtime-plan.template.json`
- Checker: `scripts/security/check-p0-provider-runtime-plan.mjs`
- Final evidence target: `docs/security/evidence/runtime/production-secrets-provider-stores.json`

## Workflow

1. Copy the template to a private working file or runtime plan file.
2. Replace placeholders with provider names, environments, review notes, and durable evidence references.
3. Do not add private values, tokens, connection strings, or unredacted screenshots.
4. Run:

```bash
node scripts/security/check-p0-provider-runtime-plan.mjs path/to/plan.json
```

5. Review provider-side settings in the actual production providers.
6. Store redacted evidence in the approved evidence location.
7. Fill `docs/security/evidence/runtime/production-secrets-provider-stores.json` from the runtime evidence template.
8. Run the P0 runtime evidence checkers before opening the final evidence PR.

The plan itself does not close the P0 runtime evidence item. It only standardizes what must be reviewed.
