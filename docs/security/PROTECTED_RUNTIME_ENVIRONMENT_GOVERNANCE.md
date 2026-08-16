# Protected runtime environment governance

Sensitive production evidence workflows must prove GitHub Environment governance **before** any protected secret or operational attestation is allowed to participate in release evidence.

## Required controls

Every production environment used by the release proof plane for protected secrets or authoritative operational attestations must satisfy all of the following:

- administrator bypass is disabled;
- at least one required deployment reviewer is configured;
- deployment is restricted to protected branches only;
- the workflow is bound to the exact current `main` SHA before the governance lookup;
- the governance preflight itself contains no `secrets.*` or environment `vars.*` evidence inputs;
- after environment admission, exact-current-main and environment governance are revalidated before the protected producer step;
- secret references are materialized only on the bounded step that needs them.

The canonical validator is `scripts/security/check-github-environment-governance.mjs`.

## Environments

### `Production`

Used by Production Runtime Proof, Production Provider Runtime Proof, Audit Chain Runtime Proof, Step-Up Runtime Proof, Google OAuth/Stripe provider checks and the final Enterprise Production Gate runtime job. It must be hardened before those jobs may load healthcheck, Supabase, Vercel, Stripe, Sentry, malware-scanner, rollback or signing credentials.

Pull-request contract validation remains secret-free and does not require the protected environment. On `main`, the final Enterprise Production Gate requires its governance preflight in addition to quality/security/build and production-like E2E before the secret-bearing runtime job can start.

### `production-recovery`

Used only by Recovery Resilience Proof. This environment must be created and hardened explicitly before a recovery exercise is dispatched. Do not rely on workflow execution to create the environment implicitly.

For `full` and `production-rollback` exercises the existing explicit confirmation phrase `EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK` remains mandatory in addition to environment governance.

### `production-platform-proof`

Used by Platform Providers Runtime Proof. Provider credentials remain unavailable to the proof step until exact-current-main and this environment's governance have both been validated before admission and again inside the protected job.

### `production-platform-closeout`

Used by the scheduled/final platform evidence drift closeout. The protected final release evidence payload must not be materialized unless this environment remains governed and the run still targets exact current `main`.

### `production-identity-proof`

Used by protected enterprise identity runtime proofs such as SAML and SCIM. Identity-provider credentials remain bounded behind exact-current-main and environment governance checks.

### `production-data-governance-proof`

Used by Data Governance Privacy Audit Proof. Residency, retention and export-encryption declarations are authoritative operational attestations. They are loaded only on the proof step after exact-current-main and environment governance revalidation. Missing declarations remain a real blocker.

### `production-incident-proof`

Used by Incident Response and Continuity Proof. SEV1 acknowledgement/containment targets, tabletop freshness, on-call rotation and notification-matrix attestations are loaded only after the protected boundary. Missing or invalid attestations remain blocking.

### `production-procurement-trust-proof`

Used by Procurement Trust Operations Proof. The public Trust Center URL secret and procurement/trust attestations are materialized only on the bounded proof step after governance revalidation. Missing Trust Center publication evidence remains blocking.

## Fail-closed behavior

If an environment is missing or does not satisfy governance, the protected producer job is skipped because its governance dependency fails. Missing runtime evidence remains blocking; the workflow must not synthesize PASS evidence, inject permissive defaults, or fall back to repository-level secrets.

This control does not configure GitHub Environments automatically. Environment creation, reviewers, administrator-bypass policy, branch policy, variables, secrets and credential rotation remain provider-administration actions. This is intentional: release evidence cannot bootstrap the control that is supposed to authorize that same evidence.
