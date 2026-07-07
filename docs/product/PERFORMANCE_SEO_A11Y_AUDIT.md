# Performance, SEO and Accessibility Audit

Date: 2026-07-07
Scope: public marketing routes, pricing, trust/security surfaces, auth entry points, onboarding, dashboard entry, images, fonts, metadata, robots, sitemap, locale alternates, mobile behavior and client component boundaries.

## Executive summary

RISCK COMPLY already had a strong security/release foundation and several public routes were statically rendered. The main performance risk was the public waitlist landing being implemented as one large client component, which forced non-interactive hero, navigation, proof chips and feature content into the client bundle.

This change keeps the premium visual direction and i18n structure while reducing unnecessary client JavaScript, strengthening localized metadata, improving indexability, and adding source/E2E checks for SEO and accessibility regressions.

## Changes applied

### Performance

- Converted the public waitlist landing shell from a full client component into a mostly server-rendered component.
- Isolated only the interactive countdown and waitlist form in `src/components/marketing/waitlist-interactions.tsx`.
- Kept the landing route as `force-static` with `revalidate = 300`.
- Kept pricing and trust routes static where possible.
- Preserved the brand wordmark dimensions to reduce layout shift.
- Added explicit lazy loading for the footer wordmark.
- Avoided broad lazy-loading of important above-the-fold content.

### SEO

- Added shared public metadata helper at `src/lib/seo/public-metadata.ts`.
- Added localized landing metadata.
- Added localized pricing metadata.
- Added canonical URLs and locale alternates, including `x-default`.
- Added Open Graph and Twitter card metadata through the shared helper.
- Added pricing structured data using `SoftwareApplication` and plan offers.
- Added `/pricing` to the sitemap.
- Reworked sitemap alternates to use real language tags such as `pt-PT`, `es-ES`, `fr-FR`, `it-IT` and `de-DE`.
- Reworked robots rules to disallow localized private/auth routes such as `/en/dashboard/`, `/pt/login`, `/en/signup`, `/en/onboarding` and `/en/checkout`.

### Accessibility

- Added primary navigation labels on the public landing and pricing page.
- Added section labels with `aria-labelledby` for major public sections.
- Marked decorative icons as `aria-hidden`.
- Added visible keyboard focus treatment to key landing, pricing and footer links/buttons.
- Improved pricing comparison table semantics with `scope="col"` and `scope="row"`.
- Kept form labels attached to inputs and added `aria-busy` / feedback association for the waitlist form.
- Added mobile viewport smoke coverage for public landing overflow and keyboard focus.

## Route notes

| Area | Status | Notes |
| --- | --- | --- |
| Landing | Improved | Mostly server-rendered now; countdown/form remain client-side. |
| Pricing | Improved | Static page, localized metadata, structured data, accessible comparison table. |
| Trust | Improved | Public metadata and static trust route optimization added. |
| Security | Improved | Public metadata added. |
| Login/signup | Partially covered | Robots now disallows localized auth routes. Route-level `noindex` metadata should be added in a future patch if route layout writes are available. |
| Onboarding | Verified posture | Already dynamic and no-store because it depends on auth/user state. Keep it non-indexed/private. |
| Dashboard | Verified posture | Dashboard entry redirects to organization dashboard and should remain private/no-store. |
| Images | Improved | Wordmark dimensions preserved; footer wordmark lazy-loaded. |
| Fonts | Reviewed | `next/font/google` is used. A future optimization could remove duplicate font setup between root and locale layouts if the app routing model allows it safely. |

## Validation added

- `scripts/quality/check-public-seo-a11y.mjs`
  - Verifies SEO helper presence.
  - Verifies localized metadata helpers are used.
  - Verifies waitlist landing is not a full client component.
  - Verifies pricing structured data and accessible table headers.
  - Verifies robots and sitemap include important rules.
  - Verifies this audit document exists.

- `tests/e2e/public-seo-a11y.spec.ts`
  - Checks public routes expose main landmark, h1, title, description, Open Graph, Twitter card, canonical and hreflang alternates.
  - Checks pricing structured data and comparison table semantics.
  - Checks mobile landing viewport overflow and keyboard focus.

## Recommended validation commands

Run these before merge:

```bash
npm run lint
npm run typecheck
npm run test
node scripts/quality/check-public-seo-a11y.mjs
npm run test:e2e -- tests/e2e/public-seo-a11y.spec.ts
npm run build
```

## Known limitations

- Lighthouse was not run in this change because it requires a built/local or deployed target plus a browser run in the validation environment.
- Bundle-size measurement was not generated here. The structural client-boundary change is expected to reduce landing hydration cost, but final bundle impact should be confirmed with a production build analyzer or Next build output.
- Auth pages are now blocked in `robots.ts`, but route-level `noindex` metadata for login/signup remains a follow-up because those pages are client components and need route layout metadata added safely.
- The waitlist anti-spam honeypot should be reviewed with the `/api/prelaunch` server validation if stronger bot filtering is required.

## Merge checklist

- Public landing still renders correctly in all supported locales.
- Pricing CTAs still route to signup/demo/enterprise as expected.
- Trust/security pages are still visible and conservative in claims.
- Robots and sitemap point to the production domain from `NEXT_PUBLIC_APP_URL` or fallback to `https://risckcomply.app`.
- CI passes lint, typecheck, unit tests, E2E smoke and build.
