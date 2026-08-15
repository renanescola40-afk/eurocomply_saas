'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getCoreWorkflowCopy } from '@/lib/i18n/core-workflow-copy';

type DocumentDownloadButtonProps = {
  locale: string;
  documentId: string;
  onCreateSignedUrl: (documentId: string) => Promise<{ signedUrl: string }>;
};

export function DocumentDownloadButton({ locale, documentId, onCreateSignedUrl }: DocumentDownloadButtonProps) {
  const copy = getCoreWorkflowCopy(locale).documents;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const result = await onCreateSignedUrl(documentId);
      window.location.assign(result.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.downloadError);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleDownload} disabled={loading} className="focus-visible:ring-2">
        {loading ? copy.preparing : copy.download}
      </Button>
      {error ? <p className="text-sm text-red-500" role="alert" aria-live="assertive">{error}</p> : null}
    </div>
  );
}
