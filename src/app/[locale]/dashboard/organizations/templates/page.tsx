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
    gdpr: 'border-sky-400/20 bg-sky-400/[0.08] text-sky-200',
    risk: 'border-rose-400/20 bg-rose-400/[0.08] text-rose-200',
    vendor: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-200',
    security: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200',
    incident: 'border-orange-400/20 bg-orange-400/[0.08] text-orange-200',
    general: 'border-white/[0.09] bg-white/[0.035] text-white/55',
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

    await createDocumentFromTemplate({
      organizationId: currentOrganization.id,
      templateId,
      title,
      category,
      owner,
      expiresAt: expiresAt || null,
    });
    revalidatePath(`/${params.locale}/dashboard/organizations/documents`);
    revalidatePath(`/${params.locale}/dashboard/organizations/templates`);
    redirect(`/${params.locale}/dashboard/organizations/documents`);
  }

  const categoryStats = getCategoryStats();
  const totalSections = COMPLIANCE_TEMPLATES.reduce((sum, template) => sum + template.sections.length, 0);

  return (
    <main className="space-y-6 text-white">
      <header className="border-b border-white/[0.07] pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-emerald-300/75">Template library</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">Launch governed compliance work</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48 md:text-base">
              Convert practical GDPR, risk, vendor, security and incident templates into tasks or evidence documents for {organization.name}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-white/42">
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2">{COMPLIANCE_TEMPLATES.length} templates</span>
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2">{totalSections} evidence sections</span>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {categoryStats.map((item) => (
          <article key={item.category} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">{item.category}</p>
            <p className="mt-2 text-2xl font-semibold text-white/88">{item.count}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {COMPLIANCE_TEMPLATES.map((template) => (
          <article key={template.id} className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]">
            <div className="border-b border-white/[0.07] p-5">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] ${getCategoryTone(template.category)}`}>
                  {template.category}
                </span>
                <span className="text-xs text-white/30">{template.sections.length} sections</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-6 text-white/88">{template.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/42">{template.description}</p>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">Owner</p>
                  <p className="mt-1.5 text-sm font-medium text-white/65">{template.recommendedOwner}</p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/28">Outputs</p>
                  <p className="mt-1.5 text-sm font-medium text-white/65">Task + document</p>
                </div>
              </div>

              <details className="mt-4 rounded-xl border border-white/[0.07] bg-black/10 p-4 open:bg-black/20">
                <summary className="cursor-pointer text-sm font-medium text-white/65">Preview generated content</summary>
                <div className="mt-4 space-y-2 text-sm leading-6 text-white/40">
                  <p>The generated Markdown document includes:</p>
                  <ul className="space-y-1.5">
                    <li>• Document metadata and source template tracking</li>
                    <li>• Purpose, scope, approval and change history sections</li>
                    {template.sections.map((section) => (
                      <li key={section}>• {section}</li>
                    ))}
                  </ul>
                </div>
              </details>

              <div className="mt-4">
                <p className="text-xs font-medium text-white/45">Included sections</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {template.sections.slice(0, 5).map((section) => (
                    <span key={section} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/38">{section}</span>
                  ))}
                  {template.sections.length > 5 && (
                    <span className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/38">+{template.sections.length - 5} more</span>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-5">
                <form action={createTemplateTask}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <button type="submit" className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-[#06100d] transition-colors hover:bg-emerald-200">
                    Create compliance task
                  </button>
                </form>

                <details className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <summary className="cursor-pointer text-sm font-medium text-white/58">Generate evidence document</summary>
                  <form action={createTemplateDocument} className="mt-4 grid gap-3">
                    <input type="hidden" name="templateId" value={template.id} />
                    <label className="grid gap-1.5 text-xs text-white/45">
                      <span className="font-medium">Document title</span>
                      <input name="title" defaultValue={template.title} className="h-10 rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white/75 outline-none focus:border-emerald-300/30" />
                    </label>
                    <label className="grid gap-1.5 text-xs text-white/45">
                      <span className="font-medium">Category</span>
                      <select name="category" defaultValue={template.category} className="h-10 rounded-xl border border-white/[0.08] bg-[#0b100f] px-3 text-sm text-white/75 outline-none focus:border-emerald-300/30">
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs text-white/45">
                      <span className="font-medium">Owner</span>
                      <input name="owner" defaultValue={template.recommendedOwner} className="h-10 rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white/75 outline-none focus:border-emerald-300/30" />
                    </label>
                    <label className="grid gap-1.5 text-xs text-white/45">
                      <span className="font-medium">Review / expiry date</span>
                      <input name="expiresAt" type="date" className="h-10 rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white/75 outline-none focus:border-emerald-300/30" />
                    </label>
                    <button type="submit" className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm font-semibold text-white/68 transition-colors hover:bg-white/[0.06] hover:text-white">
                      Generate evidence document
                    </button>
                  </form>
                </details>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
