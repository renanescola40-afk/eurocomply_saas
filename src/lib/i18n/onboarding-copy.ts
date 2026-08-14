import type {
  AiUsageLevel,
  CompanySector,
  CompanyType,
  CountryCode,
  PlanIntent,
} from '@/lib/onboarding/activation';
import type { Locale } from '@/lib/i18n/routing';

export type OnboardingCopy = {
  badge: string;
  title: string;
  subtitle: string;
  save: string;
  saving: string;
  saved: string;
  continue: string;
  back: string;
  finish: string;
  finishing: string;
  success: string;
  optional: string;
  requiredError: string;
  draftError: string;
  saveError: string;
  completeError: string;
  initialClassification: string;
  onboardingSteps: string;
};

const copy: Record<Locale, OnboardingCopy> = {
  en: {
    badge: 'Activation workspace',
    title: 'Build the operating foundation for AI governance',
    subtitle: 'Configure the organization, first system, risk context and evidence queue in one controlled setup flow.',
    save: 'Save and continue later', saving: 'Saving...', saved: 'Progress saved. You can return to onboarding later.', continue: 'Continue', back: 'Back', finish: 'Generate readiness score', finishing: 'Generating...', success: 'Onboarding completed. Opening dashboard...', optional: 'Optional', requiredError: 'Complete the required fields before continuing.', draftError: 'Organization name and slug are required before saving.', saveError: 'Could not save onboarding progress.', completeError: 'Could not complete onboarding.', initialClassification: 'Initial classification', onboardingSteps: 'Onboarding steps',
  },
  pt: {
    badge: 'Configuração do workspace',
    title: 'Construa a base operacional da sua governação de IA',
    subtitle: 'Configure a organização, o primeiro sistema, o contexto de risco e a fila de evidências num fluxo controlado.',
    save: 'Guardar e continuar depois', saving: 'A guardar...', saved: 'Progresso guardado. Pode voltar ao onboarding depois.', continue: 'Continuar', back: 'Voltar', finish: 'Gerar score de prontidão', finishing: 'A gerar...', success: 'Onboarding concluído. A abrir o dashboard...', optional: 'Opcional', requiredError: 'Preencha os campos obrigatórios antes de continuar.', draftError: 'Nome da organização e slug são obrigatórios antes de guardar.', saveError: 'Não foi possível guardar o progresso do onboarding.', completeError: 'Não foi possível concluir o onboarding.', initialClassification: 'Classificação inicial', onboardingSteps: 'Etapas do onboarding',
  },
  es: {
    badge: 'Configuración del workspace',
    title: 'Construye la base operativa de tu gobernanza de IA',
    subtitle: 'Configura la organización, el primer sistema, el contexto de riesgo y la cola de evidencias en un flujo controlado.',
    save: 'Guardar y continuar después', saving: 'Guardando...', saved: 'Progreso guardado. Puedes volver al onboarding después.', continue: 'Continuar', back: 'Atrás', finish: 'Generar score de preparación', finishing: 'Generando...', success: 'Onboarding completado. Abriendo dashboard...', optional: 'Opcional', requiredError: 'Completa los campos obligatorios antes de continuar.', draftError: 'El nombre de la organización y el slug son obligatorios antes de guardar.', saveError: 'No se pudo guardar el progreso del onboarding.', completeError: 'No se pudo completar el onboarding.', initialClassification: 'Clasificación inicial', onboardingSteps: 'Etapas del onboarding',
  },
  fr: {
    badge: 'Configuration du workspace',
    title: 'Construisez la base opérationnelle de votre gouvernance IA',
    subtitle: 'Configurez l’organisation, le premier système, le contexte de risque et la file de preuves dans un parcours contrôlé.',
    save: 'Enregistrer et continuer plus tard', saving: 'Enregistrement...', saved: 'Progression enregistrée. Vous pouvez reprendre l’onboarding plus tard.', continue: 'Continuer', back: 'Retour', finish: 'Générer le score de préparation', finishing: 'Génération...', success: 'Onboarding terminé. Ouverture du dashboard...', optional: 'Facultatif', requiredError: 'Complétez les champs obligatoires avant de continuer.', draftError: 'Le nom de l’organisation et le slug sont requis avant l’enregistrement.', saveError: 'Impossible d’enregistrer la progression de l’onboarding.', completeError: 'Impossible de terminer l’onboarding.', initialClassification: 'Classification initiale', onboardingSteps: 'Étapes de l’onboarding',
  },
  it: {
    badge: 'Configurazione del workspace',
    title: 'Costruisci la base operativa della tua governance IA',
    subtitle: 'Configura organizzazione, primo sistema, contesto di rischio e coda delle evidenze in un flusso controllato.',
    save: 'Salva e continua dopo', saving: 'Salvataggio...', saved: 'Progresso salvato. Puoi riprendere l’onboarding più tardi.', continue: 'Continua', back: 'Indietro', finish: 'Genera score di preparazione', finishing: 'Generazione...', success: 'Onboarding completato. Apertura dashboard...', optional: 'Facoltativo', requiredError: 'Completa i campi obbligatori prima di continuare.', draftError: 'Nome dell’organizzazione e slug sono obbligatori prima del salvataggio.', saveError: 'Impossibile salvare il progresso dell’onboarding.', completeError: 'Impossibile completare l’onboarding.', initialClassification: 'Classificazione iniziale', onboardingSteps: 'Passaggi dell’onboarding',
  },
  de: {
    badge: 'Workspace-Einrichtung',
    title: 'Schaffen Sie die operative Grundlage für Ihre KI-Governance',
    subtitle: 'Konfigurieren Sie Organisation, erstes System, Risikokontext und Evidenz-Warteschlange in einem kontrollierten Ablauf.',
    save: 'Speichern und später fortsetzen', saving: 'Speichern...', saved: 'Fortschritt gespeichert. Sie können das Onboarding später fortsetzen.', continue: 'Weiter', back: 'Zurück', finish: 'Readiness-Score erzeugen', finishing: 'Erzeugung...', success: 'Onboarding abgeschlossen. Dashboard wird geöffnet...', optional: 'Optional', requiredError: 'Füllen Sie die Pflichtfelder aus, bevor Sie fortfahren.', draftError: 'Organisationsname und Slug sind vor dem Speichern erforderlich.', saveError: 'Onboarding-Fortschritt konnte nicht gespeichert werden.', completeError: 'Onboarding konnte nicht abgeschlossen werden.', initialClassification: 'Erste Klassifizierung', onboardingSteps: 'Onboarding-Schritte',
  },
};

