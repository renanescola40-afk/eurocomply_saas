# RISCK COMPLY International SEO Recovery

Date: 2026-08-01  
Canonical production origin: `https://www.risckcomply.com`

## Objective

Build a truthful, scalable international acquisition surface for searches related to AI governance, AI inventories, risk assessment, evidence management, provider assurance, audit trails, documentation and EU AI Act readiness.

This implementation improves technical eligibility and content relevance. It does not claim or guarantee first position in Google, a fixed ranking, legal compliance, certification or regulatory outcomes.

## Implemented in this Mega PR

### Canonical domain consolidation

- Changes the SEO fallback origin from the legacy `.app` domain to `https://www.risckcomply.com`.
- Normalizes known apex, `www` and legacy `.app` host values to the canonical production origin.
- Adds permanent host redirects from:
  - `risckcomply.com`
  - `risckcomply.app`
  - `www.risckcomply.app`
- Keeps canonicals, Open Graph URLs, structured data and sitemap URLs on one origin.

### International feature architecture

Eight high-intent public feature pages are authored independently in six locales:

1. AI system inventory
2. AI risk assessment
3. Evidence management
4. AI governance workflows
5. AI vendor risk
6. EU AI Act readiness
7. AI governance audit trails
8. AI compliance documentation

The six current locales are:

- English
- Portuguese for Portugal
- Spanish for Spain
- French for France
- Italian for Italy
- German for Germany

This creates 48 localized feature URLs. Every locale has its own slug, title, description, body content, capabilities, workflow, FAQ and CTA. The pages are not produced by replacing only a country or language name.

### Search metadata and structured data

Each feature page includes:

- a unique title and description;
- a canonical URL;
- language alternates mapped to the equivalent localized slug;
- `x-default` pointing to the English equivalent;
- `SoftwareApplication` structured data;
- `WebPage` structured data;
- `BreadcrumbList` structured data;
- `FAQPage` structured data;
- visible language navigation;
- internal links to account creation, pricing and related product areas.

Localized homepages include a shared entity graph for:

- `Organization`;
- `WebSite`;
- `SoftwareApplication`;
- localized `WebPage`.

The canonical entity name is `RISCK COMPLY`, with `Risck Comply` as an alternate name.

### Fully localized acquisition homepages

Spanish, French, Italian and German homepages now render server-side content in their own language instead of falling back to English visible copy. They expose localized positioning, workflows, product links, assurances and calls to action.

The existing English and Portuguese premium landing experience remains in place.

### Sitemap and internal discovery

- Adds all 48 feature URLs to the XML sitemap.
- Includes equivalent-language mappings for each feature intent.
- Adds localized feature links to the public footer.
- Removes the provisional status surface from the sitemap.
- Keeps incomplete mixed-language assurance variants out of the acquisition sitemap until their full body content is localized.

### Index quality controls

- Feature pages are public in middleware and do not trigger an authentication redirect.
- Public feature responses receive cache headers.
- Private routes remain `noindex`, `nofollow` and `no-store`.
- Provisional non-English assurance pages receive `noindex, follow` response headers until their complete visible content is localized.
- The static status page is `noindex` while live status integration is pending.

### Regression controls

- Adds a Vitest source-contract suite for canonical domain, redirects, locale coverage, feature intent coverage, sitemap discovery, structured data and index-quality rules.
- Extends Playwright SEO smoke coverage to a public feature page.
- Updates the brand guard for the localized public footer architecture.

## URL examples

- `/en/features/ai-inventory`
- `/pt/features/inventario-de-ia`
- `/es/features/inventario-de-ia`
- `/fr/features/inventaire-ia`
- `/it/features/inventario-ia`
- `/de/features/ki-inventar`

Equivalent URLs for every feature are generated from one stable feature identity. This lets `hreflang` connect translated equivalents even when their slugs differ.

## External actions after deployment

These actions require account access and are intentionally not performed by repository code.

### Vercel

1. Confirm `www.risckcomply.com` is the primary production domain.
2. Confirm `risckcomply.com` redirects permanently to the `www` host.
3. Confirm the legacy `.app` domain remains attached long enough to serve the permanent redirect.
4. Set `NEXT_PUBLIC_APP_URL=https://www.risckcomply.com` in Production.
5. Deploy the merged exact commit and verify redirect, canonical and sitemap responses.

### Google Search Console

1. Verify the domain property for `risckcomply.com`.
2. Submit `https://www.risckcomply.com/sitemap.xml`.
3. Inspect the six localized homepages.
4. Inspect one feature URL in each locale.
5. Request indexing after the production deployment is confirmed.
6. Review canonical selection, duplicate-page reports and excluded pages.
7. Track queries by page, country and device instead of relying only on brand searches.

### DNS

1. Keep the Search Console verification TXT record.
2. Confirm the `www` record points to the production Vercel project.
3. Confirm the apex domain redirects rather than serving an independent copy.
4. Do not remove the legacy domain before search engines have processed the permanent redirects.

### Brand consistency

Update public social profiles and directories to use the same entity:

- Brand: `RISCK COMPLY`
- Primary URL: `https://www.risckcomply.com`
- Product category: AI governance and EU AI Act readiness software

Remove remaining customer-facing references to the former EuroComply identity where they are no longer intentionally historical.

## Next growth work

After deployment and Search Console validation:

1. Use real query data to prioritize content rather than generating hundreds of speculative pages.
2. Publish authoritative resources such as inventory templates, assessment guides, policy guidance and evidence checklists.
3. Add country-specific pages only when they contain meaningful local terminology, sources, sectors and buyer context.
4. Localize the full body of assurance and legal-review pages before making their non-English variants indexable.
5. Add real customer evidence, expert authorship and external references as they become available.
6. Review ranking, click-through rate, conversion and index coverage monthly.

## Truth boundary

Repository changes can improve crawlability, relevance, language targeting, entity clarity and conversion paths. Search positions remain controlled by search engines and depend on competition, authority, content quality, links, user demand, technical health and time. No code change can honestly guarantee first place for every query or country.
