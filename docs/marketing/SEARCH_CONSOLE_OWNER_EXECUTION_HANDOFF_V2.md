# RISCK COMPLY — SEARCH CONSOLE OWNER EXECUTION HANDOFF V2

Status: OWNER_ACTION_READY / NO_CONNECTED_SEARCH_CONSOLE_CONTROL
Checked: 2026-08-23
Canonical domain: `risckcomply.com`

## 1. Objective

Create a genuine Google Search Console baseline for RISCK COMPLY without exposing verification secrets and without confusing public Google discovery with verified Search Console ownership.

Preferred property:

```text
PROPERTY_TYPE=Domain
PROPERTY=risckcomply.com
VERIFICATION=DNS
```

A Domain property is preferred because it covers protocols and subdomains. Google documents DNS record verification as the verification method for Domain properties.

Official references:

- https://support.google.com/webmasters/answer/34592
- https://support.google.com/webmasters/answer/10431861
- https://support.google.com/webmasters/answer/12482179
- https://support.google.com/webmasters/answer/7440203
- https://support.google.com/webmasters/answer/10351509

---

## 2. Exact owner steps

### Step 1 — Create the property

In Google Search Console:

1. open the property selector;
2. choose `Add property`;
3. choose `Domain`;
4. enter exactly `risckcomply.com` — no `https://`, no path, no `www`;
5. copy the Google-provided DNS TXT verification value privately.

### Step 2 — Add DNS verification

At the authoritative DNS provider for `risckcomply.com`:

1. add the TXT record supplied by Google;
2. do not paste that verification token into GitHub, public docs, screenshots or chat transcripts intended for public retention;
3. return to Search Console and run Verify;
4. retain only non-secret evidence that the property is verified.

### Step 3 — Submit the canonical sitemap

After verifying that the runtime sitemap URL resolves correctly, submit:

`https://www.risckcomply.com/sitemap.xml`

Use the Search Console Sitemaps report so crawl/read status becomes monitorable. For groups of URLs, Google recommends sitemap submission rather than requesting each URL individually.

### Step 4 — Inspect priority URLs

Use URL Inspection for individual important pages. Initial set:

- `https://www.risckcomply.com/`
- `https://www.risckcomply.com/en`
- `https://www.risckcomply.com/en/pricing`
- `https://www.risckcomply.com/en/trust`
- `https://www.risckcomply.com/en/security`
- future `https://www.risckcomply.com/en/resources/ai-system-inventory-template`
- future Article 50 flagship guide when actually published.

For each page record:

- indexed / not indexed;
- Google-selected canonical;
- user-declared canonical where shown;
- crawl allowed;
- last crawl;
- sitemap discovery where shown;
- live-test result if troubleshooting is needed.

Do not request indexing repeatedly when the page is healthy. Request indexing is for single-page cases; use the sitemap for broader discovery.

### Step 5 — Capture the Page Indexing baseline

Record:

- known indexed pages;
- known non-indexed pages;
- top exclusion/reason categories;
- sitemap-specific indexing view where useful;
- unexpected canonical/duplicate/noindex/blocked patterns.

An unindexed page is not automatically a defect; classify the reason first.

### Step 6 — Capture the Performance baseline

When data exists, save the first baseline for:

- branded query family: `risck comply`, `risckcomply`, `risk comply` and close observed variants;
- non-brand AI governance queries;
- country;
- device;
- page;
- clicks;
- impressions;
- CTR;
- average position.

Do not invent zero values before Search Console returns data.

---

## 3. Baseline record

Use this schema:

```text
PROPERTY=risckcomply.com
PROPERTY_TYPE=Domain
VERIFIED_AT=
VERIFIED_BY_ROLE=
VERIFICATION_METHOD=DNS
TOKEN_RETAINED_PUBLICLY=NO
SITEMAP_URL=
SITEMAP_SUBMITTED_AT=
SITEMAP_READ_STATUS=
INDEXED_PAGE_COUNT=
NON_INDEXED_PAGE_COUNT=
TOP_INDEXING_REASONS=
BRANDED_QUERY_DATA_AVAILABLE=true|false
NONBRAND_QUERY_DATA_AVAILABLE=true|false
BASELINE_CAPTURED_AT=
NOTES=
```

Do not store the DNS token in this record.

---

## 4. Checkpoints

### T+0

- property verified;
- sitemap submitted;
- priority URLs inspected;
- indexing snapshot captured if already available.

### T+7 days

- check sitemap read status;
- inspect any priority URLs still unexpectedly absent;
- capture first meaningful Performance baseline if populated.

Google notes that data for a newly added property can take several days and may take about a week to populate. Do not interpret an initially empty Performance report as zero demand.

### T+14 days

- branded-query variant review;
- page-level impressions/clicks;
- unexpected canonical/indexing review;
- compare LinkedIn/site brand normalization progress.

### T+30 days

- first meaningful organic baseline;
- branded vs non-brand split;
- market split EN/DE/FR/ES where data supports it;
- pages generating qualified impressions;
- new search-language signals to feed the content engine.

---

## 5. Search Console → marketing learning loop

```text
QUERY / PAGE SIGNAL
        ↓
INTENT CLASSIFICATION
        ↓
EXISTING PAGE FIT?
        ↓
IMPROVE / INTERNAL LINK / CREATE ONLY IF GAP EXISTS
        ↓
CTA / LEAD / PIPELINE SIGNAL
        ↓
REVIEW IN SEARCH CONSOLE + POSTHOG + CRM WHEN LIVE
```

Do not create pages merely because a query appears once.

---

## 6. Current truth boundary

```text
DOMAIN_PROPERTY_PLAN=READY
OWNER_STEPS=READY
DNS_VERIFICATION_REQUIRED=YES
DNS_TOKEN_PUBLIC_STORAGE=PROHIBITED
SITEMAP_SUBMISSION_PLAN=READY
URL_INSPECTION_SET=READY
INDEXING_BASELINE_SCHEMA=READY
PERFORMANCE_BASELINE_SCHEMA=READY
SEARCH_CONSOLE_VERIFIED=NO_EVIDENCE
SEARCH_CONSOLE_DATA=NO_CONNECTED_EVIDENCE
OWNER_ACTION_REQUIRED=YES
```
