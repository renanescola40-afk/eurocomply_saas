import { locales, type Locale } from '@/lib/i18n/routing';

export type CoreWorkflowCopy = {
  tasks: {
    eyebrow: string;
    title: string;
    subtitle: string;
    formTitle: string;
    formSubtitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    categoryLabel: string;
    priorityLabel: string;
    dueDateLabel: string;
    priorities: Record<'low' | 'medium' | 'high' | 'critical', string>;
    create: string;
    creating: string;
    createError: string;
    listTitle: string;
    empty: string;
    due: string;
    noDueDate: string;
    invalidDueDate: string;
    markDone: string;
    delete: string;
    deleting: string;
    deleteConfirm: (label: string) => string;
    deleteError: string;
  };
  documents: {
    eyebrow: string;
    title: string;
    subtitle: (organizationName: string) => string;
    uploadTitle: string;
    uploadSubtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    fileLabel: string;
    fileHelp: string;
    expiresLabel: string;
    selectFileError: string;
    uploadError: string;
    upload: string;
    uploading: string;
    registerTitle: string;
    records: (count: number) => string;
    emptyTitle: string;
    emptyBody: string;
    status: Record<'approved' | 'review' | 'rejected' | 'pending', string>;
    version: string;
    download: string;
    preparing: string;
    downloadError: string;
    delete: string;
    deleting: string;
    deleteConfirm: (label: string) => string;
    deleteError: string;
  };
};

