'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';

const roles = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof roles)[number];

type InviteMemberFormProps = {
  locale: string;
  canInviteAdmin: boolean;
  onSubmit: (input: { email: string; role: Role }) => Promise<void> | void;
};

export type InviteMemberInput = { email: string; role: Role };

export function InviteMemberForm({ locale, canInviteAdmin, onSubmit }: InviteMemberFormProps) {
  const copy = getTeamWorkflowCopy(locale).invite;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await onSubmit({ email, role });
      setEmail('');
      setRole('viewer');
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.body}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">{copy.email}</Label>
            <Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required className="focus-visible:ring-2" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">{copy.role}</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="invite-role" className="focus-visible:ring-2">
                <SelectValue placeholder={copy.selectRole} />
              </SelectTrigger>
              <SelectContent>
                {canInviteAdmin ? <SelectItem value="admin">{copy.admin}</SelectItem> : null}
                <SelectItem value="editor">{copy.editor}</SelectItem>
                <SelectItem value="viewer">{copy.viewer}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="text-sm text-red-600" role="alert" aria-live="assertive">{error}</p> : null}

          <Button type="submit" disabled={submitting} className="focus-visible:ring-2">
            {submitting ? copy.sending : copy.send}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
