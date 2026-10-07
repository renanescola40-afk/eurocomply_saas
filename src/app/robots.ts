import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/seo/public-metadata';

const localizedPrivateRoots = [
  '/dashboard/',
  '/settings/',
  '/billing/',
  '/team/',
  '/profile/',
  '/notifications/',
  '/audit-log/',
  '/documents/',
  '/risks/',
  '/raci/',
  '/approvals/',
  '/compliance-calendar/',
  '/onboarding',
  '/login',
  '/signup',
  '/checkout',
] as const;

export default function robots(): MetadataRoute.Robots {
  const appUrl = getSiteUrl();
  const localizedDisallow = localizedPrivateRoots.map((path) => `/en${path}`);

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
