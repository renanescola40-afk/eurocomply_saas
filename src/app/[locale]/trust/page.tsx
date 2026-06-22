import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, Database, FileCheck2, Globe2, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

const TRUST_COPY: Record<SupportedLocale, {
  eyebrow: string;
  title: string;
  description: string;
  assuranceTitle: string;
  assuranceBody: string;
  cards: Array<{ title: string; description: string; href: string; icon: 'shield' | 'scale' | 'database' | 'activity' | 'file' | 'lock' }>;
}> = {
  en: {
    eyebrow: 'Trust Center',
    title: 'Security, privacy and operational transparency without compliance washing.',
    description: 'EuroComply publishes current controls, open gaps and procurement-ready documentation so enterprise buyers can evaluate the platform honestly.',
    assuranceTitle: 'Current assurance status',
    assuranceBody: 'EuroComply is not currently ISO 27001 certified, does not currently have a SOC 2 report, and has not completed a third-party penetration test. The platform is designed to support enterprise review through RBAC, RLS, audit logging, controlled data flows and release evidence gates.',
    cards: [
      { title: 'Security overview', description: 'Authentication, RBAC, RLS, audit logs, monitoring posture and current non-claims.', href: '/security', icon: 'shield' },
      { title: 'Architecture', description: 'Next.js, Supabase, server-only admin operations, trust boundaries and data flow.', href: '/security', icon: 'database' },
      { title: 'Data processing', description: 'Data categories, privacy workflows, retention posture and DPA readiness.', href: '/data-processing', icon: 'database' },
      { title: 'Subprocessors', description: 'Draft provider register for hosting, database/auth/storage, billing, CI/CD and conditional services.', href: '/subprocessors', icon: 'database' },
      { title: 'Service commitments', description: 'Availability, incident handling, support expectations and enterprise service limitations.', href: '/sla', icon: 'activity' },
      { title: 'Responsible disclosure', description: 'Private vulnerability reporting process and security contact.', href: '/contact', icon: 'lock' },
      { title: 'Privacy policy', description: 'Personal data handling, legal bases and data subject rights information.', href: '/privacy', icon: 'lock' },
      { title: 'Data Processing Addendum', description: 'Draft processor commitments for customers using EuroComply with personal data.', href: '/dpa', icon: 'scale' },
      { title: 'Terms of service', description: 'Commercial and acceptable-use terms for the platform.', href: '/terms', icon: 'file' },
    ],
  },
  pt: {
    eyebrow: 'Centro de Confiança',
    title: 'Segurança, privacidade e transparência operacional sem compliance washing.',
    description: 'O EuroComply publica controlos atuais, lacunas abertas e documentação pronta para procurement para avaliação enterprise honesta.',
    assuranceTitle: 'Estado atual de assurance',
    assuranceBody: 'O EuroComply não é atualmente certificado ISO 27001, não tem atualmente relatório SOC 2 e ainda não concluiu pentest terceiro. A plataforma foi desenhada para apoiar avaliação enterprise com RBAC, RLS, audit logs, fluxos de dados controlados e release gates de evidência.',
    cards: [
      { title: 'Visão geral de segurança', description: 'Autenticação, RBAC, RLS, audit logs, monitorização e claims atuais.', href: '/security', icon: 'shield' },
      { title: 'Arquitetura', description: 'Next.js, Supabase, operações admin server-only, boundaries e data flow.', href: '/security', icon: 'database' },
      { title: 'Tratamento de dados', description: 'Categorias de dados, privacidade, retenção e prontidão de DPA.', href: '/data-processing', icon: 'database' },
      { title: 'Subprocessadores', description: 'Registo draft de hosting, base de dados/auth/storage, billing, CI/CD e serviços condicionais.', href: '/subprocessors', icon: 'database' },
      { title: 'Compromissos de serviço', description: 'Disponibilidade, incidentes, suporte e limitações enterprise.', href: '/sla', icon: 'activity' },
      { title: 'Divulgação responsável', description: 'Processo privado para vulnerabilidades e contacto de segurança.', href: '/contact', icon: 'lock' },
      { title: 'Política de privacidade', description: 'Dados pessoais, bases legais e direitos GDPR.', href: '/privacy', icon: 'lock' },
      { title: 'Acordo de tratamento de dados', description: 'Compromissos draft como subcontratante.', href: '/dpa', icon: 'scale' },
      { title: 'Termos de serviço', description: 'Termos comerciais e utilização aceitável.', href: '/terms', icon: 'file' },
    ],
  },
  es: {
    eyebrow: 'Centro de Confianza', title: 'Seguridad y transparencia operacional sin compliance washing.', description: 'EuroComply publica controles actuales, brechas y documentación para procurement enterprise.', assuranceTitle: 'Estado actual', assuranceBody: 'EuroComply no cuenta actualmente con certificación ISO 27001, no tiene informe SOC 2 y no ha completado un pentest de tercero. Está diseñado para apoyar revisión enterprise con RBAC, RLS, auditoría y evidencia de release.', cards: []
  },
  fr: {
    eyebrow: 'Centre de Confiance', title: 'Sécurité et transparence sans compliance washing.', description: 'EuroComply publie les contrôles actuels, limites et documents pour les évaluations enterprise.', assuranceTitle: 'Statut actuel', assuranceBody: 'EuroComply n’est pas certifié ISO 27001, ne dispose pas d’un rapport SOC 2 et n’a pas encore terminé de test d’intrusion tiers. La plateforme est conçue pour soutenir les revues enterprise avec RBAC, RLS, audit logs et preuves de release.', cards: []
  },
  it: {
    eyebrow: 'Centro Fiducia', title: 'Sicurezza e trasparenza senza compliance washing.', description: 'EuroComply pubblica controlli attuali, gap e documentazione per procurement enterprise.', assuranceTitle: 'Stato attuale', assuranceBody: 'EuroComply non è attualmente certificato ISO 27001, non ha un report SOC 2 e non ha completato un penetration test di terze parti. È progettato per supportare review enterprise con RBAC, RLS, audit log ed evidenze di release.', cards: []
  },
  de: {
    eyebrow: 'Trust Center', title: 'Sicherheit und Transparenz ohne Compliance Washing.', description: 'EuroComply veröffentlicht aktuelle Kontrollen, Lücken und Dokumentation für Enterprise-Prüfungen.', assuranceTitle: 'Aktueller Status', assuranceBody: 'EuroComply ist derzeit nicht ISO 27001-zertifiziert, verfügt nicht über einen SOC 2-Bericht und hat keinen externen Penetrationstest abgeschlossen. Die Plattform ist für Enterprise Reviews mit RBAC, RLS, Audit-Logs und Release Evidence Gates ausgelegt.', cards: []
  },
};