const phraseTranslations: Record<Exclude<Locale, 'en' | 'pt'>, Record<string, string>> = {
  es: {
    'Organization name': 'Nombre de la organización', 'Workspace slug': 'Slug del workspace', 'Workspace address': 'Dirección del workspace', 'Format validated': 'Formato validado', 'Use at least 3 characters': 'Usa al menos 3 caracteres',
    'Main operating country': 'País principal de operación', 'Jurisdiction context': 'Contexto jurisdiccional', 'Country context informs the first controls and regulatory references.': 'El país orienta los primeros controles y referencias regulatorias.',
    'Company type': 'Tipo de empresa', 'Operating model': 'Modelo operativo', 'Company structure adjusts task depth and ownership.': 'La estructura de la empresa ajusta la profundidad de tareas y responsabilidades.',
    'Sector': 'Sector', 'Contextual evidence': 'Evidencia contextual', 'Sector context helps prioritize risks, policies and evidence.': 'El sector ayuda a priorizar riesgos, políticas y evidencias.',
    'Current AI usage': 'Uso actual de IA', 'Short context': 'Contexto breve', 'Example: support uses AI to draft replies.': 'Ejemplo: soporte usa IA para preparar respuestas.',
    'AI system name': 'Nombre del sistema de IA', 'Owner team': 'Equipo responsable', 'Use case': 'Caso de uso', 'Summarises customer requests and proposes draft replies for human review.': 'Resume solicitudes de clientes y propone borradores para revisión humana.', 'Vendor or model provider': 'Proveedor o proveedor del modelo', 'Lifecycle status': 'Estado del ciclo de vida',
    'Organization role': 'Rol de la organización', 'Risk domain': 'Dominio de riesgo', 'Processes personal data': 'Procesa datos personales', 'Interacts directly with people': 'Interactúa directamente con personas', 'Generates content or recommendations': 'Genera contenido o recomendaciones', 'Uses biometric identification/categorisation': 'Usa identificación o categorización biométrica', 'Potential prohibited-use pattern': 'Posible patrón de uso prohibido', 'You can refine this later in the AI systems inventory.': 'Puedes refinar esta clasificación después en el inventario de sistemas de IA.',
    'Initial operating posture': 'Postura operativa inicial', 'Score generated from real setup data': 'Score generado con datos reales de configuración', 'Combines profile, system, risk, documents, tasks and team signals.': 'Combina perfil, sistema, riesgo, documentos, tareas y señales del equipo.', 'Documents': 'Documentos', 'Tasks': 'Tareas', 'Invites': 'Invitaciones',
    'Invite teammates': 'Invitar compañeros', 'Separate multiple emails with commas, semicolons or new lines.': 'Separa varios emails con comas, punto y coma o nuevas líneas.', 'Shared accountability': 'Responsabilidad compartida', 'Add legal, security, product or operations owners when ready.': 'Añade responsables de legal, seguridad, producto u operaciones cuando corresponda.',
    'Keep exploring now and choose billing later.': 'Sigue explorando y elige la facturación más adelante.', 'Continue with this plan selected for billing review.': 'Continúa con este plan seleccionado para revisar la facturación.',
    'Initial configuration': 'Configuración inicial', 'Protected session': 'Sesión protegida', 'Your setup journey': 'Tu recorrido de configuración', 'Role-based control': 'Control por rol', 'European context': 'Contexto europeo', 'Progressive activation': 'Activación progresiva', 'Operational evidence': 'Evidencia operativa',
    'Readiness score': 'Score de preparación', 'Strong operating base': 'Buena base operativa', 'Setup in progress': 'Configuración en progreso', 'The score evolves with real setup data.': 'El score evoluciona con datos reales.', 'Generated signals': 'Señales generadas', 'Operating status': 'Estado operativo', 'Initial classification': 'Clasificación inicial', 'Document pack': 'Paquete documental', 'suggested': 'sugeridos', 'Action queue': 'Cola de acciones', 'tasks': 'tareas', 'Selected plan': 'Plan seleccionado',
  },
  fr: {
    'Organization name': 'Nom de l’organisation', 'Workspace slug': 'Slug du workspace', 'Workspace address': 'Adresse du workspace', 'Format validated': 'Format validé', 'Use at least 3 characters': 'Utilisez au moins 3 caractères',
    'Main operating country': 'Pays principal d’activité', 'Jurisdiction context': 'Contexte juridictionnel', 'Country context informs the first controls and regulatory references.': 'Le pays oriente les premiers contrôles et références réglementaires.', 'Company type': 'Type d’entreprise', 'Operating model': 'Modèle opérationnel', 'Company structure adjusts task depth and ownership.': 'La structure de l’entreprise ajuste la profondeur des tâches et responsabilités.', 'Sector': 'Secteur', 'Contextual evidence': 'Preuves contextuelles', 'Sector context helps prioritize risks, policies and evidence.': 'Le secteur aide à prioriser risques, politiques et preuves.',
    'Current AI usage': 'Utilisation actuelle de l’IA', 'Short context': 'Contexte bref', 'Example: support uses AI to draft replies.': 'Exemple : le support utilise l’IA pour préparer des réponses.', 'AI system name': 'Nom du système IA', 'Owner team': 'Équipe responsable', 'Use case': 'Cas d’usage', 'Summarises customer requests and proposes draft replies for human review.': 'Résume les demandes clients et propose des brouillons pour revue humaine.', 'Vendor or model provider': 'Fournisseur ou fournisseur du modèle', 'Lifecycle status': 'État du cycle de vie',
    'Organization role': 'Rôle de l’organisation', 'Risk domain': 'Domaine de risque', 'Processes personal data': 'Traite des données personnelles', 'Interacts directly with people': 'Interagit directement avec des personnes', 'Generates content or recommendations': 'Génère du contenu ou des recommandations', 'Uses biometric identification/categorisation': 'Utilise l’identification ou la catégorisation biométrique', 'Potential prohibited-use pattern': 'Schéma potentiel d’usage interdit', 'You can refine this later in the AI systems inventory.': 'Vous pourrez affiner cette classification plus tard dans l’inventaire IA.',
    'Initial operating posture': 'Posture opérationnelle initiale', 'Score generated from real setup data': 'Score généré à partir des données réelles de configuration', 'Combines profile, system, risk, documents, tasks and team signals.': 'Combine profil, système, risque, documents, tâches et signaux d’équipe.', 'Documents': 'Documents', 'Tasks': 'Tâches', 'Invites': 'Invitations',
    'Invite teammates': 'Inviter des collègues', 'Separate multiple emails with commas, semicolons or new lines.': 'Séparez plusieurs emails par virgules, points-virgules ou nouvelles lignes.', 'Shared accountability': 'Responsabilité partagée', 'Add legal, security, product or operations owners when ready.': 'Ajoutez les responsables juridique, sécurité, produit ou opérations lorsque nécessaire.',
    'Keep exploring now and choose billing later.': 'Continuez à explorer et choisissez la facturation plus tard.', 'Continue with this plan selected for billing review.': 'Continuez avec ce plan sélectionné pour la revue de facturation.',
    'Initial configuration': 'Configuration initiale', 'Protected session': 'Session protégée', 'Your setup journey': 'Votre parcours de configuration', 'Role-based control': 'Contrôle par rôle', 'European context': 'Contexte européen', 'Progressive activation': 'Activation progressive', 'Operational evidence': 'Preuves opérationnelles',
    'Readiness score': 'Score de préparation', 'Strong operating base': 'Bonne base opérationnelle', 'Setup in progress': 'Configuration en cours', 'The score evolves with real setup data.': 'Le score évolue avec les données réelles.', 'Generated signals': 'Signaux générés', 'Operating status': 'État opérationnel', 'Initial classification': 'Classification initiale', 'Document pack': 'Pack documentaire', 'suggested': 'suggérés', 'Action queue': 'File d’actions', 'tasks': 'tâches', 'Selected plan': 'Plan sélectionné',
  },
  it: {
    'Organization name': 'Nome dell’organizzazione', 'Workspace slug': 'Slug del workspace', 'Workspace address': 'Indirizzo del workspace', 'Format validated': 'Formato validato', 'Use at least 3 characters': 'Usa almeno 3 caratteri',
    'Main operating country': 'Paese principale di operatività', 'Jurisdiction context': 'Contesto giurisdizionale', 'Country context informs the first controls and regulatory references.': 'Il paese orienta i primi controlli e riferimenti normativi.', 'Company type': 'Tipo di azienda', 'Operating model': 'Modello operativo', 'Company structure adjusts task depth and ownership.': 'La struttura aziendale adatta profondità delle attività e responsabilità.', 'Sector': 'Settore', 'Contextual evidence': 'Evidenza contestuale', 'Sector context helps prioritize risks, policies and evidence.': 'Il settore aiuta a prioritizzare rischi, policy ed evidenze.',
    'Current AI usage': 'Utilizzo attuale dell’IA', 'Short context': 'Contesto breve', 'Example: support uses AI to draft replies.': 'Esempio: il supporto usa l’IA per preparare risposte.', 'AI system name': 'Nome del sistema IA', 'Owner team': 'Team responsabile', 'Use case': 'Caso d’uso', 'Summarises customer requests and proposes draft replies for human review.': 'Riassume richieste dei clienti e propone bozze per revisione umana.', 'Vendor or model provider': 'Fornitore o provider del modello', 'Lifecycle status': 'Stato del ciclo di vita',
    'Organization role': 'Ruolo dell’organizzazione', 'Risk domain': 'Dominio di rischio', 'Processes personal data': 'Tratta dati personali', 'Interacts directly with people': 'Interagisce direttamente con persone', 'Generates content or recommendations': 'Genera contenuti o raccomandazioni', 'Uses biometric identification/categorisation': 'Usa identificazione o categorizzazione biometrica', 'Potential prohibited-use pattern': 'Possibile schema di uso vietato', 'You can refine this later in the AI systems inventory.': 'Puoi affinare questa classificazione in seguito nell’inventario IA.',
    'Initial operating posture': 'Postura operativa iniziale', 'Score generated from real setup data': 'Score generato dai dati reali di configurazione', 'Combines profile, system, risk, documents, tasks and team signals.': 'Combina profilo, sistema, rischio, documenti, attività e segnali del team.', 'Documents': 'Documenti', 'Tasks': 'Attività', 'Invites': 'Inviti',
    'Invite teammates': 'Invita colleghi', 'Separate multiple emails with commas, semicolons or new lines.': 'Separa più email con virgole, punto e virgola o nuove righe.', 'Shared accountability': 'Responsabilità condivisa', 'Add legal, security, product or operations owners when ready.': 'Aggiungi responsabili legal, security, product o operations quando necessario.',
    'Keep exploring now and choose billing later.': 'Continua a esplorare e scegli la fatturazione più tardi.', 'Continue with this plan selected for billing review.': 'Continua con questo piano selezionato per la review di fatturazione.',
    'Initial configuration': 'Configurazione iniziale', 'Protected session': 'Sessione protetta', 'Your setup journey': 'Il tuo percorso di configurazione', 'Role-based control': 'Controllo per ruolo', 'European context': 'Contesto europeo', 'Progressive activation': 'Attivazione progressiva', 'Operational evidence': 'Evidenza operativa',
    'Readiness score': 'Score di preparazione', 'Strong operating base': 'Buona base operativa', 'Setup in progress': 'Configurazione in corso', 'The score evolves with real setup data.': 'Lo score evolve con dati reali.', 'Generated signals': 'Segnali generati', 'Operating status': 'Stato operativo', 'Initial classification': 'Classificazione iniziale', 'Document pack': 'Pacchetto documentale', 'suggested': 'suggeriti', 'Action queue': 'Coda azioni', 'tasks': 'attività', 'Selected plan': 'Piano selezionato',
  },
  de: {
    'Organization name': 'Organisationsname', 'Workspace slug': 'Workspace-Slug', 'Workspace address': 'Workspace-Adresse', 'Format validated': 'Format validiert', 'Use at least 3 characters': 'Mindestens 3 Zeichen verwenden',
    'Main operating country': 'Hauptbetriebsland', 'Jurisdiction context': 'Jurisdiktionskontext', 'Country context informs the first controls and regulatory references.': 'Der Länderkontext bestimmt die ersten Kontrollen und regulatorischen Referenzen.', 'Company type': 'Unternehmenstyp', 'Operating model': 'Betriebsmodell', 'Company structure adjusts task depth and ownership.': 'Die Unternehmensstruktur passt Aufgabentiefe und Verantwortung an.', 'Sector': 'Sektor', 'Contextual evidence': 'Kontextuelle Evidenz', 'Sector context helps prioritize risks, policies and evidence.': 'Der Sektor hilft, Risiken, Richtlinien und Evidenz zu priorisieren.',
    'Current AI usage': 'Aktuelle KI-Nutzung', 'Short context': 'Kurzer Kontext', 'Example: support uses AI to draft replies.': 'Beispiel: Support nutzt KI zur Vorbereitung von Antworten.', 'AI system name': 'Name des KI-Systems', 'Owner team': 'Verantwortliches Team', 'Use case': 'Anwendungsfall', 'Summarises customer requests and proposes draft replies for human review.': 'Fasst Kundenanfragen zusammen und schlägt Entwürfe zur menschlichen Prüfung vor.', 'Vendor or model provider': 'Anbieter oder Modellprovider', 'Lifecycle status': 'Lebenszyklusstatus',
    'Organization role': 'Rolle der Organisation', 'Risk domain': 'Risikodomäne', 'Processes personal data': 'Verarbeitet personenbezogene Daten', 'Interacts directly with people': 'Interagiert direkt mit Personen', 'Generates content or recommendations': 'Erzeugt Inhalte oder Empfehlungen', 'Uses biometric identification/categorisation': 'Nutzt biometrische Identifizierung oder Kategorisierung', 'Potential prohibited-use pattern': 'Mögliches Muster verbotener Nutzung', 'You can refine this later in the AI systems inventory.': 'Sie können diese Klassifizierung später im KI-Inventar verfeinern.',
    'Initial operating posture': 'Erste operative Einschätzung', 'Score generated from real setup data': 'Score aus realen Einrichtungsdaten', 'Combines profile, system, risk, documents, tasks and team signals.': 'Kombiniert Profil, System, Risiko, Dokumente, Aufgaben und Teamsignale.', 'Documents': 'Dokumente', 'Tasks': 'Aufgaben', 'Invites': 'Einladungen',
    'Invite teammates': 'Teammitglieder einladen', 'Separate multiple emails with commas, semicolons or new lines.': 'Mehrere E-Mails durch Kommas, Semikolons oder neue Zeilen trennen.', 'Shared accountability': 'Geteilte Verantwortung', 'Add legal, security, product or operations owners when ready.': 'Fügen Sie bei Bedarf Verantwortliche aus Legal, Security, Product oder Operations hinzu.',
    'Keep exploring now and choose billing later.': 'Weiter erkunden und die Abrechnung später auswählen.', 'Continue with this plan selected for billing review.': 'Mit diesem ausgewählten Plan zur Abrechnungsprüfung fortfahren.',
    'Initial configuration': 'Erstkonfiguration', 'Protected session': 'Geschützte Sitzung', 'Your setup journey': 'Ihr Einrichtungsablauf', 'Role-based control': 'Rollenbasierte Kontrolle', 'European context': 'Europäischer Kontext', 'Progressive activation': 'Schrittweise Aktivierung', 'Operational evidence': 'Operative Evidenz',
    'Readiness score': 'Readiness-Score', 'Strong operating base': 'Gute operative Basis', 'Setup in progress': 'Einrichtung läuft', 'The score evolves with real setup data.': 'Der Score entwickelt sich mit realen Daten.', 'Generated signals': 'Erzeugte Signale', 'Operating status': 'Betriebsstatus', 'Initial classification': 'Erste Klassifizierung', 'Document pack': 'Dokumentenpaket', 'suggested': 'vorgeschlagen', 'Action queue': 'Aktionswarteschlange', 'tasks': 'Aufgaben', 'Selected plan': 'Ausgewählter Plan',
  },
};

