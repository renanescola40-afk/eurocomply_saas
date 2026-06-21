import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://risckcomply.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/en', '/pt', '/es', '/fr', '/it', '/de', '/en/privacy', '/pt/privacy', '/es/privacy', '/fr/privacy', '/it/privacy', '/de/privacy', '/en/terms', '/pt/terms', '/es/terms', '/fr/terms', '/it/terms', '/de/terms', '/en/dpa', '/pt/dpa', '/es/dpa', '/fr/dpa', '/it/dpa', '/de/dpa', '/en/subprocessors', '/pt/subprocessors', '/es/subprocessors', '/fr/subprocessors', '/it/subprocessors', '/de/subprocessors'],
        disallow: ['/api/', '/dashboard/', '/settings/', '/billing/', '/team/', '/profile/', '/notificacoes/', '/auditoria/', '/documentos/', '/riscos/', '/raci/', '/aprovacoes/', '/calendario-compliance/'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
