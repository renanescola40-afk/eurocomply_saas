# RISCK COMPLY — SEO RUNTIME DISCOVERY EVIDENCE V1

Status: CODE_VERIFIED / PARTIAL_PUBLIC_DISCOVERY_VERIFIED / SEARCH_CONSOLE_NOT_VERIFIED
Checked: 2026-08-23
Current protected main: `baf9ad40795c13df15f1120ee4a8ce025c07a7a2`

## 1. Purpose

Separate four different SEO truths that must not be conflated:

1. repository implementation;
2. public crawl/discovery evidence;
3. direct runtime endpoint verification;
4. Google Search Console ownership/performance evidence.

---

## 2. Repository implementation — verified on current main

### Sitemap

Current main contains:

`src/app/sitemap.ts`

Observed implementation:

- uses Next.js `MetadataRoute.Sitemap`;
- emits localized acquisition URLs for all configured locales;
- includes localized homepage and pricing routes;
- includes English assurance routes such as Trust, Security, Compliance, Data Processing, SLA, Privacy, Terms, DPA and Subprocessors;
- includes localized feature pages;
- emits language alternates;
- uses `x-default` on relevant alternate sets;
- uses a stable `lastModified` date and defined priority/change-frequency rules.

Repository evidence status:

`SITEMAP_CODE=VERIFIED_PRESENT`

### Robots

Current main contains:

`src/app/robots.ts`

Observed implementation:

- allows public crawling from `/`;
- disallows API, monitoring and private/authenticated route families;
- applies private-route disallows across configured locales;
- declares sitemap as `${appUrl}/sitemap.xml`;
- declares `host: appUrl`.

Repository evidence status:

`ROBOTS_CODE=VERIFIED_PRESENT`

---

## 3. Public discovery evidence

Public web/search observation on 2026-08-23 shows discoverable/indexed RISCK COMPLY pages including:

- `https://www.risckcomply.com/en`
- `https://www.risckcomply.com/trust`
- localized pricing and assurance pages

The public crawler observed the root site redirecting to a localized route (`/es`) in its crawl context.

This proves that public pages are discoverable by web search/crawlers; it does **not** prove complete indexing, correct sitemap processing or Search Console ownership.

Public discovery status:

```text
PUBLIC_PAGE_DISCOVERY=YES
COMPLETE_INDEX_COVERAGE=UNKNOWN
ROOT_LOCALE_REDIRECT=OBSERVED
SEARCH_CONSOLE_DATA=NO
```

---

## 4. Brand inconsistency observed in indexed/public surfaces

Several public/indexed surfaces still render or expose the brand as:

`Risck comply`

while the canonical brand contract is:

`RISCK COMPLY`

This is a Brand SERP/entity consistency gap, not merely typography.

Priority external normalization surfaces:

1. public page metadata / image alt / structured-data brand fields where applicable;
2. Trust Center and other assurance surfaces;
3. LinkedIn company name/tagline/About;
4. verified official social profiles before adding `sameAs`;
5. future third-party profiles only when legitimately controlled.

Do not change legal entity names where a legal document requires a different exact name; normalize the product/brand identity where product brand is intended.

---

## 5. Search Console official baseline

Official Google guidance checked 2026-08-23 confirms:

- a Domain property covers protocols/subdomains under the specified domain;
- Domain-property ownership verification uses DNS;
- the property should be entered as the domain, without `https://` or a path;
- Google generally recommends a domain-level property when appropriate because it combines protocols/subdomains;
- URL Inspection is for inspecting/troubleshooting individual URLs and can request indexing for individual pages;
- for many URLs, sitemap submission/monitoring is the appropriate path;
- the Sitemaps report can confirm whether Google could read a sitemap submitted through that report.

Preferred property:

`risckcomply.com`

Current state remains:

```text
SEARCH_CONSOLE_DOMAIN_PROPERTY=NOT_VERIFIED_BY_CONNECTED_EVIDENCE
DNS_OWNER_ACTION=REQUIRED
SITEMAP_SEARCH_CONSOLE_SUBMISSION=NO_EVIDENCE
URL_INSPECTION_BASELINE=NO_EVIDENCE
BRAND_QUERY_BASELINE=NO_DATA
```

---

## 6. Direct runtime endpoint limitation

The current browsing environment did not provide a successful direct fetch of:

- `https://www.risckcomply.com/sitemap.xml`
- `https://www.risckcomply.com/robots.txt`

Therefore this document does **not** claim runtime endpoint PASS from direct HTTP inspection.

Repository implementation is verified; direct runtime endpoint validation remains a separate check.

Status:

```text
SITEMAP_RUNTIME_DIRECT_FETCH=NOT_PROVEN_IN_THIS_CHECK
ROBOTS_RUNTIME_DIRECT_FETCH=NOT_PROVEN_IN_THIS_CHECK
```

---

## 7. Owner-action sequence

1. Create/verify Search Console Domain property `risckcomply.com` via DNS.
2. Do not expose the DNS verification token publicly.
3. Confirm runtime `sitemap.xml` and `robots.txt` from owner/browser or Search Console evidence.
4. Submit/monitor the sitemap in Search Console.
5. Inspect canonical high-value URLs.
6. Record indexing baseline.
7. Record branded-query baseline after data exists.
8. Normalize product-brand naming across controlled public surfaces.
9. Add `sameAs` only after official profile ownership is verified.

---

## 8. Definition of done

```text
SITEMAP_CODE=PASS
ROBOTS_CODE=PASS
PUBLIC_DISCOVERY=PASS_PARTIAL
BRAND_NAME_CONSISTENCY=NOT_PASS_YET
SEARCH_CONSOLE_PROPERTY=NOT_VERIFIED
SITEMAP_RUNTIME=NOT_PROVEN
SEARCH_CONSOLE_SITEMAP_STATUS=NO_EVIDENCE
SEARCH_CONSOLE_INDEXING_BASELINE=NO_EVIDENCE
SEARCH_CONSOLE_QUERY_BASELINE=NO_DATA
```

This is the correct current truth boundary.
