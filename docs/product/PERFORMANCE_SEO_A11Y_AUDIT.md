# Performance, SEO and Accessibility Audit

Date: 2026-07-07
Scope: public marketing routes, pricing, trust/security surfaces, auth entry points, onboarding, dashboard entry, images, fonts, metadata, robots, sitemap, locale alternates, mobile behavior and client component boundaries.

## Executive summary

RISCK COMPLY already had a strong security/release foundation and several public routes were statically rendered. The main performance risk was the public waitlist landing being implemented as one large client component, which forced non-interactive hero, navigation, proof chips and feature content into the client bundle.

This change keeps the premium visual direction and i18n structure while reducing unnecessary client JavaScript, strengthening localized metadata, improving indexability, and adding source/E2E checks for SEO and accessibility regressions.

## Follow-up hardening after merge

After the initial SEO/a11y PR was merged, the remaining acquisition-performance risk was the locale layout still loading auth/session code and global effects on every localized route. The follow-up hardening adds:

- `AuthProviderGate` so Supabase auth/session initialization is only mounted on auth, onboarding, checkout, billing, settings, team, profile and dashboard routes.
- `GlobalClientEffectsGate` so global client effects are dynamically loaded only on operational routes that need them.
- `X-Robots-Tag: noindex, nofollow, noarchive` and `Cache-Control: no-store, max-age=0` headers for localized auth/private routes.
- Expanded source gate coverage so regressions in auth-provider gating, global-effects gating and private-route noindex headers fail quality validation.

## Changes applied

### Performance

- Converted the public waitlist landing shell from a full client component into a mostly server-rendered component.
- Isolated only the interactive countdown and waitlist form in `src/components/marketing/waitlist-interactions.tsx`.
- Kept the landing route as `force-static` with `revalidate = 300`.
- Kept pricing and trust routes static where possible.
- Preserved the brand wordmark dimensions to reduce layout shift.
- Added explicit lazy loading for the footer wordmark.
- Avoided broad lazy-loading of important above-the-fold content.
- Removed direct global `AuthProvider` mounting from public SEO pages via `AuthProviderGate`.
- Lazy-loaded `GlobalClientEffects` behind an operational-route gate.

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
- Added response-level noindex headers for private/auth routes so crawlers get the directive even if they hit the page directly.

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
| Landing | Improved | Mostly server-rendered now; countdown/form remain client-side. Auth/session provider no longer mounts on this route. |
| Pricing | Improved | Static page, localized metadata, structured data, accessible comparison table. Auth/session provider no longer mounts on this route. |
| Trust | Improved | Public metadata and static trust route optimization added. Auth/session provider no longer mounts on this route. |
| Security | Improved | Public metadata added. Auth/session provider no longer mounts on this route. |
| Login/signup | Improved | Robots blocks localized auth routes and response headers now add noindex/no-store. Auth provider remains available for the form. |
| Onboarding | Improved | Dynamic/no-store due auth state, plus response-level noindex/no-store headers. |
| Dashboard | Improved | Dashboard stays private/no-store and response-level noindex headers are applied. |
| Images | Improved | Wordmark dimensions preserved; footer wordmark lazy-loaded. |
| Fonts | Reviewed | `next/font/google` is used. A future optimization could remove duplicate font setup between root and locale layouts if the app routing model allows it safely. |

## Validation added

- `scripts/quality/check-public-seo-a11y.mjs`
  - Verifies SEO helper presence.
  - Verifies localized metadata helpers are used.
  - Verifies waitlist landing is not a full client component.
  - Verifies pricing structured data and accessible table headers.
  - Verifies robots and sitemap include important rules.
  - Verifies auth-provider gating and global-effects lazy gating.
  - Verifies private/auth noindex and no-store headers are configured.
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
- Bundle-size measurement was not generated here. The structural client-boundary and provider-gating changes are expected to reduce landing hydration/runtime cost, but final bundle impact should be confirmed with a production build analyzer or Next build output.
- The waitlist anti-spam honeypot should be reviewed with the `/api/prelaunch` server validation if stronger bot filtering is required.

## Merge checklist

- Public landing still renders correctly in all supported locales.
- Pricing CTAs still route to signup/demo/enterprise as expected.
- Trust/security pages are still visible and conservative in claims.
- Robots and sitemap point to the production domain from `NEXT_PUBLIC_APP_URL` or fallback to `https://risckcomply.app`.
- Auth/session provider is not mounted on public SEO pages.
- Private/auth routes send noindex and no-store headers.
- CI passes lint, typecheck, unit tests, E2E smoke and build.
