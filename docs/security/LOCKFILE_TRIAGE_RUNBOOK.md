# EuroComply Lockfile and npm Audit Triage Runbook

This runbook describes the required process for moving from temporary `npm install --ignore-scripts` installs to reproducible `npm ci --ignore-scripts` installs.

## Current State

The repository currently treats `package-lock.json` as a release blocker, but not as a blocking preflight requirement.

Security CI intentionally uses:

```txt
npm install --ignore-scripts
```

Npm cache is disabled until the lockfile exists.

## Target State

Before production release candidate:

```txt
package-lock.json committed
npm ci --ignore-scripts used in Security CI
npm cache may be re-enabled with lockfile-backed keys
floating dependency specs replaced with exact audited versions
npm-audit.json generated and triaged
```

## Preconditions

Use the npm version pinned in `package.json`:

```txt
npm@10.8.2
```

Confirm locally:

```txt
npm --version
```

## Step 1 — Generate Lockfile Safely

Run:

```txt
npm run supply-chain:lockfile
```

This expands to:

```txt
npm install --package-lock-only --ignore-scripts
```

Do not run dependency lifecycle scripts during lockfile generation.

## Step 2 — Generate npm Audit JSON

Run:

```txt
npm run security:npm-audit:json > npm-audit.json
```

Then summarize:

```txt
npm run security:npm-audit:summary
```

## Step 3 — Review Floating Dependencies

Run:

```txt
npm run supply-chain:floating-deps
```

Replace floating specs with exact versions resolved by the reviewed lockfile.

Avoid blindly upgrading to newest versions without reviewing compatibility and audit impact.

## Step 4 — Review Lockfile Diff

Review:

```txt
package-lock.json
package.json
npm-audit.json
```

Confirm:

- no unexpected registry changes
- no unexpected package replacements
- no lifecycle-script dependency assumptions
- no untriaged production high-severity advisories
- no strong-copyleft dependency drift beyond policy

## Step 5 — Switch Security CI

After committing the reviewed lockfile, update Security CI from:

```txt
npm install --ignore-scripts
```

to:

```txt
npm ci --ignore-scripts
```

Only then re-enable npm cache if desired.

## Step 6 — Run Final Readiness

Run:

```txt
npm run security:final-readiness
```

Expected target:

```txt
Security readiness: ok
```

## Step 7 — Run Full Security CI

Run the GitHub Actions Security CI workflow and confirm:

- preflight passes
- RLS gate passes or advisory mode is explicitly accepted
- API guards pass
- protected routes pass
- public secrets gate passes
- client boundary gate passes
- headers/no-store/origin/upload/security response gates pass
- audit-chain gate passes
- step-up gate passes
- supply-chain gate passes
- typecheck passes
- tests pass

## Release Rule

Do not mark the project production-ready until:

```txt
package-lock.json exists
Security CI uses npm ci --ignore-scripts
npm-audit.json is generated and reviewed
security:final-readiness is clean
```
