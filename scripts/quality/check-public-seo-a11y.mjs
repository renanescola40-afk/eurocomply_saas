import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredFiles = [
  'src/lib/seo/public-metadata.ts',
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'src/app/[locale]/[trustPage]/page.tsx',
  'src/app/sitemap.ts',
  'src/app/robots.ts',
  'src/components/auth/AuthProviderGate.tsx',
  'src/components/GlobalClientEffectsGate.tsx',
  'src/components/marketing/waitlist-page.tsx',
  'src/components/marketing/waitlist-interactions.tsx',
  'tests/e2e/public-seo-a11y.spec.ts',
  'docs/product/PERFORMANCE_SEO_A11Y_AUDIT.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `Missing required SEO/a11y artifact: ${file}`);
}

const seoHelper = read('src/lib/seo/public-metadata.ts');
assert(seoHelper.includes('makePublicMetadata'), 'SEO helper must expose makePublicMetadata.');
assert(seoHelper.includes('getLocaleAlternates'), 'SEO helper must expose locale alternates.');
assert(seoHelper.includes('x-default'), 'SEO alternates must include x-default.');

const landing = read('src/app/[locale]/page.tsx');
assert(landing.includes('generateMetadata'), 'Landing must define localized metadata.');
assert(landing.includes('makePublicMetadata'), 'Landing metadata must use shared public metadata helper.');

const pricing = read('src/app/[locale]/pricing/page.tsx');
assert(pricing.includes('generateMetadata'), 'Pricing must define localized metadata.');
assert(pricing.includes('application/ld+json'), 'Pricing must include structured data.');
assert(pricing.includes('scope="row"'), 'Pricing comparison table must expose row headers.');

const trustRoute = read('src/app/[locale]/[trustPage]/page.tsx');
assert(trustRoute.includes("dynamic = 'force-static'"), 'Trust routes should stay statically optimized.');
assert(trustRoute.includes('generateStaticParams'), 'Trust routes must keep locale/static params.');
assert(trustRoute.includes('makePublicMetadata'), 'Trust routes must use shared public metadata helper.');

const waitlistPage = read('src/components/marketing/waitlist-page.tsx');
const waitlistInteractions = read('src/components/marketing/waitlist-interactions.tsx');
assert(!waitlistPage.startsWith("'use client'"), 'Waitlist landing page must not be a full client component.');
assert(waitlistInteractions.startsWith("'use client'"), 'Waitlist interactions must be isolated in a client boundary.');
assert(waitlistPage.includes('aria-labelledby="landing-title"'), 'Landing hero should be labelled for assistive tech.');

const localeLayout = read('src/app/[locale]/layout.tsx');
const authProviderGate = read('src/components/auth/AuthProviderGate.tsx');
const globalEffectsGate = read('src/components/GlobalClientEffectsGate.tsx');
assert(localeLayout.includes('AuthProviderGate'), 'Locale layout must gate the auth provider away from public SEO routes.');
assert(!localeLayout.includes('import { AuthProvider }'), 'Locale layout must not import AuthProvider directly.');
assert(authProviderGate.includes('AUTH_PROVIDER_SEGMENTS'), 'AuthProviderGate must explicitly document auth/private route segments.');
assert(globalEffectsGate.includes('dynamic('), 'Global effects should be dynamically loaded.');
assert(globalEffectsGate.includes('isOperationalRoute'), 'Global effects gate should only run on operational routes.');

const robots = read('src/app/robots.ts');
assert(robots.includes('/api/'), 'robots.ts must disallow API routes.');
assert(robots.includes('/dashboard/'), 'robots.ts must disallow dashboard routes.');
assert(robots.includes('localizedDisallow'), 'robots.ts must generate localized private disallows.');

const nextConfig = read('next.config.ts');
assert(nextConfig.includes('X-Robots-Tag'), 'Private/auth routes must send X-Robots-Tag headers.');
assert(nextConfig.includes('noindex, nofollow, noarchive'), 'Private/auth route robots header must be strict.');
assert(nextConfig.includes('no-store, max-age=0'), 'Private/auth routes must send no-store caching headers.');

const sitemap = read('src/app/sitemap.ts');
assert(sitemap.includes('/pricing'), 'sitemap must include pricing.');
assert(sitemap.includes('getLocaleAlternates'), 'sitemap must include locale alternates.');

console.log('Public SEO/a11y source gate passed.');
