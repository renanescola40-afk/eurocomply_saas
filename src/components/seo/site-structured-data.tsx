import type { Locale } from '@/lib/i18n/routing';
import { getCanonicalUrl, getSiteUrl, localeLanguageTags } from '@/lib/seo/public-metadata';

type SiteStructuredDataProps = {
  locale: Locale;
  title: string;
  description: string;
};

export function SiteStructuredData({ locale, title, description }: SiteStructuredDataProps) {
  const siteUrl = getSiteUrl();
  const pageUrl = getCanonicalUrl(locale);
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'RISCK COMPLY',
        alternateName: 'Risck Comply',
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/brand/risck-comply-wordmark.svg`,
        },
        description: 'AI governance and EU AI Act readiness software for European B2B teams.',
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'RISCK COMPLY',
        alternateName: 'Risck Comply',
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: Object.values(localeLanguageTags),
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name: 'RISCK COMPLY',
        alternateName: 'Risck Comply',
        url: siteUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description,
        provider: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        inLanguage: localeLanguageTags[locale],
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#software` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
    />
  );
}
