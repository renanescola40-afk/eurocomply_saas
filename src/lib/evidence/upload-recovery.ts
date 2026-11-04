/**
 * Evidence uploads reserve immutable metadata before Storage creates the object.
 * If the upload response is lost (or returns duplicate), confirm that the
 * private object actually exists with the same bytes before treating it as
 * successful. Never overwrite a Storage object or change reserved metadata.
 */
export async function evidenceSha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

type EvidenceDownload = () => Promise<{ data: Blob | null; error: unknown }>;

export async function verifyExistingEvidenceObject(input: {
  expectedSize: number;
  expectedSha256: string;
  download: EvidenceDownload;
}): Promise<boolean> {
  if (!Number.isSafeInteger(input.expectedSize) || input.expectedSize < 0) return false;
  if (!/^[a-f0-9]{64}$/.test(input.expectedSha256)) return false;

  try {
    const { data, error } = await input.download();
    if (error || !data || data.size !== input.expectedSize) return false;
    return (await evidenceSha256Hex(data)) === input.expectedSha256;
  } catch {
    // Storage SELECT denied, missing object and transport errors are NOT proof.
    return false;
  }
}
