# RISCK COMPLY — BRAND SERP + GOOGLE SEARCH CONSOLE HANDOFF V1

Status: READY_FOR_OWNER_VERIFICATION / SEARCH_CONSOLE_NOT_CONNECTED
Checked: 2026-08-23
Canonical site: `https://www.risckcomply.com`
Marketing mode: PRELAUNCH_CONTROLLED

## 1. Mission

Create the minimum trustworthy operating handoff required to own branded search, monitor indexing and measure organic demand once the site is ready — without claiming that Google Search Console is already verified or connected.

Operating model:

`VERIFY OWNERSHIP -> SUBMIT SITEMAP -> INSPECT CANONICAL URLS -> MONITOR INDEXING -> MONITOR BRAND QUERIES -> FIX ENTITY CONSISTENCY -> BUILD AUTHORITY`

---

## 2. Current Google Search Console baseline

Current official Google guidance supports two website-property types:

- **Domain property** — covers the root domain across protocols and subdomains and requires DNS verification;
- **URL-prefix property** — covers only URLs matching the exact protocol/prefix and supports several verification methods.

Google generally recommends a Domain property when it is appropriate because it combines protocol/subdomain traffic in one property.

Official sources checked 2026-08-23:

- https://support.google.com/webmasters/answer/34592
- https://support.google.com/webmasters/answer/10351509
- https://support.google.com/webmasters/answer/10267942

For RISCK COMPLY, preferred canonical ownership target:

`risckcomply.com` as a **Domain property**.

Do not enter `https://` or `/path` when creating the Domain property.

---

## 3. Owner verification handoff

### Recommended path

1. Open Google Search Console.
2. Add property.
3. Choose **Domain**.
4. Enter:

`risckcomply.com`

5. Google will provide a DNS TXT verification record.
6. Add the exact TXT record at the authoritative DNS provider for `risckcomply.com`.
7. Return to Search Console and verify.
8. Keep the verification TXT record in DNS after verification unless there is a documented reason to remove/change ownership.

Do not copy a verification token into a public issue, marketing document or chat transcript.

### Ownership governance

After verification:

- keep at least one verified owner;
- add only necessary users;
- review `Settings -> Users and permissions` periodically;
- avoid using shared personal credentials as an ownership strategy.

Official permissions guidance:

https://support.google.com/webmasters/answer/7687615

---

## 4. Sitemap handoff

After property verification and when the production sitemap is confirmed current:

1. Open Search Console -> Sitemaps.
2. Submit the canonical production sitemap URL.
3. Confirm Google can read it.
4. Monitor indexed URLs through Page Indexing filtered by sitemap.

Expected canonical candidate to validate at runtime before submission:

`https://www.risckcomply.com/sitemap.xml`

Do not claim the sitemap exists or is correct until runtime verification confirms it.

Google notes that the Sitemaps report specifically tracks sitemaps submitted through that report; submitting a sitemap also provides a practical way to monitor Google crawl attempts.

---

## 5. URL Inspection launch set

After verification, inspect a small canonical set rather than requesting indexing for every URL manually.

Priority URLs once they exist and are production-approved:

1. `/`
2. `/en`
3. `/en/pricing`
4. `/en/enterprise`
5. `/en/trust`
6. `/en/guides/eu-ai-act-article-50-transparency`
7. `/en/guides/eu-ai-act-provider-vs-deployer`
8. `/en/guides/how-to-build-ai-system-inventory`
9. `/en/guides/ai-governance-evidence`
10. `/en/resources/ai-system-inventory-template`

Use URL Inspection to:

- check indexed/canonical state;
- inspect crawl/access problems;
- request indexing for a small number of important new/updated URLs when useful.

For many pages, use the sitemap rather than mass URL Inspection requests.

---

## 6. Brand SERP truth contract

Canonical brand:

`RISCK COMPLY`

Preferred category phrase:

`Operational AI Governance for European Teams`

Do not alternate publicly between:

- Risck comply
- Risk Comply
- EuroComply AI
- RISCKCOMPLY

unless a historical/legal context explicitly requires it.

### Entity consistency surfaces

Priority surfaces to keep consistent:

- homepage title/H1/Organization schema;
- About / company description;
- Trust Center;
- pricing / enterprise pages;
- LinkedIn company page;
- official social profiles after ownership is verified;
- footer;
- public GitHub or technical resources only where intended as public brand surfaces;
- third-party profiles/directories only when legitimately controlled.

---

## 7. `sameAs` gate

Do not add social/profile URLs to Organization `sameAs` until ownership and canonical identity are verified.

Requirements before `sameAs`:

