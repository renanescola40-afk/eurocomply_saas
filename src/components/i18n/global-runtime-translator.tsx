'use client';

import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n/routing';

type TranslationRow = Record<Locale, string>;
type TranslationMap = Record<string, string>;

const rows: TranslationRow[] = [
  // Navigation and global app chrome
  { en: 'Command Center', pt: 'Centro de Comando', es: 'Centro de Mando', fr: 'Centre de Commande', it: 'Centro di Comando', de: 'Command Center' },
  { en: 'Executive Dashboard', pt: 'Dashboard Executivo', es: 'Panel Ejecutivo', fr: 'Tableau de Bord Exécutif', it: 'Dashboard Esecutiva', de: 'Executive Dashboard' },
  { en: 'Audit Log', pt: 'Log de Auditoria', es: 'Registro de Auditoría', fr: 'Journal d’Audit', it: 'Registro di Audit', de: 'Audit-Log' },
  { en: 'Legal Calendar', pt: 'Calendário Legal', es: 'Calendario Legal', fr: 'Calendrier Légal', it: 'Calendario Legale', de: 'Rechtskalender' },
  { en: 'Evidence & Risk', pt: 'Evidências e Risco', es: 'Evidencia y Riesgo', fr: 'Preuves et Risques', it: 'Evidenze e Rischio', de: 'Nachweise und Risiko' },
  { en: 'Controlled Documents', pt: 'Documentos Controlados', es: 'Documentos Controlados', fr: 'Documents Contrôlés', it: 'Documenti Controllati', de: 'Kontrollierte Dokumente' },
  { en: 'Risk Matrix', pt: 'Matriz de Riscos', es: 'Matriz de Riesgos', fr: 'Matrice des Risques', it: 'Matrice dei Rischi', de: 'Risikomatrix' },
  { en: 'RACI Matrix', pt: 'Matriz RACI', es: 'Matriz RACI', fr: 'Matrice RACI', it: 'Matrice RACI', de: 'RACI-Matrix' },
  { en: 'Reports & Governance', pt: 'Relatórios e Governação', es: 'Informes y Gobierno', fr: 'Rapports et Gouvernance', it: 'Report e Governance', de: 'Berichte und Governance' },
  { en: 'Compliance Reports', pt: 'Relatórios de Compliance', es: 'Informes de Cumplimiento', fr: 'Rapports de Conformité', it: 'Report di Compliance', de: 'Compliance-Berichte' },
  { en: 'European News', pt: 'Notícias Europeias', es: 'Noticias Europeas', fr: 'Actualités Européennes', it: 'Notizie Europee', de: 'Europäische News' },
  { en: 'Approvals', pt: 'Aprovações', es: 'Aprobaciones', fr: 'Approbations', it: 'Approvazioni', de: 'Freigaben' },
  { en: 'Minutes & Governance', pt: 'Atas e Governação', es: 'Actas y Gobierno', fr: 'Procès-verbaux et Gouvernance', it: 'Verbali e Governance', de: 'Protokolle und Governance' },
  { en: 'Profile', pt: 'Perfil', es: 'Perfil', fr: 'Profil', it: 'Profilo', de: 'Profil' },
  { en: 'My Data', pt: 'Os Meus Dados', es: 'Mis Datos', fr: 'Mes Données', it: 'I Miei Dati', de: 'Meine Daten' },
  { en: 'Plan', pt: 'Plano', es: 'Plan', fr: 'Plan', it: 'Piano', de: 'Plan' },
  { en: 'Employees', pt: 'Funcionários', es: 'Empleados', fr: 'Employés', it: 'Dipendenti', de: 'Mitarbeiter' },
  { en: 'Notifications', pt: 'Notificações', es: 'Notificaciones', fr: 'Notifications', it: 'Notifiche', de: 'Benachrichtigungen' },
  { en: 'News', pt: 'Notícias', es: 'Noticias', fr: 'Actualités', it: 'Notizie', de: 'News' },
  { en: 'Open menu', pt: 'Abrir menu', es: 'Abrir menú', fr: 'Ouvrir le menu', it: 'Apri menu', de: 'Menü öffnen' },
  { en: 'Log out', pt: 'Sair', es: 'Salir', fr: 'Déconnexion', it: 'Esci', de: 'Abmelden' },

  // Auth
  { en: 'Secure access', pt: 'Acesso seguro', es: 'Acceso seguro', fr: 'Accès sécurisé', it: 'Accesso sicuro', de: 'Sicherer Zugang' },
  { en: 'Sign in to EuroComply', pt: 'Entrar no EuroComply', es: 'Entrar en EuroComply', fr: 'Connexion à EuroComply', it: 'Accedi a EuroComply', de: 'Bei EuroComply anmelden' },
  { en: 'Access your compliance workspace with Google or email.', pt: 'Aceda ao seu workspace de compliance com Google ou email.', es: 'Accede a tu workspace de compliance con Google o email.', fr: 'Accédez à votre espace compliance avec Google ou email.', it: 'Accedi al workspace compliance con Google o email.', de: 'Melden Sie sich mit Google oder E-Mail an.' },
  { en: 'Continue with Google', pt: 'Continuar com Google', es: 'Continuar con Google', fr: 'Continuer avec Google', it: 'Continua con Google', de: 'Mit Google fortfahren' },
  { en: 'Email', pt: 'Email', es: 'Email', fr: 'Email', it: 'Email', de: 'E-Mail' },
  { en: 'Password', pt: 'Palavra-passe', es: 'Contraseña', fr: 'Mot de passe', it: 'Password', de: 'Passwort' },
  { en: 'Sign in with email', pt: 'Entrar com email', es: 'Entrar con email', fr: 'Connexion par email', it: 'Accedi con email', de: 'Mit E-Mail anmelden' },
  { en: 'Create an account', pt: 'Criar conta', es: 'Crear cuenta', fr: 'Créer un compte', it: 'Crea account', de: 'Konto erstellen' },
  { en: 'Could not complete sign-in', pt: 'Não foi possível concluir o login', es: 'No se pudo completar el inicio de sesión', fr: 'Impossible de terminer la connexion', it: 'Impossibile completare l’accesso', de: 'Anmeldung konnte nicht abgeschlossen werden' },

  // Generic actions and statuses
  { en: 'Loading...', pt: 'A carregar...', es: 'Cargando...', fr: 'Chargement...', it: 'Caricamento...', de: 'Wird geladen...' },
  { en: 'Save', pt: 'Guardar', es: 'Guardar', fr: 'Enregistrer', it: 'Salva', de: 'Speichern' },
  { en: 'Cancel', pt: 'Cancelar', es: 'Cancelar', fr: 'Annuler', it: 'Annulla', de: 'Abbrechen' },
  { en: 'Create', pt: 'Criar', es: 'Crear', fr: 'Créer', it: 'Crea', de: 'Erstellen' },
  { en: 'Update', pt: 'Atualizar', es: 'Actualizar', fr: 'Mettre à jour', it: 'Aggiorna', de: 'Aktualisieren' },
  { en: 'Delete', pt: 'Eliminar', es: 'Eliminar', fr: 'Supprimer', it: 'Elimina', de: 'Löschen' },
  { en: 'Send', pt: 'Enviar', es: 'Enviar', fr: 'Envoyer', it: 'Invia', de: 'Senden' },
  { en: 'Export CSV', pt: 'Exportar CSV', es: 'Exportar CSV', fr: 'Exporter CSV', it: 'Esporta CSV', de: 'CSV exportieren' },
  { en: 'View plans', pt: 'Ver planos', es: 'Ver planes', fr: 'Voir les offres', it: 'Vedi piani', de: 'Pläne ansehen' },
  { en: 'Manage subscription', pt: 'Gerir assinatura', es: 'Gestionar suscripción', fr: 'Gérer l’abonnement', it: 'Gestisci abbonamento', de: 'Abonnement verwalten' },
  { en: 'Professional plan or higher required', pt: 'Plano Professional ou superior necessário', es: 'Se requiere plan Professional o superior', fr: 'Plan Professional ou supérieur requis', it: 'Piano Professional o superiore richiesto', de: 'Professional-Plan oder höher erforderlich' },

  // Tables and form labels
  { en: 'Name', pt: 'Nome', es: 'Nombre', fr: 'Nom', it: 'Nome', de: 'Name' },
  { en: 'Status', pt: 'Estado', es: 'Estado', fr: 'Statut', it: 'Stato', de: 'Status' },
  { en: 'Risk', pt: 'Risco', es: 'Riesgo', fr: 'Risque', it: 'Rischio', de: 'Risiko' },
  { en: 'Risk Level', pt: 'Nível de Risco', es: 'Nivel de riesgo', fr: 'Niveau de risque', it: 'Livello di rischio', de: 'Risikostufe' },
  { en: 'Department', pt: 'Departamento', es: 'Departamento', fr: 'Département', it: 'Dipartimento', de: 'Abteilung' },
  { en: 'Vendor', pt: 'Fornecedor', es: 'Proveedor', fr: 'Fournisseur', it: 'Fornitore', de: 'Anbieter' },
  { en: 'Date', pt: 'Data', es: 'Fecha', fr: 'Date', it: 'Data', de: 'Datum' },
  { en: 'Action', pt: 'Ação', es: 'Acción', fr: 'Action', it: 'Azione', de: 'Aktion' },
  { en: 'User', pt: 'Utilizador', es: 'Usuario', fr: 'Utilisateur', it: 'Utente', de: 'Benutzer' },
  { en: 'System', pt: 'Sistema', es: 'Sistema', fr: 'Système', it: 'Sistema', de: 'System' },
  { en: 'Version', pt: 'Versão', es: 'Versión', fr: 'Version', it: 'Versione', de: 'Version' },
  { en: 'Category', pt: 'Categoria', es: 'Categoría', fr: 'Catégorie', it: 'Categoria', de: 'Kategorie' },
  { en: 'Country', pt: 'País', es: 'País', fr: 'Pays', it: 'Paese', de: 'Land' },
  { en: 'Owner', pt: 'Responsável', es: 'Responsable', fr: 'Responsable', it: 'Responsabile', de: 'Verantwortliche Person' },

  // Status values
  { en: 'In review', pt: 'Em revisão', es: 'En revisión', fr: 'En révision', it: 'In revisione', de: 'In Prüfung' },
  { en: 'Compliant', pt: 'Conforme', es: 'Conforme', fr: 'Conforme', it: 'Conforme', de: 'Konform' },
  { en: 'Non-compliant', pt: 'Não conforme', es: 'No conforme', fr: 'Non conforme', it: 'Non conforme', de: 'Nicht konform' },
  { en: 'Mitigated', pt: 'Mitigado', es: 'Mitigado', fr: 'Atténué', it: 'Mitigato', de: 'Abgemildert' },
  { en: 'Low', pt: 'Baixo', es: 'Bajo', fr: 'Faible', it: 'Basso', de: 'Niedrig' },
  { en: 'Medium', pt: 'Médio', es: 'Medio', fr: 'Moyen', it: 'Medio', de: 'Mittel' },
  { en: 'High', pt: 'Alto', es: 'Alto', fr: 'Élevé', it: 'Alto', de: 'Hoch' },
  { en: 'Critical', pt: 'Crítico', es: 'Crítico', fr: 'Critique', it: 'Critico', de: 'Kritisch' },
  { en: 'High Risk', pt: 'Alto Risco', es: 'Alto riesgo', fr: 'Risque élevé', it: 'Alto rischio', de: 'Hohes Risiko' },
  { en: 'Limited Risk', pt: 'Risco Limitado', es: 'Riesgo limitado', fr: 'Risque limité', it: 'Rischio limitato', de: 'Begrenztes Risiko' },
  { en: 'Minimal Risk', pt: 'Risco Mínimo', es: 'Riesgo mínimo', fr: 'Risque minimal', it: 'Rischio minimo', de: 'Minimales Risiko' },
  { en: 'Unacceptable', pt: 'Inaceitável', es: 'Inaceptable', fr: 'Inacceptable', it: 'Inaccettabile', de: 'Unzulässig' },

  // Documents, risks, vendors and governance
  { en: 'New Case', pt: 'Novo Caso', es: 'Nuevo caso', fr: 'Nouveau cas', it: 'Nuovo caso', de: 'Neuer Fall' },
  { en: 'Create first case', pt: 'Criar primeiro caso', es: 'Crear primer caso', fr: 'Créer le premier cas', it: 'Crea il primo caso', de: 'Ersten Fall erstellen' },
  { en: 'Search by name or vendor...', pt: 'Pesquisar por nome ou fornecedor...', es: 'Buscar por nombre o proveedor...', fr: 'Rechercher par nom ou fournisseur...', it: 'Cerca per nome o fornitore...', de: 'Nach Name oder Anbieter suchen...' },
  { en: 'Risk: All', pt: 'Risco: Todos', es: 'Riesgo: Todos', fr: 'Risque : Tous', it: 'Rischio: Tutti', de: 'Risiko: Alle' },
  { en: 'Dept: All', pt: 'Dept: Todos', es: 'Depto: Todos', fr: 'Dépt. : Tous', it: 'Dip.: Tutti', de: 'Abt.: Alle' },
  { en: 'Status: All', pt: 'Estado: Todos', es: 'Estado: Todos', fr: 'Statut : Tous', it: 'Stato: Tutti', de: 'Status: Alle' },
  { en: 'No system matches the filters.', pt: 'Nenhum sistema corresponde aos filtros.', es: 'Ningún sistema coincide con los filtros.', fr: 'Aucun système ne correspond aux filtres.', it: 'Nessun sistema corrisponde ai filtri.', de: 'Kein System entspricht den Filtern.' },
  { en: 'No AI system registered.', pt: 'Nenhum sistema de IA registado.', es: 'No hay ningún sistema de IA registrado.', fr: 'Aucun système d’IA enregistré.', it: 'Nessun sistema IA registrato.', de: 'Kein KI-System registriert.' },
  { en: 'Upload document', pt: 'Carregar documento', es: 'Subir documento', fr: 'Importer un document', it: 'Carica documento', de: 'Dokument hochladen' },
  { en: 'Document title', pt: 'Título do documento', es: 'Título del documento', fr: 'Titre du document', it: 'Titolo documento', de: 'Dokumenttitel' },
  { en: 'Expiration date', pt: 'Data de expiração', es: 'Fecha de vencimiento', fr: 'Date d’expiration', it: 'Data di scadenza', de: 'Ablaufdatum' },
  { en: 'No documents yet', pt: 'Ainda não há documentos', es: 'Aún no hay documentos', fr: 'Aucun document pour le moment', it: 'Ancora nessun documento', de: 'Noch keine Dokumente' },
  { en: 'Vendors', pt: 'Fornecedores', es: 'Proveedores', fr: 'Fournisseurs', it: 'Fornitori', de: 'Anbieter' },
  { en: 'Add vendor', pt: 'Adicionar fornecedor', es: 'Añadir proveedor', fr: 'Ajouter un fournisseur', it: 'Aggiungi fornitore', de: 'Anbieter hinzufügen' },
  { en: 'DPA signed', pt: 'DPA assinado', es: 'DPA firmado', fr: 'DPA signé', it: 'DPA firmato', de: 'DPA unterzeichnet' },
  { en: 'Approval workflow', pt: 'Workflow de aprovação', es: 'Workflow de aprobación', fr: 'Workflow d’approbation', it: 'Workflow di approvazione', de: 'Freigabe-Workflow' },
  { en: 'Responsible', pt: 'Responsável', es: 'Responsable', fr: 'Responsable', it: 'Responsabile', de: 'Verantwortlich' },
  { en: 'Accountable', pt: 'Aprovador', es: 'Aprobador', fr: 'Approbateur', it: 'Approvatore', de: 'Freigebend' },
  { en: 'Consulted', pt: 'Consultado', es: 'Consultado', fr: 'Consulté', it: 'Consultato', de: 'Konsultiert' },
  { en: 'Informed', pt: 'Informado', es: 'Informado', fr: 'Informé', it: 'Informato', de: 'Informiert' },

  // Billing and account
  { en: 'Essential', pt: 'Essential', es: 'Essential', fr: 'Essential', it: 'Essential', de: 'Essential' },
  { en: 'Professional', pt: 'Professional', es: 'Professional', fr: 'Professional', it: 'Professional', de: 'Professional' },
  { en: 'Business', pt: 'Business', es: 'Business', fr: 'Business', it: 'Business', de: 'Business' },
  { en: 'Enterprise', pt: 'Enterprise', es: 'Enterprise', fr: 'Enterprise', it: 'Enterprise', de: 'Enterprise' },
  { en: 'Current plan', pt: 'Plano atual', es: 'Plan actual', fr: 'Plan actuel', it: 'Piano attuale', de: 'Aktueller Plan' },
  { en: 'Upgrade', pt: 'Upgrade', es: 'Upgrade', fr: 'Mise à niveau', it: 'Upgrade', de: 'Upgrade' },
  { en: 'Company data', pt: 'Dados da empresa', es: 'Datos de empresa', fr: 'Données d’entreprise', it: 'Dati aziendali', de: 'Unternehmensdaten' },
  { en: 'Tax operations', pt: 'Operações fiscais', es: 'Operaciones fiscales', fr: 'Opérations fiscales', it: 'Operazioni fiscali', de: 'Steueroperationen' },
  { en: 'Export my data', pt: 'Exportar os meus dados', es: 'Exportar mis datos', fr: 'Exporter mes données', it: 'Esporta i miei dati', de: 'Meine Daten exportieren' },
  { en: 'Delete request', pt: 'Pedido de eliminação', es: 'Solicitud de eliminación', fr: 'Demande de suppression', it: 'Richiesta di eliminazione', de: 'Löschanfrage' },
];