export const onboardingStepTitles: Record<Locale, Record<string, string>> = {
  en: { 'create-organization': 'Create organization', country: 'Choose country', 'company-type': 'Company type', sector: 'Sector', 'ai-usage': 'AI usage', 'first-ai-system': 'First AI system', 'risk-classification': 'Initial risk', 'readiness-score': 'Readiness score', documents: 'Documents', tasks: 'Tasks', team: 'Invite team', plan: 'Plan or trial' },
  pt: { 'create-organization': 'Criar organização', country: 'Escolher país', 'company-type': 'Tipo de empresa', sector: 'Setor', 'ai-usage': 'Utilização de IA', 'first-ai-system': 'Primeiro sistema de IA', 'risk-classification': 'Risco inicial', 'readiness-score': 'Score de prontidão', documents: 'Documentos', tasks: 'Tarefas', team: 'Convidar equipa', plan: 'Plano ou trial' },
  es: { 'create-organization': 'Crear organización', country: 'Elegir país', 'company-type': 'Tipo de empresa', sector: 'Sector', 'ai-usage': 'Uso de IA', 'first-ai-system': 'Primer sistema de IA', 'risk-classification': 'Riesgo inicial', 'readiness-score': 'Score de preparación', documents: 'Documentos', tasks: 'Tareas', team: 'Invitar equipo', plan: 'Plan o prueba' },
  fr: { 'create-organization': 'Créer l’organisation', country: 'Choisir le pays', 'company-type': 'Type d’entreprise', sector: 'Secteur', 'ai-usage': 'Utilisation de l’IA', 'first-ai-system': 'Premier système IA', 'risk-classification': 'Risque initial', 'readiness-score': 'Score de préparation', documents: 'Documents', tasks: 'Tâches', team: 'Inviter l’équipe', plan: 'Plan ou essai' },
  it: { 'create-organization': 'Crea organizzazione', country: 'Scegli paese', 'company-type': 'Tipo di azienda', sector: 'Settore', 'ai-usage': 'Utilizzo IA', 'first-ai-system': 'Primo sistema IA', 'risk-classification': 'Rischio iniziale', 'readiness-score': 'Score di preparazione', documents: 'Documenti', tasks: 'Attività', team: 'Invita team', plan: 'Piano o prova' },
  de: { 'create-organization': 'Organisation erstellen', country: 'Land wählen', 'company-type': 'Unternehmenstyp', sector: 'Sektor', 'ai-usage': 'KI-Nutzung', 'first-ai-system': 'Erstes KI-System', 'risk-classification': 'Erstes Risiko', 'readiness-score': 'Readiness-Score', documents: 'Dokumente', tasks: 'Aufgaben', team: 'Team einladen', plan: 'Plan oder Test' },
};

