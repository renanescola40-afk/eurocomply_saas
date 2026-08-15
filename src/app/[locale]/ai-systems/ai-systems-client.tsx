'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bot, BrainCircuit, Database, FileText, Plus, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AiActRiskLevel } from '@/server/ai-governance/classifier';
import type { AiGovernanceReadiness } from '@/server/ai-governance/readiness';
import type { AiSystemRecord } from '@/server/queries/ai-systems';
import { ReadinessCard } from './readiness-card';
import { RoleWizardCard } from './role-wizard-card';

type AiSystemsClientProps = {
  locale: string;
  initialSystems: AiSystemRecord[];
  organizationName?: string | null;
  readiness: AiGovernanceReadiness;
};

type FormState = {
  name: string;
  ownerTeam: string;
  category: string;
  countryMarket: string;
  processedData: string;
  vendorName: string;
  modelName: string;
  useCase: string;
  role: string;
  lifecycleStatus: string;
  riskDomain: string;
  usesPersonalData: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  biometricIdentification: boolean;
  manipulativeOrExploitative: boolean;
};

const defaultForm: FormState = {
  name: '',
  ownerTeam: '',
  category: '',
  countryMarket: '',
  processedData: '',
  vendorName: '',
  modelName: '',
  useCase: '',
  role: 'deployer',
  lifecycleStatus: 'planned',
  riskDomain: 'general_productivity',
  usesPersonalData: false,
  interactsWithPeople: false,
  generatesContent: false,
  biometricIdentification: false,
  manipulativeOrExploitative: false,
};

const baseInventoryCopy = {
  badge: 'AI Governance',
  title: 'AI systems inventory',
  subtitle: 'Register AI systems with owners, market, data, model facts, AI Act exposure, obligations and history-backed next actions.',
  org: 'Organization',
  total: 'AI systems',
  high: 'High-risk review',
  transparency: 'Transparency',
  addTitle: 'Register AI system',
  addSubtitle: 'Start with the facts a compliance team needs: owner, category, market, data, model, use case and risk signals.',
  name: 'System name',
  ownerTeam: 'Owner team',
  category: 'Category',
  countryMarket: 'Country or market',
  processedData: 'Data processed',
  vendorName: 'Vendor or model provider',
  modelName: 'Model name',
  useCasePlaceholder: 'Example: summarises customer support tickets and suggests replies to agents.',
  role: 'Organization role',
  status: 'Lifecycle status',
  domain: 'Risk domain',
  checks: 'Assessment flags',
  personalData: 'Processes personal data',
  people: 'Interacts directly with people',
  content: 'Generates content or decisions',
  biometric: 'Biometric identification or categorisation',
  prohibited: 'Could manipulate, exploit vulnerability or enable prohibited use',
  submit: 'Classify and save',
  saving: 'Classifying...',
  empty: 'No AI systems registered yet. Add the first one to build your AI Act inventory.',
  obligations: 'Initial obligations',
  nextActions: 'Next actions',
  error: 'Could not create AI system.',
  migration: 'The AI governance table is not available yet. Apply the Supabase migration before saving systems.',
  review: 'Open detail',
  model: 'Model',
  market: 'Market',
  data: 'Data',
  lastReassessed: 'Last reassessed',
};

