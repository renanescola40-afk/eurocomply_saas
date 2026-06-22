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
  { title: 'Security overview', description: 'Authentication, RBAC, audit logs, monitoring posture and current non-claims.', href: '/security' },
  { title: 'Architecture', description: 'Application stack, server-only operations, trust boundaries and data flow.', href: '/security' },
  { title: 'Data protection', description: 'Data categories, retention posture, deletion/export support and DPA readiness.', href: '/data-processing' },
  { title: 'Subprocessors', description: 'Provider register for hosting, database, billing, CI/CD and conditional services.', href: '/subprocessors' },
  { title: 'Responsible disclosure', description: 'Private contact path for coordinated reports.', href: '/contact' },
];

const TRUST_COPY: Record<SupportedLocale, TrustCopy> = {
  en: {
    eyebrow: 'Trust Center',
    title: 'Security, privacy and operational transparency without compliance washing.',
    description: 'EuroComply publishes current controls, open gaps and procurement-ready documentation so enterprise buyers can evaluate the platform honestly.',
    assurance: 'EuroComply does not currently claim external security certifications or completed third-party penetration testing. The platform is designed to support enterprise review through RBAC, RLS, audit logging, controlled data flows and release evidence gates.',
    resourceLabel: 'Open resource',
    cards: baseCards,
  },
  pt: {
    eyebrow: 'Centro de Confiança',
    title: 'Segurança, privacidade e transparência operacional sem compliance washing.',
    description: 'O EuroComply publica controlos atuais, lacunas abertas e documentação pronta para procurement enterprise.',
    assurance: 'O EuroComply não afirma certificações externas de segurança ou teste externo concluído. A plataforma foi desenhada para apoiar avaliação enterprise com RBAC, RLS, audit logs e release gates.',
    resourceLabel: 'Abrir recurso',
    cards: [
      { title: 'Visão geral de segurança', description: 'Autenticação, RBAC, audit logs, monitorização e claims atuais.', href: '/security' },
      { title: 'Arquitetura', description: 'Stack aplicacional, operações server-only, boundaries e fluxo de dados.', href: '/security' },
      { title: 'Proteção de dados', description: 'Categorias de dados, retenção, export/delete e prontidão DPA.', href: '/data-processing' },
      { title: 'Subprocessadores', description: 'Registo de hosting, base de dados, billing, CI/CD e serviços condicionais.', href: '/subprocessors' },
      { title: 'Divulgação responsável', description: 'Contacto privado para reports coordenados.', href: '/contact' },
    ],
  },
  es: {
    eyebrow: 'Centro de Confianza',
    title: 'Seguridad, privacidad y transparencia operacional sin compliance washing.',
    description: 'EuroComply publica controles actuales, brechas abiertas y documentación lista para evaluación enterprise.',
    assurance: 'EuroComply no afirma certificaciones externas de seguridad ni revisión externa completada. Está diseñado para apoyar revisión enterprise con RBAC, RLS, auditoría y evidencia de release.',
    resourceLabel: 'Abrir recurso',
    cards: baseCards,
  },
  fr: {
    eyebrow: 'Centre de Confiance',
    title: 'Sécurité, confidentialité et transparence opérationnelle sans compliance washing.',
    description: 'EuroComply publie les contrôles actuels, les limites ouvertes et les documents prêts pour revue enterprise.',
    assurance: 'EuroComply ne revendique pas de certifications de sécurité externes ou de revue externe terminée. La plateforme est conçue pour soutenir les revues enterprise avec RBAC, RLS, audit logs et preuves de release.',
    resourceLabel: 'Ouvrir la ressource',
    cards: baseCards,
  },
  it: {
    eyebrow: 'Centro Fiducia',
    title: 'Sicurezza, privacy e trasparenza operativa senza compliance washing.',
    description: 'EuroComply pubblica controlli attuali, gap aperti e documentazione pronta per review enterprise.',
    assurance: 'EuroComply non dichiara certificazioni esterne di sicurezza o review esterna completata. È progettato per supportare review enterprise con RBAC, RLS, audit log ed evidenze di release.',
    resourceLabel: 'Apri risorsa',
    cards: baseCards,
  },
  de: {
    eyebrow: 'Trust Center',
    title: 'Sicherheit, Datenschutz und operative Transparenz ohne Compliance Washing.',
    description: 'EuroComply veröffentlicht aktuelle Kontrollen, offene Lücken und Dokumentation für Enterprise Reviews.',
    assurance: 'EuroComply beansprucht derzeit keine externen Sicherheitszertifizierungen und keine abgeschlossene externe Prüfung. Die Plattform ist für Enterprise Reviews mit RBAC, RLS, Audit Logs und Release Evidence Gates ausgelegt.',
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
          <Link href={`/${locale}`} className="text-sm text-white/70 hover:text-white">EuroComply</Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em]">{copy.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{copy.description}</p>
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
