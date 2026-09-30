'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, FileCheck2, Loader2, ShieldAlert, UploadCloud } from 'lucide-react';

type Locale = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

type VerifyResult = {
  valid: boolean;
  validHash?: boolean;
  validSignature?: boolean;
  signed?: boolean;
  payloadHash?: string;
  expectedHash?: string;
  error?: string;
};

const copy: Record<Locale, {
  paste: string; placeholder: string; verify: string; verifying: string; valid: string; invalid: string; hash: string; signature: string; signed: string; unsigned: string; upload: string; parseError: string;
}> = {
  en: { paste: 'Paste exported JSON', placeholder: 'Paste the full RISCK COMPLY evidence pack export here...', verify: 'Verify package', verifying: 'Verifying...', valid: 'Evidence pack is valid', invalid: 'Evidence pack could not be verified', hash: 'Payload hash', signature: 'Signature check', signed: 'Signed export', unsigned: 'Unsigned export', upload: 'Load JSON file', parseError: 'The content is not valid JSON.' },
  pt: { paste: 'Cole o JSON exportado', placeholder: 'Cole aqui o export completo do pacote de evidências RISCK COMPLY...', verify: 'Verificar pacote', verifying: 'A verificar...', valid: 'O pacote de evidências é válido', invalid: 'Não foi possível verificar o pacote de evidências', hash: 'Hash do payload', signature: 'Verificação da assinatura', signed: 'Export assinado', unsigned: 'Export sem assinatura', upload: 'Carregar ficheiro JSON', parseError: 'O conteúdo não é JSON válido.' },
  es: { paste: 'Pega el JSON exportado', placeholder: 'Pega aquí el export completo del paquete de evidencias RISCK COMPLY...', verify: 'Verificar paquete', verifying: 'Verificando...', valid: 'El paquete de evidencias es válido', invalid: 'No se pudo verificar el paquete de evidencias', hash: 'Hash del payload', signature: 'Verificación de firma', signed: 'Export firmado', unsigned: 'Export sin firma', upload: 'Cargar archivo JSON', parseError: 'El contenido no es JSON válido.' },
  fr: { paste: 'Coller le JSON exporté', placeholder: 'Collez ici l’export complet du pack de preuves RISCK COMPLY...', verify: 'Vérifier le pack', verifying: 'Vérification...', valid: 'Le pack de preuves est valide', invalid: 'Le pack de preuves n’a pas pu être vérifié', hash: 'Hash du payload', signature: 'Vérification de signature', signed: 'Export signé', unsigned: 'Export non signé', upload: 'Charger un fichier JSON', parseError: 'Le contenu n’est pas un JSON valide.' },
  it: { paste: 'Incolla il JSON esportato', placeholder: 'Incolla qui l’export completo del pacchetto evidenze RISCK COMPLY...', verify: 'Verifica pacchetto', verifying: 'Verifica...', valid: 'Il pacchetto evidenze è valido', invalid: 'Impossibile verificare il pacchetto evidenze', hash: 'Hash del payload', signature: 'Verifica firma', signed: 'Export firmato', unsigned: 'Export non firmato', upload: 'Carica file JSON', parseError: 'Il contenuto non è JSON valido.' },
  de: { paste: 'Exportiertes JSON einfügen', placeholder: 'Fügen Sie hier den vollständigen RISCK COMPLY Evidence-Pack-Export ein...', verify: 'Paket prüfen', verifying: 'Prüfung...', valid: 'Das Evidence Pack ist gültig', invalid: 'Das Evidence Pack konnte nicht geprüft werden', hash: 'Payload-Hash', signature: 'Signaturprüfung', signed: 'Signierter Export', unsigned: 'Nicht signierter Export', upload: 'JSON-Datei laden', parseError: 'Der Inhalt ist kein gültiges JSON.' },
};

export function EvidencePackVerifier({ locale }: { locale: string }) {
  const normalizedLocale = (['en', 'pt', 'es', 'fr', 'it', 'de'].includes(locale) ? locale : 'en') as Locale;
  const t = copy[normalizedLocale];
  const [rawJson, setRawJson] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!rawJson.trim()) return null;
    try { return JSON.parse(rawJson) as unknown; } catch { return null; }
  }, [rawJson]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!parsed) { setError(t.parseError); return; }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/audit/evidence-pack/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed),
      });
      const body = (await response.json()) as VerifyResult;
      setResult(body);
      if (!response.ok && body.error) setError(body.error);
    } catch {
      setError(t.invalid);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    setError(null);
    setRawJson(await file.text());
  }

  return (
    <form onSubmit={handleVerify} className="space-y-5 rounded-xl border border-slate-800 bg-[#0b121e] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{t.paste}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">JSON export, payload hash and optional signature are checked server-side.</p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#0d1624] px-4 text-sm font-medium text-slate-100 transition hover:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-400">
          <UploadCloud className="h-4 w-4" aria-hidden="true" /> {t.upload}
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} />
        </label>
      </div>

      <textarea
        value={rawJson}
        onChange={(event) => setRawJson(event.target.value)}
        placeholder={t.placeholder}
        aria-label={t.paste}
        className="min-h-[320px] w-full rounded-lg border border-slate-700 bg-[#0d1624] p-4 font-mono text-xs leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />

      {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.08] p-4 text-sm text-rose-50" role="alert">{error}</div> : null}

      {result ? (
        <div className={`rounded-xl border p-5 ${result.valid ? 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-50' : 'border-rose-300/20 bg-rose-300/[0.08] text-rose-50'}`} role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            {result.valid ? <CheckCircle2 className="mt-0.5 h-5 w-5" aria-hidden="true" /> : <ShieldAlert className="mt-0.5 h-5 w-5" aria-hidden="true" />}
            <div className="min-w-0 space-y-3">
              <p className="font-semibold">{result.valid ? t.valid : t.invalid}</p>
              <div className="grid gap-2 text-xs md:grid-cols-2">
                <p>{t.hash}: {result.validHash ? 'OK' : 'Failed'}</p>
                <p>{t.signature}: {result.validSignature === undefined ? 'N/A' : result.validSignature ? 'OK' : 'Failed'}</p>
                <p>{result.signed ? t.signed : t.unsigned}</p>
                <p className="break-all">{result.payloadHash ? `${t.hash}: ${result.payloadHash}` : null}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button type="submit" disabled={isVerifying || !rawJson.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50">
        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileCheck2 className="h-4 w-4" aria-hidden="true" />}
        {isVerifying ? t.verifying : t.verify}
      </button>
    </form>
  );
}
