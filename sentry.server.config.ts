import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-forwarded-for'];
        delete event.request.headers['x-real-ip'];
        delete event.request.headers['x-supabase-auth'];
      }

      if (event.request?.cookies) {
        event.request.cookies = {};
      }

      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      return event;
    },
  });
}
