import { NextResponse } from 'next/server';
import type { RateLimitResult } from './rate-limit';

export function rateLimitResponse(result: RateLimitResult, message = 'Too many requests') {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
      },
    },
  );
}
