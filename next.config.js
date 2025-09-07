const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  // Prototype settings - remove for production
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = withSentryConfig(
  nextConfig,
  {
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
  }
);