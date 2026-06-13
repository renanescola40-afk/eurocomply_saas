# npm audit triage workflow — 2026-06-13

## Status

Vercel install currently reports 2 npm audit findings: 1 moderate and 1 high.
The exact packages were not available from the Vercel summary log, so no dependency update was applied in this cycle.

## Change made

Added explicit npm audit scripts to `package.json`:

```bash
npm run security:npm-audit:prod
npm run security:npm-audit:all
npm run security:npm-audit:json
npm run security:npm-audit:summary
```

The `summary` command reads `npm-audit.json` and prints a reviewer-friendly list of vulnerable packages, severity, direct/transitive scope, vulnerable range, affected paths, and advertised fix.

These commands are intentionally not part of `npm run security:ci` yet. The known high finding would likely make the main security gate fail before the dependency diff is reviewed.

## Triage sequence

1. Run the production-only gate first:

```bash
npm run security:npm-audit:prod
```

2. If it fails, capture machine-readable detail:

```bash
npm run security:npm-audit:json > npm-audit.json
```

3. Convert the raw JSON into a readable summary:

```bash
npm run security:npm-audit:summary
```

4. Identify whether the high finding affects production runtime dependencies or only development/test tooling.

5. Prefer a targeted dependency update over `npm audit fix --force`.

6. After the dependency diff is reviewed, run:

```bash
npm run build
npm run security:ci
npm run security:npm-audit:prod
```

7. Once the production audit is clean and a committed `package-lock.json` exists, promote `security:npm-audit:prod` into `security:ci`.

## Do not do

Do not run `npm audit fix --force` on main without reviewing the resulting dependency changes. It may introduce breaking framework or tooling upgrades.

Do not commit `npm-audit.json`; it is ignored locally because audit output can include noisy environment-specific metadata.

## Next owner action

Run the JSON + summary pair in a connected environment and inspect the advisory package names before applying dependency changes:

```bash
npm run security:npm-audit:json > npm-audit.json
npm run security:npm-audit:summary
```