const copy = {
  en: { ...baseInventoryCopy },
  pt: {
    ...baseInventoryCopy,
    badge: 'Governação de IA',
    title: 'Inventário de sistemas de IA',
    subtitle: 'Registe sistemas de IA com responsável, mercado, dados, modelo, exposição ao AI Act, obrigações e próximas ações com histórico.',
    org: 'Organização',
    total: 'Sistemas de IA',
    high: 'Revisão de alto risco',
    transparency: 'Transparência',
    addTitle: 'Registar sistema de IA',
    addSubtitle: 'Comece pelos factos que a equipa de compliance precisa: responsável, categoria, mercado, dados, modelo, caso de uso e sinais de risco.',
    name: 'Nome do sistema',
    ownerTeam: 'Equipa responsável',
    category: 'Categoria',
    countryMarket: 'País ou mercado',
    processedData: 'Dados processados',
    vendorName: 'Fornecedor ou provedor do modelo',
    modelName: 'Nome do modelo',
    useCasePlaceholder: 'Exemplo: resume tickets de suporte e sugere respostas aos agentes.',
    role: 'Papel da organização',
    status: 'Estado do ciclo de vida',
    domain: 'Domínio de risco',
    checks: 'Sinais da avaliação',
    personalData: 'Processa dados pessoais',
    people: 'Interage diretamente com pessoas',
    content: 'Gera conteúdo ou decisões',
    biometric: 'Identificação ou categorização biométrica',
    prohibited: 'Pode manipular, explorar vulnerabilidades ou permitir uso proibido',
    submit: 'Classificar e guardar',
    saving: 'A classificar...',
    empty: 'Ainda não existem sistemas de IA registados. Adicione o primeiro para criar o inventário do AI Act.',
    obligations: 'Obrigações iniciais',
    nextActions: 'Próximas ações',
    error: 'Não foi possível criar o sistema de IA.',
    migration: 'A tabela de governação de IA ainda não está disponível. A configuração da base de dados precisa de ser concluída antes de guardar sistemas.',
    review: 'Abrir detalhe',
    model: 'Modelo',
    market: 'Mercado',
    data: 'Dados',
    lastReassessed: 'Última reavaliação',
  },
  es: {
    ...baseInventoryCopy,
    badge: 'Gobernanza de IA',
    title: 'Inventario de sistemas de IA',
    subtitle: 'Registra sistemas de IA con responsables, mercado, datos, modelo, exposición al AI Act, obligaciones y próximas acciones basadas en historial.',
    org: 'Organización',
    total: 'Sistemas de IA',
    high: 'Revisión de alto riesgo',
    transparency: 'Transparencia',
    addTitle: 'Registrar sistema de IA',
    addSubtitle: 'Empieza por los datos que necesita compliance: responsable, categoría, mercado, datos, modelo, caso de uso y señales de riesgo.',
    name: 'Nombre del sistema', ownerTeam: 'Equipo responsable', category: 'Categoría', countryMarket: 'País o mercado', processedData: 'Datos procesados', vendorName: 'Proveedor o proveedor del modelo', modelName: 'Nombre del modelo',
    useCasePlaceholder: 'Ejemplo: resume tickets de soporte y sugiere respuestas a los agentes.',
    role: 'Rol de la organización', status: 'Estado del ciclo de vida', domain: 'Dominio de riesgo', checks: 'Señales de evaluación', personalData: 'Procesa datos personales', people: 'Interactúa directamente con personas', content: 'Genera contenido o decisiones', biometric: 'Identificación o categorización biométrica', prohibited: 'Podría manipular, explotar vulnerabilidades o permitir un uso prohibido',
    submit: 'Clasificar y guardar', saving: 'Clasificando...', empty: 'Todavía no hay sistemas de IA registrados. Añade el primero para crear tu inventario del AI Act.', obligations: 'Obligaciones iniciales', nextActions: 'Próximas acciones', error: 'No se pudo crear el sistema de IA.', migration: 'La tabla de gobernanza de IA aún no está disponible. La configuración de la base de datos debe completarse antes de guardar sistemas.', review: 'Abrir detalle', model: 'Modelo', market: 'Mercado', data: 'Datos', lastReassessed: 'Última reevaluación',
  },
  fr: {
    ...baseInventoryCopy,
    badge: 'Gouvernance IA', title: 'Inventaire des systèmes IA', subtitle: 'Enregistrez les systèmes IA avec responsables, marché, données, modèle, exposition à l’AI Act, obligations et prochaines actions issues de l’historique.', org: 'Organisation', total: 'Systèmes IA', high: 'Revue haut risque', transparency: 'Transparence', addTitle: 'Enregistrer un système IA', addSubtitle: 'Commencez par les faits utiles à la conformité : responsable, catégorie, marché, données, modèle, cas d’usage et signaux de risque.', name: 'Nom du système', ownerTeam: 'Équipe responsable', category: 'Catégorie', countryMarket: 'Pays ou marché', processedData: 'Données traitées', vendorName: 'Fournisseur ou fournisseur du modèle', modelName: 'Nom du modèle', useCasePlaceholder: 'Exemple : résume les tickets de support et suggère des réponses aux agents.', role: 'Rôle de l’organisation', status: 'État du cycle de vie', domain: 'Domaine de risque', checks: 'Signaux d’évaluation', personalData: 'Traite des données personnelles', people: 'Interagit directement avec des personnes', content: 'Génère du contenu ou des décisions', biometric: 'Identification ou catégorisation biométrique', prohibited: 'Pourrait manipuler, exploiter une vulnérabilité ou permettre un usage interdit', submit: 'Classifier et enregistrer', saving: 'Classification...', empty: 'Aucun système IA enregistré. Ajoutez le premier pour constituer votre inventaire AI Act.', obligations: 'Obligations initiales', nextActions: 'Prochaines actions', error: 'Impossible de créer le système IA.', migration: 'La table de gouvernance IA n’est pas encore disponible. La configuration de la base doit être terminée avant l’enregistrement.', review: 'Ouvrir le détail', model: 'Modèle', market: 'Marché', data: 'Données', lastReassessed: 'Dernière réévaluation',
  },
  it: {
    ...baseInventoryCopy,
    badge: 'Governance IA', title: 'Inventario dei sistemi IA', subtitle: 'Registra i sistemi IA con responsabili, mercato, dati, modello, esposizione all’AI Act, obblighi e prossime azioni basate sullo storico.', org: 'Organizzazione', total: 'Sistemi IA', high: 'Revisione alto rischio', transparency: 'Trasparenza', addTitle: 'Registra sistema IA', addSubtitle: 'Parti dai dati necessari al team compliance: responsabile, categoria, mercato, dati, modello, caso d’uso e segnali di rischio.', name: 'Nome del sistema', ownerTeam: 'Team responsabile', category: 'Categoria', countryMarket: 'Paese o mercato', processedData: 'Dati trattati', vendorName: 'Fornitore o provider del modello', modelName: 'Nome del modello', useCasePlaceholder: 'Esempio: riassume ticket di supporto e suggerisce risposte agli operatori.', role: 'Ruolo dell’organizzazione', status: 'Stato del ciclo di vita', domain: 'Dominio di rischio', checks: 'Segnali di valutazione', personalData: 'Tratta dati personali', people: 'Interagisce direttamente con persone', content: 'Genera contenuti o decisioni', biometric: 'Identificazione o categorizzazione biometrica', prohibited: 'Potrebbe manipolare, sfruttare vulnerabilità o consentire un uso vietato', submit: 'Classifica e salva', saving: 'Classificazione...', empty: 'Nessun sistema IA registrato. Aggiungi il primo per creare il tuo inventario AI Act.', obligations: 'Obblighi iniziali', nextActions: 'Prossime azioni', error: 'Impossibile creare il sistema IA.', migration: 'La tabella di governance IA non è ancora disponibile. La configurazione del database deve essere completata prima del salvataggio.', review: 'Apri dettaglio', model: 'Modello', market: 'Mercato', data: 'Dati', lastReassessed: 'Ultima rivalutazione',
  },
  de: {
    ...baseInventoryCopy,
    badge: 'KI-Governance', title: 'KI-Systeminventar', subtitle: 'Erfassen Sie KI-Systeme mit Verantwortlichen, Markt, Daten, Modell, AI-Act-Exposition, Pflichten und historienbasierten nächsten Schritten.', org: 'Organisation', total: 'KI-Systeme', high: 'Hochrisiko-Prüfung', transparency: 'Transparenz', addTitle: 'KI-System erfassen', addSubtitle: 'Beginnen Sie mit den Fakten für Compliance: Verantwortliche, Kategorie, Markt, Daten, Modell, Use Case und Risikosignale.', name: 'Systemname', ownerTeam: 'Verantwortliches Team', category: 'Kategorie', countryMarket: 'Land oder Markt', processedData: 'Verarbeitete Daten', vendorName: 'Anbieter oder Modellprovider', modelName: 'Modellname', useCasePlaceholder: 'Beispiel: fasst Support-Tickets zusammen und schlägt Antworten vor.', role: 'Rolle der Organisation', status: 'Lebenszyklusstatus', domain: 'Risikodomäne', checks: 'Bewertungssignale', personalData: 'Verarbeitet personenbezogene Daten', people: 'Interagiert direkt mit Personen', content: 'Erzeugt Inhalte oder Entscheidungen', biometric: 'Biometrische Identifizierung oder Kategorisierung', prohibited: 'Könnte manipulieren, Schwachstellen ausnutzen oder verbotene Nutzung ermöglichen', submit: 'Klassifizieren und speichern', saving: 'Klassifizierung...', empty: 'Noch keine KI-Systeme erfasst. Fügen Sie das erste hinzu, um Ihr AI-Act-Inventar aufzubauen.', obligations: 'Erste Pflichten', nextActions: 'Nächste Schritte', error: 'KI-System konnte nicht erstellt werden.', migration: 'Die KI-Governance-Tabelle ist noch nicht verfügbar. Die Datenbankkonfiguration muss vor dem Speichern abgeschlossen sein.', review: 'Details öffnen', model: 'Modell', market: 'Markt', data: 'Daten', lastReassessed: 'Letzte Neubewertung',
  },
} as const;

