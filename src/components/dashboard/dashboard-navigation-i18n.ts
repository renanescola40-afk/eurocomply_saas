import { getAppDictionary } from '@/lib/i18n/app-dictionary';

const dashboardRoot = '/dashboard/organizations';

export type LocalizedMenuLink = {
  label: string;
  href: string;
  description?: string;
};

export type LocalizedMenuItem = LocalizedMenuLink & {
  sections?: LocalizedMenuLink[];
};

const aiGovernanceCopy: Record<string, { label: string; description: string; inventory: string; inventoryDescription: string; incidents: string; incidentsDescription: string }> = {
  en: {
    label: 'AI Governance',
    description: 'AI systems inventory and AI Act classification',
    inventory: 'AI Systems Inventory',
    inventoryDescription: 'Register AI tools, roles, risk domains and obligations',
    incidents: 'AI Incident Register',
    incidentsDescription: 'Track serious incidents, triage deadlines and authority-ready evidence',
  },
  pt: {
    label: 'Governação de IA',
    description: 'Inventário de sistemas de IA e classificação AI Act',
    inventory: 'Inventário de Sistemas de IA',
    inventoryDescription: 'Registe ferramentas, papéis, domínios de risco e obrigações',
    incidents: 'Registo de Incidentes de IA',
    incidentsDescription: 'Acompanhe incidentes graves, prazos de triagem e evidências para autoridades',
  },
  es: {
    label: 'Gobierno de IA',
    description: 'Inventario de sistemas de IA y clasificación AI Act',
    inventory: 'Inventario de Sistemas de IA',
    inventoryDescription: 'Registra herramientas, roles, dominios de riesgo y obligaciones',
    incidents: 'Registro de Incidentes de IA',
    incidentsDescription: 'Controla incidentes graves, plazos de triaje y evidencias para autoridades',
  },
  fr: {
    label: 'Gouvernance IA',
    description: 'Inventaire des systèmes IA et classification AI Act',
    inventory: 'Inventaire des Systèmes IA',
    inventoryDescription: 'Recenser outils, rôles, domaines de risque et obligations',
    incidents: 'Registre des Incidents IA',
    incidentsDescription: 'Suivre incidents graves, échéances de triage et preuves prêtes pour autorités',
  },
  it: {
    label: 'Governance IA',
    description: 'Inventario sistemi IA e classificazione AI Act',
    inventory: 'Inventario Sistemi IA',
    inventoryDescription: 'Registra strumenti, ruoli, domini di rischio e obblighi',
    incidents: 'Registro Incidenti IA',
    incidentsDescription: 'Monitora incidenti gravi, scadenze di triage ed evidenze per autorità',
  },
  de: {
    label: 'KI-Governance',
    description: 'KI-Systeminventar und AI-Act-Klassifizierung',
    inventory: 'KI-Systeminventar',
    inventoryDescription: 'Tools, Rollen, Risikobereiche und Pflichten erfassen',
    incidents: 'KI-Vorfallregister',
    incidentsDescription: 'Schwerwiegende Vorfälle, Triage-Fristen und behördenfähige Nachweise verfolgen',
  },
};

const rolesCopy: Record<string, string> = {
  en: 'Workspace Roles',
  pt: 'Papéis do Workspace',
  es: 'Roles del Workspace',
  fr: 'Rôles du Workspace',
  it: 'Ruoli Workspace',
  de: 'Workspace-Rollen',
};

const readinessCopy: Record<string, { label: string; description: string }> = {
  en: { label: 'Enterprise Readiness', description: 'Review consolidated enterprise maturity across governance controls' },
  pt: { label: 'Prontidão Enterprise', description: 'Reveja a maturidade enterprise consolidada dos controlos de governança' },
  es: { label: 'Preparación Enterprise', description: 'Revisa la madurez enterprise consolidada de los controles de gobernanza' },
  fr: { label: 'Préparation Enterprise', description: 'Vérifier la maturité enterprise consolidée des contrôles de gouvernance' },
  it: { label: 'Readiness Enterprise', description: 'Verifica la maturità enterprise consolidata dei controlli governance' },
  de: { label: 'Enterprise Readiness', description: 'Konsolidierten Enterprise-Reifegrad der Governance-Kontrollen prüfen' },
};

const retentionCopy: Record<string, { label: string; description: string }> = {
  en: { label: 'Retention Center', description: 'Review retention coverage for evidence, records and audit history' },
  pt: { label: 'Centro de Retenção', description: 'Reveja a cobertura de retenção de evidências, registos e auditoria' },
  es: { label: 'Centro de Retención', description: 'Revisa la cobertura de retención de evidencias, registros y auditoría' },
  fr: { label: 'Centre de Rétention', description: 'Vérifier la couverture de rétention des preuves, registres et audits' },
  it: { label: 'Centro Retention', description: 'Verifica la copertura retention di evidenze, registri e audit' },
  de: { label: 'Retention Center', description: 'Aufbewahrung für Nachweise, Datensätze und Audit-Historie prüfen' },
};

