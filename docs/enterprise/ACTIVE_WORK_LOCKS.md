# Active work locks

| Scope | Files or area | Branch / PR | Mode | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Atomic onboarding activation | `src/server/actions/onboarding.ts`, activation result type, new atomic RPC migration and contracts | `agent/atomic-onboarding-activation` | Write | Primary engineering agent | Active |
| AI reassessment localization | AI-system reassessment form, localized copy and UX contracts | #1125 | Integrated | Human owner | Merged with exact-head gates green |
| Atomic member removal | member action and atomic removal contracts | #1123 | Integrated | Human owner | Merged |
| Canonical team invitations | team invitation create, delivery, list, cancel and acceptance lifecycle | #1124 | Integrated | Human owner | Merged |

Do not modify the onboarding action or its new RPC from another branch while the activation lock is active. Read-only audits may continue across all areas.