const countryBase: Record<CountryCode, string> = { pt: 'Portugal', es: 'Spain', fr: 'France', de: 'Germany', it: 'Italy', nl: 'Netherlands', be: 'Belgium', ie: 'Ireland', se: 'Sweden', dk: 'Denmark', no: 'Norway', fi: 'Finland', pl: 'Poland', other_eu: 'Other EU country', uk: 'United Kingdom', ch: 'Switzerland' };
const companyBase: Record<CompanyType, string> = { startup: 'Startup', sme: 'SME', scaleup: 'Scale-up', enterprise: 'Enterprise', agency: 'Agency', consultancy: 'Consultancy', public_sector: 'Public sector', non_profit: 'Non-profit' };
const sectorBase: Record<CompanySector, string> = { saas: 'SaaS', fintech: 'Fintech', hr_recruiting: 'HR / recruiting', healthcare: 'Healthcare', education: 'Education', legal_compliance: 'Legal / compliance', ecommerce: 'E-commerce', marketing_agency: 'Marketing agency', manufacturing: 'Manufacturing', financial_services: 'Financial services', public_services: 'Public services', other: 'Other' };
const usageBase: Record<AiUsageLevel, string> = { not_started: 'Not using AI yet', exploring: 'Exploring AI', internal_productivity: 'Internal productivity tools', customer_facing: 'Customer-facing AI', automated_decisions: 'Automated decisions', multiple_systems: 'Multiple AI systems' };

