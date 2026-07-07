'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Crown, Diamond, Download, FileText, LockKeyhole, Mail, Plus, Save, ShieldCheck, Trash2, UploadCloud, UsersRound } from 'lucide-react';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const defaultCompany = {
  legalName: 'RISCK COMPLY Europe GmbH',
  tradeName: 'RISCK COMPLY',
  email: 'compliance@risckcomply.com',
  phone: '+351 910 000 000',
  street: 'Avenida da Liberdade',
  number: '110',
  postalCode: '1250-146',
  city: 'Lisboa',
  logoUrl: 'https://dummyimage.com/180x180/111827/ffffff&text=RC',
};

const fiscalCountries = {
  Portugal: { label: 'NIF', helper: '9 dígitos', placeholder: '509442013', pattern: /^\d{9}$/ },
  França: { label: 'SIRET ou SIREN', helper: '14 ou 9 dígitos', placeholder: '12345678900012', pattern: /^(\d{9}|\d{14})$/ },
  Espanha: { label: 'NIF', helper: '8 dígitos + letra', placeholder: '12345678Z', pattern: /^\d{8}[A-Za-z]$/ },
  Alemanha: { label: 'Steuernummer', helper: '10–11 dígitos', placeholder: '12345678901', pattern: /^\d{10,11}$/ },
  Itália: { label: 'Partita IVA', helper: '11 dígitos', placeholder: '12345678901', pattern: /^\d{11}$/ },
  Holanda: { label: 'BTW-nummer', helper: '14 caracteres', placeholder: 'NL123456789B01', pattern: /^.{14}$/ },
  Bélgica: { label: "Numéro d'entreprise", helper: '10 dígitos', placeholder: '0123456789', pattern: /^\d{10}$/ },
  Irlanda: { label: 'VAT Number', helper: '8 a 10 caracteres', placeholder: '1234567A', pattern: /^[A-Za-z0-9]{8,10}$/ },
  Outro: { label: 'Identificação fiscal', helper: 'Formato local', placeholder: 'ID fiscal europeu', pattern: /^.{3,}$/ },
};

type CountryKey = keyof typeof fiscalCountries;
type Plan = 'Essential' | 'Professional' | 'Business' | 'Enterprise';

type FiscalId = {
  id: string;
  country: CountryKey;
  value: string;
};

const initialFiscalIds: FiscalId[] = [
  { id: 'fiscal-fr', country: 'França', value: '12345678900012' },
  { id: 'fiscal-es', country: 'Espanha', value: '12345678Z' },
];

const initialEmployees = [
  { id: 'employee-ana', name: 'Ana Martins', email: 'ana@risckcomply.com', role: 'Admin', status: 'ativo' },
  { id: 'employee-miguel', name: 'Miguel Costa', email: 'miguel@risckcomply.com', role: 'Visualizador', status: 'pendente' },
];