const continuityCopy: Record<string, { label: string; description: string }> = {
  en: { label: 'Continuity Center', description: 'Review operational continuity controls and recovery readiness' },
  pt: { label: 'Centro de Continuidade', description: 'Reveja controlos de continuidade operacional e prontidão de recuperação' },
  es: { label: 'Centro de Continuidad', description: 'Revisa controles de continuidad operativa y preparación de recuperación' },
  fr: { label: 'Centre de Continuité', description: 'Vérifier les contrôles de continuité et la préparation de reprise' },
  it: { label: 'Centro Continuità', description: 'Verifica controlli di continuità operativa e readiness di recovery' },
  de: { label: 'Continuity Center', description: 'Operative Kontinuität und Wiederherstellungsreife prüfen' },
};

const vendorAssuranceCopy: Record<string, { label: string; description: string }> = {
  en: { label: 'Vendor Assurance', description: 'Review key providers, subprocessors and vendor evidence' },
  pt: { label: 'Garantia de Fornecedores', description: 'Reveja fornecedores, subprocessadores e evidências de terceiros' },
  es: { label: 'Garantía de Proveedores', description: 'Revisa proveedores, subprocesadores y evidencias de terceros' },
  fr: { label: 'Assurance Fournisseurs', description: 'Vérifier les prestataires, sous-traitants et preuves associées' },
  it: { label: 'Assurance Fornitori', description: 'Verifica provider, subprocessori ed evidenze di terze parti' },
  de: { label: 'Vendor Assurance', description: 'Anbieter, Unterauftragsverarbeiter und Nachweise prüfen' },
};

const questionnaireCopy: Record<string, { label: string; description: string }> = {
  en: { label: 'Security Questionnaire', description: 'Review reusable answers for security reviews, RFPs and procurement' },
  pt: { label: 'Questionário de Segurança', description: 'Reveja respostas reutilizáveis para security reviews, RFPs e procurement' },
  es: { label: 'Cuestionario de Seguridad', description: 'Revisa respuestas reutilizables para security reviews, RFPs y procurement' },
  fr: { label: 'Questionnaire Sécurité', description: 'Vérifier les réponses réutilisables pour revues sécurité, RFP et procurement' },
  it: { label: 'Questionario Sicurezza', description: 'Verifica risposte riutilizzabili per security review, RFP e procurement' },
  de: { label: 'Security Questionnaire', description: 'Wiederverwendbare Antworten für Security Reviews, RFPs und Procurement prüfen' },
};

const evidencePackCopy: Record<string, { label: string; description: string; verify: string; verifyDescription: string }> = {
  en: { label: 'Evidence Pack', description: 'Export a structured audit evidence snapshot', verify: 'Verify Evidence Pack', verifyDescription: 'Validate exported pack hash and signature status' },
  pt: { label: 'Pacote de Evidências', description: 'Exporte uma fotografia estruturada de evidências de auditoria', verify: 'Verificar Evidências', verifyDescription: 'Valide hash e estado da assinatura do pacote exportado' },
  es: { label: 'Paquete de Evidencias', description: 'Exporta una fotografía estructurada de evidencias de auditoría', verify: 'Verificar Evidencias', verifyDescription: 'Valida hash y estado de firma del paquete exportado' },
  fr: { label: 'Pack de Preuves', description: 'Exporter un instantané structuré des preuves d’audit', verify: 'Vérifier le Pack', verifyDescription: 'Valider le hash et l’état de signature du pack exporté' },
  it: { label: 'Pacchetto Evidenze', description: 'Esporta uno snapshot strutturato delle evidenze di audit', verify: 'Verifica Evidenze', verifyDescription: 'Valida hash e stato firma del pacchetto esportato' },
  de: { label: 'Evidence Pack', description: 'Strukturierten Audit-Nachweis-Snapshot exportieren', verify: 'Evidence Pack prüfen', verifyDescription: 'Hash und Signaturstatus des exportierten Pakets prüfen' },
};

const addOnsCopy: Record<string, { label: string; description: string }> = {
  en: { label: 'Add-ons & Credits', description: 'Check what is included, active or available before buying extras' },
  pt: { label: 'Add-ons & Créditos', description: 'Veja o que está incluído, ativo ou disponível antes de comprar adicionais' },
  es: { label: 'Add-ons y Créditos', description: 'Consulta qué está incluido, activo o disponible antes de comprar extras' },
  fr: { label: 'Modules & Crédits', description: 'Vérifier ce qui est inclus, actif ou disponible avant achat' },
  it: { label: 'Add-on e Crediti', description: 'Verifica cosa è incluso, attivo o disponibile prima dell’acquisto' },
  de: { label: 'Add-ons & Credits', description: 'Prüfen, was enthalten, aktiv oder vor dem Kauf verfügbar ist' },
};

function getAiGovernanceCopy(locale: string) {
  return aiGovernanceCopy[locale] ?? aiGovernanceCopy.en;
}

function getRolesCopy(locale: string) {
  return rolesCopy[locale] ?? rolesCopy.en;
}

