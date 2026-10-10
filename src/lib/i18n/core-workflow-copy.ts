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

const ENGLISH_COPY: CoreWorkflowCopy = {
    tasks: {
      eyebrow: 'Compliance operations', title: 'Compliance tasks', subtitle: 'Track requirements, owners, priorities and deadlines for your compliance program.',
      formTitle: 'Add compliance requirement', formSubtitle: 'Create a trackable task for your compliance program.', titleLabel: 'Title', titlePlaceholder: 'Review privacy policy', descriptionLabel: 'Description', descriptionPlaceholder: 'What needs to be done?', categoryLabel: 'Category', priorityLabel: 'Priority', dueDateLabel: 'Due date', priorities: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }, create: 'Create task', creating: 'Creating...', createError: 'Could not create task.', listTitle: 'Compliance tasks', empty: 'No compliance tasks yet. Add the first requirement to start tracking work.', due: 'Due', noDueDate: 'No due date', invalidDueDate: 'Invalid due date', markDone: 'Mark done', delete: 'Delete', deleting: 'Deleting...', deleteConfirm: (label) => `Delete task “${label}”? This action cannot be undone.`, deleteError: 'Could not delete task.',
    },
    documents: {
      eyebrow: 'Documents', title: 'Compliance documents', subtitle: (name) => `Track policies, DPIAs, vendor agreements and audit evidence files for ${name}.`, uploadTitle: 'Upload compliance document', uploadSubtitle: 'Store evidence in the private organization-scoped document workspace.', nameLabel: 'Name', namePlaceholder: 'Privacy Policy', categoryLabel: 'Category', categoryPlaceholder: 'DPIA', fileLabel: 'File', fileHelp: 'PDF, PNG, JPG, DOCX or XLSX. Max 10MB.', expiresLabel: 'Expiration date', selectFileError: 'Select a document file to upload.', uploadError: 'Unable to upload document.', upload: 'Upload document', uploading: 'Uploading...', registerTitle: 'Document register', records: (count) => `${count} document record${count === 1 ? '' : 's'}`, emptyTitle: 'Add the first document to activate this workspace.', emptyBody: 'Upload one useful file so the dashboard can show real evidence progress.', status: { approved: 'Approved', review: 'In review', rejected: 'Rejected', pending: 'Pending' }, version: 'Version', download: 'Download', preparing: 'Preparing...', downloadError: 'Unable to download document.', delete: 'Delete', deleting: 'Deleting...', deleteConfirm: (label) => `Delete “${label}”? This removes the document record and its stored file.`, deleteError: 'Could not delete document.',
    },
  };

export function getCoreWorkflowCopy(_locale: string): CoreWorkflowCopy {
  return ENGLISH_COPY;
}
