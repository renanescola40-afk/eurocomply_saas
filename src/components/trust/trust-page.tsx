import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { type Locale } from '@/lib/i18n/routing';
import { getTrustCenterPages, type TrustPage } from '@/lib/trust-center/content';

export function TrustCenterPage({ locale, page }: { locale: Locale; page: TrustPage }) {
  const pages = getTrustCenterPages(locale);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(14,165,233,.24),transparent_30rem),radial-gradient(circle_at_88%_4%,rgba(16,185,129,.14),transparent_30rem),linear-gradient(180deg,#050505_0%,#071018_52%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />

      <header className="relative z-10 border-b border-white/10 bg-[#050505]/78 px-6 py-4 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href={`/${locale}`} className="flex items-center gap-3 font-semibold tracking-tight text-white">
            <span className="rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.08] p-2 text-cyan-50">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            RISCK COMPLY
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-white/55 md:flex">
            <Link href={`/${locale}/trust`} className="transition hover:text-white">Trust</Link>
            <Link href={`/${locale}/security`} className="transition hover:text-white">Security</Link>
            <Link href={`/${locale}/privacy`} className="transition hover:text-white">Privacy</Link>
            <Link href={`/${locale}/status`} className="transition hover:text-white">Status</Link>
          </nav>
          <LanguageSwitcher currentLocale={locale} compact variant="dark" />
        </div>
      </header>

      <section className="relative z-10 border-b border-white/10 px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.16fr_0.84fr] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/82">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {page.status}
            </p>
            <h1 className="mt-7 max-w-5xl text-4xl font-semibold tracking-[-0.055em] text-white md:text-6xl">{page.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{page.subtitle}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {['Security review', 'Procurement diligence', 'Evidence preparation'].map((label) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-medium text-white/72">
                  {label}
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-white/38">Last updated: {page.updated}</p>
          </div>
          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/65">Trust portal</p>
            <div className="mt-5 grid gap-2">
              {pages.map((item) => (
                <Link key={item.slug} href={`/${locale}/${item.slug}`} className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${item.slug === page.slug ? 'border-white bg-white text-black' : 'border-white/10 bg-black/20 text-white/62 hover:border-cyan-200/25 hover:bg-cyan-300/[0.06] hover:text-white'}`}>
                  <span>{item.navLabel}</span>
                  <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="relative z-10 px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-[1.75rem] border border-white/10 bg-black/28 p-6 shadow-xl backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.07] p-2 text-cyan-50"><FileText className="h-4 w-4" aria-hidden="true" /></span>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">{section.title}</h2>
              </div>
              <p className="mt-4 leading-7 text-white/56">{section.body}</p>
              {section.bullets ? (
                <ul className="mt-5 space-y-3 text-sm text-white/54">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100/70" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
