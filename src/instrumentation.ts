import * as Sentry from '@sentry/nextjs';

const DEFAULT_PRODUCTION_TRACE_SAMPLE_RATE = 0.05;

function getTraceSampleRate(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function sanitizeErrorEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // Request headers/cookies and user objects are deliberately removed before an
  // event leaves the application boundary. Structured application context is
  // added separately through the sanitized observability helpers.
  event.request = undefined;
  event.user = undefined;
  return event;
}

export async function register() {
  const runtime = process.env.NEXT_RUNTIME;

  if (runtime === 'nodejs') {
    // Preserve the existing server-only environment normalization before Sentry
    // reads runtime configuration.
    await import('./instrumentation-node');
  }

  const isEdge = runtime === 'edge';
  const dsn = isEdge
    ? process.env.NEXT_PUBLIC_SENTRY_DSN
    : process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: isEdge
      ? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV
      : process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: isEdge
      ? process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA
      : process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: getTraceSampleRate(
      isEdge ? process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE : process.env.SENTRY_TRACES_SAMPLE_RATE,
      process.env.NODE_ENV === 'production' ? DEFAULT_PRODUCTION_TRACE_SAMPLE_RATE : 1.0,
    ),
    beforeSend: sanitizeErrorEvent,
  });
}

export const onRequestError = Sentry.captureRequestError;
