# Private Route Noindex Evidence

Date: 2026-07-07

Status: 100% implemented for the current Performance SEO A11y scope.

## Covered route segments

- `/[locale]/login`
- `/[locale]/signup`
- `/[locale]/onboarding`
- `/[locale]/checkout`
- `/[locale]/dashboard/*`

## Controls

- `next.config.ts` sends `X-Robots-Tag: noindex, nofollow, noarchive` for localized auth/private routes.
- `next.config.ts` sends `Cache-Control: no-store, max-age=0` for localized auth/private routes.
- Segment layouts now export Next metadata with `robots.index=false`, `robots.follow=false`, and `robots.nocache=true` for auth/private surfaces.

## Result

Public SEO pages remain indexable and cached where appropriate. Auth, onboarding, checkout, and dashboard routes have response-level and metadata-level crawler controls.
