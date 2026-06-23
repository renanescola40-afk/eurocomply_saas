import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, FileCheck2 } from 'lucide-react';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { EvidencePackVerifier } from './evidence-pack-verifier';

const copy = {
  en: {
    eyebrow: 'Evidence Verification',
    title: 'Verify an Audit Evidence Pack',
    description: 'Paste or upload an exported Risck comply evidence pack to validate the payload hash and signature status.',
    back: 'Back to Evidence Pack',
    checks: ['SHA-256 payload hash', 'Optional signature check', 'Export structure validation'],
  },
  pt: {
    eyebrow: 'Verificação de Evidências',
    title: 'Verificar um Pacote de Evidências',
    description: 'Cole ou carregue um pacote de evidências Risck comply exportado para validar o hash do payload e o estado da assinatura.',
    back: 'Voltar ao Pacote de Evidências',
    checks: ['Hash SHA-256 do payload', 'Verificação opcional de assinatura', 'Validação da estrutura do export'],
  },
  es: {
    eyebrow: 'Verificación de Evidencias',
    title: 'Verificar un Paquete de Evidencias',
    description: 'Pega o carga un paquete de evidencias Risck comply exportado para validar el hash del payload y el estado de firma.',
    back: 'Volver al Paquete de Evidencias',
    checks: ['Hash SHA-256 del payload', 'Verificación opcional de firma', 'Validación de estructura del export'],
  },
  fr: {
    eyebrow: 'Vérification des Preuves',
    title: 'Vérifier un Pack de Preuves',
    description: 'Collez ou chargez un pack de preuves Risck comply exporté pour valider le hash du payload et l’état de signature.',
    back: 'Retour au Pack de Preuves',
    checks: ['Hash SHA-256 du payload', 'Vérification optionnelle de signature', 'Validation de structure de l’export'],
  },
  it: {
    eyebrow: 'Verifica Evidenze',
    title: 'Verifica un Pacchetto Evidenze',
    description: 'Incolla o carica un pacchetto evidenze Risck comply esportato per validare hash del payload e stato firma.',
    back: 'Torna al Pacchetto Evidenze',
    checks: ['Hash SHA-256 del payload', 'Verifica firma opzionale', 'Validazione struttura export'],
  },
  de: {
    eyebrow: 'Nachweisprüfung',
    title: 'Audit Evidence Pack prüfen',
    description: 'Fügen Sie ein exportiertes Risck comply Evidence Pack ein oder laden Sie es hoch, um Payload-Hash und Signaturstatus zu prüfen.',
    back: 'Zurück zum Evidence Pack',
    checks: ['SHA-256-Payload-Hash', 'Optionale Signaturprüfung', 'Validierung der Exportstruktur'],
  },
} as const;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AuditPackVerifyPage({ params }: PageProps) {
  const { locale } = await params;
  const normalizedLocale = locale in copy ? (locale as keyof typeof copy) : 'en';
  const t = copy[normalizedLocale];
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
          <Link href={`/${locale}/audit-pack`} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t.back}
          </Link>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">{t.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{t.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{t.description}</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-emerald-300/20 bg-black p-1 text-emerald-50">
              <Image src="/brand/risck-comply-icon.svg" alt="Risck comply" width={52} height={52} className="h-13 w-13 object-contain" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {t.checks.map((check) => (
            <article key={check} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <FileCheck2 className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-sm font-medium text-slate-100">{check}</p>
            </article>
          ))}
        </section>

        <EvidencePackVerifier locale={locale} />
      </div>
    </main>
  );
}
