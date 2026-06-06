import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { COMPLIANCE_TEMPLATES } from '@/lib/compliance/templates';
import { getCurrentUser } from '@/server/auth/user';
import { createDocumentFromTemplate } from '@/server/actions/template-documents';
import { createTaskFromTemplate } from '@/server/actions/template-tasks';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

export default async function ComplianceTemplatesPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${params.locale}/onboarding`);
  }

  async function createTemplateTask(formData: FormData) {
    'use server';

    const templateId = String(formData.get('templateId') ?? '');
    await createTaskFromTemplate({ organizationId: organization.id, templateId }, user.id);
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations/templates`);
  }

  async function createTemplateDocument(formData: FormData) {
    'use server';

    const templateId = String(formData.get('templateId') ?? '');
    await createDocumentFromTemplate({ organizationId: organization.id, templateId }, user.id);
    revalidatePath(`/${params.locale}/dashboard/organizations/documents`);
    revalidatePath(`/${params.locale}/dashboard/organizations/templates`);
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Templates</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Compliance template library</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Start faster with reusable GDPR, vendor, risk, incident and security evidence templates. These templates are operational starting points, not legal advice.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {COMPLIANCE_TEMPLATES.map((template) => (
          <article key={template.id} className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{template.category}</p>
              <h2 className="mt-2 text-xl font-semibold">{template.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{template.description}</p>
            </div>

            <div className="mt-5 rounded-xl bg-muted/40 p-4">
              <p className="text-sm font-medium">Recommended owner</p>
              <p className="mt-1 text-sm text-muted-foreground">{template.recommendedOwner}</p>
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium">Sections</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {template.sections.map((section) => (
                  <li key={section}>• {section}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid gap-2">
              <form action={createTemplateTask}>
                <input type="hidden" name="templateId" value={template.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create compliance task
                </button>
              </form>
              <form action={createTemplateDocument}>
                <input type="hidden" name="templateId" value={template.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
                >
                  Generate document
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
