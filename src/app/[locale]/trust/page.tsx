import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

type Copy = { title: string; body: string; assurance: string; resource: string; cards: Array<{ title: string; description: string; href: string }> };

const cardSets: Record<SupportedLocale, Copy['cards']> = {
  en: [
    { title: 'Security overview', description: 'Authentication, RBAC, RLS, audit logs and current non-claims.', href: '/security' },
    { title: 'Data protection', description: 'Data categories, retention posture and DPA readiness.', href: '/data-processing' },
    { title: 'Subprocessors', description: 'Provider register for hosting, database, billing and CI/CD.', href: '/subprocessors' },
  ],
  pt: [
    { title: 'Visão geral de segurança', description: 'Autenticação, RBAC, RLS, audit logs e claims atuais.', href: '/security' },
    { title: 'Proteção de dados', description: 'Categorias de dados, retenção e prontidão DPA.', href: '/data-processing' },
    { title: 'Subprocessadores', description: 'Registo de hosting, base de dados, billing e CI/CD.', href: '/subprocessors' },
  ],
  es: [
    { title: 'Resumen de seguridad', description: 'Autenticación, RBAC, RLS, audit logs y non-claims actuales.', href: '/security' },
    { title: 'Protección de datos', description: 'Categorías de datos, retención y preparación DPA.', href: '/data-processing' },
    { title: 'Subprocesadores', description: 'Registro de hosting, base de datos, billing y CI/CD.', href: '/subprocessors' },
  ],
  fr: [
    { title: 'Vue sécurité', description: 'Authentification, RBAC, RLS, audit logs et non-claims actuels.', href: '/security' },
    { title: 'Protection des données', description: 'Catégories de données, rétention et préparation DPA.', href: '/data-processing' },
    { title: 'Sous-traitants', description: 'Registre hosting, base de données, billing et CI/CD.', href: '/subprocessors' },
  ],
  it: [
    { title: 'Panoramica sicurezza', description: 'Autenticazione, RBAC, RLS, audit log e non-claim attuali.', href: '/security' },
    { title: 'Protezione dati', description: 'Categorie dati, retention e preparazione DPA.', href: '/data-processing' },
    { title: 'Subprocessori', description: 'Registro hosting, database, billing e CI/CD.', href: '/subprocessors' },
  ],
  de: [
    { title: 'Security Overview', description: 'Authentifizierung, RBAC, RLS, Audit Logs und aktuelle Non-Claims.', href: '/security' },
    { title: 'Datenschutz', description: 'Datenkategorien, Retention und DPA Readiness.', href: '/data-processing' },
    { title: 'Unterauftragsverarbeiter', description: 'Register für Hosting, Datenbank, Billing und CI/CD.', href: '/subprocessors' },
  ],
};

const copy: Record<SupportedLocale, Copy> = {
  en: { title: 'Trust Center', body: 'Security, privacy and operational transparency without compliance washing.', assurance: 'EuroComply does not currently claim SOC 2, ISO 27001 certification or completed third-party testing. The platform is designed to support enterprise review through RBAC, RLS, audit logging and release evidence gates.', resource: 'Open resource', cards: cardSets.en },
  pt: { title: 'Centro de Confiança', body: 'Segurança, privacidade e transparência operacional sem compliance washing.', assurance: 'O EuroComply não afirma SOC 2, certificação ISO 27001 ou teste externo concluído. A plataforma foi desenhada para apoiar avaliação enterprise com RBAC, RLS, audit logs e release gates.', resource: 'Abrir recurso', cards: cardSets.pt },
  es: { title: 'Centro de Confianza', body: 'Seguridad, privacidad y transparencia operacional sin compliance washing.', assurance: 'EuroComply no afirma SOC 2, certificación ISO 27001 ni revisión externa completada. Está diseñado para apoyar revisión enterprise con RBAC, RLS, auditoría y evidencia de release.', resource: 'Abrir recurso', cards: cardSets.es },
  fr: { title: 'Centre de Confiance', body: 'Sécurité, confidentialité et transparence opérationnelle sans compliance washing.', assurance: 'EuroComply ne revendique pas SOC 2, certification ISO 27001 ou revue externe terminée. La plateforme est conçue pour soutenir les revues enterprise avec RBAC, RLS, audit logs et preuves de release.', resource: 'Ouvrir la ressource', cards: cardSets.fr },
  it: { title: 'Centro Fiducia', body: 'Sicurezza, privacy e trasparenza operativa senza compliance washing.', assurance: 'EuroComply non dichiara SOC 2, certificazione ISO 27001 o review esterna completata. È progettato per supportare review enterprise con RBAC, RLS, audit log ed evidenze di release.', resource: 'Apri risorsa', cards: cardSets.it },
  de: { title: 'Trust Center', body: 'Sicherheit, Datenschutz und operative Transparenz ohne Compliance Washing.', assurance: 'EuroComply beansprucht derzeit weder SOC 2, ISO 27001-Zertifizierung noch eine abgeschlossene externe Prüfung. Die Plattform ist für Enterprise Reviews mit RBAC, RLS, Audit Logs und Release Evidence Gates ausgelegt.', resource: 'Ressource öffnen', cards: cardSets.de },
};

export default async function TrustCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const page = copy[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Link href={`/${locale}`} className="text-sm text-white/70 hover:text-white">← EuroComply</Link>
          <h1 className="mt-8 text-5xl font-semibold tracking-[-0.05em]">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{page.body}</p>
          <p className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-slate-300">{page.assurance}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 md:grid-cols-3">
        {page.cards.map((card) => (
          <Link key={card.title} href={`/${locale}${card.href}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 hover:border-blue-300/40">
            <h2 className="text-xl font-semibold">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
            <span className="mt-5 inline-flex text-sm font-semibold text-blue-200">{page.resource}</span>
          </Link>
        ))}
      </section>
      <PublicFooter locale={locale} />
    </main>
  );
}
