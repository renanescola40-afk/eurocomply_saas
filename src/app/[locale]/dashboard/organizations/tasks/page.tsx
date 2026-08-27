import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { CreateComplianceTaskForm, type CreateComplianceTaskFormInput } from '@/components/compliance/create-compliance-task-form';
import { ComplianceTaskList, type EditComplianceTaskInput } from '@/components/dashboard/compliance-task-list';
import { StepUpCsvExportButton } from '@/components/reports/step-up-csv-export-button';
import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';
import { roleHasPermission } from '@/lib/security/permissions';
import { createComplianceTask, deleteComplianceTask, updateComplianceTask } from '@/server/actions/compliance-tasks';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getCurrentUser } from '@/server/queries/auth';
import { listComplianceTasks } from '@/server/queries/compliance-tasks';

const readOnlyCopy: Record<string, string> = {
  en: 'Your role can review compliance tasks but cannot create, edit, complete or delete them.',
  pt: 'A sua função pode consultar tarefas de compliance, mas não pode criar, editar, concluir ou eliminar tarefas.',
  es: 'Tu rol puede consultar tareas de compliance, pero no puede crear, editar, completar ni eliminar tareas.',
  fr: 'Votre rôle peut consulter les tâches de conformité, mais ne peut pas les créer, modifier, terminer ou supprimer.',
  it: 'Il tuo ruolo può consultare le attività di compliance, ma non può crearle, modificarle, completarle o eliminarle.',
  de: 'Ihre Rolle kann Compliance-Aufgaben einsehen, aber nicht erstellen, bearbeiten, abschließen oder löschen.',
};

export default async function OrganizationComplianceTasksPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${params.locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${params.locale}/onboarding`);

  const copy = getCoreWorkflowCopy(params.locale).tasks;
  const tasks = await listComplianceTasks(organization.id);
  const canManageTasks = roleHasPermission(organization.role, 'manage_ai_governance');

  async function handleCreateTask(input: CreateComplianceTaskFormInput) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);
    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);
    if (!currentOrganization) redirect(`/${params.locale}/onboarding`);

    await createComplianceTask({
      organizationId: currentOrganization.id,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      dueDate: input.dueDate,
    });
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  async function handleEditTask(taskId: string, input: EditComplianceTaskInput) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);
    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);
    if (!currentOrganization) redirect(`/${params.locale}/onboarding`);

    await updateComplianceTask(taskId, currentOrganization.id, input);
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  async function handleCompleteTask(taskId: string) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);
    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);
    if (!currentOrganization) redirect(`/${params.locale}/onboarding`);

    await updateComplianceTask(taskId, currentOrganization.id, { status: 'done' });
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  async function handleDeleteTask(taskId: string) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect(`/${params.locale}/login`);
    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);
    if (!currentOrganization) redirect(`/${params.locale}/onboarding`);

    await deleteComplianceTask(taskId, currentOrganization.id);
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-4 border-b border-white/[0.065] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{organization.name} · {copy.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{copy.subtitle}</p>
          </div>
          <StepUpCsvExportButton endpoint="/api/reports/tasks.csv" filename="tasks-report.csv" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 disabled:opacity-60" />
        </header>

        {canManageTasks ? (
          <CreateComplianceTaskForm locale={params.locale} onSubmit={handleCreateTask} />
        ) : (
          <p className="rounded-xl border border-white/[0.075] bg-[#101715] p-4 text-sm text-white/62" role="status">{readOnlyCopy[params.locale] ?? readOnlyCopy.en}</p>
        )}
        <ComplianceTaskList
          locale={params.locale}
          tasks={tasks}
          onEdit={canManageTasks ? handleEditTask : undefined}
          onDelete={canManageTasks ? handleDeleteTask : undefined}
          onComplete={canManageTasks ? handleCompleteTask : undefined}
        />
      </div>
    </main>
  );
}
