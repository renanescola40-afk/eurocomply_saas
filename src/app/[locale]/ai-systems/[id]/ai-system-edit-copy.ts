export const aiSystemEditLocales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;

type AiSystemEditLocale = (typeof aiSystemEditLocales)[number];

type AiSystemEditCopy = {
  editTitle: string;
  editBody: string;
  systemName: string;
  ownerTeam: string;
  category: string;
  countryMarket: string;
  vendor: string;
  model: string;
  organizationRole: string;
  lifecycleStatus: string;
  riskDomain: string;
  processedData: string;
  useCase: string;
  riskSignals: string;
  saving: string;
  saveReassessment: string;
  workflowContext: string;
  title: string;
  subtitle: string;
  evidenceTitle: string;
  evidenceBody: string;
  packName: string;
  defaultPackTitle: string;
  buildPack: string;
  vendorTitle: string;
  vendorBody: string;
  vendorName: string;
  vendorNotes: string;
  vendorRiskLevel: string;
  startVendor: string;
  riskTitle: string;
  riskBody: string;
  dueDate: string;
  riskNotes: string;
  startRisk: string;
  reportTitle: string;
  reportBody: string;
  success: string;
  error: string;
  loading: string;
  emptyVendor: string;
  saveSuccess: string;
  saveError: string;
  notSet: string;
  roleLabels: Record<string, string>;
  statusLabels: Record<string, string>;
  domainLabels: Record<string, string>;
  riskLevelLabels: Record<string, string>;
  riskSignalLabels: Record<string, string>;
  executiveSignalLabels: Record<string, string>;
};

