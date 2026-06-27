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
  { label: 'audit-ready profile', icon: FileText },
  { label: 'tenant isolated workspace', icon: Building2 },
  { label: 'GDPR aligned controls', icon: ShieldCheck },
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
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58 md:text-base">Manage business identity, fiscal countries, people and GDPR operations with controlled states instead of generic form screens.</p>
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
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="premium-card rounded-[2rem] p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-white"><Building2 className="h-5 w-5" /></div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">Dados da empresa</h2>
                <p className="mt-1 text-sm leading-6 text-white/52">Campos editáveis com labels claros. O logo usa upload simulado ou URL para manter o fluxo controlado.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Razão Social', 'legalName'], ['Nome Comercial', 'tradeName'], ['Email da empresa', 'email'], ['Telefone com indicativo', 'phone'], ['Rua', 'street'], ['Número', 'number'], ['Código Postal', 'postalCode'], ['Cidade', 'city'], ['Logo da empresa URL', 'logoUrl'],
              ].map(([label, field]) => (
                <label key={field} className={field === 'logoUrl' ? 'md:col-span-2' : ''}>
                  <span className="text-sm font-medium text-white/72">{label}</span>
                  <input value={company[field as keyof typeof company]} onChange={(event) => updateCompany(field as keyof typeof company, event.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30 focus:ring-4 focus:ring-white/10" />
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!allFiscalIdsValid} className="rounded-full bg-white text-black hover:bg-white/90"><Save className="h-4 w-4" /> Guardar alterações</Button>
              <Button type="button" variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10" onClick={() => { updateCompany('logoUrl', 'https://dummyimage.com/180x180/d4af37/111827&text=RC'); showToast('Upload de logo simulado.'); }}><UploadCloud className="h-4 w-4" /> Simular upload de logo</Button>
              {saved ? <span className="inline-flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Guardado no localStorage demo.</span> : null}
            </div>
          </section>

          <aside id="enterprise-status" className="space-y-6">
            <section className={`premium-card rounded-[2rem] p-6 ${isEnterprise ? 'ring-1 ring-white/30' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/45">Plano atual</p>
                  <h2 className="mt-1 text-4xl font-semibold tracking-[-0.04em] text-white">{plan}</h2>
                </div>
                <Badge className="rounded-full bg-white px-3 py-1 text-black">{isEnterprise ? <Diamond className="mr-1 h-3.5 w-3.5" /> : <Crown className="mr-1 h-3.5 w-3.5" />}{isEnterprise ? 'Enterprise' : 'Upgrade disponível'}</Badge>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-lg"><Image src={company.logoUrl} alt="Logo da empresa" fill className="object-cover" unoptimized /></div>
                <div>
                  <p className="font-semibold text-white">{company.tradeName}</p>
                  <p className="text-sm text-white/52">{company.city}, Europa</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3 rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10" onClick={openBillingPortal}>Gerir assinatura <ArrowRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/54">
                {isEnterprise ? 'Enterprise ativo: convites, operações multi-país e workflows de equipa ficam desbloqueados.' : 'Estado controlado: algumas ações aparecem bloqueadas até upgrade para evitar permissões confusas.'}
              </div>
            </section>
          </aside>
        </div>

        <section className="premium-card rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Identificação fiscal por país</h2>
              <p className="mt-1 text-sm leading-6 text-white/52">Cada país ajusta automaticamente tipo de identificação, helper e validação inline.</p>
            </div>
            <Button type="button" onClick={addFiscalCountry} variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10"><Plus className="h-4 w-4" /> Adicionar país</Button>
          </div>
          {!isBusinessOrEnterprise ? <div className="mt-5 rounded-2xl border border-dashed border-white/14 bg-white/[0.035] p-4 text-sm text-white/56" role="status"><LockKeyhole className="mr-2 inline h-4 w-4" /> No plano {plan}, a gestão multi-país aparece como preview bloqueado. Faça upgrade para Business ou Enterprise.</div> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2">{fiscalIds.map((item) => { const meta = fiscalCountries[item.country]; const valid = isFiscalIdValid(item); return <div key={item.id} className={`relative rounded-2xl border border-white/10 p-4 transition ${!isBusinessOrEnterprise ? 'bg-white/[0.025] opacity-75' : 'bg-white/[0.035] hover:border-white/20'}`}>{!isBusinessOrEnterprise ? <div className="absolute right-4 top-4 rounded-full bg-black/50 px-2 py-1 text-xs text-white/62"><LockKeyhole className="mr-1 inline h-3 w-3" /> Bloqueado</div> : null}<div className="grid gap-3 md:grid-cols-[0.85fr_1.15fr]"><label><span className="text-sm font-medium text-white/72">País</span><select disabled={!isBusinessOrEnterprise} value={item.country} onChange={(event) => updateFiscalId(item.id, 'country', event.target.value as CountryKey)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#050505] px-3 py-2 text-sm text-white outline-none focus:border-white/30 disabled:cursor-not-allowed">{(Object.keys(fiscalCountries) as CountryKey[]).map((country) => <option key={country}>{country}</option>)}</select></label><label><span className="text-sm font-medium text-white/72">{meta.label}</span><input disabled={!isBusinessOrEnterprise} value={item.value} onChange={(event) => updateFiscalId(item.id, 'value', event.target.value)} placeholder={meta.placeholder} className={`mt-1 w-full rounded-xl border bg-white/[0.035] px-3 py-2 text-sm text-white outline-none focus:border-white/30 disabled:cursor-not-allowed ${valid ? 'border-white/10' : 'border-red-400'}`} /><span className={`mt-1 block text-xs ${valid ? 'text-white/42' : 'text-red-300'}`}>{valid ? meta.helper : `Formato esperado: ${meta.helper}`}</span></label></div><button disabled={!isBusinessOrEnterprise} type="button" onClick={() => removeFiscalId(item.id)} className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/55 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="mr-1 inline h-4 w-4" /> Remover</button></div>; })}</div>
        </section>

        <section id="employees" className="premium-card rounded-[2rem] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3"><div className="rounded-2xl bg-white/10 p-3 text-white"><UsersRound className="h-5 w-5" /></div><div><h2 className="text-2xl font-semibold text-white">Gestão de funcionários</h2><p className="mt-1 text-sm text-white/52">Convites e papéis ficam explícitos antes do clique, evitando drift visual de permissões.</p></div></div>
          </div>
          {isEnterprise ? <div className="mt-5 space-y-5"><div className="grid gap-3 md:grid-cols-[1fr_220px_auto]"><input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="email@empresa.com" className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none focus:border-white/30" /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="rounded-2xl border border-white/10 bg-[#050505] px-4 py-3 text-sm text-white outline-none focus:border-white/30"><option>Admin</option><option>Editor</option><option>Visualizador</option></select><Button type="button" onClick={inviteEmployee} className="rounded-full bg-white text-black hover:bg-white/90"><Mail className="h-4 w-4" /> Convidar funcionário</Button></div><div className="grid gap-3 md:grid-cols-2">{employees.map((employee) => <div key={employee.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="font-semibold text-white">{employee.name}</p><p className="text-sm text-white/52">{employee.email}</p><div className="mt-3 flex gap-2"><Badge variant="outline" className="border-white/15 text-white">{employee.role}</Badge><Badge className="bg-white text-black">{employee.status}</Badge></div></div>)}</div></div> : <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-6 text-white/56" role="status"><LockKeyhole className="mr-2 inline h-4 w-4" /> Upgrade para o plano Enterprise e convide funcionários para colaborar na implementação dos documentos.<div><Button asChild className="mt-4 rounded-full bg-white text-black hover:bg-white/90"><Link href={`/${locale}/pricing`}>Fazer upgrade</Link></Button></div></div>}
        </section>

        <section id="privacy" className="premium-card rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3"><div className="rounded-2xl bg-white/10 p-3 text-white"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-2xl font-semibold text-white">Privacidade & GDPR</h2><p className="mt-1 text-sm leading-6 text-white/52">Ações protegidas por sessão. Exportação gera auditoria e notificação; apagamento fica pendente para revisão legal.</p></div></div>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10" onClick={downloadGdprExport}><Download className="h-4 w-4" /> Exportar dados</Button><Button type="button" variant="destructive" className="rounded-full" onClick={requestGdprDelete}><Trash2 className="h-4 w-4" /> Abrir centro GDPR</Button></div>
          </div>
        </section>
      </form>
    </main>
  );
}
