'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VendorActivationCard({ locale }: { locale: string }) {
  return (
    <aside className="rounded-[2rem] border bg-background/90 p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Vendor activation</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Create real vendor records from the vendor register. Analytics are emitted only after the database vendor is created successfully and never include supplier names, contract details or assurance evidence.
      </p>
      <Button asChild className="mt-5 w-full rounded-full">
        <Link href={`/${locale}/dashboard/organizations/vendors`}>
          <Plus className="h-4 w-4" /> Open vendor register
        </Link>
      </Button>
    </aside>
  );
}