const COPY: Record<Locale, CoreWorkflowCopy> = {
  en: {
    tasks: {
      eyebrow: 'Compliance operations', title: 'Compliance tasks', subtitle: 'Track requirements, owners, priorities and deadlines for your compliance program.',
      formTitle: 'Add compliance requirement', formSubtitle: 'Create a trackable task for your compliance program.', titleLabel: 'Title', titlePlaceholder: 'Review privacy policy', descriptionLabel: 'Description', descriptionPlaceholder: 'What needs to be done?', categoryLabel: 'Category', priorityLabel: 'Priority', dueDateLabel: 'Due date', priorities: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }, create: 'Create task', creating: 'Creating...', createError: 'Could not create task.', listTitle: 'Compliance tasks', empty: 'No compliance tasks yet. Add the first requirement to start tracking work.', due: 'Due', noDueDate: 'No due date', invalidDueDate: 'Invalid due date', markDone: 'Mark done', delete: 'Delete', deleting: 'Deleting...', deleteConfirm: (label) => `Delete task “${label}”? This action cannot be undone.`, deleteError: 'Could not delete task.',
    },
    documents: {
      eyebrow: 'Documents', title: 'Compliance documents', subtitle: (name) => `Track policies, DPIAs, vendor agreements and audit evidence files for ${name}.`, uploadTitle: 'Upload compliance document', uploadSubtitle: 'Store evidence in the private organization-scoped document workspace.', nameLabel: 'Name', namePlaceholder: 'Privacy Policy', categoryLabel: 'Category', categoryPlaceholder: 'DPIA', fileLabel: 'File', fileHelp: 'PDF, PNG, JPG, DOCX or XLSX. Max 10MB.', expiresLabel: 'Expiration date', selectFileError: 'Select a document file to upload.', uploadError: 'Unable to upload document.', upload: 'Upload document', uploading: 'Uploading...', registerTitle: 'Document register', records: (count) => `${count} document record${count === 1 ? '' : 's'}`, emptyTitle: 'Add the first document to activate this workspace.', emptyBody: 'Upload one useful file so the dashboard can show real evidence progress.', status: { approved: 'Approved', review: 'In review', rejected: 'Rejected', pending: 'Pending' }, version: 'Version', download: 'Download', preparing: 'Preparing...', downloadError: 'Unable to download document.', delete: 'Delete', deleting: 'Deleting...', deleteConfirm: (label) => `Delete “${label}”? This removes the document record and its stored file.`, deleteError: 'Could not delete document.',
    },
  },
  pt: {
    tasks: {
      eyebrow: 'Operações de compliance', title: 'Tarefas de compliance', subtitle: 'Acompanhe requisitos, responsáveis, prioridades e prazos do seu programa de compliance.', formTitle: 'Adicionar requisito de compliance', formSubtitle: 'Crie uma tarefa rastreável para o seu programa de compliance.', titleLabel: 'Título', titlePlaceholder: 'Rever política de privacidade', descriptionLabel: 'Descrição', descriptionPlaceholder: 'O que precisa de ser feito?', categoryLabel: 'Categoria', priorityLabel: 'Prioridade', dueDateLabel: 'Prazo', priorities: { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' }, create: 'Criar tarefa', creating: 'A criar...', createError: 'Não foi possível criar a tarefa.', listTitle: 'Tarefas de compliance', empty: 'Ainda não existem tarefas de compliance. Adicione o primeiro requisito para começar a acompanhar o trabalho.', due: 'Prazo', noDueDate: 'Sem prazo', invalidDueDate: 'Prazo inválido', markDone: 'Marcar concluída', delete: 'Eliminar', deleting: 'A eliminar...', deleteConfirm: (label) => `Eliminar a tarefa “${label}”? Esta ação não pode ser anulada.`, deleteError: 'Não foi possível eliminar a tarefa.',
    },
    documents: {
      eyebrow: 'Documentos', title: 'Documentos de compliance', subtitle: (name) => `Acompanhe políticas, DPIAs, acordos com fornecedores e evidências de auditoria de ${name}.`, uploadTitle: 'Carregar documento de compliance', uploadSubtitle: 'Guarde evidências no workspace privado da organização.', nameLabel: 'Nome', namePlaceholder: 'Política de Privacidade', categoryLabel: 'Categoria', categoryPlaceholder: 'DPIA', fileLabel: 'Ficheiro', fileHelp: 'PDF, PNG, JPG, DOCX ou XLSX. Máx. 10MB.', expiresLabel: 'Data de validade', selectFileError: 'Selecione um ficheiro para carregar.', uploadError: 'Não foi possível carregar o documento.', upload: 'Carregar documento', uploading: 'A carregar...', registerTitle: 'Registo de documentos', records: (count) => `${count} ${count === 1 ? 'documento' : 'documentos'}`, emptyTitle: 'Adicione o primeiro documento para ativar este workspace.', emptyBody: 'Carregue um ficheiro útil para que o dashboard mostre progresso real de evidências.', status: { approved: 'Aprovado', review: 'Em revisão', rejected: 'Rejeitado', pending: 'Pendente' }, version: 'Versão', download: 'Descarregar', preparing: 'A preparar...', downloadError: 'Não foi possível descarregar o documento.', delete: 'Eliminar', deleting: 'A eliminar...', deleteConfirm: (label) => `Eliminar “${label}”? O registo e o ficheiro armazenado serão removidos.`, deleteError: 'Não foi possível eliminar o documento.',
    },
  },
  es: {
    tasks: {
      eyebrow: 'Operaciones de compliance', title: 'Tareas de compliance', subtitle: 'Controla requisitos, responsables, prioridades y plazos de tu programa de compliance.', formTitle: 'Añadir requisito de compliance', formSubtitle: 'Crea una tarea trazable para tu programa de compliance.', titleLabel: 'Título', titlePlaceholder: 'Revisar política de privacidad', descriptionLabel: 'Descripción', descriptionPlaceholder: '¿Qué hay que hacer?', categoryLabel: 'Categoría', priorityLabel: 'Prioridad', dueDateLabel: 'Fecha límite', priorities: { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }, create: 'Crear tarea', creating: 'Creando...', createError: 'No se pudo crear la tarea.', listTitle: 'Tareas de compliance', empty: 'Todavía no hay tareas de compliance. Añade el primer requisito para empezar a controlar el trabajo.', due: 'Vence', noDueDate: 'Sin fecha límite', invalidDueDate: 'Fecha inválida', markDone: 'Marcar completada', delete: 'Eliminar', deleting: 'Eliminando...', deleteConfirm: (label) => `¿Eliminar la tarea “${label}”? Esta acción no se puede deshacer.`, deleteError: 'No se pudo eliminar la tarea.',
    },
    documents: {
      eyebrow: 'Documentos', title: 'Documentos de compliance', subtitle: (name) => `Controla políticas, DPIAs, acuerdos con proveedores y evidencias de auditoría de ${name}.`, uploadTitle: 'Subir documento de compliance', uploadSubtitle: 'Guarda evidencias en el workspace privado de la organización.', nameLabel: 'Nombre', namePlaceholder: 'Política de Privacidad', categoryLabel: 'Categoría', categoryPlaceholder: 'DPIA', fileLabel: 'Archivo', fileHelp: 'PDF, PNG, JPG, DOCX o XLSX. Máx. 10MB.', expiresLabel: 'Fecha de caducidad', selectFileError: 'Selecciona un archivo para subir.', uploadError: 'No se pudo subir el documento.', upload: 'Subir documento', uploading: 'Subiendo...', registerTitle: 'Registro de documentos', records: (count) => `${count} ${count === 1 ? 'documento' : 'documentos'}`, emptyTitle: 'Añade el primer documento para activar este workspace.', emptyBody: 'Sube un archivo útil para que el dashboard muestre progreso real de evidencias.', status: { approved: 'Aprobado', review: 'En revisión', rejected: 'Rechazado', pending: 'Pendiente' }, version: 'Versión', download: 'Descargar', preparing: 'Preparando...', downloadError: 'No se pudo descargar el documento.', delete: 'Eliminar', deleting: 'Eliminando...', deleteConfirm: (label) => `¿Eliminar “${label}”? Se eliminarán el registro y el archivo almacenado.`, deleteError: 'No se pudo eliminar el documento.',
    },
  },
  fr: {
    tasks: {
      eyebrow: 'Opérations de conformité', title: 'Tâches de conformité', subtitle: 'Suivez les exigences, responsables, priorités et échéances de votre programme de conformité.', formTitle: 'Ajouter une exigence de conformité', formSubtitle: 'Créez une tâche traçable pour votre programme de conformité.', titleLabel: 'Titre', titlePlaceholder: 'Réviser la politique de confidentialité', descriptionLabel: 'Description', descriptionPlaceholder: 'Que faut-il faire ?', categoryLabel: 'Catégorie', priorityLabel: 'Priorité', dueDateLabel: 'Échéance', priorities: { low: 'Faible', medium: 'Moyenne', high: 'Haute', critical: 'Critique' }, create: 'Créer la tâche', creating: 'Création...', createError: 'Impossible de créer la tâche.', listTitle: 'Tâches de conformité', empty: 'Aucune tâche de conformité pour le moment. Ajoutez la première exigence pour commencer le suivi.', due: 'Échéance', noDueDate: 'Sans échéance', invalidDueDate: 'Échéance invalide', markDone: 'Marquer terminée', delete: 'Supprimer', deleting: 'Suppression...', deleteConfirm: (label) => `Supprimer la tâche « ${label} » ? Cette action est irréversible.`, deleteError: 'Impossible de supprimer la tâche.',
    },
    documents: {
      eyebrow: 'Documents', title: 'Documents de conformité', subtitle: (name) => `Suivez les politiques, DPIA, accords fournisseurs et preuves d’audit de ${name}.`, uploadTitle: 'Téléverser un document de conformité', uploadSubtitle: 'Conservez les preuves dans l’espace documentaire privé de l’organisation.', nameLabel: 'Nom', namePlaceholder: 'Politique de confidentialité', categoryLabel: 'Catégorie', categoryPlaceholder: 'DPIA', fileLabel: 'Fichier', fileHelp: 'PDF, PNG, JPG, DOCX ou XLSX. 10 Mo max.', expiresLabel: 'Date d’expiration', selectFileError: 'Sélectionnez un fichier à téléverser.', uploadError: 'Impossible de téléverser le document.', upload: 'Téléverser le document', uploading: 'Téléversement...', registerTitle: 'Registre des documents', records: (count) => `${count} ${count === 1 ? 'document' : 'documents'}`, emptyTitle: 'Ajoutez le premier document pour activer cet espace.', emptyBody: 'Téléversez un fichier utile afin que le dashboard affiche une progression réelle des preuves.', status: { approved: 'Approuvé', review: 'En révision', rejected: 'Rejeté', pending: 'En attente' }, version: 'Version', download: 'Télécharger', preparing: 'Préparation...', downloadError: 'Impossible de télécharger le document.', delete: 'Supprimer', deleting: 'Suppression...', deleteConfirm: (label) => `Supprimer « ${label} » ? L’enregistrement et le fichier stocké seront supprimés.`, deleteError: 'Impossible de supprimer le document.',
    },
  },
  it: {
    tasks: {
      eyebrow: 'Operazioni di compliance', title: 'Attività di compliance', subtitle: 'Monitora requisiti, responsabili, priorità e scadenze del programma di compliance.', formTitle: 'Aggiungi requisito di compliance', formSubtitle: 'Crea un’attività tracciabile per il programma di compliance.', titleLabel: 'Titolo', titlePlaceholder: 'Rivedi la privacy policy', descriptionLabel: 'Descrizione', descriptionPlaceholder: 'Cosa deve essere fatto?', categoryLabel: 'Categoria', priorityLabel: 'Priorità', dueDateLabel: 'Scadenza', priorities: { low: 'Bassa', medium: 'Media', high: 'Alta', critical: 'Critica' }, create: 'Crea attività', creating: 'Creazione...', createError: 'Impossibile creare l’attività.', listTitle: 'Attività di compliance', empty: 'Non ci sono ancora attività di compliance. Aggiungi il primo requisito per iniziare il monitoraggio.', due: 'Scadenza', noDueDate: 'Nessuna scadenza', invalidDueDate: 'Scadenza non valida', markDone: 'Segna completata', delete: 'Elimina', deleting: 'Eliminazione...', deleteConfirm: (label) => `Eliminare l’attività “${label}”? Questa azione non può essere annullata.`, deleteError: 'Impossibile eliminare l’attività.',
    },
    documents: {
      eyebrow: 'Documenti', title: 'Documenti di compliance', subtitle: (name) => `Monitora policy, DPIA, accordi con fornitori e prove di audit di ${name}.`, uploadTitle: 'Carica documento di compliance', uploadSubtitle: 'Conserva le prove nel workspace documentale privato dell’organizzazione.', nameLabel: 'Nome', namePlaceholder: 'Privacy Policy', categoryLabel: 'Categoria', categoryPlaceholder: 'DPIA', fileLabel: 'File', fileHelp: 'PDF, PNG, JPG, DOCX o XLSX. Max 10MB.', expiresLabel: 'Data di scadenza', selectFileError: 'Seleziona un file da caricare.', uploadError: 'Impossibile caricare il documento.', upload: 'Carica documento', uploading: 'Caricamento...', registerTitle: 'Registro documenti', records: (count) => `${count} ${count === 1 ? 'documento' : 'documenti'}`, emptyTitle: 'Aggiungi il primo documento per attivare questo workspace.', emptyBody: 'Carica un file utile affinché il dashboard mostri progressi reali delle prove.', status: { approved: 'Approvato', review: 'In revisione', rejected: 'Rifiutato', pending: 'In attesa' }, version: 'Versione', download: 'Scarica', preparing: 'Preparazione...', downloadError: 'Impossibile scaricare il documento.', delete: 'Elimina', deleting: 'Eliminazione...', deleteConfirm: (label) => `Eliminare “${label}”? Il record e il file archiviato saranno rimossi.`, deleteError: 'Impossibile eliminare il documento.',
    },
  },
  de: {
    tasks: {
      eyebrow: 'Compliance-Betrieb', title: 'Compliance-Aufgaben', subtitle: 'Verfolgen Sie Anforderungen, Verantwortliche, Prioritäten und Fristen Ihres Compliance-Programms.', formTitle: 'Compliance-Anforderung hinzufügen', formSubtitle: 'Erstellen Sie eine nachverfolgbare Aufgabe für Ihr Compliance-Programm.', titleLabel: 'Titel', titlePlaceholder: 'Datenschutzrichtlinie prüfen', descriptionLabel: 'Beschreibung', descriptionPlaceholder: 'Was muss erledigt werden?', categoryLabel: 'Kategorie', priorityLabel: 'Priorität', dueDateLabel: 'Fälligkeitsdatum', priorities: { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' }, create: 'Aufgabe erstellen', creating: 'Wird erstellt...', createError: 'Aufgabe konnte nicht erstellt werden.', listTitle: 'Compliance-Aufgaben', empty: 'Noch keine Compliance-Aufgaben. Fügen Sie die erste Anforderung hinzu, um die Arbeit zu verfolgen.', due: 'Fällig', noDueDate: 'Kein Fälligkeitsdatum', invalidDueDate: 'Ungültiges Fälligkeitsdatum', markDone: 'Als erledigt markieren', delete: 'Löschen', deleting: 'Wird gelöscht...', deleteConfirm: (label) => `Aufgabe „${label}“ löschen? Diese Aktion kann nicht rückgängig gemacht werden.`, deleteError: 'Aufgabe konnte nicht gelöscht werden.',
    },
    documents: {
      eyebrow: 'Dokumente', title: 'Compliance-Dokumente', subtitle: (name) => `Verfolgen Sie Richtlinien, DPIAs, Lieferantenvereinbarungen und Audit-Nachweise für ${name}.`, uploadTitle: 'Compliance-Dokument hochladen', uploadSubtitle: 'Speichern Sie Nachweise im privaten Dokumentenbereich der Organisation.', nameLabel: 'Name', namePlaceholder: 'Datenschutzrichtlinie', categoryLabel: 'Kategorie', categoryPlaceholder: 'DPIA', fileLabel: 'Datei', fileHelp: 'PDF, PNG, JPG, DOCX oder XLSX. Max. 10 MB.', expiresLabel: 'Ablaufdatum', selectFileError: 'Wählen Sie eine Datei zum Hochladen aus.', uploadError: 'Dokument konnte nicht hochgeladen werden.', upload: 'Dokument hochladen', uploading: 'Wird hochgeladen...', registerTitle: 'Dokumentenregister', records: (count) => `${count} ${count === 1 ? 'Dokument' : 'Dokumente'}`, emptyTitle: 'Fügen Sie das erste Dokument hinzu, um diesen Workspace zu aktivieren.', emptyBody: 'Laden Sie eine nützliche Datei hoch, damit das Dashboard echten Nachweisfortschritt zeigt.', status: { approved: 'Genehmigt', review: 'In Prüfung', rejected: 'Abgelehnt', pending: 'Ausstehend' }, version: 'Version', download: 'Herunterladen', preparing: 'Wird vorbereitet...', downloadError: 'Dokument konnte nicht heruntergeladen werden.', delete: 'Löschen', deleting: 'Wird gelöscht...', deleteConfirm: (label) => `„${label}“ löschen? Datensatz und gespeicherte Datei werden entfernt.`, deleteError: 'Dokument konnte nicht gelöscht werden.',
    },
  },
};

export function getCoreWorkflowCopy(locale: string): CoreWorkflowCopy {
  const safeLocale = locales.includes(locale as Locale) ? (locale as Locale) : 'en';
  return COPY[safeLocale];
}
