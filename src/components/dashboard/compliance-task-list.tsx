import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ComplianceTask = {
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

type ComplianceTaskListProps = {
  tasks: ComplianceTask[];
};

function formatDueDate(value?: string | null) {
  if (!value) return 'No due date';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function ComplianceTaskList({ tasks }: ComplianceTaskListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open compliance tasks.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">Due {formatDueDate(task.due_date)}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                    <p>{task.priority ?? 'normal'}</p>
                    <p>{task.status ?? 'open'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
