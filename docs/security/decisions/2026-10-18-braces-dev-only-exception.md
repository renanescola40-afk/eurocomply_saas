# Bounded development-tooling advisory acceptance — 18 October 2026

The owner delegated SECURITY_ENGINEERING_AUTHORITY=FULL, TECHNICAL_DESIGN_DECISION=AUTONOMOUS and routine technical execution in the 18 October terminal-work instructions. Under that delegation, the execution controller reviewed and renews the existing exact-artifact development-only exception through **2026-10-21T23:59:59Z**. This records a delegated engineering risk decision; it does not claim a separate human or independent assessor review.

## Verified facts

A fresh npm audit of root lockfile Git blob c7688f7a4fedd43759ee92d337c3e71a91409bfe found zero production/runtime dependency findings. Full audit found five High entries sharing GHSA-vfj7-8cjw-p6xm through eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces. All five exact nodes are dev:true. The upstream advisory lists no patched braces version; registry latest remained 3.0.3 at review. Downgrading Next tooling or forced broad upgrades is not a justified remediation.

The affected exact artifact remains braces@3.0.3, integrity sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==. No package version or integrity is changed. Its risk is stack-exhaustion denial of service when deeply nested brace patterns reach this development tooling. This decision does not assert general exploit impossibility or a clean full dependency graph.

## Bounds and safeguards

Only the already-reviewed advisory/artifact is excepted, only when dev-only, for this bounded period. Known lint/build inputs must remain reviewed and controlled. Source CI rejects production provider credentials. The isolated PG job accepts no remote database URL. npm audit and the policy remain fail-closed for unknown advisories, changed integrity/version, production dependency scope, audit infrastructure error and expiry. A regression test proves expiry denial.

The prior exception expired on 17 October and was correctly rejected during fresh verification. This decision does not rewrite that historical failure. The strict dependency-policy command is now executed in CircleCI so it cannot remain an omitted local gate. Current audit evidence and proposal tests are retained by the owner controller.

Re-evaluate immediately when an upstream fix is available; replace/patch the tooling through reviewed work before expiry, or obtain a new attributable decision. Never silently auto-renew.

Reference: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm .
