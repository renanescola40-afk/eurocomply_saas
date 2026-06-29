import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { PublicFooter } from '@/components/marketing/public-footer';
import { type Locale } from '@/lib/i18n/routing';
import { getTrustCenterPages, type TrustPage } from '@/lib/trust-center/content';

export function TrustCenterPage({ locale, page }: { locale: Locale; page: TrustPage }) {
  const pages = getTrustCenterPages(locale);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href={`/${locale}`} className="flex items-center gap-2 font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            RISCK COMPLY
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
            <Link href={`/${locale}/trust`} className="hover:text-foreground">Trust</Link>
            <Link href={`/${locale}/security`} className="hover:text-foreground">Security</Link>
            <Link href={`/${locale}/privacy`} className="hover:text-foreground">Privacy</Link>
            <Link href={`/${locale}/status`} className="hover:text-foreground">Status</Link>
          </nav>
          <LanguageSwitcher currentLocale={locale} compact />
        </div>
      </header>

      <section className="border-b px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {page.status}
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{page.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{page.subtitle}</p>
            <p className="mt-6 text-sm text-muted-foreground">Last updated: {page.updated}</p>
          </div>
          <aside className="rounded-3xl border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trust pages</p>
            <div className="mt-4 grid gap-2">
              {pages.map((item) => (
                <Link key={item.slug} href={`/${locale}/${item.slug}`} className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${item.slug === page.slug ? 'bg-foreground text-background' : 'bg-background hover:bg-muted'}`}>
                  <span>{item.navLabel}</span>
                  <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
          {page.sections.map((section) => (
            <article key={section.title} className="rounded-3xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl border bg-background p-2"><FileText className="h-4 w-4" aria-hidden="true" /></span>
                <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
              </div>
              <p className="mt-4 leading-7 text-muted-foreground">{section.body}</p>
              {section.bullets ? (
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
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
