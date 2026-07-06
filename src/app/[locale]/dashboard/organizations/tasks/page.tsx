import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { CreateComplianceTaskForm, type CreateComplianceTaskFormInput } from '@/components/compliance/create-compliance-task-form';
import { ComplianceTaskList } from '@/components/dashboard/compliance-task-list';
import { createComplianceTask, deleteComplianceTask, updateComplianceTask } from '@/server/actions/compliance-tasks';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getCurrentUser } from '@/server/queries/auth';
import { listComplianceTasks } from '@/server/queries/compliance-tasks';

export default async function OrganizationComplianceTasksPage({ params }: { params: { locale: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${params.locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${params.locale}/onboarding`);
  }

  const tasks = await listComplianceTasks(organization.id);

  async function handleCreateTask(input: CreateComplianceTaskFormInput) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

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

  async function handleCompleteTask(taskId: string) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    await updateComplianceTask(taskId, currentOrganization.id, { status: 'done' });
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  async function handleDeleteTask(taskId: string) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${params.locale}/login`);
    }

    const currentOrganization = await getCurrentOrganizationForUser(currentUser.id);

    if (!currentOrganization) {
      redirect(`/${params.locale}/onboarding`);
    }

    await deleteComplianceTask(taskId, currentOrganization.id);
    revalidatePath(`/${params.locale}/dashboard/organizations/tasks`);
    revalidatePath(`/${params.locale}/dashboard/organizations`);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/40">{organization.name}</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Compliance tasks</h1>
            <p className="max-w-2xl text-white/55">Track requirements, owners, priorities and deadlines for your compliance program.</p>
          </div>
          <Link href="/api/reports/tasks.csv" className="inline-flex h-10 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-medium hover:bg-white/10">
            Export CSV
          </Link>
        </div>

        <CreateComplianceTaskForm onSubmit={handleCreateTask} />
        <ComplianceTaskList tasks={tasks} onDelete={handleDeleteTask} onComplete={handleCompleteTask} />
      </div>
    </main>
  );
}
