import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/server/auth/user';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

function csvEscape(value: string | number | null | undefined) {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('compliance_tasks')
    .select('title,category,priority,status,due_date,created_at,updated_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    ['Title', 'Category', 'Priority', 'Status', 'Due date', 'Created at', 'Updated at'],
    ...((data ?? []).map((task) => [task.title, task.category, task.priority, task.status, task.due_date, task.created_at, task.updated_at])),
  ];

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tasks-report.csv"',
    },
  });
}