function getReadinessCopy(locale: string) {
  return readinessCopy[locale] ?? readinessCopy.en;
}

function getRetentionCopy(locale: string) {
  return retentionCopy[locale] ?? retentionCopy.en;
}

function getContinuityCopy(locale: string) {
  return continuityCopy[locale] ?? continuityCopy.en;
}

function getVendorAssuranceCopy(locale: string) {
  return vendorAssuranceCopy[locale] ?? vendorAssuranceCopy.en;
}

function getQuestionnaireCopy(locale: string) {
  return questionnaireCopy[locale] ?? questionnaireCopy.en;
}

function getEvidencePackCopy(locale: string) {
  return evidencePackCopy[locale] ?? evidencePackCopy.en;
}

function getAddOnsCopy(locale: string) {
  return addOnsCopy[locale] ?? addOnsCopy.en;
}

export function getLocalizedDashboardNavigation(locale: string): LocalizedMenuItem[] {
  const nav = getAppDictionary(locale).nav;
  const aiNav = getAiGovernanceCopy(locale);
  const rolesLabel = getRolesCopy(locale);
  const readiness = getReadinessCopy(locale);
  const retention = getRetentionCopy(locale);
  const continuity = getContinuityCopy(locale);
  const vendorAssurance = getVendorAssuranceCopy(locale);
  const questionnaire = getQuestionnaireCopy(locale);
  const evidencePack = getEvidencePackCopy(locale);
  const addOns = getAddOnsCopy(locale);

  return [
    { label: nav.eurocomply, href: '/risck-comply-home', description: nav.eurocomplyDescription },
    {
      label: nav.commandCenter,
      href: `${dashboardRoot}/command-center`,
      sections: [
        { label: nav.executiveDashboard, href: `${dashboardRoot}/command-center`, description: nav.executiveDashboardDescription },
        { label: nav.auditLog, href: '/auditoria', description: nav.auditLogDescription },
        { label: nav.legalCalendar, href: '/calendario-compliance', description: nav.legalCalendarDescription },
      ],
    },
    {
      label: aiNav.label,
      href: '/ai-systems',
      description: aiNav.description,
      sections: [
        { label: aiNav.inventory, href: '/ai-systems', description: aiNav.inventoryDescription },
        { label: aiNav.incidents, href: '/ai-incidents', description: aiNav.incidentsDescription },
        { label: nav.riskMatrix, href: `${dashboardRoot}/risks`, description: nav.riskMatrixDescription },
        { label: nav.raciMatrix, href: '/raci', description: nav.raciMatrixDescription },
      ],
    },
    {
      label: nav.evidenceRisk,
      href: `${dashboardRoot}/evidence-risk`,
      sections: [
        { label: nav.controlledDocuments, href: `${dashboardRoot}/documents`, description: nav.controlledDocumentsDescription },
        { label: nav.riskMatrix, href: `${dashboardRoot}/risks`, description: nav.riskMatrixDescription },
        { label: nav.raciMatrix, href: '/raci', description: nav.raciMatrixDescription },
      ],
    },
    {
      label: nav.reportsGovernance,
      href: `${dashboardRoot}/reports-governance`,
      sections: [
        { label: nav.complianceReports, href: `${dashboardRoot}/reports-governance`, description: nav.complianceReportsDescription },
        { label: readiness.label, href: '/enterprise-readiness', description: readiness.description },
        { label: evidencePack.label, href: '/audit-pack', description: evidencePack.description },
        { label: evidencePack.verify, href: '/audit-pack/verify', description: evidencePack.verifyDescription },
        { label: questionnaire.label, href: '/security-questionnaire', description: questionnaire.description },
        { label: retention.label, href: '/retention-center', description: retention.description },
        { label: continuity.label, href: '/continuity-center', description: continuity.description },
        { label: vendorAssurance.label, href: '/vendor-assurance', description: vendorAssurance.description },
        { label: nav.europeanNews, href: `${dashboardRoot}/reports-governance/news`, description: nav.europeanNewsDescription },
        { label: nav.approvals, href: '/aprovacoes', description: nav.approvalsDescription },
        { label: nav.minutesGovernance, href: `${dashboardRoot}/reports-governance`, description: nav.minutesGovernanceDescription },
      ],
    },
    {
      label: nav.profile,
      href: '/profile',
      sections: [
        { label: nav.myData, href: '/profile#company-data', description: nav.myDataDescription },
        { label: nav.plan, href: '/profile#plan', description: nav.planDescription },
        { label: addOns.label, href: `${dashboardRoot}/add-ons`, description: addOns.description },
        { label: nav.employees, href: '/profile#employees', description: nav.employeesDescription },
        { label: rolesLabel, href: '/security-center' },
        { label: nav.enterpriseAvatar, href: '/profile#enterprise-status', description: nav.enterpriseAvatarDescription },
      ],
    },
    { label: nav.notifications, href: '/notificacoes', description: nav.notificationsDescription },
    { label: nav.news, href: `${dashboardRoot}/reports-governance/news`, description: nav.newsDescription },
  ];
}
