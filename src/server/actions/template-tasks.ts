import { getComplianceTemplate } from '@/lib/compliance/templates';
import { createComplianceTask } from '@/server/actions/compliance-tasks';
import { requireCurrentUser } from '@/server/queries/auth';

export async function createTaskFromTemplate(input: { organizationId: string; templateId: string }) {
  await requireCurrentUser();
  const template = getComplianceTemplate(input.templateId);

  if (!template) {
    throw new Error('Compliance template not found');
  }

  return createComplianceTask({
    organizationId: input.organizationId,
    title: template.title,
    description: `${template.description}\n\nRecommended owner: ${template.recommendedOwner}\n\nSections:\n${template.sections.map((section) => `- ${section}`).join('\n')}`,
    category: template.category,
    priority: 'medium',
  });
}