const enterpriseSignals = [
  { label: 'review-ready profile', icon: FileText },
  { label: 'tenant isolated workspace', icon: Building2 },
  { label: 'privacy-oriented controls', icon: ShieldCheck },
  { label: 'role-based access', icon: UsersRound },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFiscalValue(value: string) {
  return value.replace(/[\s.-]/g, '').trim();
}

function isFiscalIdValid(item: FiscalId) {
  if (!item.value.trim()) return true;
  return fiscalCountries[item.country].pattern.test(normalizeFiscalValue(item.value));
}

export function ProfileClient({ locale }: { locale: string }) {
  const [company, setCompany] = useState(defaultCompany);
  const [plan, setPlan] = useState<Plan>('Essential');
  const [fiscalIds, setFiscalIds] = useState<FiscalId[]>(initialFiscalIds);
  const [employees, setEmployees] = useState(initialEmployees);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');

  const isBusinessOrEnterprise = plan === 'Business' || plan === 'Enterprise';
  const isEnterprise = plan === 'Enterprise';
  const allFiscalIdsValid = useMemo(() => fiscalIds.every(isFiscalIdValid), [fiscalIds]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  }

  function updateCompany(field: keyof typeof company, value: string) {
    setCompany((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function addFiscalCountry() {
    if (!isBusinessOrEnterprise) {
      showToast('Gestão multi-país disponível nos planos Business e Enterprise.');
      return;
    }
    setFiscalIds((current) => [...current, { id: createId('fiscal'), country: 'Portugal', value: '' }]);
    setSaved(false);
    showToast('País fiscal adicionado.');
  }

  function updateFiscalId(id: string, field: 'country' | 'value', value: string) {
    setFiscalIds((current) => current.map((item) => (item.id === id ? ({ ...item, [field]: value } as FiscalId) : item)));
    setSaved(false);
  }

  function removeFiscalId(id: string) {
    if (!isBusinessOrEnterprise) {
      showToast('Faça upgrade para Business ou Enterprise para editar operações fiscais multi-país.');
      return;
    }
    setFiscalIds((current) => current.filter((item) => item.id !== id));
    setSaved(false);
    showToast('País fiscal removido.');
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!allFiscalIdsValid) {
      showToast('Corrija os identificadores fiscais antes de guardar.');
      return;
    }
    localStorage.setItem('risck-comply-profile-demo', JSON.stringify({ company, fiscalIds, plan, employees }));
    setSaved(true);
    showToast('Perfil guardado localmente.');
  }

  async function inviteEmployee() {
    if (!isEnterprise) {
      showToast('Convites de equipa exigem plano Enterprise.');
      return;
    }
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      showToast('Informe um email válido.');
      return;
    }

    const response = await fetch('/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    if (!response.ok) {
      showToast(response.status === 403 ? 'Upgrade Enterprise necessário para convidar equipa.' : 'Não foi possível enviar o convite.');
      return;
    }

    setEmployees((current) => [...current, { id: createId('employee'), name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole, status: 'pendente' }]);
    setInviteEmail('');
    showToast('Convite registado com validação server-side.');
  }

  async function openBillingPortal() {
    const response = await fetch('/api/billing/portal', { method: 'POST' });
    if (!response.ok) {
      showToast('Ainda não existe uma assinatura Stripe ativa para esta organização.');
      return;
    }
    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      window.location.href = payload.url;
      return;
    }
    showToast('Não foi possível abrir o portal de faturação.');
  }

  async function downloadGdprExport() {
    const response = await fetch('/api/gdpr/export');
    if (!response.ok) {
      showToast('Não foi possível preparar a exportação GDPR.');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'risck-comply-gdpr-export.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    showToast('Exportação GDPR descarregada.');
  }

  function requestGdprDelete() {
    window.location.href = `/${locale}/dashboard/privacy`;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.16),_transparent_34rem),radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_28rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)]">
      <DashboardCommandNavigation locale={locale} activePage="Perfil" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />
      {toast ? <div className="fixed right-4 top-20 z-50 rounded-2xl border border-white/10 bg-background px-4 py-3 text-sm text-white shadow-xl" role="status" aria-live="polite">{toast}</div> : null}

      <form id="company-data" onSubmit={saveProfile} className="relative mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <section className="premium-card rounded-[2rem] p-6 md:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="rounded-full bg-white px-3 py-1 text-black uppercase tracking-[0.18em]">Settings</Badge>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.055em] text-white md:text-5xl">Company, access and privacy settings.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58 md:text-base">Manage business identity, fiscal countries, people and privacy operations with controlled states instead of generic form screens.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {enterpriseSignals.map((item) => {
                  const Icon = item.icon;
                  return <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-medium text-white/55"><Icon className="h-3.5 w-3.5" /> {item.label}</span>;
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['Essential', 'Professional', 'Business', 'Enterprise'] as const).map((item) => (
                <button key={item} type="button" onClick={() => { setPlan(item); showToast(`Plano simulado: ${item}`); }} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${plan === item ? 'border-white bg-white text-black shadow-lg' : 'border-white/10 bg-white/[0.04] text-white/64 hover:bg-white/10 hover:text-white'}`}>
                  Simular {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center gap-4">
                <Image src={company.logoUrl} alt="Company logo" width={72} height={72} className="rounded-2xl border border-white/10 bg-white/5 object-cover" />
                <div>
                  <p className="text-lg font-semibold text-white">{company.tradeName}</p>
                  <p className="text-sm text-white/50">{company.legalName}</p>
                </div>
              </div>
              <Button type="button" variant="outline" className="mt-5 w-full rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
                <UploadCloud className="h-4 w-4" /> Upload logo
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(['legalName', 'tradeName', 'email', 'phone', 'street', 'number', 'postalCode', 'city'] as const).map((field) => (
                <label key={field} className="space-y-2 text-sm text-white/62">
                  <span className="capitalize">{field}</span>
                  <input value={company[field]} onChange={(event) => updateCompany(field, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-white/30" />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="premium-card rounded-[2rem] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="outline" className="rounded-full border-white/10 text-white/60">Fiscal countries</Badge>
                <h2 className="mt-3 text-2xl font-semibold text-white">European identifiers</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">Manage country-specific identifiers with validation before saving.</p>
              </div>
              <Button type="button" onClick={addFiscalCountry} className="rounded-full bg-white text-black hover:bg-white/90"><Plus className="h-4 w-4" /> Add</Button>
            </div>

            <div className="mt-6 space-y-4">
              {fiscalIds.map((item) => {
                const countryConfig = fiscalCountries[item.country];
                const isValid = isFiscalIdValid(item);
                return (
                  <div key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto]">
                      <select value={item.country} onChange={(event) => updateFiscalId(item.id, 'country', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none">
                        {Object.keys(fiscalCountries).map((country) => <option key={country}>{country}</option>)}
                      </select>
                      <input value={item.value} placeholder={countryConfig.placeholder} onChange={(event) => updateFiscalId(item.id, 'value', event.target.value)} className={`rounded-2xl border px-4 py-3 text-white outline-none transition ${isValid ? 'border-white/10 bg-white/[0.04]' : 'border-rose-500/50 bg-rose-500/10'}`} />
                      <Button type="button" variant="outline" onClick={() => removeFiscalId(item.id)} className="rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <p className={`mt-2 text-xs ${isValid ? 'text-white/42' : 'text-rose-200'}`}>{countryConfig.label} · {countryConfig.helper}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="premium-card rounded-[2rem] p-6">
            <Badge variant="outline" className="rounded-full border-white/10 text-white/60">Team access</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-white">Employees and roles</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">Invite team members and keep access aligned with responsibilities.</p>
            <div className="mt-6 space-y-3">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div>
                    <p className="font-medium text-white">{employee.name}</p>
                    <p className="text-xs text-white/42">{employee.email} · {employee.role}</p>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-white/54">{employee.status}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none">
                {['Admin', 'Editor', 'Visualizador'].map((role) => <option key={role}>{role}</option>)}
              </select>
              <Button type="button" onClick={inviteEmployee} className="rounded-2xl bg-white text-black hover:bg-white/90"><Mail className="h-4 w-4" /> Invite</Button>
            </div>
          </div>
        </section>

        <section className="premium-card rounded-[2rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full border-white/10 text-white/60">Privacy and billing</Badge>
              <h2 className="mt-3 text-2xl font-semibold text-white">Controlled account operations</h2>
              <p className="mt-2 text-sm text-white/50">Download personal data exports, request deletion flow and manage billing portal access.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={downloadGdprExport} className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"><Download className="h-4 w-4" /> Export GDPR</Button>
              <Button type="button" variant="outline" onClick={requestGdprDelete} className="rounded-full border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20">Request deletion</Button>
              <Button type="button" onClick={openBillingPortal} className="rounded-full bg-white text-black hover:bg-white/90"><Crown className="h-4 w-4" /> Billing portal</Button>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/42">{saved ? 'Last saved locally.' : 'Unsaved changes.'}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/10"><Link href={`/${locale}/dashboard/organizations`}><ArrowRight className="h-4 w-4" /> Back to dashboard</Link></Button>
            <Button type="submit" className="rounded-full bg-white text-black hover:bg-white/90"><Save className="h-4 w-4" /> Save profile</Button>
          </div>
        </div>
      </form>
    </main>
  );
}
