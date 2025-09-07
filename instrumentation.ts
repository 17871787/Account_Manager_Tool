async function initSentry() {
  const isNode = process.env.NEXT_RUNTIME === 'nodejs';
  const Sentry = await (isNode
    ? import('@sentry/node')
    : import('@sentry/nextjs'));

  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
    ...(isNode && {
      integrations: [
        ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
      ],
    }),
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
        return null;
      }

      return event;
    },
  });
}

/**
 * Initializes Sentry for the current Next.js runtime.
 *
 * This function is executed via Next.js instrumentation and will
 * set up Sentry for supported runtimes.
 *
 * Supported runtimes:
 * - `nodejs` for Node.js server runtime
 * - `edge` for the Edge runtime
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' ||
    process.env.NEXT_RUNTIME === 'edge'
  ) {
    await initSentry();
  }
}
