export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Environment
      environment: process.env.NODE_ENV,

      // Filtering
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (
          process.env.NODE_ENV === "development" &&
          !process.env.SENTRY_DEBUG
        ) {
          return null;
        }

        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Environment
      environment: process.env.NODE_ENV,

      // Filtering
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (
          process.env.NODE_ENV === "development" &&
          !process.env.SENTRY_DEBUG
        ) {
          return null;
        }

        return event;
      },
    });
  }
}