const localizedSelects: Partial<Record<Locale, { countries?: Partial<Record<CountryCode, string>>; companies?: Partial<Record<CompanyType, string>>; sectors?: Partial<Record<CompanySector, string>>; usage?: Partial<Record<AiUsageLevel, string>> }>> = {
  pt: { countries: { es: 'Espanha', fr: 'França', de: 'Alemanha', it: 'Itália', nl: 'Países Baixos', ie: 'Irlanda', se: 'Suécia', dk: 'Dinamarca', no: 'Noruega', fi: 'Finlândia', pl: 'Polónia', other_eu: 'Outro país da UE', uk: 'Reino Unido', ch: 'Suíça' }, companies: { sme: 'PME', agency: 'Agência', consultancy: 'Consultoria', public_sector: 'Setor público', non_profit: 'Sem fins lucrativos' }, sectors: { hr_recruiting: 'RH / recrutamento', healthcare: 'Saúde', education: 'Educação', legal_compliance: 'Jurídico / compliance', ecommerce: 'E-commerce', marketing_agency: 'Agência de marketing', manufacturing: 'Indústria', financial_services: 'Serviços financeiros', public_services: 'Serviços públicos', other: 'Outro' }, usage: { not_started: 'Ainda não utiliza IA', exploring: 'A explorar IA', internal_productivity: 'Ferramentas internas de produtividade', customer_facing: 'IA voltada ao cliente', automated_decisions: 'Decisões automatizadas', multiple_systems: 'Vários sistemas de IA' } },
  es: { countries: { es: 'España', fr: 'Francia', de: 'Alemania', it: 'Italia', nl: 'Países Bajos', ie: 'Irlanda', se: 'Suecia', dk: 'Dinamarca', no: 'Noruega', fi: 'Finlandia', pl: 'Polonia', other_eu: 'Otro país de la UE', uk: 'Reino Unido', ch: 'Suiza' }, companies: { sme: 'PyME', agency: 'Agencia', consultancy: 'Consultoría', public_sector: 'Sector público', non_profit: 'Sin ánimo de lucro' }, sectors: { hr_recruiting: 'RR. HH. / selección', healthcare: 'Salud', education: 'Educación', legal_compliance: 'Legal / compliance', ecommerce: 'E-commerce', marketing_agency: 'Agencia de marketing', manufacturing: 'Industria', financial_services: 'Servicios financieros', public_services: 'Servicios públicos', other: 'Otro' }, usage: { not_started: 'Aún no usa IA', exploring: 'Explorando IA', internal_productivity: 'Herramientas internas de productividad', customer_facing: 'IA de cara al cliente', automated_decisions: 'Decisiones automatizadas', multiple_systems: 'Varios sistemas de IA' } },
  fr: { countries: { es: 'Espagne', fr: 'France', de: 'Allemagne', it: 'Italie', nl: 'Pays-Bas', ie: 'Irlande', se: 'Suède', dk: 'Danemark', no: 'Norvège', fi: 'Finlande', pl: 'Pologne', other_eu: 'Autre pays de l’UE', uk: 'Royaume-Uni', ch: 'Suisse' }, companies: { sme: 'PME', agency: 'Agence', consultancy: 'Conseil', public_sector: 'Secteur public', non_profit: 'Association' }, sectors: { hr_recruiting: 'RH / recrutement', healthcare: 'Santé', education: 'Éducation', legal_compliance: 'Juridique / compliance', ecommerce: 'E-commerce', marketing_agency: 'Agence marketing', manufacturing: 'Industrie', financial_services: 'Services financiers', public_services: 'Services publics', other: 'Autre' }, usage: { not_started: 'Pas encore d’IA', exploring: 'Exploration de l’IA', internal_productivity: 'Outils internes de productivité', customer_facing: 'IA orientée client', automated_decisions: 'Décisions automatisées', multiple_systems: 'Plusieurs systèmes IA' } },
  it: { countries: { es: 'Spagna', fr: 'Francia', de: 'Germania', it: 'Italia', nl: 'Paesi Bassi', ie: 'Irlanda', se: 'Svezia', dk: 'Danimarca', no: 'Norvegia', fi: 'Finlandia', pl: 'Polonia', other_eu: 'Altro paese UE', uk: 'Regno Unito', ch: 'Svizzera' }, companies: { sme: 'PMI', agency: 'Agenzia', consultancy: 'Consulenza', public_sector: 'Settore pubblico', non_profit: 'Non profit' }, sectors: { hr_recruiting: 'HR / recruiting', healthcare: 'Sanità', education: 'Istruzione', legal_compliance: 'Legal / compliance', ecommerce: 'E-commerce', marketing_agency: 'Agenzia marketing', manufacturing: 'Industria', financial_services: 'Servizi finanziari', public_services: 'Servizi pubblici', other: 'Altro' }, usage: { not_started: 'Non usa ancora IA', exploring: 'Esplorazione IA', internal_productivity: 'Strumenti interni di produttività', customer_facing: 'IA rivolta ai clienti', automated_decisions: 'Decisioni automatizzate', multiple_systems: 'Più sistemi IA' } },
  de: { countries: { es: 'Spanien', fr: 'Frankreich', de: 'Deutschland', it: 'Italien', nl: 'Niederlande', ie: 'Irland', se: 'Schweden', dk: 'Dänemark', no: 'Norwegen', fi: 'Finnland', pl: 'Polen', other_eu: 'Anderes EU-Land', uk: 'Vereinigtes Königreich', ch: 'Schweiz' }, companies: { sme: 'KMU', agency: 'Agentur', consultancy: 'Beratung', public_sector: 'Öffentlicher Sektor', non_profit: 'Gemeinnützig' }, sectors: { hr_recruiting: 'HR / Recruiting', healthcare: 'Gesundheit', education: 'Bildung', legal_compliance: 'Recht / Compliance', ecommerce: 'E-Commerce', marketing_agency: 'Marketingagentur', manufacturing: 'Fertigung', financial_services: 'Finanzdienstleistungen', public_services: 'Öffentliche Dienste', other: 'Andere' }, usage: { not_started: 'Noch keine KI-Nutzung', exploring: 'KI wird evaluiert', internal_productivity: 'Interne Produktivitätstools', customer_facing: 'Kundenorientierte KI', automated_decisions: 'Automatisierte Entscheidungen', multiple_systems: 'Mehrere KI-Systeme' } },
};

