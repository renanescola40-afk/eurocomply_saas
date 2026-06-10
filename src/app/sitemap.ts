import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://eurocomply-saas.vercel.app';
const locales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
const publicPaths = ['', '/trust', '/privacy', '/terms', '/dpa', '/subprocessors', '/status'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return locales.flatMap((locale) =>
    publicPaths.map((path) => ({
      url: `${appUrl}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === '' ? 'weekly' : 'monthly',
      priority: path === '' ? 1 : path === '/trust' ? 0.8 : path === '/status' ? 0.6 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((alternateLocale) => [alternateLocale, `${appUrl}/${alternateLocale}${path}`]),
        ),
      },
    })),
  );
}
