# CI lint baseline recovery

Status: in progress.

This note tracks the investigation of the current `npm run lint` failure in GitHub Actions. The failure is treated as a release-blocking CI baseline issue, not as evidence that runtime controls are complete.

Validation target:

```bash
npm run lint
npm run test -- tests/security/eslint-node-scripts-config.test.ts
```
