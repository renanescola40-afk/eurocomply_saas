'use client';

import { useEffect } from 'react';

export function PublicLandingSampleBadgeNormalizer({ locale }: { locale: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-public-sample-preview="true"]');
    if (!root) return;

    const sampleLabel = locale === 'pt' ? 'Amostra' : 'Sample';

    const normalizeSampleBadges = () => {
      for (const span of Array.from(root.querySelectorAll<HTMLSpanElement>('span'))) {
        if (span.textContent?.trim() !== 'Live') continue;

        span.textContent = sampleLabel;
        span.setAttribute('data-sample-preview-badge', 'true');
        span.setAttribute(
          'aria-label',
          locale === 'pt' ? 'Dados ilustrativos de demonstração' : 'Illustrative demo data',
        );
      }
    };

    normalizeSampleBadges();

    const observer = new MutationObserver(normalizeSampleBadges);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [locale]);

  return null;
}
