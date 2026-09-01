import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, Mail } from 'lucide-react';
import { PublicFooter } from '@/components/marketing/public-footer';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

const contactMailbox = ['comercial', 'risckcomply.com'].join('@');

type ContactSearchParams = {
  intent?: string | string[];
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<ContactSearchParams>;
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
  const { locale: requestedLocale } = await params;
  const resolvedSearchParams: ContactSearchParams = searchParams ? await searchParams : {};
  const activeLocale = (locales.includes(requestedLocale as Locale) ? requestedLocale : defaultLocale) as Locale;
  const intent = first(resolvedSearchParams.intent);
  const copy = copyFor(activeLocale, intent);
  const mailto = `mailto:${contactMailbox}?subject=${encodeURIComponent(copy.subject)}`;

  return (
    <main className="min-h-screen bg-[#050913] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <div className="w-full rounded-2xl border border-white/10 bg-[#0d1522] p-6 md:p-10">
          <Link
            href={`/${activeLocale}`}
            aria-label="RISCK COMPLY home"
            className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1522]"
          >
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={178} height={32} priority />
          </Link>
          <div className="mt-10 grid gap-8 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300/70">{copy.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">{copy.title}</h1>
              <p className="mt-5 text-sm leading-7 text-white/60 md:text-base">{copy.subtitle}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={mailto}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1522]"
                >
                  <Mail className="h-4 w-4" /> {copy.emailLabel}
                </Link>
                <Link
                  href={`/${activeLocale}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1522]"
                >
                  {copy.back} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#08101c] p-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-5">
                <CalendarDays className="h-5 w-5 text-blue-300" />
                <div>
                  <p className="text-sm font-semibold text-white">{copy.scope}</p>
                  <p className="text-xs text-white/45">{copy.disclaimer}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                {copy.bullets.map((item) => (
                  <li key={item} className="flex gap-3 border-b border-white/8 py-3 text-sm leading-6 text-white/65 last:border-b-0">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter locale={activeLocale} />
    </main>
  );
}
