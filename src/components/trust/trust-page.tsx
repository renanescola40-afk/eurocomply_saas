import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { ProviderRuntimeDisclosure } from '@/components/trust/provider-runtime-disclosure';
import { type Locale } from '@/lib/i18n/routing';
import { getLocalizedTrustCenterPages, getTrustCenterUi } from '@/lib/trust-center/localized-content';
import { type TrustPage } from '@/lib/trust-center/content';
import { getLegalPublicationState } from '@/server/legal/legal-publication-state';

export function TrustCenterPage({ locale, page }: { locale: Locale; page: TrustPage }) {
  const pages = getLocalizedTrustCenterPages(locale);
  const ui = getTrustCenterUi(locale);
  const legalPublication = getLegalPublicationState();

  return (
    <main className="min-h-screen bg-[#050913] text-white">
      <header className="border-b border-slate-800/80 bg-[#08101c]/95 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href={`/${locale}`}
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050913]"
            aria-label="RISCK COMPLY home"
          >
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={220} height={46} priority className="h-8 w-auto sm:h-9" />
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-white/48 lg:flex" aria-label={ui.portal}>
            <Link href={`/${locale}/trust`} className="rounded-md transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{ui.trust}</Link>
            <Link href={`/${locale}/security`} className="rounded-md transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{ui.security}</Link>
            <Link href={`/${locale}/privacy`} className="rounded-md transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{ui.privacy}</Link>
            <Link href={`/${locale}/status`} className="rounded-md transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{ui.status}</Link>
          </nav>
          <LanguageSwitcher currentLocale={locale} compact variant="dark" />
        </div>
      </header>

      <section className="border-b border-slate-800/80 px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.16fr_0.84fr] lg:items-start">
          <div>
            <p className="inline-flex max-w-3xl items-start gap-2 rounded-lg border border-blue-400/15 bg-blue-500/[0.06] px-3 py-2 text-xs font-medium leading-5 text-blue-100/80">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-300" aria-hidden="true" />
              {page.status}
            </p>
            <h1 className="mt-6 max-w-5xl text-4xl font-semibold tracking-[-0.055em] text-white md:text-6xl">{page.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/54">{page.subtitle}</p>

            <div className="mt-8 grid overflow-hidden rounded-xl border border-slate-800/80 bg-[#0d1522] sm:grid-cols-3">
              {ui.proofBadges.map((label, index) => (
                <div key={label} className={`px-4 py-4 text-sm font-medium text-white/66 ${index > 0 ? 'border-t border-slate-800 sm:border-l sm:border-t-0' : ''}`}>
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-4" lang="en">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100/78">{legalPublication.label}</p>
              <p className="mt-2 text-xs leading-6 text-white/46">{legalPublication.notice}</p>
            </div>
            <p className="mt-5 text-sm text-white/32">{ui.lastUpdated}: {page.updated}</p>
          </div>

          <aside className="overflow-hidden rounded-xl border border-slate-800/80 bg-[#0d1522]">
            <div className="border-b border-slate-800 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300/65">{ui.portal}</p>
            </div>
            <div className="divide-y divide-slate-800">
              {pages.map((item) => {
                const active = item.slug === page.slug;
                return (
                  <Link
                    key={item.slug}
                    href={`/${locale}/${item.slug}`}
                    className={`group flex items-center justify-between px-5 py-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${active ? 'bg-blue-500/[0.11] text-blue-100' : 'text-white/52 hover:bg-blue-500/[0.055] hover:text-white'}`}
                  >
                    <span>{item.navLabel}</span>
                    <ArrowRight className={`h-4 w-4 transition ${active ? 'text-blue-200/75' : 'text-white/24 group-hover:translate-x-0.5 group-hover:text-blue-200/70'}`} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-xl border border-slate-800/80 bg-[#0d1522] p-5 md:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/15 bg-blue-500/[0.06] text-blue-300">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-white/88">{section.title}</h2>
              </div>
              <p className="mt-4 leading-7 text-white/48">{section.body}</p>
              {section.bullets ? (
                <ul className="mt-5 space-y-3 text-sm text-white/48">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <ProviderRuntimeDisclosure locale={locale} slug={page.slug} />
      <PublicFooter locale={locale} />
    </main>
  );
}
