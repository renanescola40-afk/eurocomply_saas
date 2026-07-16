import { NextResponse } from 'next/server';
import { z, type ZodSchema } from 'zod';

export const DEFAULT_JSON_BODY_MAX_BYTES = 64 * 1024;

export type JsonRequestOptions = {
  maxBytes?: number;
  requireJsonContentType?: boolean;
};

export class ValidationError extends Error {
  issues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    super('Invalid request payload');
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

function validationIssue(message: string): z.ZodIssue[] {
  return [
    {
      code: 'custom',
      path: [],
      message,
    },
  ];
}

function isJsonContentType(contentType: string | null) {
  if (!contentType) return false;
  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();
  return mediaType === 'application/json' || mediaType?.endsWith('+json') === true;
}

function getContentLength(request: Request) {
  const value = request.headers.get('content-length');
  if (!value) return null;

  const length = Number(value);
  return Number.isFinite(length) && length >= 0 ? length : null;
}

async function readBoundedRequestText(request: Request, maxBytes: number) {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel('Request body is too large');
        } catch {
          // Cancellation is best-effort; the size violation remains authoritative.
        }
        throw new ValidationError(validationIssue('Request body is too large'));
      }

      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(validationIssue('Request body could not be read'));
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    throw new ValidationError(validationIssue('Request body must be valid UTF-8'));
  }
}

export async function readBoundedJsonRequest<T = unknown>(
  request: Request,
  options: JsonRequestOptions = {},
): Promise<T> {
  const maxBytes = options.maxBytes ?? DEFAULT_JSON_BODY_MAX_BYTES;
  const requireJsonContentType = options.requireJsonContentType ?? true;

  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new ValidationError(validationIssue('JSON body limit is invalid'));
  }

  if (requireJsonContentType && !isJsonContentType(request.headers.get('content-type'))) {
    throw new ValidationError(validationIssue('Request body must be application/json'));
  }

  const contentLength = getContentLength(request);
  if (contentLength !== null && contentLength > maxBytes) {
    throw new ValidationError(validationIssue('Request body is too large'));
  }

  const text = await readBoundedRequestText(request, maxBytes);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ValidationError(validationIssue('Request body must be valid JSON'));
  }
}

export async function validateJsonRequest<T>(request: Request, schema: ZodSchema<T>, options?: JsonRequestOptions): Promise<T> {
  const payload = await readBoundedJsonRequest(request, options);
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }

  return result.data;
}

export function validationErrorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: 'invalid_request_payload',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
        })),
      },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  }

  return null;
}

export const safeUuidSchema = z.string().uuid();
export const safeSlugSchema = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/i);
export const safeShortTextSchema = z.string().trim().min(1).max(240);
export const safeLongTextSchema = z.string().trim().max(5000);
