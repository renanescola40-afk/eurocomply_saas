import Link from 'next/link';
import { Activity, CheckCircle2, Database, LockKeyhole, Server, ShieldCheck } from 'lucide-react';

import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

type StatusPageProps = {
  params: Promise<{ locale: string }>;
};

const copy = {
  en: {
    title: 'EuroComply system status',
    subtitle: 'Operational overview for public platform components. Sensitive infrastructure checks remain protected.',
    allSystems: 'Core services are designed for monitored, production-ready operation.',
    checks: ['Application availability', 'Authentication services', 'Compliance data layer', 'Document storage', 'Billing operations', 'Security monitoring'],
    private: 'Deep readiness checks are protected and available only to authorised operators.',
    back: 'Back to EuroComply',
  },
  pt: {
    title: 'Estado do sistema EuroComply',
    subtitle: 'Visão operacional pública dos componentes da plataforma. Verificações sensíveis de infraestrutura permanecem protegidas.',
    allSystems: 'Os serviços principais foram desenhados para operação monitorizada em produção.',
    checks: ['Disponibilidade da aplicação', 'Serviços de autenticação', 'Camada de dados de compliance', 'Armazenamento documental', 'Operações de faturação', 'Monitorização de segurança'],
    private: 'As verificações profundas de readiness são protegidas e disponíveis apenas para operadores autorizados.',
    back: 'Voltar ao EuroComply',
  },
  es: {
    title: 'Estado del sistema EuroComply',
    subtitle: 'Resumen operativo público de los componentes de la plataforma. Las comprobaciones sensibles permanecen protegidas.',
    allSystems: 'Los servicios principales están diseñados para operación monitorizada en producción.',
    checks: ['Disponibilidad de la aplicación', 'Servicios de autenticación', 'Capa de datos de compliance', 'Almacenamiento documental', 'Operaciones de facturación', 'Monitorización de seguridad'],
    private: 'Las comprobaciones profundas de readiness están protegidas y disponibles solo para operadores autorizados.',
    back: 'Volver a EuroComply',
  },
  fr: {
    title: 'État du système EuroComply',
    subtitle: 'Vue opérationnelle publique des composants de la plateforme. Les contrôles sensibles restent protégés.',
    allSystems: 'Les services principaux sont conçus pour une exploitation supervisée en production.',
    checks: ['Disponibilité applicative', 'Services d’authentification', 'Couche de données compliance', 'Stockage documentaire', 'Opérations de facturation', 'Supervision sécurité'],
    private: 'Les contrôles profonds de readiness sont protégés et réservés aux opérateurs autorisés.',
    back: 'Retour à EuroComply',
  },
  it: {
    title: 'Stato del sistema EuroComply',
    subtitle: 'Panoramica operativa pubblica dei componenti della piattaforma. I controlli sensibili restano protetti.',
    allSystems: 'I servizi principali sono progettati per operazioni monitorate in produzione.',
    checks: ['Disponibilità applicativa', 'Servizi di autenticazione', 'Layer dati compliance', 'Archiviazione documentale', 'Operazioni di fatturazione', 'Monitoraggio sicurezza'],
    private: 'I controlli approfonditi di readiness sono protetti e disponibili solo agli operatori autorizzati.',
    back: 'Torna a EuroComply',
  },
  de: {
    title: 'EuroComply-Systemstatus',
    subtitle: 'Öffentliche Betriebsübersicht der Plattformkomponenten. Sensible Infrastrukturprüfungen bleiben geschützt.',
    allSystems: 'Die Kernservices sind für überwachten Produktionsbetrieb ausgelegt.',
    checks: ['Anwendungsverfügbarkeit', 'Authentifizierungsdienste', 'Compliance-Datenschicht', 'Dokumentenspeicher', 'Abrechnungsprozesse', 'Sicherheitsüberwachung'],
    private: 'Tiefe Readiness-Prüfungen sind geschützt und nur autorisierten Betreibern zugänglich.',
    back: 'Zurück zu EuroComply',
  },
} satisfies Record<Locale, { title: string; subtitle: string; allSystems: string; checks: string[]; private: string; back: string }>;

const icons = [Activity, LockKeyhole, Database, Server, CheckCircle2, ShieldCheck];

export default async function StatusPage({ params }: StatusPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  const t = copy[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <Link href={`/${locale}`} className="text-sm text-white/60 transition hover:text-white">
          {t.back}
        </Link>
        <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur md:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Operational readiness
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{t.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">{t.subtitle}</p>
          <p className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5 text-white/75">{t.allSystems}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {t.checks.map((check, index) => {
            const Icon = icons[index] ?? CheckCircle2;
            return (
              <div key={check} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <Icon className="h-5 w-5 text-white" />
                <p className="mt-4 font-medium">{check}</p>
                <p className="mt-2 text-sm text-white/55">Monitored component</p>
              </div>
            );
          })}
        </div>

        <p className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/60">
          {t.private}
        </p>
      </section>
    </main>
  );
}