export const aiSystemEditCopy = {
  en: {
    editTitle: 'Edit and reassess', editBody: 'Update the facts, then recalculate risk and append a history event. This is readiness support, not a legal determination.',
    systemName: 'System name', ownerTeam: 'Owner team', category: 'Category', countryMarket: 'Country or market', vendor: 'Vendor', model: 'Model', organizationRole: 'Organization role', lifecycleStatus: 'Lifecycle status', riskDomain: 'Risk domain', processedData: 'Data processed', useCase: 'Use case', riskSignals: 'Risk signals', saving: 'Saving...', saveReassessment: 'Save reassessment', workflowContext: 'Supabase · RBAC · activity history',
    title: 'Enterprise readiness workflows', subtitle: 'Create real evidence, vendor and risk workflow records. Every action persists to Supabase and writes an activity event.', evidenceTitle: 'Evidence Pack Builder', evidenceBody: 'Build a procurement review evidence package from this AI system and current readiness signals.', packName: 'Pack title', defaultPackTitle: 'AI Act readiness evidence pack', buildPack: 'Create evidence pack', vendorTitle: 'Vendor Due Diligence Checklist', vendorBody: 'Start a structured vendor review for model/provider, security, retention and AI Act duties.', vendorName: 'Vendor name', vendorNotes: 'Vendor notes', vendorRiskLevel: 'Vendor risk level', startVendor: 'Start vendor review', riskTitle: 'Risk Review Workflow', riskBody: 'Open a risk review with due date and decision trail for high-risk or sensitive systems.', dueDate: 'Due date', riskNotes: 'Risk review notes', startRisk: 'Open risk review', reportTitle: 'Executive Readiness Report signals', reportBody: 'Leadership review summary generated from actual system facts, not a fake compliance claim.', success: 'Workflow created and recorded.', error: 'Could not create workflow.', loading: 'Creating...', emptyVendor: 'No vendor is set yet. Add a vendor above before starting diligence.', saveSuccess: 'System reassessed and saved.', saveError: 'Could not save reassessment.', notSet: 'Not set',
    roleLabels: { provider: 'Provider', deployer: 'Deployer', importer: 'Importer', distributor: 'Distributor', other: 'Other' },
    statusLabels: { planned: 'Planned', pilot: 'Pilot', production: 'Production', retired: 'Retired' },
    domainLabels: { general_productivity: 'General productivity', customer_support: 'Customer support', content_generation: 'Content generation', biometrics: 'Biometrics', employment: 'Employment', education: 'Education', credit_finance: 'Credit and finance', essential_services: 'Essential services', law_enforcement: 'Law enforcement', migration_border: 'Migration and border', justice_democratic_processes: 'Justice and democratic processes', safety_component: 'Safety component', critical_infrastructure: 'Critical infrastructure' },
    riskLevelLabels: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' },
    riskSignalLabels: { usesPersonalData: 'Processes personal data', interactsWithPeople: 'Interacts directly with people', generatesContent: 'Generates content or decisions', biometricIdentification: 'Biometric identification or categorisation', manipulativeOrExploitative: 'Potential prohibited-practice review' },
    executiveSignalLabels: { system: 'AI system', risk: 'Risk level', market: 'Market', vendor: 'Vendor', obligations: 'Obligations', nextActions: 'Next actions' },
  },
  pt: {
    editTitle: 'Editar e reavaliar', editBody: 'Atualize os factos, recalcule o risco e registe um evento no histórico. Este apoio à preparação não constitui uma decisão jurídica.',
    systemName: 'Nome do sistema', ownerTeam: 'Equipa responsável', category: 'Categoria', countryMarket: 'País ou mercado', vendor: 'Fornecedor', model: 'Modelo', organizationRole: 'Papel da organização', lifecycleStatus: 'Estado do ciclo de vida', riskDomain: 'Domínio de risco', processedData: 'Dados tratados', useCase: 'Caso de uso', riskSignals: 'Sinais de risco', saving: 'A guardar...', saveReassessment: 'Guardar reavaliação', workflowContext: 'Supabase · RBAC · histórico de atividade',
    title: 'Workflows de preparação enterprise', subtitle: 'Crie registos reais de evidências, fornecedores e riscos. Cada ação persiste no Supabase e regista um evento de atividade.', evidenceTitle: 'Criador de pacote de evidências', evidenceBody: 'Crie um pacote de evidências para procurement a partir deste sistema de IA e dos sinais atuais de preparação.', packName: 'Título do pacote', defaultPackTitle: 'pacote de evidências de preparação para o AI Act', buildPack: 'Criar pacote de evidências', vendorTitle: 'Checklist de due diligence do fornecedor', vendorBody: 'Inicie uma revisão estruturada do modelo ou fornecedor, segurança, retenção e deveres do AI Act.', vendorName: 'Nome do fornecedor', vendorNotes: 'Notas do fornecedor', vendorRiskLevel: 'Nível de risco do fornecedor', startVendor: 'Iniciar revisão do fornecedor', riskTitle: 'Workflow de revisão de risco', riskBody: 'Abra uma revisão com prazo e trilho de decisão para sistemas sensíveis ou de alto risco.', dueDate: 'Data limite', riskNotes: 'Notas da revisão de risco', startRisk: 'Abrir revisão de risco', reportTitle: 'Sinais do relatório executivo de preparação', reportBody: 'Resumo para a liderança gerado a partir de factos reais do sistema, sem alegações falsas de conformidade.', success: 'Workflow criado e registado.', error: 'Não foi possível criar o workflow.', loading: 'A criar...', emptyVendor: 'Ainda não existe fornecedor. Adicione um antes de iniciar a due diligence.', saveSuccess: 'Sistema reavaliado e guardado.', saveError: 'Não foi possível guardar a reavaliação.', notSet: 'Não definido',
    roleLabels: { provider: 'Fornecedor', deployer: 'Responsável pela implantação', importer: 'Importador', distributor: 'Distribuidor', other: 'Outro' },
    statusLabels: { planned: 'Planeado', pilot: 'Piloto', production: 'Produção', retired: 'Descontinuado' },
    domainLabels: { general_productivity: 'Produtividade geral', customer_support: 'Apoio ao cliente', content_generation: 'Geração de conteúdo', biometrics: 'Biometria', employment: 'Emprego', education: 'Educação', credit_finance: 'Crédito e finanças', essential_services: 'Serviços essenciais', law_enforcement: 'Aplicação da lei', migration_border: 'Migração e fronteiras', justice_democratic_processes: 'Justiça e processos democráticos', safety_component: 'Componente de segurança', critical_infrastructure: 'Infraestrutura crítica' },
    riskLevelLabels: { low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico' },
    riskSignalLabels: { usesPersonalData: 'Trata dados pessoais', interactsWithPeople: 'Interage diretamente com pessoas', generatesContent: 'Gera conteúdo ou decisões', biometricIdentification: 'Identificação ou categorização biométrica', manipulativeOrExploitative: 'Possível revisão de prática proibida' },
    executiveSignalLabels: { system: 'Sistema de IA', risk: 'Nível de risco', market: 'Mercado', vendor: 'Fornecedor', obligations: 'Obrigações', nextActions: 'Próximas ações' },
  },
  es: {
    editTitle: 'Editar y reevaluar', editBody: 'Actualiza los datos, recalcula el riesgo y añade un evento al historial. Este apoyo de preparación no constituye una decisión jurídica.',
    systemName: 'Nombre del sistema', ownerTeam: 'Equipo responsable', category: 'Categoría', countryMarket: 'País o mercado', vendor: 'Proveedor', model: 'Modelo', organizationRole: 'Rol de la organización', lifecycleStatus: 'Estado del ciclo de vida', riskDomain: 'Dominio de riesgo', processedData: 'Datos tratados', useCase: 'Caso de uso', riskSignals: 'Señales de riesgo', saving: 'Guardando...', saveReassessment: 'Guardar reevaluación', workflowContext: 'Supabase · RBAC · historial de actividad',
    title: 'Flujos de preparación empresarial', subtitle: 'Crea registros reales de evidencias, proveedores y riesgos. Cada acción persiste en Supabase y registra un evento de actividad.', evidenceTitle: 'Creador de paquetes de evidencias', evidenceBody: 'Crea un paquete de evidencias para compras a partir de este sistema de IA y las señales actuales de preparación.', packName: 'Título del paquete', defaultPackTitle: 'paquete de evidencias de preparación para la Ley de IA', buildPack: 'Crear paquete de evidencias', vendorTitle: 'Lista de diligencia debida del proveedor', vendorBody: 'Inicia una revisión estructurada del modelo o proveedor, seguridad, retención y obligaciones de la Ley de IA.', vendorName: 'Nombre del proveedor', vendorNotes: 'Notas del proveedor', vendorRiskLevel: 'Nivel de riesgo del proveedor', startVendor: 'Iniciar revisión del proveedor', riskTitle: 'Flujo de revisión de riesgos', riskBody: 'Abre una revisión con fecha límite y trazabilidad de decisiones para sistemas sensibles o de alto riesgo.', dueDate: 'Fecha límite', riskNotes: 'Notas de la revisión de riesgos', startRisk: 'Abrir revisión de riesgos', reportTitle: 'Señales del informe ejecutivo de preparación', reportBody: 'Resumen para la dirección generado con hechos reales del sistema, sin afirmaciones falsas de cumplimiento.', success: 'Flujo creado y registrado.', error: 'No se pudo crear el flujo.', loading: 'Creando...', emptyVendor: 'Aún no hay proveedor. Añade uno antes de iniciar la diligencia.', saveSuccess: 'Sistema reevaluado y guardado.', saveError: 'No se pudo guardar la reevaluación.', notSet: 'No definido',
    roleLabels: { provider: 'Proveedor', deployer: 'Responsable del despliegue', importer: 'Importador', distributor: 'Distribuidor', other: 'Otro' },
    statusLabels: { planned: 'Planificado', pilot: 'Piloto', production: 'Producción', retired: 'Retirado' },
    domainLabels: { general_productivity: 'Productividad general', customer_support: 'Atención al cliente', content_generation: 'Generación de contenido', biometrics: 'Biometría', employment: 'Empleo', education: 'Educación', credit_finance: 'Crédito y finanzas', essential_services: 'Servicios esenciales', law_enforcement: 'Aplicación de la ley', migration_border: 'Migración y fronteras', justice_democratic_processes: 'Justicia y procesos democráticos', safety_component: 'Componente de seguridad', critical_infrastructure: 'Infraestructura crítica' },
    riskLevelLabels: { low: 'Bajo', medium: 'Medio', high: 'Alto', critical: 'Crítico' },
    riskSignalLabels: { usesPersonalData: 'Trata datos personales', interactsWithPeople: 'Interactúa directamente con personas', generatesContent: 'Genera contenido o decisiones', biometricIdentification: 'Identificación o categorización biométrica', manipulativeOrExploitative: 'Posible revisión de práctica prohibida' },
    executiveSignalLabels: { system: 'Sistema de IA', risk: 'Nivel de riesgo', market: 'Mercado', vendor: 'Proveedor', obligations: 'Obligaciones', nextActions: 'Próximas acciones' },
  },
  fr: {
    editTitle: 'Modifier et réévaluer', editBody: 'Mettez à jour les faits, recalculez le risque et ajoutez un événement à l’historique. Cette aide à la préparation ne constitue pas une décision juridique.',
    systemName: 'Nom du système', ownerTeam: 'Équipe responsable', category: 'Catégorie', countryMarket: 'Pays ou marché', vendor: 'Fournisseur', model: 'Modèle', organizationRole: 'Rôle de l’organisation', lifecycleStatus: 'État du cycle de vie', riskDomain: 'Domaine de risque', processedData: 'Données traitées', useCase: 'Cas d’usage', riskSignals: 'Signaux de risque', saving: 'Enregistrement...', saveReassessment: 'Enregistrer la réévaluation', workflowContext: 'Supabase · RBAC · historique d’activité',
    title: 'Workflows de préparation entreprise', subtitle: 'Créez de véritables enregistrements de preuves, fournisseurs et risques. Chaque action est persistée dans Supabase et journalisée.', evidenceTitle: 'Générateur de dossier de preuves', evidenceBody: 'Créez un dossier de preuves pour les achats à partir de ce système d’IA et des signaux de préparation actuels.', packName: 'Titre du dossier', defaultPackTitle: 'dossier de preuves de préparation à l’AI Act', buildPack: 'Créer le dossier de preuves', vendorTitle: 'Liste de diligence fournisseur', vendorBody: 'Lancez une revue structurée du modèle ou fournisseur, de la sécurité, de la conservation et des obligations de l’AI Act.', vendorName: 'Nom du fournisseur', vendorNotes: 'Notes sur le fournisseur', vendorRiskLevel: 'Niveau de risque du fournisseur', startVendor: 'Lancer la revue fournisseur', riskTitle: 'Workflow de revue des risques', riskBody: 'Ouvrez une revue avec échéance et piste de décision pour les systèmes sensibles ou à haut risque.', dueDate: 'Échéance', riskNotes: 'Notes de revue des risques', startRisk: 'Ouvrir la revue des risques', reportTitle: 'Signaux du rapport exécutif de préparation', reportBody: 'Résumé pour la direction fondé sur des faits réels du système, sans fausse déclaration de conformité.', success: 'Workflow créé et enregistré.', error: 'Impossible de créer le workflow.', loading: 'Création...', emptyVendor: 'Aucun fournisseur n’est défini. Ajoutez-en un avant de lancer la diligence.', saveSuccess: 'Système réévalué et enregistré.', saveError: 'Impossible d’enregistrer la réévaluation.', notSet: 'Non défini',
    roleLabels: { provider: 'Fournisseur', deployer: 'Déployeur', importer: 'Importateur', distributor: 'Distributeur', other: 'Autre' },
    statusLabels: { planned: 'Planifié', pilot: 'Pilote', production: 'Production', retired: 'Retiré' },
    domainLabels: { general_productivity: 'Productivité générale', customer_support: 'Support client', content_generation: 'Génération de contenu', biometrics: 'Biométrie', employment: 'Emploi', education: 'Éducation', credit_finance: 'Crédit et finance', essential_services: 'Services essentiels', law_enforcement: 'Application de la loi', migration_border: 'Migration et frontières', justice_democratic_processes: 'Justice et processus démocratiques', safety_component: 'Composant de sécurité', critical_infrastructure: 'Infrastructure critique' },
    riskLevelLabels: { low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique' },
    riskSignalLabels: { usesPersonalData: 'Traite des données personnelles', interactsWithPeople: 'Interagit directement avec des personnes', generatesContent: 'Génère du contenu ou des décisions', biometricIdentification: 'Identification ou catégorisation biométrique', manipulativeOrExploitative: 'Revue potentielle d’une pratique interdite' },
    executiveSignalLabels: { system: 'Système d’IA', risk: 'Niveau de risque', market: 'Marché', vendor: 'Fournisseur', obligations: 'Obligations', nextActions: 'Prochaines actions' },
  },
  it: {
    editTitle: 'Modifica e rivaluta', editBody: 'Aggiorna i fatti, ricalcola il rischio e aggiungi un evento alla cronologia. Questo supporto alla preparazione non costituisce una decisione legale.',
    systemName: 'Nome del sistema', ownerTeam: 'Team responsabile', category: 'Categoria', countryMarket: 'Paese o mercato', vendor: 'Fornitore', model: 'Modello', organizationRole: 'Ruolo dell’organizzazione', lifecycleStatus: 'Stato del ciclo di vita', riskDomain: 'Dominio di rischio', processedData: 'Dati trattati', useCase: 'Caso d’uso', riskSignals: 'Segnali di rischio', saving: 'Salvataggio...', saveReassessment: 'Salva rivalutazione', workflowContext: 'Supabase · RBAC · cronologia attività',
    title: 'Workflow di preparazione enterprise', subtitle: 'Crea registrazioni reali di evidenze, fornitori e rischi. Ogni azione viene salvata in Supabase e registrata nella cronologia.', evidenceTitle: 'Generatore di pacchetti di evidenze', evidenceBody: 'Crea un pacchetto di evidenze per gli acquisti a partire da questo sistema di IA e dagli attuali segnali di preparazione.', packName: 'Titolo del pacchetto', defaultPackTitle: 'pacchetto di evidenze di preparazione all’AI Act', buildPack: 'Crea pacchetto di evidenze', vendorTitle: 'Checklist di due diligence del fornitore', vendorBody: 'Avvia una revisione strutturata di modello o fornitore, sicurezza, conservazione e obblighi dell’AI Act.', vendorName: 'Nome del fornitore', vendorNotes: 'Note sul fornitore', vendorRiskLevel: 'Livello di rischio del fornitore', startVendor: 'Avvia revisione del fornitore', riskTitle: 'Workflow di revisione del rischio', riskBody: 'Apri una revisione con scadenza e traccia decisionale per sistemi sensibili o ad alto rischio.', dueDate: 'Scadenza', riskNotes: 'Note della revisione del rischio', startRisk: 'Apri revisione del rischio', reportTitle: 'Segnali del rapporto esecutivo di preparazione', reportBody: 'Sintesi per la direzione basata su fatti reali del sistema, senza false dichiarazioni di conformità.', success: 'Workflow creato e registrato.', error: 'Impossibile creare il workflow.', loading: 'Creazione...', emptyVendor: 'Nessun fornitore definito. Aggiungine uno prima di avviare la due diligence.', saveSuccess: 'Sistema rivalutato e salvato.', saveError: 'Impossibile salvare la rivalutazione.', notSet: 'Non definito',
    roleLabels: { provider: 'Fornitore', deployer: 'Utilizzatore', importer: 'Importatore', distributor: 'Distributore', other: 'Altro' },
    statusLabels: { planned: 'Pianificato', pilot: 'Pilota', production: 'Produzione', retired: 'Dismesso' },
    domainLabels: { general_productivity: 'Produttività generale', customer_support: 'Assistenza clienti', content_generation: 'Generazione di contenuti', biometrics: 'Biometria', employment: 'Occupazione', education: 'Istruzione', credit_finance: 'Credito e finanza', essential_services: 'Servizi essenziali', law_enforcement: 'Forze dell’ordine', migration_border: 'Migrazione e frontiere', justice_democratic_processes: 'Giustizia e processi democratici', safety_component: 'Componente di sicurezza', critical_infrastructure: 'Infrastruttura critica' },
    riskLevelLabels: { low: 'Basso', medium: 'Medio', high: 'Alto', critical: 'Critico' },
    riskSignalLabels: { usesPersonalData: 'Tratta dati personali', interactsWithPeople: 'Interagisce direttamente con persone', generatesContent: 'Genera contenuti o decisioni', biometricIdentification: 'Identificazione o categorizzazione biometrica', manipulativeOrExploitative: 'Possibile revisione di pratica vietata' },
    executiveSignalLabels: { system: 'Sistema di IA', risk: 'Livello di rischio', market: 'Mercato', vendor: 'Fornitore', obligations: 'Obblighi', nextActions: 'Prossime azioni' },
  },
  de: {
    editTitle: 'Bearbeiten und neu bewerten', editBody: 'Aktualisieren Sie die Fakten, berechnen Sie das Risiko neu und ergänzen Sie den Verlauf. Diese Unterstützung zur Vorbereitung ist keine Rechtsentscheidung.',
    systemName: 'Systemname', ownerTeam: 'Verantwortliches Team', category: 'Kategorie', countryMarket: 'Land oder Markt', vendor: 'Anbieter', model: 'Modell', organizationRole: 'Rolle der Organisation', lifecycleStatus: 'Lebenszyklusstatus', riskDomain: 'Risikobereich', processedData: 'Verarbeitete Daten', useCase: 'Anwendungsfall', riskSignals: 'Risikosignale', saving: 'Wird gespeichert...', saveReassessment: 'Neubewertung speichern', workflowContext: 'Supabase · RBAC · Aktivitätsverlauf',
    title: 'Workflows für Enterprise-Bereitschaft', subtitle: 'Erstellen Sie echte Nachweis-, Anbieter- und Risikodatensätze. Jede Aktion wird in Supabase gespeichert und im Aktivitätsverlauf erfasst.', evidenceTitle: 'Generator für Nachweispakete', evidenceBody: 'Erstellen Sie aus diesem KI-System und den aktuellen Bereitschaftssignalen ein Nachweispaket für die Beschaffungsprüfung.', packName: 'Titel des Pakets', defaultPackTitle: 'Nachweispaket zur Vorbereitung auf den AI Act', buildPack: 'Nachweispaket erstellen', vendorTitle: 'Checkliste zur Anbieterprüfung', vendorBody: 'Starten Sie eine strukturierte Prüfung von Modell oder Anbieter, Sicherheit, Aufbewahrung und Pflichten nach dem AI Act.', vendorName: 'Name des Anbieters', vendorNotes: 'Anbieternotizen', vendorRiskLevel: 'Risikostufe des Anbieters', startVendor: 'Anbieterprüfung starten', riskTitle: 'Workflow zur Risikoprüfung', riskBody: 'Eröffnen Sie für sensible oder risikoreiche Systeme eine Prüfung mit Frist und Entscheidungsverlauf.', dueDate: 'Fälligkeitsdatum', riskNotes: 'Notizen zur Risikoprüfung', startRisk: 'Risikoprüfung eröffnen', reportTitle: 'Signale des Bereitschaftsberichts für die Leitung', reportBody: 'Zusammenfassung für die Leitung auf Basis realer Systemfakten, ohne falsche Compliance-Aussage.', success: 'Workflow erstellt und protokolliert.', error: 'Workflow konnte nicht erstellt werden.', loading: 'Wird erstellt...', emptyVendor: 'Noch kein Anbieter festgelegt. Fügen Sie vor der Prüfung einen Anbieter hinzu.', saveSuccess: 'System neu bewertet und gespeichert.', saveError: 'Neubewertung konnte nicht gespeichert werden.', notSet: 'Nicht festgelegt',
    roleLabels: { provider: 'Anbieter', deployer: 'Betreiber', importer: 'Importeur', distributor: 'Händler', other: 'Sonstige' },
    statusLabels: { planned: 'Geplant', pilot: 'Pilot', production: 'Produktion', retired: 'Stillgelegt' },
    domainLabels: { general_productivity: 'Allgemeine Produktivität', customer_support: 'Kundensupport', content_generation: 'Inhaltserstellung', biometrics: 'Biometrie', employment: 'Beschäftigung', education: 'Bildung', credit_finance: 'Kredit und Finanzen', essential_services: 'Wesentliche Dienste', law_enforcement: 'Strafverfolgung', migration_border: 'Migration und Grenzen', justice_democratic_processes: 'Justiz und demokratische Prozesse', safety_component: 'Sicherheitskomponente', critical_infrastructure: 'Kritische Infrastruktur' },
    riskLevelLabels: { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' },
    riskSignalLabels: { usesPersonalData: 'Verarbeitet personenbezogene Daten', interactsWithPeople: 'Interagiert direkt mit Menschen', generatesContent: 'Erzeugt Inhalte oder Entscheidungen', biometricIdentification: 'Biometrische Identifizierung oder Kategorisierung', manipulativeOrExploitative: 'Mögliche Prüfung verbotener Praktiken' },
    executiveSignalLabels: { system: 'KI-System', risk: 'Risikostufe', market: 'Markt', vendor: 'Anbieter', obligations: 'Pflichten', nextActions: 'Nächste Schritte' },
  },
} satisfies Record<AiSystemEditLocale, AiSystemEditCopy>;

export function getAiSystemEditCopy(locale?: string): AiSystemEditCopy {
  return aiSystemEditCopy[aiSystemEditLocales.includes(locale as AiSystemEditLocale) ? locale as AiSystemEditLocale : 'en'];
}
