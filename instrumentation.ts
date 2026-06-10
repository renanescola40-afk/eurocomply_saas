import * as Sentry from '@sentry/nextjs';

function sanitizeEvent(event: Sentry.Event) {
  event.request = undefined;
  event.user = undefined;
  return event;
}

function initSentry(dsn: string | undefined) {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    telemetry: false,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    beforeSend: sanitizeEvent,
  });
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initSentry(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    initSentry(process.env.NEXT_PUBLIC_SENTRY_DSN);
  }
}

export const onRequestError = Sentry.captureRequestError;
