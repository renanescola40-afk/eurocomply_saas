import { DeleteRecordButton } from '@/components/shared/delete-record-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';

type ComplianceTask = {
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

type ComplianceTaskListProps = {
  locale: string;
  tasks: ComplianceTask[];
  onDelete?: (taskId: string) => Promise<void>;
  onComplete?: (taskId: string) => Promise<void>;
};

function formatDueDate(value: string | null | undefined, locale: string, noDueDate: string, invalidDueDate: string) {
  if (!value) return noDueDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return invalidDueDate;

  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function ComplianceTaskList({ locale, tasks, onDelete, onComplete }: ComplianceTaskListProps) {
  const copy = getCoreWorkflowCopy(locale).tasks;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.listTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">{copy.empty}</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isDone = task.status === 'done';
              return (
                <div key={task.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{copy.due} {formatDueDate(task.due_date, locale, copy.noDueDate, copy.invalidDueDate)}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-xs uppercase tracking-wide text-muted-foreground sm:items-end sm:text-right">
                      <div>
                        <p>{task.priority ? copy.priorities[task.priority as keyof typeof copy.priorities] ?? task.priority : copy.priorities.medium}</p>
                        <p>{task.status ?? 'todo'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {onComplete && !isDone ? (
                          <form action={onComplete.bind(null, task.id)}>
                            <Button type="submit" variant="outline" size="sm" className="h-8 rounded-full text-xs normal-case tracking-normal focus-visible:ring-2">
                              {copy.markDone}
                            </Button>
                          </form>
                        ) : null}
                        {onDelete ? (
                          <DeleteRecordButton
                            id={task.id}
                            label={task.title}
                            resourceName="task"
                            onDelete={onDelete}
                            copy={{ delete: copy.delete, deleting: copy.deleting, confirm: copy.deleteConfirm, error: copy.deleteError }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
