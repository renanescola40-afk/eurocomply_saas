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

type EvidenceDownload = () => PromiseLike<{ data: Blob | null; error: unknown }>;

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

/**
 * Upload without overwriting immutable evidence. A failed or lost provider
 * response is recoverable only if a private readback proves identical bytes.
 * A real upload error always remains fatal when that proof is missing.
 */
export async function uploadImmutableEvidenceObject(input: {
  expectedSize: number;
  expectedSha256: string;
  upload: () => PromiseLike<{ error: unknown }>;
  download: EvidenceDownload;
}): Promise<void> {
  let uploadError: unknown;
  try {
    const result = await input.upload();
    if (!result.error) return;
    uploadError = result.error;
  } catch (error) {
    // A transport failure might occur after Storage already wrote the bytes.
    uploadError = error;
  }

  const recovered = await verifyExistingEvidenceObject(input);
  if (!recovered) throw uploadError;
}
