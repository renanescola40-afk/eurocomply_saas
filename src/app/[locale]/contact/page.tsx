import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { PublicFooter } from '@/components/marketing/public-footer';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

export const revalidate = 300;
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ intent?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function copyFor(locale: Locale, intent?: string) {
  const demoIntent = intent === 'demo';
  if (locale === 'pt') {
    return {
      eyebrow: demoIntent ? 'Marcar demo' : 'Falar com vendas',
      title: demoIntent ? 'Veja como o RISCK COMPLY organiza AI Act readiness.' : 'Fale connosco sobre rollout enterprise.',
      subtitle: 'Conte-nos o contexto da empresa, número de equipas, países, sistemas de IA e necessidades de procurement. Respondemos com o próximo passo mais adequado.',
      emailLabel: 'Enviar pedido por email',
      back: 'Voltar à landing',
      scope: 'Escopo da conversa',
      disclaimer: 'Sem garantia legal. Apenas readiness e workflow de evidências.',
      bullets: ['Inventário de IA e owners', 'Classificação de risco e evidências', 'Políticas e governance reports', 'Procurement e security review'],
      subject: demoIntent ? 'Demo RISCK COMPLY' : 'Enterprise sales RISCK COMPLY',
    };
  }

  return {
    eyebrow: demoIntent ? 'Book demo' : 'Talk to sales',
    title: demoIntent ? 'See how RISCK COMPLY organizes AI Act readiness.' : 'Talk to us about enterprise rollout.',
    subtitle: 'Share your company context, teams, countries, AI systems and procurement needs. We will respond with the most relevant next step.',
    emailLabel: 'Send request by email',
    back: 'Back to landing',
    scope: 'Buyer conversation scope',
    disclaimer: 'No legal guarantee. Readiness and evidence workflow only.',
    bullets: ['AI inventory and owners', 'Risk classification and evidence', 'Policies and governance reports', 'Procurement and security review'],
    subject: demoIntent ? 'RISCK COMPLY demo request' : 'RISCK COMPLY enterprise sales',
  };
}

export default async function ContactPage({ params, searchParams }: PageProps) {
  const [{ locale: requestedLocale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const activeLocale = (locales.includes(requestedLocale as Locale) ? requestedLocale : defaultLocale) as Locale;
  const intent = first(resolvedSearchParams.intent);
  const copy = copyFor(activeLocale, intent);
  const mailto = `mailto:renansilva2002@gmail.com?subject=${encodeURIComponent(copy.subject)}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(14,165,233,.25),transparent_30rem),linear-gradient(180deg,#050505_0%,#071018_52%,#050505_100%)]" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur md:p-10">
          <Link href={`/${activeLocale}`} className="inline-flex items-center gap-3 text-sm font-semibold text-white/70 hover:text-white">
            <ShieldCheck className="h-4 w-4" /> RISCK COMPLY
          </Link>
          <div className="mt-10 grid gap-8 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/60">{copy.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">{copy.title}</h1>
              <p className="mt-5 text-sm leading-7 text-white/58 md:text-base">{copy.subtitle}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={mailto} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black hover:bg-zinc-200">
                  <Mail className="h-4 w-4" /> {copy.emailLabel}
                </Link>
                <Link href={`/${activeLocale}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
                  {copy.back} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                <CalendarDays className="h-5 w-5 text-cyan-100" />
                <div>
                  <p className="text-sm font-semibold text-white">{copy.scope}</p>
                  <p className="text-xs text-white/42">{copy.disclaimer}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                {copy.bullets.map((item) => (
                  <li key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/62">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <div className="relative z-10"><PublicFooter locale={activeLocale} /></div>
    </main>
  );
}