const fallbackCards = TRUST_COPY.en.cards;

const iconMap = {
  shield: ShieldCheck,
  scale: Scale,
  database: Database,
  activity: Activity,
  file: FileCheck2,
  lock: LockKeyhole,
};

export default async function TrustCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const copy = TRUST_COPY[locale];
  const cards = copy.cards.length > 0 ? copy.cards : fallbackCards;

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white">
            <Globe2 className="h-4 w-4" /> EuroComply
          </Link>
          <div className="mt-12 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/50">{copy.eyebrow}</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">{copy.title}</h1>
            <p className="mt-6 text-lg leading-8 text-white/65">{copy.description}</p>
          </div>

          <section className="mt-10 rounded-3xl border border-amber-200/20 bg-amber-200/[0.06] p-6 text-sm leading-7 text-amber-50/80">
            <h2 className="text-xl font-semibold text-white">{copy.assuranceTitle}</h2>
            <p className="mt-3">{copy.assuranceBody}</p>
          </section>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const Icon = iconMap[card.icon];
              return (
                <Link key={`${card.title}-${card.href}`} href={`/${locale}${card.href}`} className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold">{card.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">{card.description}</p>
                  <span className="mt-6 inline-flex text-sm font-semibold text-white/80 transition group-hover:text-white">Open resource</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}
