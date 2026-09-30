import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, FileCheck2 } from 'lucide-react';

import { AuthenticatedProductShell } from '@/components/dashboard/authenticated-product-shell';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { EvidencePackVerifier } from './evidence-pack-verifier';

const copy = {
  en: { eyebrow: 'Evidence Verification', title: 'Verify an Audit Evidence Pack', description: 'Paste or upload an exported RISCK COMPLY evidence pack to validate the payload hash and signature status.', back: 'Back to Evidence Pack', checks: ['SHA-256 payload hash', 'Optional signature check', 'Export structure validation'] },
  pt: { eyebrow: 'Verificação de Evidências', title: 'Verificar um Pacote de Evidências', description: 'Cole ou carregue um pacote de evidências RISCK COMPLY exportado para validar o hash do payload e o estado da assinatura.', back: 'Voltar ao Pacote de Evidências', checks: ['Hash SHA-256 do payload', 'Verificação opcional de assinatura', 'Validação da estrutura do export'] },
  es: { eyebrow: 'Verificación de Evidencias', title: 'Verificar un Paquete de Evidencias', description: 'Pega o carga un paquete de evidencias RISCK COMPLY exportado para validar el hash del payload y el estado de firma.', back: 'Volver al Paquete de Evidencias', checks: ['Hash SHA-256 del payload', 'Verificación opcional de firma', 'Validación de estructura del export'] },
  fr: { eyebrow: 'Vérification des Preuves', title: 'Vérifier un Pack de Preuves', description: 'Collez ou chargez un pack de preuves RISCK COMPLY exporté pour valider le hash du payload et l’état de signature.', back: 'Retour au Pack de Preuves', checks: ['Hash SHA-256 du payload', 'Vérification optionnelle de signature', 'Validation de structure de l’export'] },
  it: { eyebrow: 'Verifica Evidenze', title: 'Verifica un Pacchetto Evidenze', description: 'Incolla o carica un pacchetto evidenze RISCK COMPLY esportato per validare hash del payload e stato firma.', back: 'Torna al Pacchetto Evidenze', checks: ['Hash SHA-256 del payload', 'Verifica firma opzionale', 'Validazione struttura export'] },
  de: { eyebrow: 'Nachweisprüfung', title: 'Audit Evidence Pack prüfen', description: 'Fügen Sie ein exportiertes RISCK COMPLY Evidence Pack ein oder laden Sie es hoch, um Payload-Hash und Signaturstatus zu prüfen.', back: 'Zurück zum Evidence Pack', checks: ['SHA-256-Payload-Hash', 'Optionale Signaturprüfung', 'Validierung der Exportstruktur'] },
} as const;

type PageProps = { params: Promise<{ locale: string }> };

export default async function AuditPackVerifyPage({ params }: PageProps) {
  const { locale } = await params;
  const normalizedLocale = locale in copy ? (locale as keyof typeof copy) : 'en';
  const t = copy[normalizedLocale];
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${locale}/dashboard`);

  const content = (
    <div className="min-h-0 bg-transparent text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-800 bg-[#0b121e] p-6">
          <Link href={`/${locale}/audit-pack`} className="inline-flex items-center gap-2 rounded-md text-sm text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t.back}
          </Link>
          <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">{t.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{t.description}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-emerald-300/20 bg-[#0d1624] p-1 text-emerald-50">
              <Image src="/brand/risck-comply-icon.svg" alt="RISCK COMPLY" width={52} height={52} className="h-12 w-12 object-contain" />
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {t.checks.map((check) => (
            <article key={check} className="rounded-xl border border-slate-800 bg-[#0b121e] p-5">
              <FileCheck2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-100">{check}</p>
            </article>
          ))}
        </section>

        <EvidencePackVerifier locale={locale} />
      </div>
    </div>
  );

  return <AuthenticatedProductShell locale={locale}>{content}</AuthenticatedProductShell>;
}
