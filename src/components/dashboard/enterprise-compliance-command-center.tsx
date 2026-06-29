import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n/routing';
import type { DashboardSummary } from '@/server/queries/dashboard';
import type {
  DashboardAiSystemSummary,
  DashboardAuditEventPreview,
  OrganizationWorkflowReadiness,
} from '@/server/queries/organization-dashboard';

type PreviewTask = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

type PreviewVendor = {
  id: string;
  name?: string | null;
  risk_level?: string | null;
  review_status?: string | null;
  next_review_at?: string | null;
};

type PreviewDocument = {
  id: string;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  expires_at?: string | null;
  category?: string | null;
};

type PreviewRisk = {
  id: string;
  title?: string | null;
  status?: string | null;
  risk_score?: number | string | null;
  category?: string | null;
};

type EnterpriseCommandCenterProps = {
  locale: Locale;
  summary: DashboardSummary;
  tasks: PreviewTask[];
  topRisks: PreviewRisk[];
  vendorsRequiringReview: PreviewVendor[];
  documentsExpiringSoon: PreviewDocument[];
  aiSystemSummary: DashboardAiSystemSummary;
  auditEvents: DashboardAuditEventPreview[];
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath: string;
  tasksPath: string;
  planName: string;
  limitsSummary: string;
  currentUserRole: string;
  canManageWorkspace: boolean;
  canManageBilling: boolean;
};

