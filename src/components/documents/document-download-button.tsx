"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type DocumentDownloadButtonProps = {
  documentId: string;
  onCreateSignedUrl: (documentId: string) => Promise<{ signedUrl: string }>;
};

export function DocumentDownloadButton({ documentId, onCreateSignedUrl }: DocumentDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const result = await onCreateSignedUrl(documentId);
      window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download document');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleDownload} disabled={loading}>
        {loading ? 'Preparing...' : 'Download'}
      </Button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
