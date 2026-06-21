import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RISCK COMPLY',
    short_name: 'RISCK COMPLY',
    description: 'European compliance operating system for regulated B2B teams.',
    start_url: '/en',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['business', 'finance', 'productivity', 'security'],
    lang: 'en',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/logo-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