export function getOnboardingCopy(locale: Locale) {
  return copy[locale];
}

export function translateOnboardingPhrase(locale: Locale, portuguese: string, english: string) {
  if (locale === 'pt') return portuguese;
  if (locale === 'en') return english;
  return phraseTranslations[locale][english] ?? english;
}

export function getOnboardingStepTitle(locale: Locale, stepId: string) {
  return onboardingStepTitles[locale][stepId] ?? onboardingStepTitles.en[stepId] ?? stepId;
}

export function getOnboardingSelectLabels(locale: Locale) {
  const local = localizedSelects[locale];
  return {
    countries: { ...countryBase, ...(local?.countries ?? {}) },
    companies: { ...companyBase, ...(local?.companies ?? {}) },
    sectors: { ...sectorBase, ...(local?.sectors ?? {}) },
    usage: { ...usageBase, ...(local?.usage ?? {}) },
  };
}

export function getPlanIntentLabel(locale: Locale, plan: PlanIntent) {
  if (plan !== 'trial') return plan === 'essential' ? 'Essential' : plan[0].toUpperCase() + plan.slice(1);
  return ({ en: 'Continue trial', pt: 'Continuar trial', es: 'Continuar prueba', fr: 'Continuer l’essai', it: 'Continua prova', de: 'Test fortsetzen' } satisfies Record<Locale, string>)[locale];
}

