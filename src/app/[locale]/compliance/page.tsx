import Link from 'next/link';
import { Award, CheckCircle2, FileCheck2, Landmark, ShieldCheck } from 'lucide-react';
import { isSupportedLocale, normalizeLocale } from '@/lib/i18n/locales';

const copy = {
  en: {
    eyebrow: 'Compliance posture',
    title: 'Built for European compliance teams.',
    intro: 'Risck comply helps companies organise evidence, responsibilities, regulatory deadlines and audit trails across European operations.',
    items: [
      ['GDPR-aligned workflows', 'Data subject exports, deletion request workflow and processor transparency are designed around EU privacy expectations.'],
      ['DORA, NIS2 and AI Act roadmap', 'Premium modules are prepared for regulated companies that need stronger operational resilience and governance controls.'],
      ['Audit-ready evidence', 'Controlled documents, risk records, approvals and activity logs help teams prove what happened and when.'],
      ['ISO 27001 preparation', 'Security practices, incident response and continuity documentation are maintained as part of the trust program.'],
    ],
    cta: 'View Security',
    secondary: 'Open Trust Center',
    note: 'This page is a product and security overview. Formal legal commitments are governed by the signed agreement, DPA and applicable order form.',
  },
  pt: {
    eyebrow: 'Postura de compliance',
    title: 'Construído para equipas europeias de compliance.',
    intro: 'O Risck comply ajuda empresas a organizar evidências, responsabilidades, prazos regulatórios e trilhos de auditoria em operações europeias.',
    items: [
      ['Workflows alinhados com GDPR', 'Exportação de dados, pedidos de apagamento e transparência de subprocessadores foram desenhados para expectativas europeias de privacidade.'],
      ['Roadmap DORA, NIS2 e AI Act', 'Módulos premium estão preparados para empresas reguladas que precisam de resiliência operacional e governação mais forte.'],
      ['Evidência pronta para auditoria', 'Documentos controlados, riscos, aprovações e logs de atividade ajudam a provar o que aconteceu e quando.'],
      ['Preparação ISO 27001', 'Práticas de segurança, resposta a incidentes e continuidade são mantidas como parte do programa de confiança.'],
    ],
    cta: 'Ver Segurança',
    secondary: 'Abrir Trust Center',
    note: 'Esta página é uma visão geral de produto e segurança. Compromissos legais formais são regidos pelo contrato assinado, DPA e ordem aplicável.',
  },
  es: {
    eyebrow: 'Postura de compliance',
    title: 'Diseñado para equipos europeos de compliance.',
    intro: 'Risck comply ayuda a organizar evidencias, responsabilidades, plazos regulatorios y trazas de auditoría en operaciones europeas.',
    items: [
      ['Flujos alineados con GDPR', 'Exportaciones de datos, solicitudes de supresión y transparencia de subencargados están diseñadas para expectativas europeas de privacidad.'],
      ['Roadmap DORA, NIS2 y AI Act', 'Módulos premium preparados para compañías reguladas que necesitan resiliencia operativa y gobierno más sólido.'],
      ['Evidencia lista para auditoría', 'Documentos controlados, riesgos, aprobaciones y logs ayudan a demostrar qué ocurrió y cuándo.'],
      ['Preparación ISO 27001', 'Prácticas de seguridad, respuesta a incidentes y continuidad forman parte del programa de confianza.'],
    ],
    cta: 'Ver Seguridad',
    secondary: 'Abrir Trust Center',
    note: 'Esta página es una visión general de producto y seguridad. Los compromisos legales formales se rigen por el contrato firmado, DPA y pedido aplicable.',
  },
  fr: {
    eyebrow: 'Posture de conformité',
    title: 'Conçu pour les équipes européennes de conformité.',
    intro: 'Risck comply aide les entreprises à organiser preuves, responsabilités, échéances réglementaires et journaux d’audit dans leurs opérations européennes.',
    items: [
      ['Processus alignés GDPR', 'Exports de données, demandes de suppression et transparence des sous-traitants sont pensés pour les attentes européennes de confidentialité.'],
      ['Feuille de route DORA, NIS2 et AI Act', 'Modules premium préparés pour les entreprises réglementées nécessitant résilience opérationnelle et gouvernance renforcée.'],
      ['Preuves prêtes pour audit', 'Documents contrôlés, risques, approbations et journaux d’activité aident à prouver ce qui s’est passé et quand.'],
      ['Préparation ISO 27001', 'Pratiques de sécurité, réponse aux incidents et continuité font partie du programme de confiance.'],
    ],
    cta: 'Voir Sécurité',
    secondary: 'Ouvrir Trust Center',
    note: 'Cette page est une vue d’ensemble produit et sécurité. Les engagements juridiques formels sont régis par le contrat signé, le DPA et le bon de commande applicable.',
  },
  it: {
    eyebrow: 'Postura di compliance',
    title: 'Progettato per team europei di compliance.',
    intro: 'Risck comply aiuta le aziende a organizzare evidenze, responsabilità, scadenze normative e audit trail nelle operazioni europee.',
    items: [
      ['Workflow allineati al GDPR', 'Export dei dati, richieste di cancellazione e trasparenza dei subprocessori sono progettati per le aspettative europee sulla privacy.'],
      ['Roadmap DORA, NIS2 e AI Act', 'Moduli premium preparati per aziende regolamentate che richiedono resilienza operativa e governance più forte.'],
      ['Evidenze pronte per audit', 'Documenti controllati, rischi, approvazioni e log aiutano a dimostrare cosa è accaduto e quando.'],
      ['Preparazione ISO 27001', 'Pratiche di sicurezza, risposta agli incidenti e continuità fanno parte del programma di fiducia.'],
    ],
    cta: 'Vedi Sicurezza',
    secondary: 'Apri Trust Center',
    note: 'Questa pagina è una panoramica di prodotto e sicurezza. Gli impegni legali formali sono regolati dal contratto firmato, DPA e ordine applicabile.',
  },
  de: {
    eyebrow: 'Compliance-Positionierung',
    title: 'Entwickelt für europäische Compliance-Teams.',
    intro: 'Risck comply hilft Unternehmen, Nachweise, Verantwortlichkeiten, regulatorische Fristen und Audit-Trails über europäische Abläufe hinweg zu organisieren.',
    items: [
      ['GDPR-orientierte Workflows', 'Datenexporte, Löschanfragen und Transparenz zu Unterauftragsverarbeitern sind auf europäische Datenschutzanforderungen ausgelegt.'],
      ['Roadmap für DORA, NIS2 und AI Act', 'Premium-Module für regulierte Unternehmen mit Bedarf an operativer Resilienz und stärkerer Governance.'],
      ['Auditfähige Nachweise', 'Kontrollierte Dokumente, Risiken, Freigaben und Aktivitätsprotokolle helfen zu belegen, was wann passiert ist.'],
      ['ISO-27001-Vorbereitung', 'Sicherheitspraktiken, Incident Response und Kontinuität sind Teil des Trust-Programms.'],
    ],
    cta: 'Security ansehen',
    secondary: 'Trust Center öffnen',
    note: 'Diese Seite ist ein Produkt- und Sicherheitsüberblick. Formale rechtliche Verpflichtungen ergeben sich aus dem unterzeichneten Vertrag, DPA und der jeweiligen Bestellung.',
  },
} as const;

export default function CompliancePage({ params }: { params: { locale: string } }) {
  const locale = normalizeLocale(params.locale);
  const content = copy[isSupportedLocale(locale) ? locale : 'en'];

  return (
    <main className="min-h-screen bg-[#0A0A0F] px-6 py-24 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/50">{content.eyebrow}</p>
        <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] md:text-6xl">{content.title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68">{content.intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${locale}/security`} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90">{content.cta}</Link>
          <Link href={`/${locale}/trust`} className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">{content.secondary}</Link>
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-2">
        {content.items.map(([title, description], index) => {
          const Icon = [ShieldCheck, Landmark, FileCheck2, Award][index] ?? CheckCircle2;
          return (
            <article key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/62">{description}</p>
            </article>
          );
        })}
      </section>

      <section className="mx-auto mt-12 max-w-5xl rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/55">
        {content.note}
      </section>
    </main>
  );
}
