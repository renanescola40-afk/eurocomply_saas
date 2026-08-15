import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { CreateComplianceTaskForm, type CreateComplianceTaskFormInput } from '@/components/compliance/create-compliance-task-form';
import { ComplianceTaskList, type EditComplianceTaskInput } from '@/components/dashboard/compliance-task-list';
import { StepUpCsvExportButton } from '@/components/reports/step-up-csv-export-button';
import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';
import { createComplianceTask, deleteComplianceTask, updateComplianceTask } from '@/server/actions/compliance-tasks';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getCurrentUser } from '@/server/queries/auth';
import { listComplianceTasks } from '@/server/queries/compliance-tasks';

export default async function OrganizationComplianceTasksPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${params.locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${params.locale}/onboarding`);

  const copy = getCoreWorkflowCopy(params.locale).tasks;
  const tasks = await listComplianceTasks(organization.id);

  async function currentContext() {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);
    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);
    if (!currentOrganization) redirect(`/${params.locale}/onboarding`);
    return currentOrganization;
  }

  async function refreshTaskViews() {
    'use server';
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  async function handleCreateTask(input: CreateComplianceTaskFormInput) {
    'use server';
    const currentOrganization = await currentContext();
    await createComplianceTask({ organizationId: currentOrganization.id, title: input.title, description: input.description, category: input.category, priority: input.priority, dueDate: input.dueDate });
    await refreshTaskViews();
  }

  async function handleEditTask(taskId: string, input: EditComplianceTaskInput) {
    'use server';
    const currentOrganization = await currentContext();
    await updateComplianceTask(taskId, currentOrganization.id, input);
    await refreshTaskViews();
  }

  async function handleCompleteTask(taskId: string) {
    'use server';
    const currentOrganization = await currentContext();
    await updateComplianceTask(taskId, currentOrganization.id, { status: 'done' });
    await refreshTaskViews();
  }

  async function handleDeleteTask(taskId: string) {
    'use server';
    const currentOrganization = await currentContext();
    await deleteComplianceTask(taskId, currentOrganization.id);
    await refreshTaskViews();
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40 sm:text-sm">{organization.name} · {copy.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">{copy.subtitle}</p>
          </div>
          <StepUpCsvExportButton endpoint="/api/reports/tasks.csv" filename="tasks-report.csv" className="inline-flex h-10 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-medium hover:bg-white/10 focus-visible:ring-2 disabled:opacity-60" />
        </div>

        <CreateComplianceTaskForm locale={params.locale} onSubmit={handleCreateTask} />
        <ComplianceTaskList locale={params.locale} tasks={tasks} onEdit={handleEditTask} onDelete={handleDeleteTask} onComplete={handleCompleteTask} />
      </div>
    </main>
  );
}
