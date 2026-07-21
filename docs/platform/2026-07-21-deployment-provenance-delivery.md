# Deployment provenance delivery

This platform-access delivery adds repository-side proof for exact-SHA production deployment provenance and rollback-target reachability.

It does not deploy, roll back, change product behavior, mutate provider settings, or claim enterprise readiness.

## Files

- `.github/workflows/platform-deployment-provenance.yml`
- `scripts/platform/validate-deployment-provenance.mjs`
- `tests/security/platform-deployment-provenance-contract.test.mjs`
- `docs/runbooks/platform-deployment-provenance.md`

## External actions remaining

The repository owner must map the protected GitHub environment values and execute the strict runtime workflow against the exact current `main` SHA.
