# Lock governance writes behind audited server boundaries

## Status

Proposed

## Context

AI Literacy and enterprise evidence workflows expose bounded API routes for
mutations. Those routes require trusted origin, authentication, tenant membership,
workflow-specific RBAC, distributed rate limiting, Zod validation and durable audit
persistence with compensation. Their mutation paths use the server-only Supabase
administrative client or a `service_role`-only atomic RPC.

The original schemas nevertheless allowed authenticated managers to write four AI
Literacy tables and four enterprise evidence/governance tables through PostgREST.
A valid client session could therefore bypass API validation, fine-grained RBAC,
rate limits, workflow transitions, separation of duties and audit persistence.

## Decision

Treat these eight tables as backend-owned write models:

- `ai_literacy_programs`, `ai_literacy_courses`,
  `ai_literacy_assignments`, `ai_literacy_evidence`;
- `enterprise_evidence_packs`, `enterprise_evidence_pack_items`,
  `enterprise_vendor_due_diligence`, `enterprise_risk_reviews`.

The late migration is self-contained: it fails closed if a required table is
missing, forces RLS, removes every legacy write policy, installs explicit deny
policies for authenticated DML, revokes client DML privileges, preserves
tenant-scoped member reads and grants only table-level `select`, `insert`, `update`
and `delete` to `service_role`. It does not depend on a helper dropped by an older
migration.

## Consequences

- Supported mutations must pass through the audited API/RPC security boundary.
- Existing authenticated, tenant-scoped read behavior is preserved.
- Direct Supabase client integrations that wrote these tables fail closed.
- No row is changed or deleted by this migration.
- Live Supabase denial tests remain required before claiming runtime RLS evidence.

## Rollback

Do not rewrite applied migration history. If rollback is explicitly approved, add
a follow-up migration restoring the prior grants and manager policies. That would
deliberately reopen the bypass and requires a documented security decision.
