# Package lock alignment audit

Date: 2026-06-30
Scope: release-safety audit for `package.json` and `package-lock.json` before Early Access / Controlled Beta.

## Executive result

The root package manifest in `package-lock.json` is aligned with `package.json` for the dependency fields checked by the repository gate:

- package name/version match the root manifest.
- `dependencies` match the root manifest.
- `devDependencies` match the root manifest.
- The existing package lock alignment gate compares those fields directly and should pass when run against the current files.

No dependency upgrade was introduced as part of this audit.
No auth migration was performed.
No functionality was changed.

## What was desalinhado / suspicious

### 1. Clerk is still present in the runtime dependency graph

`@clerk/nextjs` is present in `dependencies` and in the lockfile root manifest.

That is suspicious for a Supabase-first release because maintaining two auth stacks increases release risk. However, it is not safe to remove `@clerk/nextjs` as a package-only cleanup right now because current application code imports Clerk runtime components and APIs. Removing only the dependency would likely break `npm run build`.

Observed current Clerk usage includes:

- `src/app/[locale]/layout.tsx` imports `ClerkProvider` from `@clerk/nextjs`.
- `src/app/[locale]/layout.tsx` imports `ClerkFloatingControls`.
- The app shell conditionally enables Clerk based on `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Additional Clerk-named routes/components are present in the repository.

Release decision: keep `@clerk/nextjs` for this release candidate unless a separate auth cleanup PR removes the runtime imports and verifies the Supabase-only flow end to end.

### 2. Node version is implicit in package.json

The GitHub Actions CI workflow uses Node 22 via `actions/setup-node`.

`package.json` currently does not declare an `engines.node` field. For release stability, the expected runtime should be Node 22.x in Vercel and GitHub Actions. Because adding `engines` changes the package manifest and should be regenerated into the lockfile through npm, this audit does not add it manually without running the lock regeneration command.

Recommended follow-up after this release-safe audit:

```json
"engines": {
  "node": "22.x"
}
```

Then regenerate with:

```bash
npm install --package-lock-only --ignore-scripts
```

## Dependencies removed

None.

Reason: `@clerk/nextjs` is still imported by runtime code. Removing it without code cleanup would be an unsafe release change.

## Dependencies maintained

Maintained intentionally for this release:

- `next` / `react` / `react-dom`: no framework upgrade before Early Access.
- `@supabase/ssr` and `@supabase/supabase-js`: required for Supabase auth/database integration.
- `@clerk/nextjs`: kept only because current code imports it; this should be resolved in a separate Supabase-only auth cleanup if the product direction is Supabase Auth only.
- `@sentry/nextjs`: no Sentry upgrade before release.
- `@playwright/test`: no Playwright upgrade before release.
- `vitest`: no test runner upgrade before release.
- `typescript`: no TypeScript upgrade before release.
- `stripe`: no Stripe SDK upgrade before release.

## Node version expected

Expected release Node version: Node 22.x.

Rationale:

- CI is configured with `actions/setup-node` and `node-version: 22`.
- Keeping Vercel on Node 22.x avoids mismatch between CI and production build/runtime.

## Commands to run for validation

These are the release validation commands for this package/lock audit:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test
```

Optional repository-specific gate:

```bash
npm run security:package-lock
```

## Commands executed in this audit

Remote repository inspection was performed through the GitHub connector. Local npm commands were not executed in this environment because the runtime does not have direct registry/repository network access for `npm ci` / full dependency installation.

GitHub CI should run the install/lint/typecheck/test gates on the pushed documentation commit.

## Final release assessment

Package lock alignment status: acceptable for release candidate based on repository manifest/lock inspection.

Release blocker found: none in package-lock alignment itself.

Release risk retained: mixed Supabase/Clerk auth code remains present. Do not remove `@clerk/nextjs` as a package-only cleanup. Schedule a separate auth-stack consolidation PR after Early Access, or before release only if there is enough time to remove Clerk imports, update auth flows, and re-run the full validation suite.
