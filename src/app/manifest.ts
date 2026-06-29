import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Risck Comply',
    short_name: 'Risck Comply',
    description:
      'AI compliance operating system for EU AI Act readiness, AI system inventory, risk evidence and governance workflows.',
    start_url: '/en',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['business', 'productivity', 'security'],
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
