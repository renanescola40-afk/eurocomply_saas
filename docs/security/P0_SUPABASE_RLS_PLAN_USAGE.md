# Supabase RLS Validation Plan Usage

Use this plan before creating the final `supabase-live-rls-validation` runtime evidence file.

## Files

- Template: `docs/security/evidence/templates/supabase-live-rls-plan.template.json`
- Checker: `scripts/security/check-p0-supabase-rls-plan.mjs`
- Final evidence target: `docs/security/evidence/runtime/supabase-live-rls-validation.json`

## Workflow

1. Copy the template to a private working file or a runtime plan file.
2. Replace placeholders with table names, tenant boundary columns, and coverage notes.
3. Do not add credentials, production row contents, or private customer data.
4. Run:

```bash
node scripts/security/check-p0-supabase-rls-plan.mjs path/to/plan.json
```

5. Execute the live validation outside the repository using approved access.
6. Store redacted output in the approved evidence location.
7. Fill `docs/security/evidence/runtime/supabase-live-rls-validation.json` from the runtime evidence template.
8. Run the P0 runtime evidence checkers before opening the final evidence PR.

The plan itself does not close the P0 runtime evidence item. It only standardizes what must be validated.
