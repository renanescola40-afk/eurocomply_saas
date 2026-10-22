# Temporary Dependency Risk Decision — GHSA-vfj7-8cjw-p6xm

**Status:** `OWNER_DECISION_REQUIRED`
**Decision:** Not approved by this document. Keep the dependency audit gate blocked unless the owner records a separate, attributable decision.

## Finding

```text
ADVISORY=GHSA-vfj7-8cjw-p6xm
SEVERITY=High
PACKAGE=braces
DIRECT_OR_TRANSITIVE=Transitive
DEPENDENCY_PATH=eslint-config-next@15.5.27 -> @next/eslint-plugin-next@15.5.27 -> fast-glob@3.3.1 -> micromatch@4.0.8 -> braces@3.0.3
INSTALLED_VERSION=3.0.3
LOCKFILE_SCOPE=dev-only
FIX_AVAILABLE=None as of 2026-10-22; registry latest is 3.0.3 and remains affected
LATEST_SAFE_VERSION=None published
BREAKING_CHANGE_RISK=No patched braces release is available. npm's suggested eslint-config-next@14.2.35 remediation is a major-version downgrade incompatible with the pinned Next.js 15 toolchain; do not apply it blindly.
```

## Exposure Assessment

`braces` is not in the production dependency graph and is not shipped as an application runtime package. The production-only npm audit returned zero vulnerabilities. The affected tooling is reachable during lint/build/dependency-analysis operations, so the relevant impact is CI or developer-build availability if attacker-controlled brace-pattern input reaches the vulnerable parser. No customer-facing runtime exploitability has been demonstrated; do not claim that all build-time exposure is impossible.

**Affected production request path:** None identified from the lockfile; the residual exposure is in the development/build pipeline, not an application request handler.

## Existing and Compensating Controls

- Exact versions and integrity are locked; dependency policy rejects unknown advisories and expired exceptions.
- CircleCI source validation rejects privileged provider credentials and does not deploy.
- The isolated PostgreSQL job uses only synthetic local fixtures and rejects remote database credentials.
- Production-only dependency audit is clean.
- Keep dependency changes reviewed and preserve CI time/resource limits. These controls reduce impact; they do not remediate the vulnerable parser.

## Risk Decision Required

```text
RESIDUAL_RISK=High-severity build/CI availability risk remains for a dev-only transitive package until upstream remediation or a verified dependency-path removal.
EXPIRATION_TRIGGER=Any temporary acceptance must have an explicit owner-set expiry no later than 7 calendar days after approval; never auto-renew.
UPSTREAM_FIX_TRIGGER=Re-run the exact-lockfile audit when braces publishes a patched release or the dependency path changes; remove any exception as soon as the advisory is resolved.
RECOMMENDATION=Do not extend the expired exception by default. Keep npm audit fail-closed. If business continuity requires a temporary exception, require a separate owner approval bound to this exact GHSA, package version, lockfile integrity, dev-only scope, compensating controls and expiry.
OWNER_DECISION_REQUIRED=YES
```

This record is a risk proposal only. It does not change `scripts/security/npm-audit-policy.mjs`, authorize an exception, or convert the dependency gate to PASS.