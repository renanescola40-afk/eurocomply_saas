# Supabase RLS Plan Status

This branch adds a validation plan and plan checker for the remaining Supabase live RLS runtime evidence item.

## What this closes

- It standardizes the table coverage and required test case plan.
- It prevents a runtime plan from passing with placeholders.
- It documents that the plan does not equal runtime evidence.

## What it does not close

- It does not prove live Supabase behavior by itself.
- It does not create `docs/security/evidence/runtime/supabase-live-rls-validation.json`.
- It does not change the P0 runtime evidence register.

## P0 effect

P0 remains 75% until the final runtime evidence JSONs are added and validated.
