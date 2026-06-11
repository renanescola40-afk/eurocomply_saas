import { NextResponse } from 'next/server';
import { z, type ZodSchema } from 'zod';

export class ValidationError extends Error {
  issues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    super('Invalid request payload');
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export async function validateJsonRequest<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new ValidationError([
      {
        code: 'custom',
        path: [],
        message: 'Request body must be valid JSON',
      },
    ]);
  }

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
        error: 'Invalid request payload',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  return null;
}

export const safeUuidSchema = z.string().uuid();
export const safeSlugSchema = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/i);
export const safeShortTextSchema = z.string().trim().min(1).max(240);
export const safeLongTextSchema = z.string().trim().max(5000);
