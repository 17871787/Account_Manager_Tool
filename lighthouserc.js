module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run build && npm run start",
      startServerReadyPattern: "ready on",
      startServerReadyTimeout: 30000,
      url: ["http://localhost:3000/", "http://localhost:3000/api/health"],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      preset: "lighthouse:recommended",
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "categories:pwa": ["warn", { minScore: 0.5 }],

        // Specific metrics thresholds
        "first-contentful-paint": ["error", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        interactive: ["error", { maxNumericValue: 3800 }],

        // Accessibility checks
        "color-contrast": "error",
        "heading-order": "error",
        "image-alt": "error",
        label: "error",

        // Best practices
        "errors-in-console": "warn",
        "no-vulnerable-libraries": "error",
        "js-libraries": "warn",
      },
    },
    upload: {
      target: "temporary-public-storage",
      // For GitHub integration (optional)
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.example.com',
      // token: process.env.LHCI_TOKEN,
    },
  },
};
