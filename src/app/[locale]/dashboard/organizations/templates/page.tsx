import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { COMPLIANCE_TEMPLATES } from '@/lib/compliance/templates';
import { createDocumentFromTemplate } from '@/server/actions/template-documents';
import { createTaskFromTemplate } from '@/server/actions/template-tasks';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

const categoryOptions = ['gdpr', 'risk', 'vendor', 'security', 'incident', 'general'];

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

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    const templateId = String(formData.get('templateId') ?? '');
    await createTaskFromTemplate({ organizationId: currentOrganization.id, templateId }, currentUser.id);
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations/templates`);
    redirect(`/${params.locale}/dashboard/organizations/tasks`);
  }

  async function createTemplateDocument(formData: FormData) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    const templateId = String(formData.get('templateId') ?? '');
    const title = String(formData.get('title') ?? '');
    const category = String(formData.get('category') ?? '');
    const owner = String(formData.get('owner') ?? '');
    const expiresAt = String(formData.get('expiresAt') ?? '');

    await createDocumentFromTemplate(
      {
        organizationId: currentOrganization.id,
        templateId,
        title,
        category,
        owner,
        expiresAt: expiresAt || null,
      },
      currentUser.id,
    );
    revalidatePath(`/${params.locale}/dashboard/organizations/documents`);
    revalidatePath(`/${params.locale}/dashboard/organizations/templates`);
    redirect(`/${params.locale}/dashboard/organizations/documents`);
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

            <details className="mt-5 rounded-xl border p-4 open:bg-muted/20">
              <summary className="cursor-pointer text-sm font-medium">Preview generated document</summary>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>The generated Markdown document includes:</p>
                <ul className="space-y-2">
                  <li>• Document metadata and source template tracking</li>
                  <li>• Purpose, scope, approval and change history sections</li>
                  {template.sections.map((section) => (
                    <li key={section}>• {section}</li>
                  ))}
                </ul>
              </div>
            </details>

            <div className="mt-5">
              <p className="text-sm font-medium">Sections</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {template.sections.map((section) => (
                  <li key={section}>• {section}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid gap-3">
              <form action={createTemplateTask}>
                <input type="hidden" name="templateId" value={template.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Create compliance task
                </button>
              </form>

              <form action={createTemplateDocument} className="grid gap-3 rounded-xl border p-3">
                <input type="hidden" name="templateId" value={template.id} />
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Document title</span>
                  <input name="title" defaultValue={template.title} className="h-10 rounded-md border bg-background px-3 text-sm" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Category</span>
                  <select name="category" defaultValue={template.category} className="h-10 rounded-md border bg-background px-3 text-sm">
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Owner</span>
                  <input name="owner" defaultValue={template.recommendedOwner} className="h-10 rounded-md border bg-background px-3 text-sm" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Review / expiry date</span>
                  <input name="expiresAt" type="date" className="h-10 rounded-md border bg-background px-3 text-sm" />
                </label>
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
