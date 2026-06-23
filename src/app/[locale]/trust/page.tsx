import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

type TrustCard = { title: string; description: string; href: string };

type TrustCopy = {
  eyebrow: string;
  title: string;
  description: string;
  assurance: string;
  resourceLabel: string;
  cards: TrustCard[];
};

const baseCards: TrustCard[] = [
  { title: 'Overview', description: 'Current controls, operating model and known release limits.', href: '/security' },
  { title: 'Architecture', description: 'Application stack, trust boundaries and data flow.', href: '/security' },
  { title: 'Data protection', description: 'Data categories, retention posture and DPA readiness.', href: '/data-processing' },
  { title: 'Providers', description: 'Hosting, database, billing, CI/CD and conditional services.', href: '/subprocessors' },
  { title: 'Contact', description: 'Contact path for product, privacy and trust questions.', href: '/contact' },
];

const TRUST_COPY: Record<SupportedLocale, TrustCopy> = {
  en: {
    eyebrow: 'Trust Center',
    title: 'Security, privacy and operational transparency.',
    description: 'Risck comply publishes current controls, open gaps and procurement-ready documentation so enterprise buyers can evaluate the platform honestly.',
    assurance: 'Risck comply publishes current controls, open gaps and release evidence for enterprise review.',
    resourceLabel: 'Open resource',
    cards: baseCards,
  },
  pt: {
    eyebrow: 'Centro de Confiança',
    title: 'Segurança, privacidade e transparência operacional.',
    description: 'O Risck comply publica controlos atuais, lacunas abertas e documentação pronta para procurement enterprise.',
    assurance: 'O Risck comply publica controlos atuais, lacunas abertas e evidência de release para revisão enterprise.',
    resourceLabel: 'Abrir recurso',
    cards: baseCards,
  },
  es: {
    eyebrow: 'Centro de Confianza',
    title: 'Seguridad, privacidad y transparencia operacional.',
    description: 'Risck comply publica controles actuales, brechas abiertas y documentación lista para evaluación enterprise.',
    assurance: 'Risck comply publica controles actuales, brechas abiertas y evidencia de release para revisión enterprise.',
    resourceLabel: 'Abrir recurso',
    cards: baseCards,
  },
  fr: {
    eyebrow: 'Centre de Confiance',
    title: 'Sécurité, confidentialité et transparence opérationnelle.',
    description: 'Risck comply publie les contrôles actuels, les limites ouvertes et les documents prêts pour revue enterprise.',
    assurance: 'Risck comply publie les contrôles actuels, les limites ouvertes et les preuves de release pour revue enterprise.',
    resourceLabel: 'Ouvrir la ressource',
    cards: baseCards,
  },
  it: {
    eyebrow: 'Centro Fiducia',
    title: 'Sicurezza, privacy e trasparenza operativa.',
    description: 'Risck comply pubblica controlli attuali, gap aperti e documentazione pronta per review enterprise.',
    assurance: 'Risck comply pubblica controlli attuali, gap aperti ed evidenze di release per review enterprise.',
    resourceLabel: 'Apri risorsa',
    cards: baseCards,
  },
  de: {
    eyebrow: 'Trust Center',
    title: 'Sicherheit, Datenschutz und operative Transparenz.',
    description: 'Risck comply veröffentlicht aktuelle Kontrollen, offene Lücken und Dokumentation für Enterprise Reviews.',
    assurance: 'Risck comply veröffentlicht aktuelle Kontrollen, offene Lücken und Release Evidence Gates für Enterprise Reviews.',
    resourceLabel: 'Ressource öffnen',
    cards: baseCards,
  },
};

export default async function TrustCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const copy = TRUST_COPY[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}`} className="text-sm text-white/70 hover:text-white">Risck comply</Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em]">{copy.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{copy.description}</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-slate-300">
            {copy.assurance}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 md:grid-cols-2 lg:grid-cols-3">
        {copy.cards.map((card) => (
          <Link key={card.title} href={`/${locale}${card.href}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-blue-300/40 hover:bg-white/[0.07]">
            <h2 className="text-xl font-semibold">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
            <span className="mt-5 inline-flex text-sm font-semibold text-blue-200">{copy.resourceLabel}</span>
          </Link>
        ))}
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
