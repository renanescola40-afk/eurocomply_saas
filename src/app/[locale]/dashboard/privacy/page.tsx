import Link from 'next/link';

import { Badge } from '@/components/ui/badge';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyAdminPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8 md:py-12">
      <div className="rounded-[2rem] border bg-background/88 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
        <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">Admin GDPR</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Privacidade e GDPR.</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Centro enterprise para exportação, retenção, autorização, verificação adicional, isolamento por organização e evidência operacional.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <h2 className="text-2xl font-semibold">Exportação</h2>
          <p className="mt-3 text-sm text-muted-foreground">Use a rota GDPR existente com sessão autenticada e resposta no-store.</p>
        </section>
        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
          <h2 className="text-2xl font-semibold">Revisão</h2>
          <p className="mt-3 text-sm text-muted-foreground">Fluxos sensíveis exigem permissão administrativa, verificação adicional e revisão operacional.</p>
        </section>
      </div>

      <p className="text-sm text-muted-foreground">Voltar ao <Link className="underline" href={`/${locale}/profile#privacy`}>perfil</Link>.</p>
    </section>
  );
}
