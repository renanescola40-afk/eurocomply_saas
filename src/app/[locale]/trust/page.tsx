import { notFound } from 'next/navigation';

import { TrustCenterPage, type LocalizedTrustCopy } from '@/components/marketing/trust-center-page';
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n/locales';

export const revalidate = 300;
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string }>;
};

const TRUST_COPY: Record<SupportedLocale, LocalizedTrustCopy> = {
  en: {
    brand: 'Risck comply',
    eyebrow: 'Trust Center',
    title: 'Security, privacy and operational transparency without compliance washing.',
    subtitle: 'Current controls, open gaps and buyer-ready documentation are shown clearly so enterprise teams can evaluate the platform honestly.',
    notice: 'Every claim is tied to implementation status. Certification claims are only shown when evidence is available.',
    cards: [
      { href: '/security', title: 'Security overview', body: 'Workspace access, audit posture and operating safeguards summarized for review.' },
      { href: '/data-processing', title: 'Data protection', body: 'Data categories, retention posture and processor review in one place.' },
      { href: '/subprocessors', title: 'Subprocessors', body: 'Infrastructure and operating providers prepared for procurement review.' },
    ],
    evidenceTitle: 'Evidence-bound trust summary',
    evidenceItems: ['Private routes use server-side session checks.', 'Roles and permissions are documented by implementation scope.', 'Production claims require current release evidence.'],
    procurementTitle: 'Procurement checklist',
    procurementItems: ['Validate data categories and use case.', 'Confirm enabled providers.', 'Attach release evidence and trust documentation.'],
  },
  pt: {
    brand: 'Risck comply',
    eyebrow: 'Centro de Confiança',
    title: 'Segurança, privacidade e transparência operacional sem maquiar compliance.',
    subtitle: 'Controles atuais, lacunas abertas e documentação para compradores enterprise aparecem de forma clara.',
    notice: 'Cada afirmação é vinculada ao estado de implementação. Certificações só aparecem quando houver evidência.',
    cards: [
      { href: '/security', title: 'Visão de segurança', body: 'Acesso ao workspace, postura de auditoria e salvaguardas operacionais para revisão.' },
      { href: '/data-processing', title: 'Proteção de dados', body: 'Categorias de dados, retenção e revisão de processadores em um só lugar.' },
      { href: '/subprocessors', title: 'Subprocessadores', body: 'Fornecedores de infraestrutura e operação preparados para procurement.' },
    ],
    evidenceTitle: 'Resumo de confiança baseado em evidências',
    evidenceItems: ['Rotas privadas usam verificações de sessão server-side.', 'Papéis e permissões são documentados por escopo de implementação.', 'Afirmações de produção exigem evidência atual de release.'],
    procurementTitle: 'Checklist de procurement',
    procurementItems: ['Validar categorias de dados e caso de uso.', 'Confirmar fornecedores habilitados.', 'Anexar evidências de release e documentação de confiança.'],
  },
  es: {
    brand: 'Risck comply',
    eyebrow: 'Centro de Confianza',
    title: 'Seguridad, privacidad y transparencia operativa sin maquillaje de cumplimiento.',
    subtitle: 'Controles actuales, brechas abiertas y documentación para compradores enterprise se muestran con claridad.',
    notice: 'Cada afirmación está vinculada al estado de implementación. Las certificaciones solo aparecen con evidencia.',
    cards: [
      { href: '/security', title: 'Resumen de seguridad', body: 'Acceso al workspace, postura de auditoría y salvaguardas operativas para revisión.' },
      { href: '/data-processing', title: 'Protección de datos', body: 'Categorías de datos, retención y revisión de procesadores en un solo lugar.' },
      { href: '/subprocessors', title: 'Subprocesadores', body: 'Proveedores de infraestructura y operación preparados para procurement.' },
    ],
    evidenceTitle: 'Resumen de confianza basado en evidencia',
    evidenceItems: ['Las rutas privadas usan verificaciones de sesión server-side.', 'Roles y permisos se documentan por alcance de implementación.', 'Las afirmaciones de producción requieren evidencia actual de release.'],
    procurementTitle: 'Checklist de procurement',
    procurementItems: ['Validar categorías de datos y caso de uso.', 'Confirmar proveedores habilitados.', 'Adjuntar evidencia de release y documentación de confianza.'],
  },
  fr: {
    brand: 'Risck comply',
    eyebrow: 'Centre de confiance',
    title: 'Sécurité, confidentialité et transparence opérationnelle sans vernis conformité.',
    subtitle: 'Les contrôles actuels, écarts ouverts et documents pour acheteurs enterprise sont présentés clairement.',
    notice: 'Chaque affirmation est liée à son état d’implémentation. Les certifications n’apparaissent qu’avec preuve.',
    cards: [
      { href: '/security', title: 'Vue sécurité', body: 'Accès workspace, posture audit et garanties opérationnelles pour revue.' },
      { href: '/data-processing', title: 'Protection des données', body: 'Catégories de données, rétention et revue des processeurs au même endroit.' },
      { href: '/subprocessors', title: 'Sous-traitants', body: 'Fournisseurs d’infrastructure et d’opérations préparés pour procurement.' },
    ],
    evidenceTitle: 'Résumé confiance basé sur preuves',
    evidenceItems: ['Les routes privées utilisent des vérifications de session côté serveur.', 'Les rôles et permissions sont documentés par périmètre.', 'Les affirmations production exigent une preuve de release actuelle.'],
    procurementTitle: 'Checklist procurement',
    procurementItems: ['Valider catégories de données et cas d’usage.', 'Confirmer les fournisseurs activés.', 'Joindre preuves de release et documentation confiance.'],
  },
  it: {
    brand: 'Risck comply',
    eyebrow: 'Centro fiducia',
    title: 'Sicurezza, privacy e trasparenza operativa senza compliance washing.',
    subtitle: 'Controlli attuali, gap aperti e documentazione per buyer enterprise sono presentati con chiarezza.',
    notice: 'Ogni affermazione è legata allo stato di implementazione. Le certificazioni appaiono solo con evidenza.',
    cards: [
      { href: '/security', title: 'Panoramica sicurezza', body: 'Accesso workspace, postura audit e salvaguardie operative per review.' },
      { href: '/data-processing', title: 'Protezione dati', body: 'Categorie dati, retention e review dei processori in un unico posto.' },
      { href: '/subprocessors', title: 'Subprocessori', body: 'Provider infrastrutturali e operativi preparati per procurement.' },
    ],
    evidenceTitle: 'Sintesi fiducia basata su evidenze',
    evidenceItems: ['Le rotte private usano controlli sessione server-side.', 'Ruoli e permessi sono documentati per ambito implementativo.', 'I claim production richiedono evidenza release aggiornata.'],
    procurementTitle: 'Checklist procurement',
    procurementItems: ['Validare categorie dati e caso d’uso.', 'Confermare provider abilitati.', 'Allegare evidenze release e documentazione trust.'],
  },
  de: {
    brand: 'Risck comply',
    eyebrow: 'Trust Center',
    title: 'Sicherheit, Datenschutz und operative Transparenz ohne Compliance-Washing.',
    subtitle: 'Aktuelle Kontrollen, offene Lücken und Unterlagen für Enterprise-Käufer werden klar dargestellt.',
    notice: 'Jede Aussage ist an den Implementierungsstatus gebunden. Zertifizierungen erscheinen nur mit Nachweis.',
    cards: [
      { href: '/security', title: 'Sicherheitsübersicht', body: 'Workspace-Zugriff, Audit-Posture und operative Schutzmaßnahmen zur Prüfung.' },
      { href: '/data-processing', title: 'Datenschutz', body: 'Datenkategorien, Aufbewahrung und Prozessorprüfung an einem Ort.' },
      { href: '/subprocessors', title: 'Subprozessoren', body: 'Infrastruktur- und Betriebsanbieter für Procurement-Prüfung.' },
    ],
    evidenceTitle: 'Nachweisgebundene Vertrauenszusammenfassung',
    evidenceItems: ['Private Routen nutzen serverseitige Session-Prüfungen.', 'Rollen und Berechtigungen sind nach Implementierungsumfang dokumentiert.', 'Produktionsaussagen erfordern aktuelle Release-Nachweise.'],
    procurementTitle: 'Procurement-Checkliste',
    procurementItems: ['Datenkategorien und Use Case validieren.', 'Aktivierte Anbieter bestätigen.', 'Release-Nachweise und Trust-Dokumentation anhängen.'],
  },
};

export default async function TrustPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  if (!isSupportedLocale(rawLocale)) notFound();

  const locale = rawLocale;
  const copy = TRUST_COPY[locale];
  void copy;

  return <TrustCenterPage locale={locale} kind="trust" />;
}
