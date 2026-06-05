'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type CreateOrganizationFormProps = {
  onCreate: (input: { name: string; slug: string }) => Promise<void>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateOrganizationForm({ onCreate }: CreateOrganizationFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setName(value);
    setSlug((current) => current || slugify(value));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await onCreate({ name, slug });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to create organization.');
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>This becomes the secure tenant for your compliance data, team members and billing.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="organization-name">Organization name</Label>
            <Input id="organization-name" value={name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Acme Europe Ltd" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization-slug">Workspace URL slug</Label>
            <Input id="organization-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="acme-europe" required />
            <p className="text-xs text-muted-foreground">Use lowercase letters, numbers and hyphens only.</p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending || !name || !slug}>
            {isPending ? 'Creating...' : 'Create organization'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
