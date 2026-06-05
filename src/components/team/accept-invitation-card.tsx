'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type AcceptInvitationCardProps = {
  email?: string | null;
  organizationName?: string | null;
  onAccept: () => Promise<void> | void;
};

export function AcceptInvitationCard({ email, organizationName, onAccept }: AcceptInvitationCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setIsSubmitting(true);
    setError(null);

    try {
      await onAccept();
    } catch {
      setError('Could not accept this invitation. Please try again or request a new invite.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept your invitation</CardTitle>
        <CardDescription>
          {organizationName
            ? `Join ${organizationName} to collaborate on compliance operations.`
            : 'Join this workspace to collaborate on compliance operations.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {email ? <p className="text-sm text-muted-foreground">Invited email: {email}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={handleAccept} disabled={isSubmitting}>
          {isSubmitting ? 'Accepting...' : 'Accept invitation'}
        </Button>
      </CardContent>
    </Card>
  );
}
