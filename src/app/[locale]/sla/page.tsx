import Link from 'next/link';
import { ArrowLeft, Clock, Server, ShieldCheck, LifeBuoy, Activity } from 'lucide-react';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

const content: Record<SupportedLocale, { title: string; subtitle: string; back: string; sections: { title: string; body: string; icon: 'clock' | 'server' | 'shield' | 'support' | 'activity' }[]; note: string }> = {
  en: {
    title: 'Service Commitments',
    subtitle: 'Operational expectations for EuroComply customers evaluating availability, support and incident handling.',
    back: 'Back to Trust Center',
    sections: [
      { title: 'Availability target', body: 'EuroComply is designed for high availability on managed cloud infrastructure. Public status and operational checks support customer monitoring.', icon: 'activity' },
      { title: 'Incident response', body: 'Security and availability incidents are triaged by severity, with containment, customer communication and post-incident review procedures.', icon: 'shield' },
      { title: 'Support expectations', body: 'Business and Enterprise customers receive prioritised handling for billing, access and compliance-critical operational questions.', icon: 'support' },
      { title: 'Infrastructure continuity', body: 'Vercel, Supabase, Stripe and monitoring services are used with documented backup and continuity procedures.', icon: 'server' },
      { title: 'Enterprise agreements', body: 'Formal SLAs, response targets and custom commitments may be defined in enterprise contracts.', icon: 'clock' },
    ],
    note: 'This page describes the operational posture of EuroComply. Contractual commitments are governed by the executed agreement with each customer.',
  },
  pt: {
    title: 'Compromissos de Serviço',
    subtitle: 'Expectativas operacionais para clientes EuroComply que avaliam disponibilidade, suporte e resposta a incidentes.',
    back: 'Voltar ao Trust Center',
    sections: [
      { title: 'Objetivo de disponibilidade', body: 'O EuroComply é desenhado para elevada disponibilidade em infraestrutura cloud gerida. A página de estado e os checks operacionais apoiam a monitorização.', icon: 'activity' },
      { title: 'Resposta a incidentes', body: 'Incidentes de segurança e disponibilidade são triados por severidade, com contenção, comunicação ao cliente e revisão pós-incidente.', icon: 'shield' },
      { title: 'Expectativas de suporte', body: 'Clientes Business e Enterprise recebem tratamento prioritário para billing, acesso e questões operacionais críticas de compliance.', icon: 'support' },
      { title: 'Continuidade de infraestrutura', body: 'Vercel, Supabase, Stripe e serviços de monitorização são usados com procedimentos documentados de backup e continuidade.', icon: 'server' },
      { title: 'Acordos Enterprise', body: 'SLAs formais, objetivos de resposta e compromissos personalizados podem ser definidos em contratos enterprise.', icon: 'clock' },
    ],
    note: 'Esta página descreve a postura operacional do EuroComply. Compromissos contratuais são regidos pelo acordo assinado com cada cliente.',
  },
  es: {
    title: 'Compromisos de Servicio',
    subtitle: 'Expectativas operativas para clientes EuroComply que evalúan disponibilidad, soporte y gestión de incidentes.',
    back: 'Volver al Trust Center',
    sections: [
      { title: 'Objetivo de disponibilidad', body: 'EuroComply está diseñado para alta disponibilidad sobre infraestructura cloud gestionada. El estado público y los checks operativos ayudan a la monitorización.', icon: 'activity' },
      { title: 'Respuesta a incidentes', body: 'Los incidentes de seguridad y disponibilidad se clasifican por severidad, con contención, comunicación al cliente y revisión posterior.', icon: 'shield' },
      { title: 'Soporte prioritario', body: 'Los clientes Business y Enterprise reciben prioridad para billing, acceso y cuestiones operativas críticas de compliance.', icon: 'support' },
      { title: 'Continuidad de infraestructura', body: 'Vercel, Supabase, Stripe y servicios de monitorización se usan con procedimientos documentados de backup y continuidad.', icon: 'server' },
      { title: 'Acuerdos Enterprise', body: 'SLAs formales, objetivos de respuesta y compromisos personalizados pueden definirse en contratos enterprise.', icon: 'clock' },
    ],
    note: 'Esta página describe la postura operativa de EuroComply. Los compromisos contractuales se rigen por el acuerdo firmado con cada cliente.',
  },
  fr: {
    title: 'Engagements de Service',
    subtitle: 'Attentes opérationnelles pour les clients EuroComply évaluant disponibilité, support et réponse aux incidents.',
    back: 'Retour au Trust Center',
    sections: [
      { title: 'Objectif de disponibilité', body: 'EuroComply est conçu pour une haute disponibilité sur une infrastructure cloud managée. Le statut public et les contrôles opérationnels facilitent le suivi.', icon: 'activity' },
      { title: 'Réponse aux incidents', body: 'Les incidents de sécurité et de disponibilité sont triés par sévérité, avec confinement, communication client et revue post-incident.', icon: 'shield' },
      { title: 'Support prioritaire', body: 'Les clients Business et Enterprise bénéficient d’un traitement prioritaire pour la facturation, l’accès et les sujets critiques de conformité.', icon: 'support' },
      { title: 'Continuité d’infrastructure', body: 'Vercel, Supabase, Stripe et des services de supervision sont utilisés avec des procédures documentées de sauvegarde et continuité.', icon: 'server' },
      { title: 'Accords Enterprise', body: 'Des SLA formels, objectifs de réponse et engagements personnalisés peuvent être définis dans les contrats enterprise.', icon: 'clock' },
    ],
    note: 'Cette page décrit la posture opérationnelle d’EuroComply. Les engagements contractuels sont régis par l’accord signé avec chaque client.',
  },
  it: {
    title: 'Impegni di Servizio',
    subtitle: 'Aspettative operative per clienti EuroComply che valutano disponibilità, supporto e gestione degli incidenti.',
    back: 'Torna al Trust Center',
    sections: [
      { title: 'Obiettivo di disponibilità', body: 'EuroComply è progettato per alta disponibilità su infrastruttura cloud gestita. Stato pubblico e controlli operativi supportano il monitoraggio.', icon: 'activity' },
      { title: 'Risposta agli incidenti', body: 'Incidenti di sicurezza e disponibilità sono classificati per severità, con contenimento, comunicazione al cliente e revisione post-incidente.', icon: 'shield' },
      { title: 'Supporto prioritario', body: 'Clienti Business ed Enterprise ricevono priorità per billing, accesso e questioni operative critiche di compliance.', icon: 'support' },
      { title: 'Continuità infrastrutturale', body: 'Vercel, Supabase, Stripe e servizi di monitoraggio sono usati con procedure documentate di backup e continuità.', icon: 'server' },
      { title: 'Accordi Enterprise', body: 'SLA formali, obiettivi di risposta e impegni personalizzati possono essere definiti nei contratti enterprise.', icon: 'clock' },
    ],
    note: 'Questa pagina descrive la postura operativa di EuroComply. Gli impegni contrattuali sono regolati dall’accordo firmato con ciascun cliente.',
  },
  de: {
    title: 'Service Commitments',
    subtitle: 'Operative Erwartungen für EuroComply-Kunden zu Verfügbarkeit, Support und Incident Handling.',
    back: 'Zurück zum Trust Center',
    sections: [
      { title: 'Verfügbarkeitsziel', body: 'EuroComply ist für hohe Verfügbarkeit auf verwalteter Cloud-Infrastruktur ausgelegt. Öffentlicher Status und operative Checks unterstützen Monitoring.', icon: 'activity' },
      { title: 'Incident Response', body: 'Sicherheits- und Verfügbarkeitsvorfälle werden nach Schweregrad triagiert, mit Eindämmung, Kundenkommunikation und Nachprüfung.', icon: 'shield' },
      { title: 'Priorisierter Support', body: 'Business- und Enterprise-Kunden erhalten priorisierte Bearbeitung für Billing, Zugang und compliance-kritische operative Fragen.', icon: 'support' },
      { title: 'Infrastrukturkontinuität', body: 'Vercel, Supabase, Stripe und Monitoring-Dienste werden mit dokumentierten Backup- und Kontinuitätsverfahren genutzt.', icon: 'server' },
      { title: 'Enterprise-Vereinbarungen', body: 'Formale SLAs, Antwortziele und individuelle Zusagen können in Enterprise-Verträgen definiert werden.', icon: 'clock' },
    ],
    note: 'Diese Seite beschreibt die operative Haltung von EuroComply. Vertragliche Zusagen richten sich nach der jeweiligen Kundenvereinbarung.',
  },
};

function Icon({ name }: { name: 'clock' | 'server' | 'shield' | 'support' | 'activity' }) {
  const className = 'h-5 w-5';
  if (name === 'clock') return <Clock className={className} />;
  if (name === 'server') return <Server className={className} />;
  if (name === 'shield') return <ShieldCheck className={className} />;
  if (name === 'support') return <LifeBuoy className={className} />;
  return <Activity className={className} />;
}

export default function SlaPage({ params }: { params: { locale: string } }) {
  const locale = isSupportedLocale(params.locale) ? params.locale : 'en';
  const copy = content[locale];

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-[#E0E0E0]">
      <div className="mx-auto max-w-5xl">
        <Link href={`/${locale}/trust`} className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {copy.back}
        </Link>
        <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/30 md:p-12">
          <p className="text-sm uppercase tracking-[0.35em] text-white/45">EuroComply Trust</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">{copy.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">{copy.subtitle}</p>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {copy.sections.map((section) => (
            <article key={section.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:bg-white/[0.06]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white text-black">
                <Icon name={section.icon} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">{section.body}</p>
            </article>
          ))}
        </section>
        <p className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/55">{copy.note}</p>
      </div>
    </main>
  );
}
