import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  ValidationError,
  readBoundedJsonRequest,
  validateJsonRequest,
  validationErrorResponse,
} from './validate';

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('https://app.example.test/api/example', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body,
  });
}

describe('bounded JSON request validation', () => {
  it('parses JSON requests within the configured byte limit', async () => {
    const payload = await readBoundedJsonRequest<{ ok: boolean }>(jsonRequest('{"ok":true}'), {
      maxBytes: 64,
    });

    expect(payload).toEqual({ ok: true });
  });

  it('accepts vendor JSON media types', async () => {
    const payload = await readBoundedJsonRequest<{ ok: boolean }>(
      jsonRequest('{"ok":true}', { 'content-type': 'application/vnd.eurocomply+json; charset=utf-8' }),
      { maxBytes: 64 },
    );

    expect(payload.ok).toBe(true);
  });

  it('rejects missing JSON content type by default', async () => {
    const request = new Request('https://app.example.test/api/example', {
      method: 'POST',
      body: '{"ok":true}',
    });

    await expect(readBoundedJsonRequest(request, { maxBytes: 64 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects oversized content length before parsing', async () => {
    const request = jsonRequest('{"ok":true}', { 'content-length': '1000' });

    await expect(readBoundedJsonRequest(request, { maxBytes: 32 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects oversized bodies even when content length is absent or wrong', async () => {
    const request = jsonRequest(JSON.stringify({ value: 'x'.repeat(256) }), { 'content-length': '1' });

    await expect(readBoundedJsonRequest(request, { maxBytes: 32 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('validates parsed payloads with zod', async () => {
    const schema = z.object({ name: z.string().min(2) });
    const payload = await validateJsonRequest(jsonRequest('{"name":"EU"}'), schema, { maxBytes: 64 });

    expect(payload).toEqual({ name: 'EU' });
  });

  it('returns sanitized no-store validation errors', async () => {
    const response = validationErrorResponse(new ValidationError([{ code: 'custom', path: ['secret'], message: 'raw provider detail' } as z.ZodIssue]));

    expect(response).not.toBeNull();
    expect(response?.status).toBe(400);
    expect(response?.headers.get('cache-control')).toBe('no-store');
    expect(response?.headers.get('x-content-type-options')).toBe('nosniff');

    const body = await response?.json();
    expect(body).toEqual({ error: 'invalid_request_payload', issues: [{ path: 'secret', code: 'custom' }] });
  });
});
