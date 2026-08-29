import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CheckCircle2, CircleDot, ListChecks, ShieldAlert } from 'lucide-react';

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
  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const openTasks = tasks.length - completedTasks;
  const criticalTasks = tasks.filter((task) => task.priority === 'critical' && task.status !== 'done').length;

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
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">{copy.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{copy.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{copy.subtitle}</p>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Organization: {organization.name}</p>
          </div>
          <StepUpCsvExportButton endpoint="/api/reports/tasks.csv" filename="tasks-report.csv" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-medium text-slate-300 transition hover:border-blue-500/50 hover:text-white focus-visible:ring-2 disabled:opacity-60" />
        </header>

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 lg:grid-cols-4" aria-label="Compliance task metrics">
          {[
            { label: 'Total tasks', value: tasks.length, icon: ListChecks },
            { label: 'Open', value: openTasks, icon: CircleDot },
            { label: 'Critical open', value: criticalTasks, icon: ShieldAlert },
            { label: 'Completed', value: completedTasks, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#0d1624] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-600">{label}</p>
                <Icon className="h-4 w-4 text-blue-500/70" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-100">{value}</p>
            </div>
          ))}
        </section>

        {canManageTasks ? (
          <section className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6" aria-label="Create compliance task">
            <CreateComplianceTaskForm locale={params.locale} onSubmit={handleCreateTask} />
          </section>
        ) : (
          <p className="rounded-xl border border-slate-800 bg-[#0b121e] p-4 text-sm text-slate-400" role="status">{readOnlyCopy[params.locale] ?? readOnlyCopy.en}</p>
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
