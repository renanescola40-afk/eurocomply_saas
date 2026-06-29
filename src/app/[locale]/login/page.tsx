'use client';

import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { getBillingPlan } from '@/lib/billing/plans';

function getAuthSuccessHref(locale: string, planId?: string | null) {
  const baseHref = `/${locale}/onboarding`;
  const safePlanId = getBillingPlan(planId)?.id;
  return safePlanId ? `${baseHref}?plan=${encodeURIComponent(safePlanId)}` : baseHref;
}

function getSafeNextPath(next: string | null, locale: string, planId?: string | null) {
  const fallback = getAuthSuccessHref(locale, planId);
  const normalizedNext = next?.trim();

  if (!normalizedNext || normalizedNext.length > 240 || normalizedNext.includes('://') || normalizedNext.startsWith('//')) {
    return fallback;
  }

  if (!normalizedNext.startsWith(`/${locale}/onboarding`)) {
    return fallback;
  }

  return normalizedNext;
}

export default function LoginPage() {
  const activeLocale = 'pt';
  const afterSignInUrl = getSafeNextPath(null, activeLocale, null);
  const signUpUrl = `/${activeLocale}/signup`;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <section className="mx-auto mt-16 max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl">
        <Link href={`/${activeLocale}`} className="mb-6 block text-center text-sm font-semibold text-white">
          RISCK COMPLY
        </Link>
        <div className="rounded-[1.5rem] bg-white p-2 text-black">
          <SignIn
            routing="hash"
            signUpUrl={signUpUrl}
            fallbackRedirectUrl={afterSignInUrl}
            forceRedirectUrl={afterSignInUrl}
          />
        </div>
        <Link href={signUpUrl} className="mt-5 block text-center text-sm font-medium text-white/55 transition hover:text-white">
          Criar conta
        </Link>
      </section>
    </main>
  );
}
