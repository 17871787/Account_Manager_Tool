/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
};

const sentryWebpackPluginOptions = {
  // Sentry Webpack Plugin Options
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps during build
  widenClientFileUpload: true,

  // Transpile SDK for compatibility
  transpileClientSDK: true,

  // Hide source maps from public
  hideSourceMaps: true,

  // Disable server source map uploading (optional)
  disableLogger: true,

  // Automatically instrument API routes
  automaticVercelMonitors: true,
};

const hasSentryEnv =
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT;

module.exports = hasSentryEnv
  ? require('@sentry/nextjs').withSentryConfig(
      nextConfig,
      sentryWebpackPluginOptions
    )
  : nextConfig;
