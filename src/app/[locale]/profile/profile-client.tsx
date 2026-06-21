'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Crown, Diamond, Download, LockKeyhole, Mail, Plus, Save, ShieldCheck, Trash2, UploadCloud, UsersRound } from 'lucide-react';
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

  async function requestGdprDelete() {
    const response = await fetch('/api/gdpr/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Pedido iniciado pelo painel de perfil.' }),
    });
    showToast(response.ok ? 'Pedido GDPR enviado para revisão.' : 'Não foi possível criar o pedido GDPR.');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.13),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.32))]">
      <DashboardCommandNavigation locale={locale} activePage="Perfil" />
      {toast ? <div className="fixed right-4 top-20 z-50 rounded-2xl border bg-background px-4 py-3 text-sm shadow-xl">{toast}</div> : null}

      <form id="company-data" onSubmit={saveProfile} className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <section className="rounded-[2rem] border bg-background/88 p-6 shadow-xl shadow-primary/5 backdrop-blur md:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">Perfil europeu</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Empresa, fiscalidade e equipa.</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">Gerencie dados comerciais, identificações fiscais por país, equipa e direitos GDPR.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['Essential', 'Professional', 'Business', 'Enterprise'] as const).map((item) => (
                <button key={item} type="button" onClick={() => { setPlan(item); showToast(`Plano simulado: ${item}`); }} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${plan === item ? 'border-primary bg-primary text-primary-foreground shadow-lg' : 'bg-background hover:bg-muted'}`}>
                  Simular {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-[2rem] border bg-background/88 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Building2 className="h-5 w-5" /></div>