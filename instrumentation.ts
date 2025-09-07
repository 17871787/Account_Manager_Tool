async function initSentry(runtime: 'node' | 'edge') {
  const Sentry = await import('@sentry/nextjs');

  const options = {
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
        return null;
      }

      return event;
    },
  };

  const runtimeOptions = runtime === 'node' ? {} : {};

  Sentry.init({
    ...options,
    ...runtimeOptions,
  });
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await initSentry('node');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await initSentry('edge');
  }
}