export function formatOnboardingStage(locale: Locale, current: number, total?: number) {
  const stage = total ? `${current} / ${total}` : String(current);
  const prefix = ({ en: 'Stage', pt: 'Etapa', es: 'Etapa', fr: 'Étape', it: 'Passaggio', de: 'Schritt' } satisfies Record<Locale, string>)[locale];
  return `${prefix} ${stage}`;
}

export function formatDueInDays(locale: Locale, days: number) {
  const templates: Record<Locale, (value: number) => string> = {
    en: (value) => `Due in ${value} days`, pt: (value) => `Prazo em ${value} dias`, es: (value) => `Vence en ${value} días`, fr: (value) => `Échéance dans ${value} jours`, it: (value) => `Scadenza tra ${value} giorni`, de: (value) => `Fällig in ${value} Tagen`,
  };
  return templates[locale](days);
}

export function formatInvitationCount(locale: Locale, count: number) {
  const templates: Record<Locale, (value: number) => string> = {
    en: (value) => `${value} invitation${value === 1 ? '' : 's'} will be created.`, pt: (value) => `${value} convite${value === 1 ? '' : 's'} será${value === 1 ? '' : 'ão'} criado${value === 1 ? '' : 's'}.`, es: (value) => `Se crear${value === 1 ? 'á' : 'án'} ${value} invitación${value === 1 ? '' : 'es'}.`, fr: (value) => `${value} invitation${value === 1 ? '' : 's'} sera${value === 1 ? '' : 'ont'} créée${value === 1 ? '' : 's'}.`, it: (value) => `Verr${value === 1 ? 'à' : 'anno'} creat${value === 1 ? 'o' : 'i'} ${value} invito${value === 1 ? '' : 'i'}.`, de: (value) => `${value} Einladung${value === 1 ? '' : 'en'} ${value === 1 ? 'wird' : 'werden'} erstellt.`,
  };
  return templates[locale](count);
}
