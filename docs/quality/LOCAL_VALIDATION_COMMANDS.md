# Local validation commands

Fresh Codespaces/local workspace:

```bash
node scripts/dev/bootstrap-local-validation.mjs
```

Then run:

```bash
npm run test:e2e
npm run quality:routes:e2e
npm run quality:routes
npm run release:production-final
```

Do not run E2E before dependencies are installed with `npm ci`.