function buildTranslationMap(locale: Locale): TranslationMap {
  const map: TranslationMap = {};

  for (const row of rows) {
    const target = row[locale];
    for (const source of Object.values(row)) {
      if (source && source !== target) map[source] = target;
    }
  }

  return map;
}

function translateText(root: ParentNode, map: TranslationMap) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const value = node.nodeValue?.trim();
    if (value && map[value]) nodes.push(node);
  }

  for (const node of nodes) {
    const original = node.nodeValue || '';
    const trimmed = original.trim();
    node.nodeValue = original.replace(trimmed, map[trimmed]);
  }
}

function translateAttributes(root: ParentNode, map: TranslationMap) {
  if (!(root instanceof Document || root instanceof Element)) return;
  const elements = root.querySelectorAll('[placeholder], [aria-label], [title], [alt]');
  elements.forEach((element) => {
    for (const attr of ['placeholder', 'aria-label', 'title', 'alt']) {
      const current = element.getAttribute(attr);
      if (current && map[current]) element.setAttribute(attr, map[current]);
    }
  });
}

export default function GlobalRuntimeTranslator() {
  const pathname = usePathname();
  const params = useParams();
  const rawLocale = params.locale as string | undefined;
  const locale = locales.includes(rawLocale as Locale) ? (rawLocale as Locale) : 'en';

  useEffect(() => {
    const map = buildTranslationMap(locale);
    if (Object.keys(map).length === 0) return;

    let raf = 0;
    const apply = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        translateText(document.body, map);
        translateAttributes(document.body, map);
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'] });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [locale, pathname]);

  return null;
}
