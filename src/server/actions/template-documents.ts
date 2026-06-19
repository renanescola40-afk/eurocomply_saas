import { DOCUMENT_BUCKET, buildDocumentStoragePath } from '@/lib/documents/upload';
import { getComplianceTemplate } from '@/lib/compliance/templates';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { createDocument } from '@/server/actions/documents';
import { assertCurrentUserCan } from '@/server/auth/permissions';

type TemplateDocumentInput = {
  organizationId: string;
  templateId: string;
  title?: string;
  category?: string;
  owner?: string;
  expiresAt?: string | null;
};

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function templateToMarkdown(template: NonNullable<ReturnType<typeof getComplianceTemplate>>, input: TemplateDocumentInput) {
  const title = normalizeOptionalText(input.title) ?? template.title;
  const owner = normalizeOptionalText(input.owner) ?? template.recommendedOwner;
  const generatedAt = new Date().toISOString();

  return [
    `# ${title}`,
    '',
    '> Generated from the EuroComply compliance template library. Review and adapt before approval.',
    '',
    '## Document metadata',
    '',
    `- Source template: ${template.title}`,
    `- Template ID: ${template.id}`,
    `- Category: ${input.category ?? template.category}`,
    `- Recommended owner: ${owner}`,
    `- Generated at: ${generatedAt}`,
    input.expiresAt ? `- Review or expiry date: ${input.expiresAt}` : '- Review or expiry date: To be defined',
    '',
    '## Purpose',
    '',
    template.description,
    '',
    '## Scope',
    '',
    'Define the teams, systems, vendors, data categories and business processes covered by this document.',
    '',
    '## Required sections',
    '',
    ...template.sections.flatMap((section) => [
      `### ${section}`,
      '',
      '- Current status:',
      '- Evidence owner:',
      '- Evidence location:',
      '- Gaps or follow-up actions:',
      '',
    ]),
    '## Approval',
    '',
    '- Owner approval:',
    '- Reviewer:',
    '- Approval date:',
    '- Next review date:',
    '',
    '## Change history',
    '',
    '| Date | Author | Change |',
    '| --- | --- | --- |',
    `| ${generatedAt.slice(0, 10)} | EuroComply | Initial draft generated from template |`,
  ].join('\n');
}

export async function createDocumentFromTemplate(input: TemplateDocumentInput, userId: string) {
  const template = getComplianceTemplate(input.templateId);
  const context = { area: 'template_document', organizationId: input.organizationId, userId, templateId: input.templateId };

  if (!template) {
    const error = new Error('Compliance template not found');
    reportError(error, context);
    throw error;
  }

  await assertCurrentUserCan(input.organizationId, userId, 'documents:write');

  const title = normalizeOptionalText(input.title) ?? template.title;
  const category = normalizeOptionalText(input.category) ?? template.category;
  const supabase = createAdminClient();
  const fileName = `${sanitizeFileName(title || template.id)}.md`;
  const content = templateToMarkdown(template, { ...input, title, category });
  const storagePath = buildDocumentStoragePath({
    organizationId: input.organizationId,
    userId,
    fileName,
  });

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, content, {
    contentType: 'text/markdown',
    upsert: false,
  });

  if (uploadError) {
    reportError(uploadError, context);
    throw uploadError;
  }

  try {
    return await createDocument(
      {
        organizationId: input.organizationId,
        name: title,
        category,
        storagePath,
        mimeType: 'text/markdown',
        sizeBytes: Buffer.byteLength(content, 'utf8'),
        expiresAt: input.expiresAt ?? null,
        metadata: {
          source: 'template',
          sourceTemplateId: template.id,
          sourceTemplateTitle: template.title,
          recommendedOwner: template.recommendedOwner,
          selectedOwner: normalizeOptionalText(input.owner) ?? null,
        },
      },
      userId,
    );
  } catch (error) {
    reportError(error, context);
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    throw error;
  }
}
