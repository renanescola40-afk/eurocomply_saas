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
    title: 'Security, privacy and operational transparency without compliance washing.',
    description: 'EuroComply publishes current controls, open gaps and procurement documentation so buyers can evaluate the platform honestly.',
    assurance: 'EuroComply only claims controls that are currently evidenced. Open release gaps remain visible until they are closed with runtime evidence.',
    resourceLabel: 'Open resource',
    cards: baseCards,
  },
  pt: {
    eyebrow: 'Centro de Confiança',
    title: 'Segurança, privacidade e transparência operacional sem compliance washing.',
    description: 'O EuroComply publica controlos atuais, lacunas abertas e documentação para avaliação honesta.',
    assurance: 'O EuroComply só afirma controlos com evidência atual. Lacunas de release continuam visíveis até serem fechadas com evidência runtime.',
    resourceLabel: 'Abrir recurso',
    cards: baseCards,
  },
  es: {
    eyebrow: 'Centro de Confianza',
    title: 'Seguridad, privacidad y transparencia operacional sin compliance washing.',
    description: 'EuroComply publica controles actuales, brechas abiertas y documentación para evaluación honesta.',
    assurance: 'EuroComply solo afirma controles con evidencia actual. Las brechas de release siguen visibles hasta cerrarse con evidencia runtime.',
    resourceLabel: 'Abrir recurso',
    cards: baseCards,
  },
  fr: {
    eyebrow: 'Centre de Confiance',
    title: 'Sécurité, confidentialité et transparence opérationnelle sans compliance washing.',
    description: 'EuroComply publie les contrôles actuels, les limites ouvertes et les documents de revue.',
    assurance: 'EuroComply ne revendique que les contrôles actuellement prouvés. Les écarts de release restent visibles jusqu’à preuve runtime.',
    resourceLabel: 'Ouvrir la ressource',
    cards: baseCards,
  },
  it: {
    eyebrow: 'Centro Fiducia',
    title: 'Sicurezza, privacy e trasparenza operativa senza compliance washing.',
    description: 'EuroComply pubblica controlli attuali, gap aperti e documentazione per una valutazione onesta.',
    assurance: 'EuroComply dichiara solo controlli supportati da evidenza attuale. I gap di release restano visibili fino alla prova runtime.',
    resourceLabel: 'Apri risorsa',
    cards: baseCards,
  },
  de: {
    eyebrow: 'Trust Center',
    title: 'Sicherheit, Datenschutz und operative Transparenz ohne Compliance Washing.',
    description: 'EuroComply veröffentlicht aktuelle Kontrollen, offene Lücken und Dokumentation für eine ehrliche Bewertung.',
    assurance: 'EuroComply beansprucht nur aktuell belegte Kontrollen. Release-Lücken bleiben sichtbar, bis Runtime-Nachweise vorliegen.',
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
          <Link href={`/${locale}`} className="text-sm text-white/70 hover:text-white">← EuroComply</Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">{page.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em]">{page.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{page.description}</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-slate-300">
            {page.assurance}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 md:grid-cols-2 lg:grid-cols-3">
        {page.cards.map((card) => (
          <Link key={card.title} href={`/${locale}${card.href}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-blue-300/40 hover:bg-white/[0.07]">
            <h2 className="text-xl font-semibold">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
            <span className="mt-5 inline-flex text-sm font-semibold text-blue-200">{page.resourceLabel}</span>
          </Link>
        ))}
      </section>

      <PublicFooter locale={locale} />
    </main>
  );
}
