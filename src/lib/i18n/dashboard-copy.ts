export const dashboardCopy = {
  en: {
    nav: { overview: 'Overview', aiInventory: 'AI Inventory', transparency: 'Transparency', assessments: 'Assessments', documents: 'Documents', procurement: 'Procurement', monitoring: 'Monitoring', billing: 'Billing' },
    common: { menu: 'Menu', logout: 'Log out', site: 'Site', dashboard: 'Dashboard', loading: 'Initializing enterprise console...', proRequired: 'Professional plan or higher required', system: 'System' },
    overview: { eyebrow: 'AI governance operating layer', title: 'Real-time compliance readiness.', subtitle: 'Inventory, assessments, documentation and continuous monitoring in an interface built for executive decisions.', liveConsole: 'Live console', complianceScore: 'Compliance Score', aiRiskScore: 'AI Risk Score', aiSystems: 'AI Systems', registeredSystems: 'Registered systems', documents: 'Documents', drafts: 'drafts', recentActivity: 'Recent activity', thisMonth: '+5% this month', medium: 'Medium', low: 'Low', high: 'High' },
    actions: { addAiSystem: 'Add AI System', newAssessment: 'New Assessment', generatePolicy: 'Generate Policy', checkPlan: 'Check Plan' },
    toasts: { noPermission: 'You do not have permission to change this workspace', aiSystemAdded: 'AI system added successfully', aiSystemError: 'Error creating AI system', assessmentCreated: 'Assessment created successfully', assessmentError: 'Error creating assessment', documentCreated: 'Document created successfully', documentError: 'Error creating document', monitoringPlanRequired: 'Monitoring is available only on Growth or Enterprise plans', monitoringSaved: 'Monitoring preferences saved', monitoringSaveError: 'Error saving preferences', invalidSession: 'Invalid session to start checkout', checkoutStartError: 'Could not start checkout' },
    organization: {
      selectedPlanBadge: 'Selected plan',
      continueWithPlan: 'Continue with',
      month: 'month',
      requestedPlanDescription: 'You arrived with a plan selected. Review limits, add-ons and commercial setup without losing the pricing choice.',
      reviewPlan: 'Review plan and add-ons',
      comparePlans: 'Compare plans',
      health: { auditReady: 'Audit ready', needsAttention: 'Needs attention', remediation: 'Remediation needed' },
      planPrefix: 'Plan',
      eyebrow: 'EuroComply',
      title: 'Your regulatory operating system, focused on what needs action today.',
      subtitle: 'Monitor GDPR, AI Act and operational compliance from one executive cockpit: risk, evidence, vendors and remediation work — without spreadsheet chaos.',
      documentsIncluded: 'Documents',
      usersIncluded: 'Users',
      fiscalCountriesIncluded: 'Fiscal countries',
      included: 'included',
      generateAuditPack: 'Generate audit pack',
      reviewPriorityTasks: 'Review priority tasks',
      complianceScore: 'Compliance score',
      criticalRisks: 'critical risks',
      missingEvidence: 'missing evidence',
      quickLinks: {
        tasks: { label: 'Tasks', description: 'Assign owners and unblock overdue work' },
        evidence: { label: 'Evidence', description: 'Review policies, proofs and expirations' },
        vendors: { label: 'Vendors', description: 'Track third-party review exposure' },
        risks: { label: 'Risks', description: 'Prioritise high-impact compliance gaps' }
      }
    },
    enterprise: {
      eyebrow: 'Enterprise command layer',
      title: 'Executive compliance overview',
      subtitle: 'A buyer-grade control room for compliance health, risk exposure, work queue, evidence, vendors, audit trail and billing readiness.',
      openOrganizations: 'Open organizations',
      viewDocuments: 'View documents',
      viewTasks: 'View tasks',
      panels: {
        compliance: { title: 'Compliance status', body: 'Score is calculated from open risks, missing evidence, overdue tasks and vendor review exposure.' },
        risk: { title: 'Risk summary', body: 'Critical and high-priority issues are surfaced with clear review paths before they affect audit readiness.' },
        tasks: { title: 'Pending tasks', body: 'Open work is grouped by urgency so owners know what must be resolved next.' },
        documents: { title: 'Document status', body: 'Evidence coverage highlights missing, expiring and draft documents before review windows close.' },
        vendors: { title: 'Vendor status', body: 'Supplier reviews are monitored for high-risk exposure and stale review decisions.' },
        audit: { title: 'Audit activity', body: 'Recent operating signals are presented as an audit-ready activity stream without exposing technical errors.' },
        billing: { title: 'Billing status', body: 'Plan limits and upgrade paths are visible without exposing admin-only billing controls to restricted roles.' }
      },
      statesTitle: 'Standard product states',
      statesSubtitle: 'Every critical action has a visible state, accessible announcement and safe next step.',
      states: {
        loading: { title: 'Loading: syncing workspace evidence', body: 'Skeleton content keeps layout stable while data loads.', tone: 'Neutral' },
        empty: { title: 'Empty: no items need attention', body: 'The page explains why the list is empty and offers one safe action.', tone: 'Ready' },
        error: { title: 'Error: action could not be completed', body: 'The message avoids stack traces and provides retry or support guidance.', tone: 'Needs review' },
        denied: { title: 'Permission denied: admin approval required', body: 'Restricted users see role guidance without hidden tenant details.', tone: 'Restricted' },
        success: { title: 'Success: change saved', body: 'Confirmation explains what changed and what happens next.', tone: 'Saved' },
        offline: { title: 'Offline: network connection interrupted', body: 'The user keeps context and can retry when the connection returns.', tone: 'Network' }
      }
    }
  },
  pt: {
    nav: { overview: 'Visão geral', aiInventory: 'Inventário de IA', transparency: 'Transparência', assessments: 'Avaliações', documents: 'Documentos', procurement: 'Procurement', monitoring: 'Monitoramento', billing: 'Faturamento' },
    common: { menu: 'Menu', logout: 'Sair', site: 'Site', dashboard: 'Dashboard', loading: 'Inicializando console enterprise...', proRequired: 'Plano Profissional ou superior necessário', system: 'Sistema' },
    overview: { eyebrow: 'Camada operacional de governança de IA', title: 'Prontidão de compliance em tempo real.', subtitle: 'Inventário, avaliações, documentação e monitoramento contínuo em uma interface construída para decisões executivas.', liveConsole: 'Console ao vivo', complianceScore: 'Score de compliance', aiRiskScore: 'Score de risco de IA', aiSystems: 'Sistemas de IA', registeredSystems: 'Sistemas registrados', documents: 'Documentos', drafts: 'rascunhos', recentActivity: 'Atividade recente', thisMonth: '+5% este mês', medium: 'Médio', low: 'Baixo', high: 'Alto' },
    actions: { addAiSystem: 'Adicionar Sistema de IA', newAssessment: 'Nova avaliação', generatePolicy: 'Gerar política', checkPlan: 'Verificar plano' },
    toasts: { noPermission: 'Sem permissão para alterar este workspace', aiSystemAdded: 'Sistema de IA adicionado com sucesso', aiSystemError: 'Erro ao criar sistema de IA', assessmentCreated: 'Avaliação criada com sucesso', assessmentError: 'Erro ao criar avaliação', documentCreated: 'Documento criado com sucesso', documentError: 'Erro ao criar documento', monitoringPlanRequired: 'Monitoramento disponível apenas no plano Growth ou Enterprise', monitoringSaved: 'Preferências de monitoramento salvas', monitoringSaveError: 'Erro ao salvar preferências', invalidSession: 'Sessão inválida para iniciar checkout', checkoutStartError: 'Não foi possível iniciar o checkout' },
    organization: {
      selectedPlanBadge: 'Plano selecionado',
      continueWithPlan: 'Continuar com',
      month: 'mês',
      requestedPlanDescription: 'Você chegou com um plano selecionado. Revise limites, add-ons e configuração comercial sem perder a escolha feita no pricing.',
      reviewPlan: 'Rever plano e add-ons',
      comparePlans: 'Comparar planos',
      health: { auditReady: 'Pronto para auditoria', needsAttention: 'Requer atenção', remediation: 'Remediação necessária' },
      planPrefix: 'Plano',
      eyebrow: 'EuroComply',
      title: 'O seu sistema operacional regulatório, focado no que precisa de ação hoje.',
      subtitle: 'Monitore GDPR, AI Act e compliance operacional em um cockpit executivo: risco, evidências, fornecedores e remediação — sem caos de planilhas.',
      documentsIncluded: 'Documentos',
      usersIncluded: 'Utilizadores',
      fiscalCountriesIncluded: 'Países fiscais',
      included: 'incluídos',
      generateAuditPack: 'Gerar pacote de auditoria',
      reviewPriorityTasks: 'Rever tarefas prioritárias',
      complianceScore: 'Score de compliance',
      criticalRisks: 'riscos críticos',
      missingEvidence: 'evidências em falta',
      quickLinks: {
        tasks: { label: 'Tarefas', description: 'Atribua responsáveis e desbloqueie trabalho em atraso' },
        evidence: { label: 'Evidências', description: 'Revise políticas, provas e expirações' },
        vendors: { label: 'Fornecedores', description: 'Acompanhe exposição de revisão de terceiros' },
        risks: { label: 'Riscos', description: 'Priorize lacunas de compliance de maior impacto' }
      }
    },
    enterprise: {
      eyebrow: 'Camada de comando enterprise',
      title: 'Visão executiva de compliance',
      subtitle: 'Uma sala de controle para compradores enterprise acompanharem saúde de compliance, risco, tarefas, evidências, fornecedores, auditoria e faturamento.',
      openOrganizations: 'Abrir organizações',
      viewDocuments: 'Ver documentos',
      viewTasks: 'Ver tarefas',
      panels: {
        compliance: { title: 'Status de compliance', body: 'O score combina riscos abertos, evidências em falta, tarefas atrasadas e exposição de fornecedores.' },
        risk: { title: 'Resumo de risco', body: 'Issues críticas e prioritárias aparecem com caminhos claros de revisão antes de afetarem a auditoria.' },
        tasks: { title: 'Tarefas pendentes', body: 'O trabalho aberto é agrupado por urgência para orientar a próxima resolução.' },
        documents: { title: 'Status documental', body: 'A cobertura de evidências destaca documentos ausentes, expirando ou em rascunho.' },
        vendors: { title: 'Status de fornecedores', body: 'Revisões de terceiros monitoram exposição elevada e decisões desatualizadas.' },
        audit: { title: 'Atividade de auditoria', body: 'Sinais operacionais aparecem em formato pronto para auditoria sem expor erros técnicos.' },
        billing: { title: 'Status de faturamento', body: 'Limites do plano e caminhos de upgrade ficam claros sem expor controles restritos.' }
      },
      statesTitle: 'Estados de produto padronizados',
      statesSubtitle: 'Toda ação crítica tem estado visível, anúncio acessível e próximo passo seguro.',
      states: {
        loading: { title: 'Carregando: sincronizando evidências', body: 'Skeletons mantêm a tela estável enquanto os dados carregam.', tone: 'Neutro' },
        empty: { title: 'Vazio: nenhum item requer atenção', body: 'A página explica o motivo e oferece uma ação segura.', tone: 'Pronto' },
        error: { title: 'Erro: ação não concluída', body: 'A mensagem evita stack trace e oferece tentar novamente ou suporte.', tone: 'Rever' },
        denied: { title: 'Permissão negada: aprovação admin necessária', body: 'Usuários restritos recebem orientação sem detalhes ocultos do tenant.', tone: 'Restrito' },
        success: { title: 'Sucesso: alteração salva', body: 'A confirmação explica o que mudou e o próximo passo.', tone: 'Salvo' },
        offline: { title: 'Offline: conexão interrompida', body: 'O usuário mantém contexto e pode tentar novamente ao voltar.', tone: 'Rede' }
      }
    }
  },
  es: {
    nav: { overview: 'Resumen', aiInventory: 'Inventario de IA', transparency: 'Transparencia', assessments: 'Evaluaciones', documents: 'Documentos', procurement: 'Compras', monitoring: 'Monitorización', billing: 'Facturación' },
    common: { menu: 'Menú', logout: 'Salir', site: 'Sitio', dashboard: 'Panel', loading: 'Inicializando consola enterprise...', proRequired: 'Se requiere plan Profesional o superior', system: 'Sistema' },
    overview: { eyebrow: 'Capa operativa de gobernanza de IA', title: 'Preparación de cumplimiento en tiempo real.', subtitle: 'Inventario, evaluaciones, documentación y monitorización continua en una interfaz para decisiones ejecutivas.', liveConsole: 'Consola en vivo', complianceScore: 'Puntuación de cumplimiento', aiRiskScore: 'Puntuación de riesgo de IA', aiSystems: 'Sistemas de IA', registeredSystems: 'Sistemas registrados', documents: 'Documentos', drafts: 'borradores', recentActivity: 'Actividad reciente', thisMonth: '+5% este mes', medium: 'Medio', low: 'Bajo', high: 'Alto' },
    actions: { addAiSystem: 'Añadir sistema de IA', newAssessment: 'Nueva evaluación', generatePolicy: 'Generar política', checkPlan: 'Verificar plan' },
    toasts: { noPermission: 'No tienes permiso para cambiar este workspace', aiSystemAdded: 'Sistema de IA añadido correctamente', aiSystemError: 'Error al crear sistema de IA', assessmentCreated: 'Evaluación creada correctamente', assessmentError: 'Error al crear evaluación', documentCreated: 'Documento creado correctamente', documentError: 'Error al crear documento', monitoringPlanRequired: 'La monitorización solo está disponible en Growth o Enterprise', monitoringSaved: 'Preferencias de monitorización guardadas', monitoringSaveError: 'Error al guardar preferencias', invalidSession: 'Sesión inválida para iniciar checkout', checkoutStartError: 'No se pudo iniciar el checkout' },
    organization: {
      selectedPlanBadge: 'Plan seleccionado',
      continueWithPlan: 'Continuar con',
      month: 'mes',
      requestedPlanDescription: 'Llegaste con un plan seleccionado. Revisa límites, add-ons y configuración comercial sin perder la elección de pricing.',
      reviewPlan: 'Revisar plan y add-ons',
      comparePlans: 'Comparar planes',
      health: { auditReady: 'Listo para auditoría', needsAttention: 'Requiere atención', remediation: 'Remediación necesaria' },
      planPrefix: 'Plan',
      eyebrow: 'EuroComply',
      title: 'Tu sistema operativo regulatorio, centrado en lo que requiere acción hoy.',
      subtitle: 'Supervisa GDPR, AI Act y cumplimiento operativo desde un cockpit ejecutivo: riesgo, evidencia, proveedores y remediación.',
      documentsIncluded: 'Documentos',
      usersIncluded: 'Usuarios',
      fiscalCountriesIncluded: 'Países fiscales',
      included: 'incluidos',
      generateAuditPack: 'Generar paquete de auditoría',
      reviewPriorityTasks: 'Revisar tareas prioritarias',
      complianceScore: 'Puntuación de cumplimiento',
      criticalRisks: 'riesgos críticos',
      missingEvidence: 'evidencia faltante',
      quickLinks: {
        tasks: { label: 'Tareas', description: 'Asigna responsables y desbloquea trabajo vencido' },
        evidence: { label: 'Evidencia', description: 'Revisa políticas, pruebas y vencimientos' },
        vendors: { label: 'Proveedores', description: 'Controla la exposición de terceros' },
        risks: { label: 'Riesgos', description: 'Prioriza brechas de cumplimiento de alto impacto' }
      }
    },
    enterprise: {
      eyebrow: 'Capa de comando enterprise',
      title: 'Vista ejecutiva de cumplimiento',
      subtitle: 'Un centro de control para salud de cumplimiento, riesgo, trabajo pendiente, evidencia, proveedores, auditoría y facturación.',
      openOrganizations: 'Abrir organizaciones',
      viewDocuments: 'Ver documentos',
      viewTasks: 'Ver tareas',
      panels: {
        compliance: { title: 'Estado de cumplimiento', body: 'La puntuación combina riesgos abiertos, evidencia faltante, tareas vencidas y exposición de proveedores.' },
        risk: { title: 'Resumen de riesgo', body: 'Los asuntos críticos aparecen con rutas claras de revisión antes de afectar la auditoría.' },
        tasks: { title: 'Tareas pendientes', body: 'El trabajo abierto se agrupa por urgencia para guiar la siguiente resolución.' },
        documents: { title: 'Estado documental', body: 'La cobertura destaca documentos ausentes, próximos a vencer o en borrador.' },
        vendors: { title: 'Estado de proveedores', body: 'Las revisiones controlan exposición alta y decisiones desactualizadas.' },
        audit: { title: 'Actividad de auditoría', body: 'Las señales operativas se muestran listas para auditoría sin errores técnicos.' },
        billing: { title: 'Estado de facturación', body: 'Los límites del plan y rutas de upgrade son claros sin exponer controles restringidos.' }
      },
      statesTitle: 'Estados de producto consistentes',
      statesSubtitle: 'Cada acción crítica tiene estado visible, anuncio accesible y siguiente paso seguro.',
      states: {
        loading: { title: 'Cargando: sincronizando evidencia', body: 'Los skeletons estabilizan la pantalla mientras cargan los datos.', tone: 'Neutral' },
        empty: { title: 'Vacío: ningún elemento requiere atención', body: 'La página explica el motivo y ofrece una acción segura.', tone: 'Listo' },
        error: { title: 'Error: acción no completada', body: 'El mensaje evita stack traces y ofrece reintento o soporte.', tone: 'Revisar' },
        denied: { title: 'Permiso denegado: aprobación admin requerida', body: 'Los usuarios restringidos ven orientación sin detalles ocultos.', tone: 'Restringido' },
        success: { title: 'Éxito: cambio guardado', body: 'La confirmación explica qué cambió y qué sigue.', tone: 'Guardado' },
        offline: { title: 'Offline: conexión interrumpida', body: 'El usuario conserva contexto y puede reintentar al volver.', tone: 'Red' }
      }
    }
  },
  fr: {
    nav: { overview: 'Vue d’ensemble', aiInventory: 'Inventaire IA', transparency: 'Transparence', assessments: 'Évaluations', documents: 'Documents', procurement: 'Achats', monitoring: 'Surveillance', billing: 'Facturation' },
    common: { menu: 'Menu', logout: 'Déconnexion', site: 'Site', dashboard: 'Tableau de bord', loading: 'Initialisation de la console enterprise...', proRequired: 'Plan Professionnel ou supérieur requis', system: 'Système' },
    overview: { eyebrow: 'Couche opérationnelle de gouvernance IA', title: 'Préparation conformité en temps réel.', subtitle: 'Inventaire, évaluations, documentation et surveillance continue dans une interface pensée pour les décisions exécutives.', liveConsole: 'Console en direct', complianceScore: 'Score de conformité', aiRiskScore: 'Score de risque IA', aiSystems: 'Systèmes IA', registeredSystems: 'Systèmes enregistrés', documents: 'Documents', drafts: 'brouillons', recentActivity: 'Activité récente', thisMonth: '+5% ce mois-ci', medium: 'Moyen', low: 'Faible', high: 'Élevé' },
    actions: { addAiSystem: 'Ajouter un système IA', newAssessment: 'Nouvelle évaluation', generatePolicy: 'Générer une politique', checkPlan: 'Vérifier le plan' },
    toasts: { noPermission: 'Vous n’avez pas l’autorisation de modifier ce workspace', aiSystemAdded: 'Système IA ajouté avec succès', aiSystemError: 'Erreur lors de la création du système IA', assessmentCreated: 'Évaluation créée avec succès', assessmentError: 'Erreur lors de la création de l’évaluation', documentCreated: 'Document créé avec succès', documentError: 'Erreur lors de la création du document', monitoringPlanRequired: 'La surveillance est disponible uniquement avec Growth ou Enterprise', monitoringSaved: 'Préférences de surveillance enregistrées', monitoringSaveError: 'Erreur lors de l’enregistrement des préférences', invalidSession: 'Session invalide pour démarrer le checkout', checkoutStartError: 'Impossible de démarrer le checkout' },
    organization: {
      selectedPlanBadge: 'Plan sélectionné',
      continueWithPlan: 'Continuer avec',
      month: 'mois',
      requestedPlanDescription: 'Vous arrivez avec un plan sélectionné. Vérifiez limites, add-ons et configuration commerciale sans perdre le choix pricing.',
      reviewPlan: 'Vérifier le plan et les add-ons',
      comparePlans: 'Comparer les plans',
      health: { auditReady: 'Prêt pour audit', needsAttention: 'Nécessite attention', remediation: 'Remédiation nécessaire' },
      planPrefix: 'Plan',
      eyebrow: 'EuroComply',
      title: 'Votre système opérationnel réglementaire, centré sur les actions du jour.',
      subtitle: 'Pilotez GDPR, AI Act et conformité opérationnelle depuis un cockpit exécutif : risques, preuves, fournisseurs et remédiation.',
      documentsIncluded: 'Documents',
      usersIncluded: 'Utilisateurs',
      fiscalCountriesIncluded: 'Pays fiscaux',
      included: 'inclus',
      generateAuditPack: 'Générer le pack audit',
      reviewPriorityTasks: 'Vérifier les tâches prioritaires',
      complianceScore: 'Score de conformité',
      criticalRisks: 'risques critiques',
      missingEvidence: 'preuves manquantes',
      quickLinks: {
        tasks: { label: 'Tâches', description: 'Attribuer des responsables et débloquer le travail en retard' },
        evidence: { label: 'Preuves', description: 'Vérifier politiques, preuves et expirations' },
        vendors: { label: 'Fournisseurs', description: 'Suivre l’exposition des tiers' },
        risks: { label: 'Risques', description: 'Prioriser les écarts de conformité à fort impact' }
      }
    },
    enterprise: {
      eyebrow: 'Couche de commande enterprise',
      title: 'Vue exécutive de conformité',
      subtitle: 'Un centre de contrôle pour la santé conformité, le risque, les tâches, les preuves, les fournisseurs, l’audit et la facturation.',
      openOrganizations: 'Ouvrir les organisations',
      viewDocuments: 'Voir les documents',
      viewTasks: 'Voir les tâches',
      panels: {
        compliance: { title: 'Statut de conformité', body: 'Le score combine risques ouverts, preuves manquantes, tâches en retard et exposition fournisseurs.' },
        risk: { title: 'Résumé du risque', body: 'Les sujets critiques apparaissent avec des chemins de revue clairs avant l’audit.' },
        tasks: { title: 'Tâches en attente', body: 'Le travail ouvert est groupé par urgence pour guider la résolution.' },
        documents: { title: 'Statut documentaire', body: 'La couverture signale documents absents, expirant bientôt ou en brouillon.' },
        vendors: { title: 'Statut fournisseurs', body: 'Les revues suivent l’exposition élevée et les décisions obsolètes.' },
        audit: { title: 'Activité d’audit', body: 'Les signaux opérationnels sont présentés sans erreurs techniques exposées.' },
        billing: { title: 'Statut de facturation', body: 'Les limites du plan et chemins d’upgrade sont clairs sans contrôles restreints.' }
      },
      statesTitle: 'États produit cohérents',
      statesSubtitle: 'Chaque action critique a un état visible, une annonce accessible et une suite sûre.',
      states: {
        loading: { title: 'Chargement : synchronisation des preuves', body: 'Les skeletons stabilisent l’écran pendant le chargement.', tone: 'Neutre' },
        empty: { title: 'Vide : aucun élément à traiter', body: 'La page explique pourquoi et propose une action sûre.', tone: 'Prêt' },
        error: { title: 'Erreur : action non terminée', body: 'Le message évite les stack traces et propose réessai ou support.', tone: 'À vérifier' },
        denied: { title: 'Accès refusé : approbation admin requise', body: 'Les utilisateurs restreints voient une guidance sans données cachées.', tone: 'Restreint' },
        success: { title: 'Succès : changement enregistré', body: 'La confirmation explique le changement et la suite.', tone: 'Enregistré' },
        offline: { title: 'Hors ligne : connexion interrompue', body: 'L’utilisateur garde le contexte et peut réessayer.', tone: 'Réseau' }
      }
    }
  },
  it: {
    nav: { overview: 'Panoramica', aiInventory: 'Inventario IA', transparency: 'Trasparenza', assessments: 'Valutazioni', documents: 'Documenti', procurement: 'Acquisti', monitoring: 'Monitoraggio', billing: 'Fatturazione' },
    common: { menu: 'Menu', logout: 'Esci', site: 'Sito', dashboard: 'Dashboard', loading: 'Inizializzazione console enterprise...', proRequired: 'Richiesto piano Professionale o superiore', system: 'Sistema' },
    overview: { eyebrow: 'Livello operativo di governance IA', title: 'Prontezza compliance in tempo reale.', subtitle: 'Inventario, valutazioni, documentazione e monitoraggio continuo in un’interfaccia per decisioni executive.', liveConsole: 'Console live', complianceScore: 'Punteggio compliance', aiRiskScore: 'Punteggio rischio IA', aiSystems: 'Sistemi IA', registeredSystems: 'Sistemi registrati', documents: 'Documenti', drafts: 'bozze', recentActivity: 'Attività recente', thisMonth: '+5% questo mese', medium: 'Medio', low: 'Basso', high: 'Alto' },
    actions: { addAiSystem: 'Aggiungi sistema IA', newAssessment: 'Nuova valutazione', generatePolicy: 'Genera policy', checkPlan: 'Verifica piano' },
    toasts: { noPermission: 'Non hai il permesso di modificare questo workspace', aiSystemAdded: 'Sistema IA aggiunto con successo', aiSystemError: 'Errore nella creazione del sistema IA', assessmentCreated: 'Valutazione creata con successo', assessmentError: 'Errore nella creazione della valutazione', documentCreated: 'Documento creato con successo', documentError: 'Errore nella creazione del documento', monitoringPlanRequired: 'Il monitoraggio è disponibile solo nei piani Growth o Enterprise', monitoringSaved: 'Preferenze di monitoraggio salvate', monitoringSaveError: 'Errore nel salvataggio delle preferenze', invalidSession: 'Sessione non valida per avviare checkout', checkoutStartError: 'Impossibile avviare checkout' },
    organization: {
      selectedPlanBadge: 'Piano selezionato',
      continueWithPlan: 'Continua con',
      month: 'mese',
      requestedPlanDescription: 'Sei arrivato con un piano selezionato. Rivedi limiti, add-on e configurazione commerciale senza perdere la scelta pricing.',
      reviewPlan: 'Rivedi piano e add-on',
      comparePlans: 'Confronta piani',
      health: { auditReady: 'Pronto per audit', needsAttention: 'Richiede attenzione', remediation: 'Rimediazione richiesta' },
      planPrefix: 'Piano',
      eyebrow: 'EuroComply',
      title: 'Il tuo sistema operativo regolatorio, centrato sulle azioni di oggi.',
      subtitle: 'Monitora GDPR, AI Act e compliance operativa da un cockpit executive: rischio, evidenze, fornitori e rimediazione.',
      documentsIncluded: 'Documenti',
      usersIncluded: 'Utenti',
      fiscalCountriesIncluded: 'Paesi fiscali',
      included: 'inclusi',
      generateAuditPack: 'Genera pacchetto audit',
      reviewPriorityTasks: 'Rivedi attività prioritarie',
      complianceScore: 'Punteggio compliance',
      criticalRisks: 'rischi critici',
      missingEvidence: 'evidenze mancanti',
      quickLinks: {
        tasks: { label: 'Attività', description: 'Assegna owner e sblocca lavoro in ritardo' },
        evidence: { label: 'Evidenze', description: 'Rivedi policy, prove e scadenze' },
        vendors: { label: 'Fornitori', description: 'Monitora esposizione di terze parti' },
        risks: { label: 'Rischi', description: 'Prioritizza gap di compliance ad alto impatto' }
      }
    },
    enterprise: {
      eyebrow: 'Livello di comando enterprise',
      title: 'Vista executive compliance',
      subtitle: 'Una control room per salute compliance, rischio, coda attività, evidenze, fornitori, audit e fatturazione.',
      openOrganizations: 'Apri organizzazioni',
      viewDocuments: 'Vedi documenti',
      viewTasks: 'Vedi attività',
      panels: {
        compliance: { title: 'Stato compliance', body: 'Il punteggio combina rischi aperti, evidenze mancanti, attività scadute ed esposizione fornitori.' },
        risk: { title: 'Sintesi rischio', body: 'I temi critici emergono con percorsi chiari di revisione prima dell’audit.' },
        tasks: { title: 'Attività pendenti', body: 'Il lavoro aperto è raggruppato per urgenza per guidare la risoluzione.' },
        documents: { title: 'Stato documenti', body: 'La copertura evidenzia documenti mancanti, in scadenza o in bozza.' },
        vendors: { title: 'Stato fornitori', body: 'Le review monitorano esposizione alta e decisioni obsolete.' },
        audit: { title: 'Attività audit', body: 'I segnali operativi sono pronti per audit senza errori tecnici esposti.' },
        billing: { title: 'Stato fatturazione', body: 'Limiti piano e upgrade sono chiari senza controlli riservati.' }
      },
      statesTitle: 'Stati prodotto coerenti',
      statesSubtitle: 'Ogni azione critica ha stato visibile, annuncio accessibile e passo sicuro.',
      states: {
        loading: { title: 'Caricamento: sincronizzazione evidenze', body: 'Gli skeleton mantengono stabile il layout durante il caricamento.', tone: 'Neutro' },
        empty: { title: 'Vuoto: nessun elemento richiede attenzione', body: 'La pagina spiega il motivo e offre un’azione sicura.', tone: 'Pronto' },
        error: { title: 'Errore: azione non completata', body: 'Il messaggio evita stack trace e offre retry o supporto.', tone: 'Da rivedere' },
        denied: { title: 'Permesso negato: approvazione admin richiesta', body: 'Gli utenti limitati vedono guidance senza dettagli nascosti.', tone: 'Limitato' },
        success: { title: 'Successo: modifica salvata', body: 'La conferma spiega cosa è cambiato e cosa succede dopo.', tone: 'Salvato' },
        offline: { title: 'Offline: connessione interrotta', body: 'L’utente mantiene il contesto e può riprovare.', tone: 'Rete' }
      }
    }
  },
  de: {
    nav: { overview: 'Übersicht', aiInventory: 'KI-Inventar', transparency: 'Transparenz', assessments: 'Bewertungen', documents: 'Dokumente', procurement: 'Beschaffung', monitoring: 'Monitoring', billing: 'Abrechnung' },
    common: { menu: 'Menü', logout: 'Abmelden', site: 'Website', dashboard: 'Dashboard', loading: 'Enterprise-Konsole wird initialisiert...', proRequired: 'Professional-Plan oder höher erforderlich', system: 'System' },
    overview: { eyebrow: 'Operative KI-Governance-Ebene', title: 'Compliance-Bereitschaft in Echtzeit.', subtitle: 'Inventar, Bewertungen, Dokumentation und kontinuierliches Monitoring in einer Oberfläche für Management-Entscheidungen.', liveConsole: 'Live-Konsole', complianceScore: 'Compliance-Score', aiRiskScore: 'KI-Risiko-Score', aiSystems: 'KI-Systeme', registeredSystems: 'Registrierte Systeme', documents: 'Dokumente', drafts: 'Entwürfe', recentActivity: 'Aktuelle Aktivität', thisMonth: '+5% diesen Monat', medium: 'Mittel', low: 'Niedrig', high: 'Hoch' },
    actions: { addAiSystem: 'KI-System hinzufügen', newAssessment: 'Neue Bewertung', generatePolicy: 'Richtlinie erstellen', checkPlan: 'Plan prüfen' },
    toasts: { noPermission: 'Sie haben keine Berechtigung, diesen Workspace zu ändern', aiSystemAdded: 'KI-System erfolgreich hinzugefügt', aiSystemError: 'Fehler beim Erstellen des KI-Systems', assessmentCreated: 'Bewertung erfolgreich erstellt', assessmentError: 'Fehler beim Erstellen der Bewertung', documentCreated: 'Dokument erfolgreich erstellt', documentError: 'Fehler beim Erstellen des Dokuments', monitoringPlanRequired: 'Monitoring ist nur in Growth oder Enterprise verfügbar', monitoringSaved: 'Monitoring-Einstellungen gespeichert', monitoringSaveError: 'Fehler beim Speichern der Einstellungen', invalidSession: 'Ungültige Sitzung für Checkout', checkoutStartError: 'Checkout konnte nicht gestartet werden' },
    organization: {
      selectedPlanBadge: 'Ausgewählter Plan',
      continueWithPlan: 'Weiter mit',
      month: 'Monat',
      requestedPlanDescription: 'Sie kamen mit ausgewähltem Plan. Prüfen Sie Limits, Add-ons und kommerzielle Einrichtung, ohne die Pricing-Auswahl zu verlieren.',
      reviewPlan: 'Plan und Add-ons prüfen',
      comparePlans: 'Pläne vergleichen',
      health: { auditReady: 'Auditbereit', needsAttention: 'Benötigt Aufmerksamkeit', remediation: 'Behebung erforderlich' },
      planPrefix: 'Plan',
      eyebrow: 'EuroComply',
      title: 'Ihr regulatorisches Betriebssystem, fokussiert auf heutige Maßnahmen.',
      subtitle: 'Überwachen Sie GDPR, AI Act und operative Compliance in einem Executive-Cockpit: Risiko, Nachweise, Anbieter und Behebung.',
      documentsIncluded: 'Dokumente',
      usersIncluded: 'Benutzer',
      fiscalCountriesIncluded: 'Steuerländer',
      included: 'enthalten',
      generateAuditPack: 'Audit-Paket erstellen',
      reviewPriorityTasks: 'Priorisierte Aufgaben prüfen',
      complianceScore: 'Compliance-Score',
      criticalRisks: 'kritische Risiken',
      missingEvidence: 'fehlende Nachweise',
      quickLinks: {
        tasks: { label: 'Aufgaben', description: 'Owner zuweisen und überfällige Arbeit lösen' },
        evidence: { label: 'Nachweise', description: 'Policies, Belege und Ablaufdaten prüfen' },
        vendors: { label: 'Anbieter', description: 'Drittanbieter-Exposition verfolgen' },
        risks: { label: 'Risiken', description: 'Compliance-Lücken mit hoher Wirkung priorisieren' }
      }
    },
    enterprise: {
      eyebrow: 'Enterprise-Kommandoebene',
      title: 'Executive Compliance Overview',
      subtitle: 'Ein Kontrollraum für Compliance-Status, Risiko, Aufgaben, Nachweise, Anbieter, Audit und Abrechnung.',
      openOrganizations: 'Organisationen öffnen',
      viewDocuments: 'Dokumente ansehen',
      viewTasks: 'Aufgaben ansehen',
      panels: {
        compliance: { title: 'Compliance-Status', body: 'Der Score kombiniert offene Risiken, fehlende Nachweise, überfällige Aufgaben und Anbieterexposition.' },
        risk: { title: 'Risikozusammenfassung', body: 'Kritische Themen erscheinen mit klaren Prüfpfaden vor dem Audit.' },
        tasks: { title: 'Ausstehende Aufgaben', body: 'Offene Arbeit wird nach Dringlichkeit gruppiert.' },
        documents: { title: 'Dokumentenstatus', body: 'Die Abdeckung zeigt fehlende, ablaufende oder Entwurfsdokumente.' },
        vendors: { title: 'Anbieterstatus', body: 'Reviews überwachen hohe Exposition und veraltete Entscheidungen.' },
        audit: { title: 'Audit-Aktivität', body: 'Operative Signale werden auditbereit ohne technische Fehler gezeigt.' },
        billing: { title: 'Abrechnungsstatus', body: 'Planlimits und Upgrade-Pfade sind klar, ohne eingeschränkte Kontrollen offenzulegen.' }
      },
      statesTitle: 'Konsistente Produktzustände',
      statesSubtitle: 'Jede kritische Aktion hat sichtbaren Zustand, zugängliche Ansage und sicheren nächsten Schritt.',
      states: {
        loading: { title: 'Lädt: Nachweise werden synchronisiert', body: 'Skeletons halten das Layout stabil, während Daten laden.', tone: 'Neutral' },
        empty: { title: 'Leer: keine Elemente benötigen Aufmerksamkeit', body: 'Die Seite erklärt warum und bietet eine sichere Aktion.', tone: 'Bereit' },
        error: { title: 'Fehler: Aktion nicht abgeschlossen', body: 'Die Meldung vermeidet Stack Traces und bietet Wiederholen oder Support.', tone: 'Prüfen' },
        denied: { title: 'Keine Berechtigung: Admin-Freigabe erforderlich', body: 'Eingeschränkte Nutzer sehen Hinweise ohne versteckte Tenant-Details.', tone: 'Eingeschränkt' },
        success: { title: 'Erfolg: Änderung gespeichert', body: 'Die Bestätigung erklärt Änderung und nächsten Schritt.', tone: 'Gespeichert' },
        offline: { title: 'Offline: Netzwerkverbindung unterbrochen', body: 'Der Kontext bleibt erhalten und kann erneut versucht werden.', tone: 'Netzwerk' }
      }
    }
  }
} as const;

export type DashboardCopy = (typeof dashboardCopy)['en'];

export function getDashboardCopy(locale: string): DashboardCopy {
  return dashboardCopy[locale as keyof typeof dashboardCopy] ?? dashboardCopy.en;
}
