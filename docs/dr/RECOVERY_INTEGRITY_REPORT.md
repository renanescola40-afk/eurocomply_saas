# Recovery Integrity Report — 2026-10-03

## Baseline controls to reproduce
Current production read-only fingerprint:
- 107 public base tables
- 107 public tables with RLS enabled
- 134 public functions
- 417 public indexes
- 73 non-internal public triggers

## Existing non-production evidence
The inspected pentest branch is not schema-equivalent and therefore is not accepted as recovery proof.

## Required post-restore assertions
- no broken foreign keys
- all expected RLS remains enabled
- no privilege-escalation regression
- required indexes present
- functions/triggers present
- canonical migrations present
- tenant-isolation tests pass with dedicated synthetic tenants

## Current verdict
RECOVERY_INTEGRITY=NOT YET PROVEN
SECURITY_AFTER_RESTORE=NOT YET PROVEN
TENANT_ISOLATION_AFTER_RESTORE=NOT YET PROVEN

Production itself was not modified during this evidence collection.
