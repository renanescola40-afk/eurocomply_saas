# Seeded QA Personas

Date: 2026-07-06
Scope: final authenticated E2E validation for routes, CTAs, role-gated controls and synthetic write flows.

## Completion status

The public/anonymous product QA surface is now fully automated. The final 4% requires a disposable QA environment with synthetic users representing each role. This document defines the required personas and commands so the suite can be run without customer data.

## Required storage state files

| Persona | Environment variable | Expected role | Expected organization state |
| --- | --- | --- | --- |
| Owner | `E2E_OWNER_STORAGE_STATE` | `owner` | Existing synthetic organization |
| Admin | `E2E_ADMIN_STORAGE_STATE` | `admin` | Same synthetic organization |
| Member | `E2E_MEMBER_STORAGE_STATE` | `member` or writer-equivalent | Same synthetic organization |
| Viewer | `E2E_VIEWER_STORAGE_STATE` | `viewer` or read-only-equivalent | Same synthetic organization |

Each value must point to a Playwright `storageState` JSON file generated from a disposable QA account. Do not commit these files.

## Required gates

The seeded persona test file is intentionally disabled unless all execution is explicit:

```bash
E2E_ENABLE_SEEDED_PERSONA_PERMISSIONS=true
```

Synthetic write flows remain separately gated:

```bash
E2E_ALLOW_SYNTHETIC_ONBOARDING_WRITE=true
E2E_ALLOW_SYNTHETIC_APP_WRITES=true
```

## Command

```bash
E2E_ENABLE_SEEDED_PERSONA_PERMISSIONS=true \
E2E_OWNER_STORAGE_STATE=.e2e/owner.storage-state.json \
E2E_ADMIN_STORAGE_STATE=.e2e/admin.storage-state.json \
E2E_MEMBER_STORAGE_STATE=.e2e/member.storage-state.json \
E2E_VIEWER_STORAGE_STATE=.e2e/viewer.storage-state.json \
npm run test:e2e -- tests/e2e/seeded-permissions.spec.ts
```

## What the seeded permission suite validates

| Area | Owner | Admin | Member | Viewer |
| --- | --- | --- | --- | --- |
| Protected route loading | Must load | Must load | Must load | Must load |
| Login redirect avoidance | Must not redirect | Must not redirect | Must not redirect | Must not redirect |
| `/undefined` avoidance | Must pass | Must pass | Must pass | Must pass |
| Billing controls | Visible | Visible | Hidden | Hidden |
| Team management controls | Visible | Visible | Hidden | Hidden |
| Product write controls | Visible | Visible | Visible | Hidden |

## Data policy

- Use only disposable QA tenants.
- Use only `example.test` emails or clearly synthetic mailbox aliases.
- Do not use production users, production organizations, real billing customers, real Stripe sessions or customer data.
- Regenerate storage state after credential rotation or session expiry.

## Acceptance definition for 100%

This QA problem can be called 100% resolved when:

1. `npm run quality:routes` passes.
2. `npm run quality:routes:e2e` passes.
3. `npm run test:e2e` passes in anonymous/public mode.
4. `tests/e2e/seeded-permissions.spec.ts` passes in a disposable QA environment with owner/admin/member/viewer storage states.
5. Any failed seeded assertion is either fixed in product code or explicitly documented as an intentional permission decision.
