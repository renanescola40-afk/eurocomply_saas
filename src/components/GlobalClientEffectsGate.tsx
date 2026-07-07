'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const GlobalClientEffects = dynamic(() => import('@/components/GlobalClientEffects'), { ssr: false });

export default function GlobalClientEffectsGate() {
  const pathname = usePathname() || '/';
  const isOperationalRoute = /\/(checkout|dashboard|billing)(\/|$)/.test(pathname);

  if (!isOperationalRoute) {
    return null;
  }

  return <GlobalClientEffects />;
}