const readinessCopy = {
  en: { score: 'Readiness score', notAssessed: 'Not assessed', gaps: 'Gap analysis', actions: 'Role-based action plan', country: 'Country-aware compliance context', productMap: 'AI compliance product map', productSubtitle: 'Every CTA points to a working route. Metrics are only shown when backed by workspace data.', questionnaire: 'Run usage questionnaire', policy: 'Generate policy pack', documents: 'Open document generator', owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer', noGaps: 'No critical gaps detected from current data.', dataSource: 'Data source' },
  pt: { score: 'Score de prontidão', notAssessed: 'Não avaliado', gaps: 'Análise de gaps', actions: 'Plano de ação por papel', country: 'Contexto de compliance por país', productMap: 'Mapa do produto de compliance de IA', productSubtitle: 'Cada CTA aponta para uma rota funcional. Métricas só aparecem quando existem dados reais.', questionnaire: 'Executar questionário de uso', policy: 'Gerar policy pack', documents: 'Abrir gerador de documentos', owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer', noGaps: 'Nenhum gap crítico detetado nos dados atuais.', dataSource: 'Fonte de dados' },
  es: { score: 'Score de preparación', notAssessed: 'No evaluado', gaps: 'Análisis de gaps', actions: 'Plan de acción por rol', country: 'Contexto de compliance por país', productMap: 'Mapa del producto de compliance de IA', productSubtitle: 'Cada CTA apunta a una ruta funcional. Las métricas solo aparecen cuando existen datos del workspace.', questionnaire: 'Ejecutar cuestionario de uso', policy: 'Generar pack de políticas', documents: 'Abrir generador de documentos', owner: 'Owner', admin: 'Admin', member: 'Miembro', viewer: 'Visualizador', noGaps: 'No se detectaron gaps críticos en los datos actuales.', dataSource: 'Fuente de datos' },
  fr: { score: 'Score de préparation', notAssessed: 'Non évalué', gaps: 'Analyse des écarts', actions: 'Plan d’action par rôle', country: 'Contexte compliance par pays', productMap: 'Carte du produit de compliance IA', productSubtitle: 'Chaque CTA mène à une route fonctionnelle. Les métriques ne sont affichées qu’avec des données du workspace.', questionnaire: 'Lancer le questionnaire d’usage', policy: 'Générer le pack de politiques', documents: 'Ouvrir le générateur de documents', owner: 'Owner', admin: 'Admin', member: 'Membre', viewer: 'Lecteur', noGaps: 'Aucun écart critique détecté dans les données actuelles.', dataSource: 'Source des données' },
  it: { score: 'Score di preparazione', notAssessed: 'Non valutato', gaps: 'Analisi dei gap', actions: 'Piano d’azione per ruolo', country: 'Contesto compliance per paese', productMap: 'Mappa prodotto compliance IA', productSubtitle: 'Ogni CTA porta a una rotta funzionante. Le metriche appaiono solo quando supportate dai dati del workspace.', questionnaire: 'Esegui questionario d’uso', policy: 'Genera policy pack', documents: 'Apri generatore documenti', owner: 'Owner', admin: 'Admin', member: 'Membro', viewer: 'Visualizzatore', noGaps: 'Nessun gap critico rilevato nei dati attuali.', dataSource: 'Fonte dati' },
  de: { score: 'Readiness-Score', notAssessed: 'Nicht bewertet', gaps: 'Gap-Analyse', actions: 'Rollenbasierter Aktionsplan', country: 'Länderspezifischer Compliance-Kontext', productMap: 'KI-Compliance-Produktkarte', productSubtitle: 'Jeder CTA führt zu einer funktionierenden Route. Kennzahlen erscheinen nur mit Workspace-Daten.', questionnaire: 'Nutzungsfragebogen starten', policy: 'Policy-Paket erzeugen', documents: 'Dokumentgenerator öffnen', owner: 'Owner', admin: 'Admin', member: 'Mitglied', viewer: 'Leser', noGaps: 'Keine kritischen Lücken in den aktuellen Daten erkannt.', dataSource: 'Datenquelle' },
} as const;

const roleOptions = ['provider', 'deployer', 'importer', 'distributor', 'other'] as const;
const statusOptions = ['planned', 'pilot', 'production', 'retired'] as const;
const domainOptions = ['general_productivity', 'customer_support', 'content_generation', 'biometrics', 'employment', 'education', 'credit_finance', 'essential_services', 'law_enforcement', 'migration_border', 'justice_democratic_processes', 'safety_component', 'critical_infrastructure'] as const;

const optionCopy = {
  en: {
    roles: { provider: 'Provider', deployer: 'Deployer', importer: 'Importer', distributor: 'Distributor', other: 'Other' },
    statuses: { planned: 'Planned', pilot: 'Pilot', production: 'Production', retired: 'Retired' },
    domains: { general_productivity: 'General productivity', customer_support: 'Customer support', content_generation: 'Content generation', biometrics: 'Biometrics', employment: 'Employment / workers', education: 'Education', credit_finance: 'Credit / finance', essential_services: 'Essential services', law_enforcement: 'Law enforcement', migration_border: 'Migration / border', justice_democratic_processes: 'Justice / democratic processes', safety_component: 'Safety component', critical_infrastructure: 'Critical infrastructure' },
  },
  pt: {
    roles: { provider: 'Fornecedor', deployer: 'Utilizador profissional', importer: 'Importador', distributor: 'Distribuidor', other: 'Outro' },
    statuses: { planned: 'Planeado', pilot: 'Piloto', production: 'Produção', retired: 'Descontinuado' },
    domains: { general_productivity: 'Produtividade geral', customer_support: 'Suporte ao cliente', content_generation: 'Geração de conteúdo', biometrics: 'Biometria', employment: 'Emprego / trabalhadores', education: 'Educação', credit_finance: 'Crédito / finanças', essential_services: 'Serviços essenciais', law_enforcement: 'Aplicação da lei', migration_border: 'Migração / fronteira', justice_democratic_processes: 'Justiça / processos democráticos', safety_component: 'Componente de segurança', critical_infrastructure: 'Infraestrutura crítica' },
  },
  es: {
    roles: { provider: 'Proveedor', deployer: 'Desplegador', importer: 'Importador', distributor: 'Distribuidor', other: 'Otro' },
    statuses: { planned: 'Planificado', pilot: 'Piloto', production: 'Producción', retired: 'Retirado' },
    domains: { general_productivity: 'Productividad general', customer_support: 'Soporte al cliente', content_generation: 'Generación de contenido', biometrics: 'Biometría', employment: 'Empleo / trabajadores', education: 'Educación', credit_finance: 'Crédito / finanzas', essential_services: 'Servicios esenciales', law_enforcement: 'Aplicación de la ley', migration_border: 'Migración / frontera', justice_democratic_processes: 'Justicia / procesos democráticos', safety_component: 'Componente de seguridad', critical_infrastructure: 'Infraestructura crítica' },
  },
  fr: {
    roles: { provider: 'Fournisseur', deployer: 'Déployeur', importer: 'Importateur', distributor: 'Distributeur', other: 'Autre' },
    statuses: { planned: 'Planifié', pilot: 'Pilote', production: 'Production', retired: 'Retiré' },
    domains: { general_productivity: 'Productivité générale', customer_support: 'Support client', content_generation: 'Génération de contenu', biometrics: 'Biométrie', employment: 'Emploi / travailleurs', education: 'Éducation', credit_finance: 'Crédit / finance', essential_services: 'Services essentiels', law_enforcement: 'Application de la loi', migration_border: 'Migration / frontière', justice_democratic_processes: 'Justice / processus démocratiques', safety_component: 'Composant de sécurité', critical_infrastructure: 'Infrastructure critique' },
  },
  it: {
    roles: { provider: 'Fornitore', deployer: 'Utilizzatore', importer: 'Importatore', distributor: 'Distributore', other: 'Altro' },
    statuses: { planned: 'Pianificato', pilot: 'Pilota', production: 'Produzione', retired: 'Ritirato' },
    domains: { general_productivity: 'Produttività generale', customer_support: 'Supporto clienti', content_generation: 'Generazione contenuti', biometrics: 'Biometria', employment: 'Impiego / lavoratori', education: 'Istruzione', credit_finance: 'Credito / finanza', essential_services: 'Servizi essenziali', law_enforcement: 'Forze dell’ordine', migration_border: 'Migrazione / frontiera', justice_democratic_processes: 'Giustizia / processi democratici', safety_component: 'Componente di sicurezza', critical_infrastructure: 'Infrastruttura critica' },
  },
  de: {
    roles: { provider: 'Anbieter', deployer: 'Betreiber', importer: 'Importeur', distributor: 'Händler', other: 'Andere' },
    statuses: { planned: 'Geplant', pilot: 'Pilot', production: 'Produktion', retired: 'Stillgelegt' },
    domains: { general_productivity: 'Allgemeine Produktivität', customer_support: 'Kundensupport', content_generation: 'Inhaltserzeugung', biometrics: 'Biometrie', employment: 'Beschäftigung / Arbeitnehmer', education: 'Bildung', credit_finance: 'Kredit / Finanzen', essential_services: 'Wesentliche Dienste', law_enforcement: 'Strafverfolgung', migration_border: 'Migration / Grenze', justice_democratic_processes: 'Justiz / demokratische Prozesse', safety_component: 'Sicherheitskomponente', critical_infrastructure: 'Kritische Infrastruktur' },
  },
} as const;

const riskCopy = {
  en: { prohibited_review: 'Prohibited review', high_risk_review: 'High-risk review', limited_transparency: 'Limited transparency', minimal_low: 'Minimal / low' },
  pt: { prohibited_review: 'Revisão de uso proibido', high_risk_review: 'Revisão de alto risco', limited_transparency: 'Transparência limitada', minimal_low: 'Mínimo / baixo' },
  es: { prohibited_review: 'Revisión de uso prohibido', high_risk_review: 'Revisión de alto riesgo', limited_transparency: 'Transparencia limitada', minimal_low: 'Mínimo / bajo' },
  fr: { prohibited_review: 'Revue d’usage interdit', high_risk_review: 'Revue haut risque', limited_transparency: 'Transparence limitée', minimal_low: 'Minimal / faible' },
  it: { prohibited_review: 'Revisione uso vietato', high_risk_review: 'Revisione alto rischio', limited_transparency: 'Trasparenza limitata', minimal_low: 'Minimo / basso' },
  de: { prohibited_review: 'Prüfung verbotener Nutzung', high_risk_review: 'Hochrisiko-Prüfung', limited_transparency: 'Begrenzte Transparenz', minimal_low: 'Minimal / niedrig' },
} as const;

function getCopy(locale: string) {
  return copy[locale as keyof typeof copy] ?? copy.en;
}

function getReadinessCopy(locale: string) {
  return readinessCopy[locale as keyof typeof readinessCopy] ?? readinessCopy.en;
}

function getOptionCopy(locale: string) {
  return optionCopy[locale as keyof typeof optionCopy] ?? optionCopy.en;
}

function localizedRoute(locale: string, route: string) {
  return `/${locale}${route.startsWith('/') ? route : `/${route}`}`;
}

function getRiskLabel(locale: string, level: AiActRiskLevel) {
  const labels = riskCopy[locale as keyof typeof riskCopy] ?? riskCopy.en;
  if (level === 'prohibited_review') return labels.prohibited_review;
  if (level === 'high_risk_review') return labels.high_risk_review;
  if (level === 'limited_transparency') return labels.limited_transparency;
  return labels.minimal_low;
}

function getRiskTone(level: AiActRiskLevel) {
  if (level === 'prohibited_review') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (level === 'high_risk_review') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (level === 'limited_transparency') return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
}

function severityTone(severity: string) {
  if (severity === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200';
  if (severity === 'high') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (severity === 'medium') return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
}

function roleLabel(locale: string, role: AiGovernanceReadiness['actionPlan'][number]['ownerRole']) {
  const t = getReadinessCopy(locale);
  return t[role];
}

export function AiSystemsClient({ locale, initialSystems, organizationName, readiness }: AiSystemsClientProps) {
  const router = useRouter();
  const t = getCopy(locale);
  const rt = getReadinessCopy(locale);
  const options = getOptionCopy(locale);
  const [systems, setSystems] = useState(initialSystems);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const stats = useMemo(() => {
    const highRisk = systems.filter((system) => system.risk_level === 'high_risk_review' || system.risk_level === 'prohibited_review').length;
    const transparency = systems.filter((system) => system.risk_level === 'limited_transparency').length;
    return { highRisk, transparency };
  }, [systems]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice('');

    const response = await fetch('/api/ai-systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setNotice(payload?.error === 'ai_systems_table_missing' ? t.migration : payload?.message ?? t.error);
      setIsSubmitting(false);
      return;
    }

    setSystems((current) => [payload.system as AiSystemRecord, ...current]);
    setForm(defaultForm);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="outline" className="rounded-full"><BrainCircuit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{t.badge}</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
            {organizationName ? <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">{t.org}: {organizationName}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border bg-muted/20 p-4"><Database className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-2xl font-bold">{systems.length}</p><p className="text-xs text-muted-foreground">{t.total}</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-2xl font-bold">{stats.highRisk}</p><p className="text-xs text-muted-foreground">{t.high}</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><FileText className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-2xl font-bold">{stats.transparency}</p><p className="text-xs text-muted-foreground">{t.transparency}</p></div>
          </div>
        </div>

        <ReadinessCard locale={locale} systems={systems} />

        <section id="readiness-score" className="mt-8 rounded-3xl border bg-background p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border bg-muted/20 p-5">
              <p className="text-sm font-medium text-muted-foreground">{rt.score}</p>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-5xl font-semibold tracking-tight">{readiness.score === null ? '—' : `${readiness.score}%`}</p>
                <Badge variant="outline" className="mb-1 rounded-full">{readiness.score === null ? rt.notAssessed : readiness.status}</Badge>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{readiness.boardSummary}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Button asChild className="rounded-full"><Link href={localizedRoute(locale, '/ai-questionnaire')}>{rt.questionnaire}</Link></Button>
                <Button asChild variant="outline" className="rounded-full"><Link href={localizedRoute(locale, '/policy-pack')}>{rt.policy}</Link></Button>
                <Button asChild variant="outline" className="rounded-full"><Link href={localizedRoute(locale, '/document-generator')}>{rt.documents}</Link></Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(readiness.coverage).map(([key, value]) => (
                <div key={key} className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}%</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border bg-background p-5">
            <h2 className="text-lg font-semibold">{rt.gaps}</h2>
            <div className="mt-4 grid gap-3">
              {readiness.gaps.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">{rt.noGaps}</div>
              ) : readiness.gaps.map((gap) => (
                <article key={gap.id} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">{gap.title}</h3>
                    <Badge variant="outline" className={severityTone(gap.severity)}>{gap.severity}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{gap.description}</p>
                  <Link href={localizedRoute(locale, gap.route)} className="mt-3 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                    {gap.action} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-background p-5">
            <h2 className="text-lg font-semibold">{rt.actions}</h2>
            <div className="mt-4 space-y-3">
              {readiness.actionPlan.map((action) => (
                <Link key={action.id} href={localizedRoute(locale, action.route)} className="block rounded-2xl border bg-muted/20 p-4 transition hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  <Badge variant="outline" className="rounded-full">{roleLabel(locale, action.ownerRole)}</Badge>
                  <h3 className="mt-3 font-semibold">{action.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="mt-8 rounded-3xl border bg-muted/20 p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">{t.addTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.addSubtitle}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder={t.name} aria-label={t.name} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" />
            <input value={form.ownerTeam} onChange={(event) => update('ownerTeam', event.target.value)} placeholder={t.ownerTeam} aria-label={t.ownerTeam} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" />
            <input value={form.category} onChange={(event) => update('category', event.target.value)} placeholder={t.category} aria-label={t.category} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" />
            <input value={form.countryMarket} onChange={(event) => update('countryMarket', event.target.value)} placeholder={t.countryMarket} aria-label={t.countryMarket} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" />
            <input value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} placeholder={t.vendorName} aria-label={t.vendorName} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" />
            <input value={form.modelName} onChange={(event) => update('modelName', event.target.value)} placeholder={t.modelName} aria-label={t.modelName} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" />
            <select value={form.role} onChange={(event) => update('role', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={t.role}>{roleOptions.map((value) => <option key={value} value={value}>{options.roles[value]}</option>)}</select>
            <select value={form.lifecycleStatus} onChange={(event) => update('lifecycleStatus', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={t.status}>{statusOptions.map((value) => <option key={value} value={value}>{options.statuses[value]}</option>)}</select>
            <select value={form.riskDomain} onChange={(event) => update('riskDomain', event.target.value)} className="rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 md:col-span-2" aria-label={t.domain}>{domainOptions.map((value) => <option key={value} value={value}>{options.domains[value]}</option>)}</select>
            <textarea value={form.processedData} onChange={(event) => update('processedData', event.target.value)} placeholder={t.processedData} aria-label={t.processedData} className="min-h-24 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 md:col-span-2" />
            <textarea required minLength={8} value={form.useCase} onChange={(event) => update('useCase', event.target.value)} placeholder={t.useCasePlaceholder} aria-label={t.useCasePlaceholder} className="min-h-28 rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 md:col-span-2" />
          </div>
          <fieldset className="mt-5 grid gap-3 rounded-2xl border bg-background p-4 md:grid-cols-2">
            <legend className="px-2 text-sm font-medium">{t.checks}</legend>
            {[
              ['usesPersonalData', t.personalData],
              ['interactsWithPeople', t.people],
              ['generatesContent', t.content],
              ['biometricIdentification', t.biometric],
              ['manipulativeOrExploitative', t.prohibited],
            ].map(([key, label]) => (
              <label key={key} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3 text-sm">
                <input type="checkbox" checked={Boolean(form[key as keyof FormState])} onChange={(event) => update(key as keyof FormState, event.target.checked as never)} className="mt-1" />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <RoleWizardCard locale={locale} input={form} />
          {notice ? <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100" role="alert"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />{notice}</div> : null}
          <Button type="submit" disabled={isSubmitting} className="mt-5 rounded-full"><Plus className="h-4 w-4" aria-hidden="true" />{isSubmitting ? t.saving : t.submit}</Button>
        </form>

        <div className="mt-8 grid gap-4">
          {systems.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground"><Bot className="mx-auto mb-3 h-8 w-8" aria-hidden="true" />{t.empty}</div>
          ) : systems.map((system) => (
            <article key={system.id} className="rounded-3xl border bg-background p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{system.name}</h3>
                    <Badge variant="outline" className={getRiskTone(system.risk_level)}>{getRiskLabel(locale, system.risk_level)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{system.classification_summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{t.model}: {system.model_name ?? '—'}</span>
                    <span>{t.market}: {system.country_market ?? '—'}</span>
                    <span>{t.data}: {system.processed_data ?? '—'}</span>
                    <span>{t.lastReassessed}: {system.last_reassessed_at ?? '—'}</span>
                  </div>
                </div>
                <Button asChild variant="outline" className="rounded-full"><Link href={localizedRoute(locale, `/ai-systems/${system.id}`)}>{t.review}</Link></Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium">{t.obligations}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{system.obligations.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium">{t.nextActions}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{system.next_actions.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