```text
PROFILE_IS_OFFICIAL=true
PROFILE_OWNER_VERIFIED=true
DISPLAY_NAME_NORMALIZED=true
DESCRIPTION_NOT_CONTRADICTORY=true
URL_STABLE=true
```

Then add only relevant canonical profiles.

Do not manufacture entity authority by adding unrelated profiles or directories.

---

## 8. Structured-data brand readiness

Future SEO/Brand Entity Mega PR should revalidate:

- Organization structured data;
- canonical organisation name `RISCK COMPLY`;
- canonical website URL;
- logo URL eligible and crawlable;
- `sameAs` only for verified official profiles;
- no unsupported certifications/awards/reviews;
- no fake AggregateRating;
- no unsupported customer logos or claims.

Follow current Google Search Central structured-data requirements at implementation time.

Official documentation root:

https://developers.google.com/search/docs/appearance/structured-data/organization

---

## 9. Search Console measurement baseline

Once verified and data begins to accumulate, create a weekly organic review with four layers.

### A. Brand demand

Query groups:

- `risck comply`
- `risckcomply`
- common legitimate brand variants/misspellings observed in data

Track:

- impressions;
- clicks;
- CTR;
- average position;
- branded landing pages.

### B. Commercial non-brand demand

Clusters:

- AI governance software/platform;
- EU AI Act compliance/readiness software;
- AI inventory;
- AI risk management;
- AI governance evidence;
- vendor AI risk;
- Article 50 / provider vs deployer.

Do not invent search volume. Use actual Search Console query data after it exists.

### C. Indexing

Monitor:

- indexed vs not indexed URLs;
- sitemap processing;
- canonical conflicts;
- robots/noindex/access problems;
- important guide/resource indexing.

### D. Country / language

Review EN/DE/FR/ES performance separately when enough data exists.

Do not conclude market priority from tiny samples.

---

## 10. First 30-day Search Console review

After verification and sufficient data:

### Week 1

- verify property;
- submit sitemap;
- inspect canonical launch set;
- record any indexability defects.

### Week 2

- check branded query visibility;
- check which core pages receive impressions;
- verify no unexpected duplicate/canonical pattern.

### Week 3

- compare guide/resource impressions;
- identify real long-tail queries;
- map query language back to content/landing pages.

### Week 4

- decide which cluster deserves expansion based on actual impressions/qualified clicks;
- identify internal-linking opportunities;
- record indexing issues separately from content-performance issues.

---

## 11. Search Console -> marketing learning contract

Every organic insight should become one of:

```text
CONTENT_EXPANSION
TITLE_SNIPPET_TEST
INTERNAL_LINKING
INDEXING_FIX
COUNTRY_LOCALISATION
COMMERCIAL_LANDING_OPPORTUNITY
BRAND_ENTITY_FIX
NO_ACTION_YET
```

Do not create a new issue for every query variation.

Group changes into coherent marketing/SEO packages.

---

## 12. Current blockers

```text
SEARCH_CONSOLE_PROPERTY_VERIFIED=NO_EVIDENCE
SEARCH_CONSOLE_CONNECTOR=NOT_CONNECTED
DOMAIN_DNS_VERIFICATION=OWNER_ACTION_REQUIRED
SITEMAP_RUNTIME_VALIDATION=REQUIRED_BEFORE_SUBMIT
BRAND_LINKEDIN_NORMALIZATION=EXTERNAL_ACTION_PENDING
OFFICIAL_SOCIAL_OWNERSHIP=PARTIAL_NOT_VERIFIED
SEO_BRAND_ENTITY_MEGA_PR=BLOCKED_BY_RELEASE_FREEZE
```

---

## 13. Definition of done

Search Console readiness becomes `LIVE_VERIFIED` only when there is evidence that:

```text
DOMAIN_PROPERTY=VERIFIED
VERIFIED_OWNER=PRESENT
SITEMAP=SUBMITTED_AND_READABLE
CANONICAL_LAUNCH_SET=INSPECTED
BRAND_QUERY_BASELINE=RECORDED_WHEN_DATA_EXISTS
INDEXING_BASELINE=RECORDED
NO_SECRET_VERIFICATION_TOKEN_EXPOSED
```

Until then, status remains `READY_FOR_OWNER_VERIFICATION`, not `CONNECTED`.

---

## Current state

```text
DOMAIN_PROPERTY_RECOMMENDATION=READY
DNS_VERIFICATION_HANDOFF=READY
SITEMAP_HANDOFF=READY
URL_INSPECTION_SET=READY
BRAND_SERP_CONTRACT=READY
SAMEAS_GATE=READY
MEASUREMENT_BASELINE=READY
SEARCH_CONSOLE_LIVE=NO
MAIN_CHANGE=NO
```
