'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreateOrganization, OrganizationSwitcher, SignedIn, SignedOut, SignInButton, useOrganization, useOrganizationList } from '@clerk/nextjs';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export function ClerkOrganizationPanel() {
  const { organization, membership, isLoaded: organizationLoaded } = useOrganization();
  const { userMemberships, isLoaded: organizationListLoaded } = useOrganizationList({
    userMemberships: true,
  });
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const memberships = useMemo(() => userMemberships.data ?? [], [userMemberships.data]);
  const hasOrganizations = memberships.length > 0;
  const activeOrganizationId = organization?.id ?? null;
  const activeOrganizationName = organization?.name ?? null;
  const activeOrganizationSlug = organization?.slug ?? null;
  const activeMembership = useMemo(
    () => memberships.find((item) => item.organization.id === activeOrganizationId),
    [memberships, activeOrganizationId],
  );

  useEffect(() => {
    if (!organizationLoaded || !activeOrganizationId || !activeOrganizationName) return;

    const controller = new AbortController();

    async function syncOrganization() {
      if (!activeOrganizationId || !activeOrganizationName) return;

      setSyncState('syncing');
      setSyncError(null);

      try {
        const response = await fetch('/api/clerk/organizations/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkOrgId: activeOrganizationId,
            name: activeOrganizationName,
            slug: activeOrganizationSlug,
            membershipId: activeMembership?.id,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(payload?.error ?? 'Organization sync failed');
        }

        setSyncState('synced');
      } catch (error) {
        if (controller.signal.aborted) return;
        setSyncState('error');
        setSyncError(error instanceof Error ? error.message : 'Organization sync failed');
      }
    }

    void syncOrganization();

    return () => controller.abort();
  }, [activeMembership?.id, activeOrganizationId, activeOrganizationName, activeOrganizationSlug, organizationLoaded]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white shadow-2xl shadow-black/20">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Clerk Organizations</p>
          <h1 className="mt-3 text-2xl font-bold">Organização e equipa</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-300">
            Use esta área para criar a organização da empresa, alternar entre organizações e preparar convites, roles e permissões enterprise.
          </p>
        </div>

        <SignedIn>
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/pt/dashboard/organizations/clerk"
            afterCreateOrganizationUrl="/pt/dashboard/organizations/clerk"
            appearance={{
              elements: {
                organizationSwitcherTrigger: 'rounded-full border border-white/15 bg-white/10 px-4 py-2 text-white',
              },
            }}
          />
        </SignedIn>
      </div>

      <SignedOut>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-100">
          Precisa iniciar sessão para gerir organizações.
          <div className="mt-4">
            <SignInButton>
              <button className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black">Entrar</button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {!organizationListLoaded || !organizationLoaded ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-300">A carregar organizações...</div>
        ) : hasOrganizations ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Organização ativa</p>
                <p className="mt-3 text-lg font-bold">{activeOrganizationName ?? 'Nenhuma organização ativa'}</p>
                <p className="mt-2 text-xs text-zinc-400">ID: {activeOrganizationId ?? 'n/a'}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Função atual</p>
                <p className="mt-3 text-lg font-bold">{membership?.role ?? 'Sem role ativa'}</p>
                <p className="mt-2 text-xs text-zinc-400">Use roles no Clerk para owner/admin/member.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Organizações</p>
                <p className="mt-3 text-lg font-bold">{memberships.length}</p>
                <p className="mt-2 text-xs text-zinc-400">Multi-tenant pronto para ligar ao Supabase por orgId.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
              {syncState === 'syncing' && 'A sincronizar organização com Supabase...'}
              {syncState === 'synced' && 'Organização sincronizada com Supabase.'}
              {syncState === 'error' && `Falha ao sincronizar organização: ${syncError}`}
              {syncState === 'idle' && 'Aguardando organização ativa para sincronizar.'}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
            <h2 className="text-lg font-bold text-white">Crie a primeira organização</h2>
            <p className="mt-2 text-sm text-cyan-100">
              A organização será a base enterprise para membros, permissões, billing, auditoria e isolamento de dados.
            </p>
            <div className="mt-5 max-w-xl overflow-hidden rounded-2xl bg-white p-1 text-black">
              <CreateOrganization
                afterCreateOrganizationUrl="/pt/dashboard/organizations/clerk"
                appearance={{
                  elements: {
                    card: 'shadow-none',
                  },
                }}
              />
            </div>
          </div>
        )}
      </SignedIn>
    </section>
  );
}
