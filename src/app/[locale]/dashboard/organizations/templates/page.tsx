import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { COMPLIANCE_TEMPLATES } from '@/lib/compliance/templates';
import { createDocumentFromTemplate } from '@/server/actions/template-documents';
import { createTaskFromTemplate } from '@/server/actions/template-tasks';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

const categoryOptions = ['gdpr', 'risk', 'vendor', 'security', 'incident', 'general'];

function getCategoryStats() {
  return categoryOptions.map((category) => ({
    category,
    count: COMPLIANCE_TEMPLATES.filter((template) => template.category === category).length,
  }));
}

function getCategoryTone(category: string) {
  const tones: Record<string, string> = {
    gdpr: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    risk: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    vendor: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    security: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    incident: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
    general: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  };

  return tones[category] ?? tones.general;
}

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
    await createTaskFromTemplate({ organizationId: currentOrganization.id, templateId });
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

  const categoryStats = getCategoryStats();
  const totalSections = COMPLIANCE_TEMPLATES.reduce((sum, template) => sum + template.sections.length, 0);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl md:p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">Template library</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">Launch compliance work in minutes</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
              Convert practical GDPR, risk, vendor, security and incident templates into tasks or evidence documents for {organization.name}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">{COMPLIANCE_TEMPLATES.length} templates</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">{totalSections} evidence sections</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">Task + document generation</span>
            </div>
          </div>

          <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Coverage</p>
            <div className="grid grid-cols-2 gap-3">
              {categoryStats.map((item) => (
                <div key={item.category} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.category}</p>
                  <p className="mt-1 text-2xl font-bold">{item.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {COMPLIANCE_TEMPLATES.map((template) => (
          <article key={template.id} className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
            <div className="border-b bg-muted/30 p-6">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getCategoryTone(template.category)}`}>
                  {template.category}
                </span>
                <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{template.sections.length} sections</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold leading-tight">{template.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{template.description}</p>
            </div>

            <div className="flex flex-1 flex-col p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Owner</p>
                  <p className="mt-2 text-sm font-semibold">{template.recommendedOwner}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Outputs</p>
                  <p className="mt-2 text-sm font-semibold">Task + document</p>
                </div>
              </div>

              <details className="mt-5 rounded-2xl border p-4 open:bg-muted/20">
                <summary className="cursor-pointer text-sm font-medium">Preview generated content</summary>
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
                <p className="text-sm font-medium">Included sections</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.sections.slice(0, 5).map((section) => (
                    <span key={section} className="rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">{section}</span>
                  ))}
                  {template.sections.length > 5 && (
                    <span className="rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">+{template.sections.length - 5} more</span>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <form action={createTemplateTask}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Create compliance task
                  </button>
                </form>

                <form action={createTemplateDocument} className="grid gap-3 rounded-2xl border bg-muted/20 p-4">
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
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border bg-background px-4 text-sm font-semibold transition hover:bg-muted"
                  >
                    Generate evidence document
                  </button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
