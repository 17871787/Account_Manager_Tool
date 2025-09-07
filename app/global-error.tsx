'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <div className="max-w-md rounded-lg bg-red-50 p-8 text-center">
            <h2 className="mb-4 text-2xl font-bold text-red-800">
              Something went wrong!
            </h2>
            <p className="mb-6 text-red-600">
              An unexpected error occurred. Our team has been notified.
            </p>
            <button
              onClick={reset}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
