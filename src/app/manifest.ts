import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EuroComply',
    short_name: 'EuroComply',
    description: 'European compliance operating system for regulated B2B teams.',
    start_url: '/en',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#0A0A0F',
    categories: ['business', 'finance', 'productivity', 'security'],
    lang: 'en',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
