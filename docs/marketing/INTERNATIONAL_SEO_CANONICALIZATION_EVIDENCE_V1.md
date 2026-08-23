# RISCK COMPLY — INTERNATIONAL SEO CANONICALIZATION EVIDENCE V1

Status: ROOT_CAUSE_PROVEN / REMEDIATION_PRESTAGED / PREVIEW_BUILD_READY / NO_RELEASE_PR_OPENED
Checked: 2026-08-23
Protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`
Marketing branch: `marketing/august-2026-authority-engine`

## 1. Executive verdict

RISCK COMPLY already uses explicit locale-prefixed canonical URLs (`/en`, `/pt`, `/es`, `/fr`, `/it`, `/de`), but two international-SEO mechanisms were competing:

1. public Next.js metadata + sitemap already publish canonical and hreflang relationships;
2. `next-intl` middleware also published an HTTP `Link` alternate header by default.

At the same time, fixed public URLs without a locale (for example `/trust`, `/dpa`, `/data-processing`) fell through to the custom middleware locale detector and were redirected temporarily to a locale selected from cookie/country/Accept-Language.

Fresh public search evidence shows locale-less assurance URLs still appearing as search-result URLs. Fresh URL resolution also demonstrated that a locale-less assurance URL can resolve to a locale selected for the requester rather than one fixed canonical target.

```text
EXPLICIT_LOCALE_URL_ARCHITECTURE=PRESENT
HTML_CANONICALS=PRESENT
HTML_HREFLANG=PRESENT
SITEMAP_HREFLANG=PRESENT
NEXT_INTL_HTTP_ALTERNATE_LINKS=ENABLED_BEFORE_FIX
LOCALELESS_PUBLIC_REDIRECT=TEMPORARY_DYNAMIC_BEFORE_FIX
SEARCH_SURFACE_LOCALELESS_ALIASES=OBSERVED
SEO_CANONICALIZATION_DRIFT=PROVEN
```

---

## 2. Why the previous behavior can retain aliases in search

Current protected main custom middleware handles locale-less non-API paths by:

```text
DETECT LOCALE FROM COOKIE / COUNTRY / ACCEPT-LANGUAGE
-> NextResponse.redirect(/<detected-locale><pathname>)
```

No explicit status is supplied, so this is the temporary redirect path rather than a permanent canonical migration contract.

For fixed public marketing/trust paths, that means the same source URL can point to different locale targets for different request contexts.

The public SEO architecture, however, already declares explicit locale-prefixed URLs as canonical.

This mismatch increases the chance that the locale-less source remains visible as an alternate/search result instead of cleanly consolidating on one canonical URL.

---

## 3. Competing hreflang authority

`src/lib/seo/public-metadata.ts` already emits:

- self canonical for the current locale;
- language alternates for supported locales;
- `x-default` pointing to the default English locale URL.

`src/app/sitemap.ts` also emits localized alternates.

Before the prestaged fix, `next-intl` middleware independently emitted response-header alternate links. Runtime inspection found this header-level x-default could use the unprefixed request path while HTML metadata pointed x-default to `/en/...`.

The product therefore had two hreflang authorities capable of expressing different x-default URLs.

---

## 4. Remediation prestaged on marketing branch

### A. One hreflang authority

Commit:

```text
e25cd546cebf942655c6367b85aa1ecd6fb1d049
```

`src/lib/i18n/routing.ts` now sets:

```text
localePrefix='always'
alternateLinks=false
```

This leaves HTML metadata + sitemap as the explicit SEO alternate authority and removes the competing `next-intl` response Link header.

### B. Permanent canonicalization for fixed-slug public aliases

Commit:

```text
202f191680a6d2176bffea92687b33432b20c0b6
```

`next.config.ts` now prestages permanent redirects for fixed public locale-less paths such as:

```text
/pricing
/enterprise
/resources
/faq
/about
/contact
/book-demo
/trust
/security
/compliance
/data-processing
/sla
/privacy
/terms
/cookie-policy
/acceptable-use
/transfers
/dpa
/subprocessors
/status
/vulnerability-disclosure
/trust/*
```

These converge on `/en/...` before middleware locale negotiation.

Auth, checkout and private application routes are deliberately excluded so existing operational locale negotiation is not changed by this SEO remediation.

### C. Localized feature slug safety

Generic `/features/* -> /en/features/*` canonicalization is deliberately **not** introduced because feature slugs differ by locale. Forcing a Spanish/French/German slug into the English route could create a false redirect or 404.

### D. Regression contract

Commit:

```text
4cdca44ab0173e79aad26bc755e0b51ff40a5be8
```

`tests/seo/international-seo.test.ts` now locks:

- explicit locale prefix policy;
- `alternateLinks: false`;
- HTML x-default authority;
- permanent fixed public alias contract;
- nested Trust alias contract;
- absence of unsafe generic English feature redirect.

---

## 5. Preview validation

Vercel preview deployment for runtime commit `202f191680a6d2176bffea92687b33432b20c0b6` completed `READY`.

The preview build passed Next.js configuration loading, optimized compilation, lint/type validation and page-data generation far enough to produce a READY deployment. Existing unrelated warnings were observed but no redirect/configuration/type failure was produced by this remediation.

Direct unauthenticated HTTP inspection of the protected Preview URL is blocked by Vercel SSO in the available connector, so this evidence does **not** claim a direct observed preview 308 response.

The Next.js redirect contract used is `permanent: true`; Production runtime proof must verify the actual 308 after release activation.

---

## 6. Production acceptance after release activation

```text
/TRUST -> 308 /EN/TRUST
/DPA -> 308 /EN/DPA
/DATA-PROCESSING -> 308 /EN/DATA-PROCESSING
/PRICING -> 308 /EN/PRICING
/BOOK-DEMO -> 308 /EN/BOOK-DEMO

/EN/TRUST -> 200 + SELF_CANONICAL
/ES/TRUST -> 200 + SELF_CANONICAL_WHEN_INDEXABLE

NEXT_INTL_HTTP_HREFLANG_HEADER=DISABLED
HTML_HREFLANG=PASS
SITEMAP_HREFLANG=PASS
X_DEFAULT_AUTHORITY=ONE
AUTH_LOCALE_NEGOTIATION=UNCHANGED
PRIVATE_ROUTE_LOCALE_NEGOTIATION=UNCHANGED
LOCALIZED_FEATURE_SLUGS=NOT_FORCED_TO_ENGLISH
```

Search Console should then be used to observe canonical selection/index consolidation rather than declaring indexing cleanup immediately after deploy.

---

## 7. Engineering handoff

### MARKETING REQUIREMENT

Consolidate fixed public locale-less aliases onto one canonical locale URL and maintain one unambiguous hreflang authority.

### ENGINEERING BRIEF

Preserve commits `e25cd546...`, `202f191...`, and `4cdca44...` inside the future SEO Authority + Brand Entity Mega PR. Revalidate against current main before activation.

### ACCEPTANCE CRITERIA

```text
FIXED_PUBLIC_LOCALELESS_ALIASES=PERMANENTLY_CANONICALIZED
HREFLANG_AUTHORITY=ONE
X_DEFAULT_CONFLICT=0
CANONICAL_SELF_REFERENCE=PASS
SITEMAP_ALTERNATES=PASS
AUTH_ROUTING_REGRESSION=0
LOCALIZED_FEATURE_REDIRECT_REGRESSION=0
```

### TEST

- international SEO regression contract;
- Next.js production build;
- preview/production HTTP redirect smoke;
- canonical/hreflang extraction;
- sitemap check;
- Search Console canonical/indexing follow-up after owner verification.

### EXPECTED BUSINESS IMPACT

`FEWER COMPETING URL SIGNALS -> CLEANER CANONICAL CONSOLIDATION -> STRONGER LOCALE SEARCH AUTHORITY -> CLEANER BRAND SERP`

---

## 8. Truth boundary

```text
SEO_002_LOCALELESS_ALIAS_ROOT_CAUSE=PROVEN
SEO_002_HREFLANG_CONFLICT=PROVEN
SEO_002_REMEDIATION=PRESTAGED_BRANCH_ONLY
SEO_002_RUNTIME_COMMIT_PREVIEW=READY
SEO_002_DIRECT_PREVIEW_308_OBSERVED=NO_SSO_BLOCKED
SEO_002_PRODUCTION_FIX=NOT_LIVE
SEARCH_CONSOLE_CONSOLIDATION=NOT_MEASURED
RELEASE_PR_OPENED=NO
MAIN_CHANGED=NO
```
