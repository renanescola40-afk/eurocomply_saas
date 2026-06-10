import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Download, FileArchive, LockKeyhole, ShieldCheck } from 'lucide-react';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { buildAuditEvidencePack } from '@/server/queries/audit-evidence-pack';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { assertOrganizationPermission } from '@/server/security/rbac';

const copy = {
  en: {
    eyebrow: 'Audit Evidence',
    title: 'Audit Evidence Pack',
    description: 'Export a structured evidence snapshot for internal audits, procurement reviews and customer due diligence.',
    download: 'Download JSON pack',
    restricted: 'Your current role cannot export evidence packs.',
    businessRequired: 'Audit Evidence Pack is available on Business and Enterprise plans.',
    sections: ['Controlled documents', 'Vendors', 'Risks', 'AI systems', 'AI incidents', 'Audit trail'],
    nextActions: 'Recommended next actions',
  },
  pt: {
    eyebrow: 'Evidências de Auditoria',
    title: 'Pacote de Evidências de Auditoria',
    description: 'Exporte uma fotografia estruturada de evidências para auditorias internas, procurement e due diligence de clientes.',
    download: 'Baixar pacote JSON',
    restricted: 'O seu papel atual não permite exportar pacotes de evidência.',
    businessRequired: 'O Pacote de Evidências está disponível nos planos Business e Enterprise.',
    sections: ['Documentos controlados', 'Fornecedores', 'Riscos', 'Sistemas de IA', 'Incidentes de IA', 'Trilha de auditoria'],
    nextActions: 'Próximas ações recomendadas',
  },
  es: {
    eyebrow: 'Evidencias de Auditoría',
    title: 'Paquete de Evidencias de Auditoría',
    description: 'Exporta una fotografía estructurada de evidencias para auditorías internas, procurement y due diligence de clientes.',
    download: 'Descargar paquete JSON',
    restricted: 'Tu rol actual no permite exportar paquetes de evidencia.',
    businessRequired: 'El Paquete de Evidencias está disponible en Business y Enterprise.',
    sections: ['Documentos controlados', 'Proveedores', 'Riesgos', 'Sistemas de IA', 'Incidentes de IA', 'Registro de auditoría'],
    nextActions: 'Próximas acciones recomendadas',
  },
  fr: {
    eyebrow: 'Preuves d’audit',
    title: 'Pack de Preuves d’Audit',
    description: 'Exportez un instantané structuré des preuves pour audits internes, procurement et due diligence client.',
    download: 'Télécharger le pack JSON',
    restricted: 'Votre rôle actuel ne permet pas d’exporter ce pack.',
    businessRequired: 'Le pack de preuves est disponible sur Business et Enterprise.',
    sections: ['Documents contrôlés', 'Fournisseurs', 'Risques', 'Systèmes IA', 'Incidents IA', 'Journal d’audit'],
    nextActions: 'Actions recommandées',
  },
  it: {
    eyebrow: 'Evidenze di audit',
    title: 'Pacchetto Evidenze di Audit',
    description: 'Esporta uno snapshot strutturato delle evidenze per audit interni, procurement e due diligence clienti.',
    download: 'Scarica pacchetto JSON',
    restricted: 'Il tuo ruolo attuale non consente di esportare pacchetti di evidenze.',
    businessRequired: 'Il pacchetto evidenze è disponibile nei piani Business ed Enterprise.',
    sections: ['Documenti controllati', 'Fornitori', 'Rischi', 'Sistemi IA', 'Incidenti IA', 'Audit trail'],
    nextActions: 'Azioni consigliate',
  },
  de: {
    eyebrow: 'Audit-Nachweise',
    title: 'Audit Evidence Pack',
    description: 'Exportieren Sie einen strukturierten Nachweis-Snapshot für interne Audits, Procurement und Kundendiligence.',
    download: 'JSON-Paket herunterladen',
    restricted: 'Ihre aktuelle Rolle darf keine Evidence Packs exportieren.',
    businessRequired: 'Das Evidence Pack ist in Business und Enterprise verfügbar.',
    sections: ['Kontrollierte Dokumente', 'Anbieter', 'Risiken', 'KI-Systeme', 'KI-Incidents', 'Audit Trail'],
    nextActions: 'Empfohlene nächste Schritte',
  },
} as const;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AuditPackPage({ params }: PageProps) {
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

  const entitlements = await getOrganizationEntitlements(organization.id);
  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'export_data',
  });

  const canUsePack = entitlements.executiveReports && permission.ok;
  const pack = canUsePack
    ? await buildAuditEvidencePack({
        organization: { id: organization.id, name: organization.name, slug: organization.slug },
        userId: user.id,
        role: permission.role,
        entitlements,
      })
    : null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />

        {!entitlements.executiveReports ? (
          <UpgradeRequiredCard locale={locale} title={t.businessRequired} description={t.description} requiredPlan="Business" />
        ) : !permission.ok ? (
          <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-8 text-amber-50">
            <LockKeyhole className="h-6 w-6" />
            <h1 className="mt-4 text-2xl font-semibold">{t.restricted}</h1>
            <p className="mt-2 text-sm text-amber-100/80">{t.description}</p>
          </section>
        ) : pack ? (
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-sky-300">{t.eyebrow}</p>
                  <h1 className="mt-2 text-3xl font-semibold">{t.title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t.description}</p>
                </div>
                <Link href="/api/audit/evidence-pack" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-100">
                  <Download className="h-4 w-4" /> {t.download}
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 text-3xl font-semibold">{pack.summary.score}%</p>
                <p className="text-sm text-slate-400">{pack.summary.status}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <FileArchive className="h-5 w-5 text-sky-300" />
                <p className="mt-3 text-3xl font-semibold">{pack.summary.auditEvents}</p>
                <p className="text-sm text-slate-400">Audit events</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <LockKeyhole className="h-5 w-5 text-violet-300" />
                <p className="mt-3 text-3xl font-semibold">{permission.role}</p>
                <p className="text-sm text-slate-400">Export role</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                pack.summary.documents,
                pack.summary.vendors,
                pack.summary.risks,
                pack.summary.aiSystems,
                pack.summary.aiIncidents,
                pack.summary.auditEvents,
              ].map((value, index) => (
                <article key={t.sections[index]} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm text-slate-400">{t.sections[index]}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </article>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-semibold">{t.nextActions}</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {pack.nextActions.map((action) => (
                  <li key={action} className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">{action}</li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
