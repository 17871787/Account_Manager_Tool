'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function SentryExamplePage() {
  const [testType, setTestType] = useState<string>('');

  const triggerError = () => {
    throw new Error('Test Sentry Error - Dashboard is working!');
  };

  const triggerTypeError = () => {
    // @ts-expect-error - Intentional error for testing
    myUndefinedFunction();
  };

  const triggerAsyncError = async () => {
    const response = await fetch('/api/non-existent-endpoint');
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
  };

  const captureMessage = () => {
    Sentry.captureMessage('Test message from AM Copilot', 'info');
    setTestType('Message sent to Sentry!');
  };

  const captureException = () => {
    try {
      // @ts-expect-error
      const result = someUndefinedVariable.property;
    } catch (error) {
      Sentry.captureException(error);
      setTestType('Exception captured and sent!');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold">Sentry Test Page</h1>
        
        <p className="mb-8 text-gray-600">
          Click any button below to test different types of Sentry error tracking.
        </p>

        <div className="space-y-4">
          <div>
            <button
              onClick={triggerError}
              className="w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Trigger Test Error
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Throws a basic error that will be caught by error boundary
            </p>
          </div>

          <div>
            <button
              onClick={triggerTypeError}
              className="w-full rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
            >
              Trigger Undefined Function Error
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Calls myUndefinedFunction() as suggested by Sentry
            </p>
          </div>

          <div>
            <button
              onClick={triggerAsyncError}
              className="w-full rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
            >
              Trigger Async API Error
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Makes a request to non-existent API endpoint
            </p>
          </div>

          <div>
            <button
              onClick={captureMessage}
              className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Send Test Message
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Sends an info message to Sentry (won&apos;t crash app)
            </p>
          </div>

          <div>
            <button
              onClick={captureException}
              className="w-full rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              Capture Handled Exception
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Catches and reports an error without crashing
            </p>
          </div>
        </div>

        {testType && (
          <div className="mt-6 rounded bg-green-100 p-4">
            <p className="text-green-800">{testType}</p>
          </div>
        )}

        <div className="mt-8 rounded bg-gray-100 p-4">
          <h2 className="mb-2 font-semibold">Setup Checklist:</h2>
          <ul className="space-y-1 text-sm">
            <li>✅ Sentry SDK installed (@sentry/nextjs)</li>
            <li>✅ Error boundaries configured</li>
            <li>✅ Sentry configs created</li>
            <li>⏳ Add DSN to .env.local</li>
            <li>⏳ Deploy to Vercel</li>
            <li>⏳ Check Sentry Dashboard for errors</li>
          </ul>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
