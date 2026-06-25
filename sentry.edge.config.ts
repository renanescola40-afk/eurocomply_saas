import * as Sentry from '@sentry/nextjs';

const DEFAULT_PRODUCTION_TRACE_SAMPLE_RATE = 0.05;

function getTraceSampleRate(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function sanitizeErrorEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  event.request = undefined;
  event.user = undefined;
  return event;
}

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: getTraceSampleRate(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
      process.env.NODE_ENV === 'production' ? DEFAULT_PRODUCTION_TRACE_SAMPLE_RATE : 1.0,
    ),
    beforeSend: sanitizeErrorEvent,
  });
}
