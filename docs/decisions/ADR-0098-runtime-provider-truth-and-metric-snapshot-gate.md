# ADR-0098: Bind Production provider truth and fail closed metric snapshots

- Status: Proposed
- Date: 2026-08-23
- Scope: protected Vercel Production deployment, provider runtime evidence, malware-scanner transport, transactional email, and dashboard metric snapshots

## Context

RISCK COMPLY has separate application-level checks for transactional email and enterprise upload scanning, but those checks only become authoritative when the exact Production deployment is bound to the same provider configuration that release governance expects. The protected deployment already carried the base malware-scanner policy and provider selector, but it did not synchronize the selected scanner transport (HTTP endpoint/URL plus allowlist, or ClamAV host/port) into Vercel Production. The broad provider proof also did not require the Resend bindings introduced by ADR-0097.

Dashboard trend snapshots add a second failure mode. The dashboard writer and history reader use the extended `compliance_metric_snapshots` schema, including `open_tasks`, `open_risks`, `critical_risks`, `high_risk_vendors`, `missing_documents` and the total counters. Enabling `ENABLE_DASHBOARD_METRIC_SNAPSHOTS=true` before that schema is present can turn a non-critical optional feature into a runtime failure after a release has otherwise been declared ready.

The release process therefore needs one consistent source of truth across pre-deploy validation, Vercel synchronization, application readiness and protected provider evidence.

## Decision

The canonical Production path will enforce the following controls:

- `REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY=true` remains the Production policy and the Vercel provider proof must confirm `RESEND_API_KEY`, `EMAIL_FROM` and the guard are bound;
- `REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true` is required for Enterprise Production;
- the deployment validates the selected malware-scanner provider before mutating Vercel;
- HTTP scanner providers require a non-empty endpoint or URL plus `MALWARE_SCANNER_ALLOWED_HOSTS`;
- ClamAV providers require a non-empty host and a valid TCP port between 1 and 65535;
- the protected deployment synchronizes the selected scanner transport into Vercel Production without printing values;
- `ENABLE_DASHBOARD_METRIC_SNAPSHOTS=false` is the canonical Production policy until the V19 snapshot schema is applied and proven compatible;
- `/api/ready` performs a read-only schema probe against the exact dashboard snapshot columns whenever the snapshot feature is enabled;
- if that probe fails, readiness returns `503 not_ready` rather than allowing an enabled-but-incompatible snapshot feature;
- the Production provider proof inventories Vercel environment keys with `decrypt=false` and may retrieve only the explicitly allowlisted non-secret policy controls needed to derive boolean evidence;
- provider evidence stores only derived booleans/counts. It never stores Resend keys, scanner endpoints, scanner hosts, allowlists, sender values, tokens or provider response bodies.

No database migration is applied by this decision. Enabling metric snapshots remains a separate reviewed change after the schema is proven.

## Operational failure mode

A protected Production deployment fails before Vercel mutation when:

- transactional email is required but its source bindings are missing;
- Enterprise upload scanning is disabled;
- the selected scanner provider is unsupported;
- an HTTP scanner lacks a transport or allowlist;
- a ClamAV scanner lacks a host or valid port;
- the metric-snapshot Production policy is not exactly `false` while this ADR is active.

At runtime, if metric snapshots are later enabled and the required table/columns are unavailable, `/api/ready` returns `503 not_ready`. The schema probe is `SELECT ... LIMIT 1`; it does not insert, update, delete or migrate data.

The provider proof fails closed when Vercel does not expose all required runtime binding names, when the selected non-secret controls cannot be resolved, when the email or scanning guards are not enabled, when the scanner provider/transport is inconsistent, or when metric snapshot writes are not explicitly disabled.

## Security and privacy impact

This decision reduces configuration drift between GitHub Production, Vercel Production and application runtime behavior.

The Vercel inventory remains non-decrypting for the general environment. Only four explicitly allowlisted non-secret controls may be retrieved individually to derive boolean evidence: transactional-email requirement, malware-scan requirement, malware-scanner provider selector and metric-snapshot enablement. Their raw values are not written to evidence or logs.

Scanner endpoints, URLs, API keys and ClamAV hosts remain sensitive/provider-store values. They may be synchronized to Vercel but are never printed or persisted in evidence. The metric-snapshot readiness probe uses the existing privileged server client only for a bounded read and returns booleans rather than database error details.

## Risks and trade-offs

- Metric trend snapshots remain unavailable in Production until the V19 schema is deliberately applied and verified. This is preferable to silently enabling a writer against an incompatible schema.
- A missing scanner transport now blocks Enterprise deployment instead of surfacing only when a user uploads a document.
- Provider proof becomes stricter and can expose previously hidden configuration drift as a failed workflow. That failure is evidence of an unresolved Production control, not a reason to weaken the proof.
- Presence of a scanner transport binding does not by itself prove the external scanner service is healthy. Application readiness and the dedicated scanner runtime validation remain separate layers.
- Presence/configuration of Resend does not prove sender-domain verification or successful inbox delivery; ADR-0097 remains authoritative for that boundary.
- Supabase plan, managed backup/PITR, V19 migration execution and independent external assurance remain separate blockers and are not implied by this ADR.

## Rollback

The preferred recovery is to correct the missing or inconsistent Production binding and redeploy the exact approved SHA through the protected workflow.

If the scanner transport policy must change, update the provider selector and matching transport through a reviewed change; do not bypass the allowlist or leave the provider selector pointing to a different transport family.

Metric snapshots must not be enabled as a rollback mechanism. They may be enabled only after the V19 schema is applied and a reviewed change updates this policy together with readiness evidence.

If this ADR itself must be reverted during an incident, the rollback must be an explicit reviewed code/workflow change. Do not perform an undocumented Vercel environment mutation and continue claiming Enterprise readiness.

This decision performs no Production DDL and no data mutation, so rollback requires no database repair.

## Verification and evidence

Verification requires:

- unit coverage showing metric snapshots do not probe the database while disabled and fail closed on missing schema while enabled;
- contract coverage that the protected Production workflow validates and synchronizes Resend, malware-scanner transport and the metric-snapshot policy;
- contract coverage that the provider proof requires the new Vercel runtime checks and stores no selected control values;
- lint, typecheck, unit tests, security CI, Actionlint, secret scanning, CodeQL/SAST, DAST and Enterprise Production Gate on the exact PR head;
- after merge, a protected exact-main provider proof and an exact Production deployment before any blocker is promoted from OPEN to PROVEN.

A green PR alone proves implementation quality, not the current Production provider state. Production credit requires exact-release runtime evidence after merge.
