import { DOCUMENT_BUCKET, buildDocumentStoragePath } from '@/lib/documents/upload';
import { getComplianceTemplate } from '@/lib/compliance/templates';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { createDocument } from '@/server/actions/documents';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';

type TemplateDocumentInput = {
  organizationId: string;
  templateId: string;
  title?: string;
  category?: string;
  owner?: string;
  expiresAt?: string | null;
};

function actionError(message: string) {
  return new Error(message);
}

function safeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export async function createDocumentFromTemplate(input: TemplateDocumentInput) {
  const user = await requireCurrentUser();
  const template = getComplianceTemplate(input.templateId);
  const context = { area: 'template_document', organizationId: input.organizationId, userId: user.id, templateId: input.templateId };

  if (!template) {
    const error = actionError('Compliance template not found');
    reportError(error, context);
    throw error;
  }

  await assertCurrentUserCan(input.organizationId, user.id, 'documents:write');

  const title = safeText(input.title) ?? template.title;
  const category = safeText(input.category) ?? template.category;
  const content = [`# ${title}`, template.description, ...template.sections.map((section) => `## ${section}`)].join('\n\n');
  const storagePath = buildDocumentStoragePath({
    organizationId: input.organizationId,
    userId: user.id,
    fileName: `${safeFileName(title || template.id)}.md`,
  });

  const { error: uploadError } = await createAdminClient().storage.from(DOCUMENT_BUCKET).upload(storagePath, content, {
    contentType: 'text/markdown',
    upsert: false,
  });

  if (uploadError) {
    reportError(uploadError, context);
    throw actionError('Unable to create template document.');
  }

  return createDocument({
    organizationId: input.organizationId,
    name: title,
    category,
    storagePath,
    mimeType: 'text/markdown',
    sizeBytes: Buffer.byteLength(content, 'utf8'),
    expiresAt: input.expiresAt ?? null,
    metadata: {
      source: 'template',
      serverGenerated: true,
      sourceTemplateId: template.id,
      sourceTemplateTitle: template.title,
      recommendedOwner: template.recommendedOwner,
      selectedOwner: safeText(input.owner) ?? null,
    },
  });
}
