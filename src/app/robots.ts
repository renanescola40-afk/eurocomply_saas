import type { MetadataRoute } from 'next';

import { locales } from '@/lib/i18n/routing';
import { getSiteUrl } from '@/lib/seo/public-metadata';

const localizedPrivateRoots = [
  '/dashboard/',
  '/settings/',
  '/billing/',
  '/team/',
  '/profile/',
  '/notificacoes/',
  '/auditoria/',
  '/documentos/',
  '/riscos/',
  '/raci/',
  '/aprovacoes/',
  '/calendario-compliance/',
  '/onboarding',
  '/login',
  '/signup',
  '/checkout',
] as const;

export default function robots(): MetadataRoute.Robots {
  const appUrl = getSiteUrl();
  const localizedDisallow = locales.flatMap((locale) => localizedPrivateRoots.map((path) => `/${locale}${path}`));

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/monitoring', ...localizedPrivateRoots, ...localizedDisallow],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
