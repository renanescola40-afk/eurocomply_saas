# Phase 1 Execution Gate

Phase 1 proves that the project runs cleanly in a real Node/npm environment.

## Required commands

Run these commands from the repository root:

```bash
npm install --package-lock-only --ignore-scripts
npm ci
npm run typecheck
npm run test
npm run build
npm run lint
```

## Required evidence

Phase 1 is not complete until all of these are committed or attached to the release evidence:

- `package-lock.json` generated from npm.
- `npm ci` output showing a clean install.
- `npm run typecheck` output showing success.
- `npm run test` output showing success.
- `npm run build` output showing success.
- `npm run lint` output showing success or documented non-critical warnings.
- A local startup smoke test showing the app starts with `npm run dev` or `npm run start` after build.

## Fix policy

If any command fails, fix the source issue before marking Phase 1 complete.

Do not manually author `package-lock.json`. Generate it with npm so dependency resolution is reproducible.