const copy = {
  en: {
    eyebrow: 'Executive command center',
    title: 'AI Act readiness cockpit',
    subtitle: 'A board-ready view of readiness, AI systems, risk, evidence, audit activity and what needs action next.',
    actualData: 'Live workspace data only',
    notEnoughData: 'No score yet',
    noOperationalData: 'Add inventory, evidence or tasks to calculate readiness.',
    readinessGood: 'Audit-ready posture',
    readinessAttention: 'Needs attention',
    readinessBlocked: 'Remediation required',
    role: 'Current role',
    plan: 'Current plan',
    sections: {
      executive: 'Executive summary',
      readiness: 'AI Act readiness score',
      inventory: 'AI systems inventory summary',
      risk: 'Risk classification summary',
      evidence: 'Evidence coverage',
      missingDocs: 'Missing documents',
      tasks: 'Open tasks',
      alerts: 'High-risk alerts',
      audit: 'Recent audit events',
      vendors: 'Vendor AI risk',
      calendar: 'Compliance calendar',
      actions: 'Recommended next actions',
      permissions: 'Permission states by role',
      limits: 'Plan limits',
    },
    labels: {
      systemsInventoried: 'systems inventoried',
      highRiskSystems: 'high-risk AI systems',
      unacceptableSystems: 'unacceptable AI systems',
      limitedSystems: 'limited AI systems',
      minimalSystems: 'minimal AI systems',
      criticalRisks: 'critical risks',
      openRisks: 'open risks',
      missingDocuments: 'missing documents',
      openTasks: 'open tasks',
      highRiskVendors: 'high-risk vendors',
      evidenceCoverage: 'evidence coverage',
      nextReview: 'next review',
      due: 'due',
      expires: 'expires',
      noDate: 'No date set',
      readOnly: 'Read-only',
      canManage: 'Can manage',
      upgradeSafe: 'Upgrade prompt is role-aware and never exposes billing internals to restricted users.',
      secureError: 'Secure error state',
      secureErrorBody: 'If dashboard data cannot load, users see a safe retry message without organization IDs, SQL errors or stack traces.',
    },
    empty: {
      inventory: 'No AI systems inventoried yet. Start by registering the first internal or vendor AI system.',
      risk: 'No open high-risk items are currently visible for this organization.',
      evidence: 'No approved evidence baseline yet. Upload or generate the first required document.',
      documents: 'No expiring or non-approved documents are visible right now.',
      tasks: 'No open tasks. Create a task when a compliance owner needs to act.',
      alerts: 'No high-risk alerts detected from current dashboard signals.',
      audit: 'No audit events recorded yet. Activity will appear after workspace actions are logged.',
      vendors: 'No vendor reviews require attention right now.',
      calendar: 'No dated tasks, document expiries or vendor reviews are scheduled yet.',
    },
    cta: {
      addAiSystem: 'Add AI system',
      reviewEvidence: 'Review evidence',
      reviewTasks: 'Review tasks',
      reviewRisks: 'Review risks',
      reviewVendors: 'Review vendors',
      openBilling: 'Open billing',
      askAdmin: 'Ask an admin',
      scheduleReview: 'Schedule review',
    },
    permissions: {
      owner: 'Owner: full governance, evidence, member and billing control.',
      admin: 'Admin: can manage governance workflows and evidence.',
      member: 'Member: can contribute work but cannot change sensitive billing or admin settings.',
      viewer: 'Viewer: read-only visibility with safe upgrade and permission guidance.',
    },
  },
  pt: {
    eyebrow: 'Centro de comando executivo',
    title: 'Cockpit de prontidão AI Act',
    subtitle: 'Uma visão pronta para liderança sobre readiness, sistemas de IA, risco, evidências, auditoria e próximos passos.',
    actualData: 'Apenas dados reais do workspace',
    notEnoughData: 'Sem score ainda',
    noOperationalData: 'Adicione inventário, evidências ou tarefas para calcular a prontidão.',
    readinessGood: 'Postura pronta para auditoria',
    readinessAttention: 'Requer atenção',
    readinessBlocked: 'Remediação necessária',
    role: 'Role atual',
    plan: 'Plano atual',
    sections: {
      executive: 'Resumo executivo',
      readiness: 'Score de prontidão AI Act',
      inventory: 'Resumo do inventário de IA',
      risk: 'Resumo de classificação de risco',
      evidence: 'Cobertura de evidências',
      missingDocs: 'Documentos em falta',
      tasks: 'Tarefas abertas',
      alerts: 'Alertas de alto risco',
      audit: 'Eventos recentes de auditoria',
      vendors: 'Risco de fornecedores IA',
      calendar: 'Calendário de compliance',
      actions: 'Próximas ações recomendadas',
      permissions: 'Estados de permissão por role',
      limits: 'Limites do plano',
    },
    labels: {
      systemsInventoried: 'sistemas inventariados',
      highRiskSystems: 'sistemas IA de alto risco',
      unacceptableSystems: 'sistemas IA inaceitáveis',
      limitedSystems: 'sistemas IA limitados',
      minimalSystems: 'sistemas IA mínimos',
      criticalRisks: 'riscos críticos',
      openRisks: 'riscos abertos',
      missingDocuments: 'documentos em falta',
      openTasks: 'tarefas abertas',
      highRiskVendors: 'fornecedores de alto risco',
      evidenceCoverage: 'cobertura de evidências',
      nextReview: 'próxima revisão',
      due: 'vence',
      expires: 'expira',
      noDate: 'Sem data definida',
      readOnly: 'Somente leitura',
      canManage: 'Pode gerir',
      upgradeSafe: 'O prompt de upgrade respeita roles e nunca expõe detalhes internos de billing.',
      secureError: 'Estado de erro seguro',
      secureErrorBody: 'Se os dados falharem, o usuário vê uma mensagem segura sem organization IDs, erros SQL ou stack traces.',
    },
    empty: {
      inventory: 'Nenhum sistema de IA inventariado ainda. Registre o primeiro sistema interno ou de fornecedor.',
      risk: 'Nenhum item aberto de alto risco está visível para esta organização.',
      evidence: 'Ainda não há baseline de evidências aprovadas. Carregue ou gere o primeiro documento obrigatório.',
      documents: 'Nenhum documento expirando ou não aprovado está visível agora.',
      tasks: 'Nenhuma tarefa aberta. Crie uma tarefa quando alguém precisar agir.',
      alerts: 'Nenhum alerta de alto risco detectado nos sinais atuais.',
      audit: 'Nenhum evento de auditoria registrado ainda. A atividade aparecerá após ações no workspace.',
      vendors: 'Nenhuma revisão de fornecedor requer atenção agora.',
      calendar: 'Nenhuma tarefa, expiração ou revisão com data está agendada ainda.',
    },
    cta: {
      addAiSystem: 'Adicionar IA',
      reviewEvidence: 'Rever evidências',
      reviewTasks: 'Rever tarefas',
      reviewRisks: 'Rever riscos',
      reviewVendors: 'Rever fornecedores',
      openBilling: 'Abrir billing',
      askAdmin: 'Pedir ao admin',
      scheduleReview: 'Agendar revisão',
    },
    permissions: {
      owner: 'Owner: controle total de governança, evidências, membros e billing.',
      admin: 'Admin: pode gerir workflows de governança e evidências.',
      member: 'Member: pode contribuir, mas não altera billing ou definições sensíveis.',
      viewer: 'Viewer: visibilidade somente leitura com orientação segura de permissões.',
    },
  },
  es: {
    eyebrow: 'Centro de mando ejecutivo',
    title: 'Cockpit de preparación AI Act',
    subtitle: 'Vista ejecutiva de readiness, sistemas de IA, riesgo, evidencia, auditoría y próximos pasos.',
    actualData: 'Solo datos reales del workspace',
    notEnoughData: 'Sin puntuación aún',
    noOperationalData: 'Añade inventario, evidencia o tareas para calcular la preparación.',
    readinessGood: 'Postura lista para auditoría',
    readinessAttention: 'Requiere atención',
    readinessBlocked: 'Remediación requerida',
    role: 'Rol actual',
    plan: 'Plan actual',
    sections: {
      executive: 'Resumen ejecutivo',
      readiness: 'Puntuación de preparación AI Act',
      inventory: 'Resumen del inventario de IA',
      risk: 'Resumen de clasificación de riesgo',
      evidence: 'Cobertura de evidencia',
      missingDocs: 'Documentos faltantes',
      tasks: 'Tareas abiertas',
      alerts: 'Alertas de alto riesgo',
      audit: 'Eventos recientes de auditoría',
      vendors: 'Riesgo de proveedores IA',
      calendar: 'Calendario de cumplimiento',
      actions: 'Próximas acciones recomendadas',
      permissions: 'Estados de permiso por rol',
      limits: 'Límites del plan',
    },
    labels: {
      systemsInventoried: 'sistemas inventariados',
      highRiskSystems: 'sistemas IA de alto riesgo',
      unacceptableSystems: 'sistemas IA inaceptables',
      limitedSystems: 'sistemas IA limitados',
      minimalSystems: 'sistemas IA mínimos',
      criticalRisks: 'riesgos críticos',
      openRisks: 'riesgos abiertos',
      missingDocuments: 'documentos faltantes',
      openTasks: 'tareas abiertas',
      highRiskVendors: 'proveedores de alto riesgo',
      evidenceCoverage: 'cobertura de evidencia',
      nextReview: 'próxima revisión',
      due: 'vence',
      expires: 'expira',
      noDate: 'Sin fecha',
      readOnly: 'Solo lectura',
      canManage: 'Puede gestionar',
      upgradeSafe: 'El upgrade respeta roles y no expone detalles internos de facturación.',
      secureError: 'Estado de error seguro',
      secureErrorBody: 'Si fallan los datos, se muestra un mensaje seguro sin IDs, errores SQL ni stack traces.',
    },
    empty: {
      inventory: 'Aún no hay sistemas de IA inventariados. Registra el primer sistema interno o de proveedor.',
      risk: 'No hay elementos abiertos de alto riesgo visibles para esta organización.',
      evidence: 'Aún no hay evidencia aprobada. Sube o genera el primer documento requerido.',
      documents: 'No hay documentos por vencer o no aprobados visibles ahora.',
      tasks: 'No hay tareas abiertas. Crea una tarea cuando alguien deba actuar.',
      alerts: 'No se detectaron alertas de alto riesgo en las señales actuales.',
      audit: 'Aún no hay eventos de auditoría registrados.',
      vendors: 'Ninguna revisión de proveedor requiere atención ahora.',
      calendar: 'No hay tareas, vencimientos o revisiones con fecha programada.',
    },
    cta: {
      addAiSystem: 'Añadir IA',
      reviewEvidence: 'Revisar evidencia',
      reviewTasks: 'Revisar tareas',
      reviewRisks: 'Revisar riesgos',
      reviewVendors: 'Revisar proveedores',
      openBilling: 'Abrir facturación',
      askAdmin: 'Pedir a admin',
      scheduleReview: 'Programar revisión',
    },
    permissions: {
      owner: 'Owner: control total de gobernanza, evidencia, miembros y facturación.',
      admin: 'Admin: puede gestionar workflows de gobernanza y evidencia.',
      member: 'Member: puede contribuir sin cambiar facturación o ajustes sensibles.',
      viewer: 'Viewer: lectura segura con guía de permisos.',
    },
  },
  fr: {
    eyebrow: 'Centre de commande exécutif',
    title: 'Cockpit de préparation AI Act',
    subtitle: 'Vue direction pour readiness, systèmes IA, risque, preuves, audit et prochaines étapes.',
    actualData: 'Données réelles du workspace uniquement',
    notEnoughData: 'Pas encore de score',
    noOperationalData: 'Ajoutez inventaire, preuves ou tâches pour calculer la préparation.',
    readinessGood: 'Posture prête pour audit',
    readinessAttention: 'Nécessite attention',
    readinessBlocked: 'Remédiation requise',
    role: 'Rôle actuel',
    plan: 'Plan actuel',
    sections: {
      executive: 'Résumé exécutif',
      readiness: 'Score de préparation AI Act',
      inventory: 'Résumé inventaire IA',
      risk: 'Résumé classification risque',
      evidence: 'Couverture des preuves',
      missingDocs: 'Documents manquants',
      tasks: 'Tâches ouvertes',
      alerts: 'Alertes haut risque',
      audit: 'Événements audit récents',
      vendors: 'Risque fournisseurs IA',
      calendar: 'Calendrier conformité',
      actions: 'Actions recommandées',
      permissions: 'États de permission par rôle',
      limits: 'Limites du plan',
    },
    labels: {
      systemsInventoried: 'systèmes inventoriés',
      highRiskSystems: 'systèmes IA haut risque',
      unacceptableSystems: 'systèmes IA inacceptables',
      limitedSystems: 'systèmes IA limités',
      minimalSystems: 'systèmes IA minimaux',
      criticalRisks: 'risques critiques',
      openRisks: 'risques ouverts',
      missingDocuments: 'documents manquants',
      openTasks: 'tâches ouvertes',
      highRiskVendors: 'fournisseurs haut risque',
      evidenceCoverage: 'couverture des preuves',
      nextReview: 'prochaine revue',
      due: 'échéance',
      expires: 'expire',
      noDate: 'Sans date',
      readOnly: 'Lecture seule',
      canManage: 'Peut gérer',
      upgradeSafe: 'L’upgrade respecte les rôles et ne révèle pas de détails internes.',
      secureError: 'État d’erreur sécurisé',
      secureErrorBody: 'En cas d’échec, message sûr sans IDs, erreurs SQL ni stack traces.',
    },
    empty: {
      inventory: 'Aucun système IA inventorié. Enregistrez le premier système interne ou fournisseur.',
      risk: 'Aucun élément haut risque ouvert visible pour cette organisation.',
      evidence: 'Aucune preuve approuvée. Ajoutez ou générez le premier document requis.',
      documents: 'Aucun document expirant ou non approuvé visible actuellement.',
      tasks: 'Aucune tâche ouverte. Créez une tâche lorsqu’une action est nécessaire.',
      alerts: 'Aucune alerte haut risque détectée.',
      audit: 'Aucun événement audit enregistré.',
      vendors: 'Aucune revue fournisseur ne nécessite attention.',
      calendar: 'Aucune tâche, expiration ou revue datée.',
    },
    cta: {
      addAiSystem: 'Ajouter IA',
      reviewEvidence: 'Voir preuves',
      reviewTasks: 'Voir tâches',
      reviewRisks: 'Voir risques',
      reviewVendors: 'Voir fournisseurs',
      openBilling: 'Ouvrir billing',
      askAdmin: 'Demander admin',
      scheduleReview: 'Planifier revue',
    },
    permissions: {
      owner: 'Owner : contrôle complet gouvernance, preuves, membres et billing.',
      admin: 'Admin : peut gérer workflows et preuves.',
      member: 'Member : peut contribuer sans changer billing ou réglages sensibles.',
      viewer: 'Viewer : lecture seule avec guidance sûre.',
    },
  },
  it: {
    eyebrow: 'Centro di comando executive',
    title: 'Cockpit readiness AI Act',
    subtitle: 'Vista executive di readiness, sistemi IA, rischio, evidenze, audit e prossime azioni.',
    actualData: 'Solo dati reali del workspace',
    notEnoughData: 'Nessun punteggio',
    noOperationalData: 'Aggiungi inventario, evidenze o attività per calcolare la readiness.',
    readinessGood: 'Postura pronta per audit',
    readinessAttention: 'Richiede attenzione',
    readinessBlocked: 'Rimediazione richiesta',
    role: 'Ruolo attuale',
    plan: 'Piano attuale',
    sections: {
      executive: 'Sintesi executive',
      readiness: 'Punteggio readiness AI Act',
      inventory: 'Sintesi inventario IA',
      risk: 'Sintesi classificazione rischio',
      evidence: 'Copertura evidenze',
      missingDocs: 'Documenti mancanti',
      tasks: 'Attività aperte',
      alerts: 'Alert alto rischio',
      audit: 'Eventi audit recenti',
      vendors: 'Rischio fornitori IA',
      calendar: 'Calendario compliance',
      actions: 'Prossime azioni consigliate',
      permissions: 'Stati permesso per ruolo',
      limits: 'Limiti del piano',
    },
    labels: {
      systemsInventoried: 'sistemi inventariati',
      highRiskSystems: 'sistemi IA alto rischio',
      unacceptableSystems: 'sistemi IA inaccettabili',
      limitedSystems: 'sistemi IA limitati',
      minimalSystems: 'sistemi IA minimi',
      criticalRisks: 'rischi critici',
      openRisks: 'rischi aperti',
      missingDocuments: 'documenti mancanti',
      openTasks: 'attività aperte',
      highRiskVendors: 'fornitori alto rischio',
      evidenceCoverage: 'copertura evidenze',
      nextReview: 'prossima review',
      due: 'scade',
      expires: 'scade',
      noDate: 'Nessuna data',
      readOnly: 'Sola lettura',
      canManage: 'Può gestire',
      upgradeSafe: 'L’upgrade rispetta i ruoli e non espone dettagli interni.',
      secureError: 'Stato errore sicuro',
      secureErrorBody: 'In caso di errore, messaggio sicuro senza ID, SQL error o stack trace.',
    },
    empty: {
      inventory: 'Nessun sistema IA inventariato. Registra il primo sistema interno o vendor.',
      risk: 'Nessun elemento alto rischio aperto visibile.',
      evidence: 'Nessuna baseline evidenze approvata. Carica o genera il primo documento.',
      documents: 'Nessun documento in scadenza o non approvato visibile ora.',
      tasks: 'Nessuna attività aperta. Crea un’attività quando serve azione.',
      alerts: 'Nessun alert alto rischio rilevato.',
      audit: 'Nessun evento audit registrato.',
      vendors: 'Nessuna review fornitore richiede attenzione.',
      calendar: 'Nessuna attività, scadenza o review datata.',
    },
    cta: {
      addAiSystem: 'Aggiungi IA',
      reviewEvidence: 'Rivedi evidenze',
      reviewTasks: 'Rivedi attività',
      reviewRisks: 'Rivedi rischi',
      reviewVendors: 'Rivedi fornitori',
      openBilling: 'Apri billing',
      askAdmin: 'Chiedi admin',
      scheduleReview: 'Pianifica review',
    },
    permissions: {
      owner: 'Owner: controllo completo su governance, evidenze, membri e billing.',
      admin: 'Admin: può gestire workflow e evidenze.',
      member: 'Member: può contribuire senza modificare billing o impostazioni sensibili.',
      viewer: 'Viewer: sola lettura con guida permessi sicura.',
    },
  },
  de: {
    eyebrow: 'Executive Command Center',
    title: 'AI-Act-Readiness Cockpit',
    subtitle: 'Management-Sicht auf Readiness, KI-Systeme, Risiko, Nachweise, Audit und nächste Schritte.',
    actualData: 'Nur echte Workspace-Daten',
    notEnoughData: 'Noch kein Score',
    noOperationalData: 'Inventar, Nachweise oder Aufgaben hinzufügen, um Readiness zu berechnen.',
    readinessGood: 'Auditbereit',
    readinessAttention: 'Benötigt Aufmerksamkeit',
    readinessBlocked: 'Behebung erforderlich',
    role: 'Aktuelle Rolle',
    plan: 'Aktueller Plan',
    sections: {
      executive: 'Executive Summary',
      readiness: 'AI-Act-Readiness-Score',
      inventory: 'KI-Inventar-Zusammenfassung',
      risk: 'Risiko-Klassifizierung',
      evidence: 'Nachweis-Abdeckung',
      missingDocs: 'Fehlende Dokumente',
      tasks: 'Offene Aufgaben',
      alerts: 'High-Risk Alerts',
      audit: 'Aktuelle Audit-Ereignisse',
      vendors: 'KI-Anbieterrisiko',
      calendar: 'Compliance-Kalender',
      actions: 'Empfohlene nächste Aktionen',
      permissions: 'Berechtigungszustände nach Rolle',
      limits: 'Planlimits',
    },
    labels: {
      systemsInventoried: 'inventarisierte Systeme',
      highRiskSystems: 'High-Risk KI-Systeme',
      unacceptableSystems: 'unzulässige KI-Systeme',
      limitedSystems: 'begrenzte KI-Systeme',
      minimalSystems: 'minimale KI-Systeme',
      criticalRisks: 'kritische Risiken',
      openRisks: 'offene Risiken',
      missingDocuments: 'fehlende Dokumente',
      openTasks: 'offene Aufgaben',
      highRiskVendors: 'High-Risk Anbieter',
      evidenceCoverage: 'Nachweis-Abdeckung',
      nextReview: 'nächste Prüfung',
      due: 'fällig',
      expires: 'läuft ab',
      noDate: 'Kein Datum',
      readOnly: 'Nur lesen',
      canManage: 'Kann verwalten',
      upgradeSafe: 'Upgrade-Hinweise sind rollenbasiert und zeigen keine internen Billing-Details.',
      secureError: 'Sicherer Fehlerzustand',
      secureErrorBody: 'Bei Ladefehlern erscheint eine sichere Meldung ohne IDs, SQL-Fehler oder Stack Traces.',
    },
    empty: {
      inventory: 'Noch keine KI-Systeme inventarisiert. Erfassen Sie das erste interne oder Anbieter-System.',
      risk: 'Keine offenen High-Risk Elemente sichtbar.',
      evidence: 'Noch keine genehmigte Nachweisbasis. Erstes erforderliches Dokument hinzufügen.',
      documents: 'Keine ablaufenden oder nicht genehmigten Dokumente sichtbar.',
      tasks: 'Keine offenen Aufgaben. Erstellen Sie eine Aufgabe, wenn Aktion nötig ist.',
      alerts: 'Keine High-Risk Alerts erkannt.',
      audit: 'Noch keine Audit-Ereignisse aufgezeichnet.',
      vendors: 'Keine Anbieterprüfung benötigt Aufmerksamkeit.',
      calendar: 'Keine datierten Aufgaben, Abläufe oder Prüfungen.',
    },
    cta: {
      addAiSystem: 'KI hinzufügen',
      reviewEvidence: 'Nachweise prüfen',
      reviewTasks: 'Aufgaben prüfen',
      reviewRisks: 'Risiken prüfen',
      reviewVendors: 'Anbieter prüfen',
      openBilling: 'Billing öffnen',
      askAdmin: 'Admin fragen',
      scheduleReview: 'Review planen',
    },
    permissions: {
      owner: 'Owner: volle Governance-, Nachweis-, Mitglieder- und Billing-Kontrolle.',
      admin: 'Admin: kann Governance-Workflows und Nachweise verwalten.',
      member: 'Member: kann beitragen, aber keine sensiblen Billing-/Admin-Einstellungen ändern.',
      viewer: 'Viewer: Nur-Lese-Zugriff mit sicherer Berechtigungsführung.',
    },
  },
};

