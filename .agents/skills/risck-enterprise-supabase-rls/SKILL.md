---
name: risck-enterprise-supabase-rls
description: Resolve SEC-04 and DAT-01 with real QA PostgreSQL privilege and migration evidence and Production read-only.
---
# Supabase/RLS specialist

Load official installed Supabase skill and up-to-date docs before SQL changes. Preserve auth, RLS/FORCE RLS, privileged RPC grants, SECURITY DEFINER boundary and cross-tenant denial. Existing accepted QA SQL tests are reused unless the code or environment changed.

SEC-04: check least-privilege SQL GRANTs and real unauthorized-invocation denials under actual QA principal. DAT-01: reconcile exact bytes/hashes/order of all migrations, isolated PG17 replay and schema parity, and independent review. Missing bytes or mismatched manifest are blockers, not PASS.

Production read-only; no Production migration, customer data, unchecked database fixes, email, paid infrastructure, forged proofs or security downgrade. Reproducible source SHA + QA run + signed review are required. If unavailable, stop with one precise next action.
