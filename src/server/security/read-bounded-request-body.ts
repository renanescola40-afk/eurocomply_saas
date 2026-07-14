export type BoundedRequestBodyResult =
  | { buffer: Buffer }
  | { error: 'empty_body' | 'body_too_large' };

function parseDeclaredLength(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<BoundedRequestBodyResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError('maxBytes must be a positive safe integer');
  }

  const declaredLength = parseDeclaredLength(request.headers.get('content-length'));
  if (declaredLength !== null && declaredLength > maxBytes) {
    return { error: 'body_too_large' };
  }

  if (!request.body) {
    return { error: 'empty_body' };
  }

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('body_too_large').catch(() => undefined);
        return { error: 'body_too_large' };
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    return { error: 'empty_body' };
  }

  return { buffer: Buffer.concat(chunks, totalBytes) };
}