const elevatedRoles = new Set(['owner', 'admin', 'compliance_manager']);

function isDone(status?: string | null) {
  return status?.toLowerCase() === 'done' || status?.toLowerCase() === 'closed' || status?.toLowerCase() === 'approved';
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return copy[locale].labels.noDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return copy[locale].labels.noDate;

  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function getReadinessTone(score: number, hasOperationalData: boolean, locale: Locale) {
  const c = copy[locale];

  if (!hasOperationalData) return c.noOperationalData;
  if (score >= 80) return c.readinessGood;
  if (score >= 55) return c.readinessAttention;
  return c.readinessBlocked;
}

function getCoverage(summary: DashboardSummary) {
  if (summary.totals.documents <= 0) return null;

  const approvedDocuments = Math.max(0, summary.totals.documents - summary.missingDocuments);
  return Math.round((approvedDocuments / summary.totals.documents) * 100);
}

function getPriorityTone(value?: string | null) {
  const normalized = value?.toLowerCase();

  if (normalized === 'urgent' || normalized === 'critical' || normalized === 'high') {
    return 'border-red-400/25 bg-red-500/10 text-red-100';
  }

  if (normalized === 'medium') {
    return 'border-amber-300/25 bg-amber-400/10 text-amber-100';
  }

  return 'border-white/10 bg-white/[0.04] text-white/64';
}

function getRiskScore(risk: PreviewRisk) {
  const score = Number(risk.risk_score ?? 0);
  return Number.isFinite(score) ? score : 0;
}

function EmptyState({ body, href, cta }: { body: string; href: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.025] p-4">
      <p className="text-sm leading-6 text-white/56">{body}</p>
      <Button asChild variant="outline" className="mt-4 rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
        <Link href={href}>
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl bg-white/10 p-2" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-right text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{label}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-white/48">{detail}</p> : null}
    </div>
  );
}

