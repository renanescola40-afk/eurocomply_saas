# Local validation commands

Fresh Codespaces/local workspace:

```bash
npm run bootstrap:local
```

This command runs `npm ci` and installs the Chromium browser needed by Playwright.

Then run:

```bash
npm run test:e2e
npm run quality:routes:e2e
npm run quality:routes
npm run release:production-final
```

Do not run E2E before dependencies are installed with `npm ci`.
