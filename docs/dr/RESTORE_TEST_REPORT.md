# Restore Test Report — 2026-10-03

## Objective
Prove restore/replay on disposable non-production infrastructure without changing production or the MaaSec target.

## Current result
A valid current-state restore has NOT yet been completed.

Two existing Supabase development branches were discovered and intentionally left untouched because both are pentest-labelled and both report `MIGRATIONS_FAILED`. The newer `maasec-pentest-20261001` branch materially diverges from current production and therefore cannot be used as DR proof.

### Production fingerprint
107 public tables; 134 public functions; 417 public indexes; 73 non-internal public triggers; 107/107 public tables with RLS enabled.

### Existing branch fingerprint
18 public tables; 5 public functions; 54 public indexes; 3 non-internal public triggers; 18/18 public tables with RLS enabled.

## Required safe next execution
Create a new dedicated disposable Supabase branch/project, replay the current canonical migration set, validate schema equivalence, then—only if safe backup material/provider restore capability is available—restore backup data into that dedicated target and validate counts/integrity.

## Pass rule
Do not mark RESTORE=PROVEN until a dedicated isolated target successfully reaches the expected current schema and recovered data validation completes.