export function EnterpriseComplianceCommandCenter({
  locale,
  summary,
  tasks,
  topRisks,
  vendorsRequiringReview,
  documentsExpiringSoon,
  aiSystemSummary,
  auditEvents,
  workflowReadiness,
  basePath,
  tasksPath,
  planName,
  limitsSummary,
  currentUserRole,
  canManageWorkspace,
  canManageBilling,
}: EnterpriseCommandCenterProps) {
  const c = copy[locale];
  const openTasks = tasks.filter((task) => !isDone(task.status));
  const criticalRisks = topRisks.filter((risk) => getRiskScore(risk) >= 16);
  const evidenceCoverage = getCoverage(summary);
  const localizedRoot = basePath.includes('/dashboard') ? basePath.split('/dashboard')[0] : '';
  const hasOperationalData =
    summary.totals.tasks + summary.totals.vendors + summary.totals.risks + summary.totals.documents + aiSystemSummary.total > 0;
  const readinessValue = hasOperationalData ? `${summary.complianceScore}%` : c.notEnoughData;
  const readinessTone = getReadinessTone(summary.complianceScore, hasOperationalData, locale);
  const canManageLabel = canManageWorkspace ? c.labels.canManage : c.labels.readOnly;

  const calendarItems = [
    ...openTasks
      .filter((task) => task.due_date)
      .map((task) => ({ key: `task-${task.id}`, title: task.title ?? c.sections.tasks, meta: c.labels.due, date: task.due_date ?? null, href: tasksPath })),
    ...documentsExpiringSoon
      .filter((document) => document.expires_at)
      .map((document) => ({
        key: `document-${document.id}`,
        title: document.title ?? document.name ?? c.sections.missingDocs,
        meta: c.labels.expires,
        date: document.expires_at ?? null,
        href: `${basePath}/documents`,
      })),
    ...vendorsRequiringReview
      .filter((vendor) => vendor.next_review_at)
      .map((vendor) => ({
        key: `vendor-${vendor.id}`,
        title: vendor.name ?? c.sections.vendors,
        meta: c.labels.nextReview,
        date: vendor.next_review_at ?? null,
        href: `${localizedRoot}/vendor-assurance`,
      })),
  ]
    .sort((left, right) => new Date(left.date ?? 0).getTime() - new Date(right.date ?? 0).getTime())
    .slice(0, 5);

  const highRiskAlerts = [
    { label: c.labels.unacceptableSystems, value: aiSystemSummary.unacceptable, href: `${localizedRoot}/ai-systems` },
    { label: c.labels.highRiskSystems, value: aiSystemSummary.high, href: `${localizedRoot}/ai-systems` },
    { label: c.labels.criticalRisks, value: criticalRisks.length || summary.criticalRisks, href: `${basePath}/risks` },
    { label: c.labels.highRiskVendors, value: summary.highRiskVendors, href: `${localizedRoot}/vendor-assurance` },
  ].filter((item) => item.value > 0);

  const recommendedActions = [
    aiSystemSummary.total === 0
      ? { label: c.empty.inventory, href: `${localizedRoot}/ai-systems`, cta: c.cta.addAiSystem }
      : null,
    summary.missingDocuments > 0 || summary.totals.documents === 0
      ? { label: c.empty.evidence, href: `${basePath}/documents`, cta: c.cta.reviewEvidence }
      : null,
    openTasks.length > 0 ? { label: `${openTasks.length} ${c.labels.openTasks}`, href: tasksPath, cta: c.cta.reviewTasks } : null,
    highRiskAlerts.length > 0 ? { label: c.empty.alerts, href: `${basePath}/risks`, cta: c.cta.reviewRisks } : null,
    !canManageWorkspace ? { label: c.permissions.viewer, href: `${basePath}/members`, cta: c.cta.askAdmin } : null,
  ].filter((action): action is { label: string; href: string; cta: string } => Boolean(action));

  const safeRecommendedActions =
    recommendedActions.length > 0
      ? recommendedActions
      : [{ label: c.readinessGood, href: `${basePath}/reports-governance`, cta: c.cta.scheduleReview }];

  const roleCards = [
    { role: 'owner', body: c.permissions.owner, active: currentUserRole === 'owner' },
    { role: 'admin', body: c.permissions.admin, active: currentUserRole === 'admin' || currentUserRole === 'compliance_manager' },
    { role: 'member', body: c.permissions.member, active: currentUserRole === 'member' },
    { role: 'viewer', body: c.permissions.viewer, active: currentUserRole === 'viewer' || !['owner', 'admin', 'member', 'viewer', 'compliance_manager'].includes(currentUserRole) },
  ];

  return (
    <section
      id="enterprise-command-center"
      aria-labelledby="enterprise-command-center-title"
      className="premium-card scroll-mt-28 rounded-[2rem] p-5 text-white md:p-8"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <Badge variant="outline" className="rounded-full border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/62">
            {c.eyebrow}
          </Badge>
          <h2 id="enterprise-command-center-title" className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white md:text-5xl">
            {c.title}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/58 md:text-base">{c.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5" /> {c.actualData}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-semibold text-white/58">
              <UsersRound className="h-3.5 w-3.5" /> {c.role}: {currentUserRole} · {canManageLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-semibold text-white/58">
              <Gauge className="h-3.5 w-3.5" /> {c.plan}: {planName}
            </span>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/25 p-5 xl:min-w-80">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">{c.sections.readiness}</p>
          <p className="mt-3 text-5xl font-semibold tracking-[-0.06em] text-white md:text-6xl">{readinessValue}</p>
          <p className="mt-3 text-sm leading-6 text-white/56">{readinessTone}</p>
          <Button asChild className="mt-5 w-full rounded-full bg-white text-black hover:bg-white/90">
            <Link href={`${basePath}/reports-governance`}>
              {c.cta.scheduleReview} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label={c.sections.executive}>
        <MetricCard icon={Workflow} label={c.labels.systemsInventoried} value={aiSystemSummary.total} detail={c.sections.inventory} />
        <MetricCard icon={ShieldAlert} label={c.labels.criticalRisks} value={summary.criticalRisks} detail={`${summary.openRisks} ${c.labels.openRisks}`} />
        <MetricCard icon={FileText} label={c.labels.evidenceCoverage} value={evidenceCoverage === null ? c.notEnoughData : `${evidenceCoverage}%`} detail={`${summary.missingDocuments} ${c.labels.missingDocuments}`} />
        <MetricCard icon={ClipboardList} label={c.labels.openTasks} value={summary.openTasks} detail={workflowReadiness?.status ?? c.sections.actions} />
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="ai-inventory-summary-title">
          <h3 id="ai-inventory-summary-title" className="text-xl font-semibold text-white">{c.sections.inventory}</h3>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {[
              [c.labels.highRiskSystems, aiSystemSummary.high],
              [c.labels.unacceptableSystems, aiSystemSummary.unacceptable],
              [c.labels.limitedSystems, aiSystemSummary.limited],
              [c.labels.minimalSystems, aiSystemSummary.minimal],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs text-white/46">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {aiSystemSummary.total === 0 ? <EmptyState body={c.empty.inventory} href={`${localizedRoot}/ai-systems`} cta={c.cta.addAiSystem} /> : null}
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="risk-classification-summary-title">
          <h3 id="risk-classification-summary-title" className="text-xl font-semibold text-white">{c.sections.risk}</h3>
          <div className="mt-4 space-y-3">
            {topRisks.length > 0 ? (
              topRisks.slice(0, 4).map((risk) => (
                <Link key={risk.id} href={`${basePath}/risks`} className="block rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-semibold">{risk.title ?? c.labels.openRisks}</p>
                    <span className="rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-100">{getRiskScore(risk)}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/44">{risk.category ?? c.sections.risk}</p>
                </Link>
              ))
            ) : (
              <EmptyState body={c.empty.risk} href={`${basePath}/risks`} cta={c.cta.reviewRisks} />
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="evidence-coverage-title">
          <h3 id="evidence-coverage-title" className="text-xl font-semibold text-white">{c.sections.evidence}</h3>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-4xl font-semibold tracking-[-0.05em]">{evidenceCoverage === null ? c.notEnoughData : `${evidenceCoverage}%`}</p>
            <p className="mt-2 text-sm leading-6 text-white/52">
              {summary.totals.documents} {c.sections.missingDocs.toLowerCase()} · {summary.missingDocuments} {c.labels.missingDocuments}
            </p>
          </div>
          {summary.totals.documents === 0 ? <EmptyState body={c.empty.evidence} href={`${basePath}/documents`} cta={c.cta.reviewEvidence} /> : null}
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="missing-documents-title">
          <h3 id="missing-documents-title" className="text-xl font-semibold text-white">{c.sections.missingDocs}</h3>
          <div className="mt-4 space-y-3">
            {documentsExpiringSoon.length > 0 ? (
              documentsExpiringSoon.slice(0, 4).map((document) => (
                <Link key={document.id} href={`${basePath}/documents`} className="block rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-white/[0.04]">
                  <p className="line-clamp-1 text-sm font-semibold">{document.title ?? document.name ?? c.sections.missingDocs}</p>
                  <p className="mt-1 text-xs text-white/44">{document.status ?? c.sections.evidence} · {formatDate(document.expires_at, locale)}</p>
                </Link>
              ))
            ) : (
              <EmptyState body={c.empty.documents} href={`${basePath}/documents`} cta={c.cta.reviewEvidence} />
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="open-tasks-title">
          <h3 id="open-tasks-title" className="text-xl font-semibold text-white">{c.sections.tasks}</h3>
          <div className="mt-4 space-y-3">
            {openTasks.length > 0 ? (
              openTasks.slice(0, 4).map((task) => (
                <Link key={task.id} href={tasksPath} className="block rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-semibold">{task.title ?? c.sections.tasks}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${getPriorityTone(task.priority)}`}>{task.priority ?? task.status ?? c.labels.openTasks}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/44">{c.labels.due}: {formatDate(task.due_date, locale)}</p>
                </Link>
              ))
            ) : (
              <EmptyState body={c.empty.tasks} href={tasksPath} cta={c.cta.reviewTasks} />
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-red-400/15 bg-red-500/[0.045] p-5" aria-labelledby="high-risk-alerts-title" role={highRiskAlerts.length > 0 ? 'alert' : 'status'} aria-live={highRiskAlerts.length > 0 ? 'assertive' : 'polite'}>
          <h3 id="high-risk-alerts-title" className="flex items-center gap-2 text-xl font-semibold text-white">
            <AlertTriangle className="h-5 w-5" /> {c.sections.alerts}
          </h3>
          <div className="mt-4 space-y-3">
            {highRiskAlerts.length > 0 ? (
              highRiskAlerts.map((alert) => (
                <Link key={alert.label} href={alert.href} className="flex items-center justify-between gap-3 rounded-2xl border border-red-300/20 bg-black/20 p-3 transition hover:border-red-200/40">
                  <span className="text-sm font-semibold text-red-50">{alert.label}</span>
                  <span className="rounded-full bg-red-400/15 px-2.5 py-1 text-xs font-semibold text-red-50">{alert.value}</span>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/56">{c.empty.alerts}</p>
            )}
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="recent-audit-events-title">
          <h3 id="recent-audit-events-title" className="text-xl font-semibold text-white">{c.sections.audit}</h3>
          <div className="mt-4 space-y-3">
            {auditEvents.length > 0 ? (
              auditEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-semibold">{event.action ?? c.sections.audit}</p>
                  <p className="mt-1 text-xs text-white/44">{event.entity_type ?? c.sections.audit} · {formatDate(event.created_at, locale)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/56">{c.empty.audit}</p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="vendor-ai-risk-title">
          <h3 id="vendor-ai-risk-title" className="text-xl font-semibold text-white">{c.sections.vendors}</h3>
          <div className="mt-4 space-y-3">
            {vendorsRequiringReview.length > 0 ? (
              vendorsRequiringReview.slice(0, 4).map((vendor) => (
                <Link key={vendor.id} href={`${localizedRoot}/vendor-assurance`} className="block rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-semibold">{vendor.name ?? c.sections.vendors}</p>
                    <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100">{vendor.risk_level ?? vendor.review_status ?? c.sections.vendors}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/44">{c.labels.nextReview}: {formatDate(vendor.next_review_at, locale)}</p>
                </Link>
              ))
            ) : (
              <EmptyState body={c.empty.vendors} href={`${localizedRoot}/vendor-assurance`} cta={c.cta.reviewVendors} />
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="compliance-calendar-title">
          <h3 id="compliance-calendar-title" className="flex items-center gap-2 text-xl font-semibold text-white">
            <CalendarClock className="h-5 w-5" /> {c.sections.calendar}
          </h3>
          <div className="mt-4 space-y-3">
            {calendarItems.length > 0 ? (
              calendarItems.map((item) => (
                <Link key={item.key} href={item.href} className="block rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-white/[0.04]">
                  <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-white/44">{item.meta}: {formatDate(item.date, locale)}</p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/56">{c.empty.calendar}</p>
            )}
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="recommended-next-actions-title">
          <h3 id="recommended-next-actions-title" className="flex items-center gap-2 text-xl font-semibold text-white">
            <Sparkles className="h-5 w-5" /> {c.sections.actions}
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {safeRecommendedActions.slice(0, 4).map((action) => (
              <Link key={`${action.cta}-${action.href}`} href={action.href} className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/[0.04]">
                <p className="text-sm leading-6 text-white/58">{action.label}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white/80">
                  {action.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="plan-limits-title">
          <h3 id="plan-limits-title" className="text-xl font-semibold text-white">{c.sections.limits}</h3>
          <p className="mt-3 text-sm leading-6 text-white/56">{limitsSummary}</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold">{canManageBilling ? c.cta.openBilling : c.cta.askAdmin}</p>
            <p className="mt-2 text-sm leading-6 text-white/50">{c.labels.upgradeSafe}</p>
            <Button asChild variant="outline" className="mt-4 rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
              <Link href={canManageBilling ? `${basePath}/billing` : `${basePath}/members`}>
                {canManageBilling ? c.cta.openBilling : c.cta.askAdmin} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.75fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="permission-states-title">
          <h3 id="permission-states-title" className="flex items-center gap-2 text-xl font-semibold text-white">
            <LockKeyhole className="h-5 w-5" /> {c.sections.permissions}
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {roleCards.map((role) => (
              <div key={role.role} className={`rounded-2xl border p-4 ${role.active ? 'border-emerald-300/25 bg-emerald-400/10' : 'border-white/10 bg-black/20'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold capitalize">{role.role}</p>
                  {role.active ? <CheckCircle2 className="h-4 w-4 text-emerald-100" /> : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-white/54">{role.body}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="secure-error-state-title" role="status" aria-live="polite">
          <h3 id="secure-error-state-title" className="text-xl font-semibold text-white">{c.labels.secureError}</h3>
          <p className="mt-3 text-sm leading-6 text-white/56">{c.labels.secureErrorBody}</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/54">
            {c.actualData} · no-store · tenant filtered
          </div>
        </article>
      </div>
    </section>
  );
}
