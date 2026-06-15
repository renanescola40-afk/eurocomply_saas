# Phase 3 Scope Lock

Phase 3 is locked to production-readiness controls only.

## Allowed files

Future Phase 3 fixes may touch only:

- `docs/PHASE3_*.md`
- `scripts/dev/check-phase3-*.mjs`
- `scripts/dev/run-phase3-strict.mjs`
- `.github/workflows/ci.yml`
- `.gitignore`
- `.env.example`
- `package.json` only for Phase 3 validation aliases

## Forbidden files

Do not modify template, product UI, email template, document template, generated content template, customer data, or production secret files as part of Phase 3.

Forbidden examples:

- `templates/`
- `app/templates/`
- `components/templates/`
- `emails/templates/`
- `.env`
- production secret files

## Completion boundary

Phase 3 repository work is complete when all repository checks pass.

Phase 3 production work is complete only after external gates are confirmed in the deployment environment.
