import Image from 'next/image';
import Link from 'next/link';

import { locales, type Locale } from '@/lib/i18n/routing';
import { getTrustCenterPages } from '@/lib/trust-center/content';

type FooterLink = { label: string; href: string };
type FooterCopy = {
  tagline: string;
  assuranceNote: string;
  productTitle: string;
  companyTitle: string;
  trustTitle: string;
  productLinks: FooterLink[];
  companyLinks: FooterLink[];
};

const productLinks: FooterLink[] = [
  { label: 'Platform', href: '/#platform' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Enterprise', href: '/enterprise' },
  { label: 'Request demo', href: '/book-demo' },
];

function getActiveLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

function localizeHref(locale: Locale, href: string) {
  if (href.startsWith('/#')) return `/${locale}${href.slice(1)}`;
  return `/${locale}${href}`;
}

export function PublicFooter({ locale }: { locale: string }) {
  const activeLocale = getActiveLocale(locale);
  const trustLinks = getTrustCenterPages(activeLocale).map((page) => ({ label: page.navLabel, href: `/${page.slug}` }));

  return (
    <footer className="border-t border-white/10 bg-[#050505] px-6 py-12 text-sm text-white/55">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.45fr_1fr_1fr]">
        <div>
          <Image src="/brand/risck-comply-wordmark.svg" alt="Risck Comply wordmark" width={170} height={42} className="h-10 w-auto object-contain" />
          <p className="mt-4 max-w-md leading-7 text-white/58">
            AI Act readiness, governance evidence and risk workflows for European teams preparing for compliance review.
          </p>
          <p className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] px-4 py-3 text-xs leading-5 text-cyan-50/72">
            Built for evidence preparation and operational governance support. No certification, audit or compliance guarantee is claimed.
          </p>
        </div>
        <nav aria-label="Product links">
          <p className="font-semibold text-white">Platform</p>
          <ul className="mt-4 space-y-2.5">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link href={localizeHref(activeLocale, link.href)} className="transition hover:text-white">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Trust links">
          <p className="font-semibold text-white">Trust</p>
          <ul className="mt-4 space-y-2.5">
            {trustLinks.map((link) => (
              <li key={link.href}>
                <Link href={localizeHref(activeLocale, link.href)} className="transition hover:text-white">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
