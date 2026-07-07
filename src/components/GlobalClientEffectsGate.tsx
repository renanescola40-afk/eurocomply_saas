'use client';

import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';

const GlobalClientEffects = dynamic(() => import('@/components/GlobalClientEffects'), { ssr: false });

export default function GlobalClientEffectsGate() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const hasReturnState = searchParams.get('checkout') === 'success';
  const isOperationalRoute = /\/(checkout|dashboard|billing)(\/|$)/.test(pathname);

  if (!hasReturnState && !isOperationalRoute) {
    return null;
  }

  return <GlobalClientEffects />;
}
