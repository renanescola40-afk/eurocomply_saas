# Phase 2 Day 4 Closeout

Day 4 covers Supabase staging and production readiness, RLS validation, and storage/security policy review.

## Required provider evidence

Create these files from real Supabase staging and production validation:

- `docs/evidence/phase2/day4-supabase-staging.md`
- `docs/evidence/phase2/day4-supabase-production.md`
- `docs/evidence/phase2/day4-storage-policy-review.md`

Each environment file should include:

- project/environment name
- project reference or non-secret identifier
- migration status
- auth configuration review status
- storage bucket review status
- reviewer or owner
- timestamp

Do not include service-role keys, database passwords, connection strings, access tokens, or customer data.

## RLS validation evidence

Generate this file from real validation output:

- `docs/evidence/phase2/day4-rls-validation.log`

The log must include:

- command or validation method
- target environment
- `## exitCode: 0`
- summary of validated tables or policies

## Closeout command

```bash
npm run phase2:day4:closeout
```

This validates the required Day 4 evidence files.

## Pass criteria

Day 4 is complete when:

- staging evidence exists
- production evidence exists
- storage/security policy review exists
- RLS validation log has `## exitCode: 0`
- `npm run phase2:day4:evidence` exits with code 0

## Scope boundary

Do not mark Phase 2 complete until Day 1 through Day 4 evidence is committed and reviewed.
