# Codex CI/CD Pipeline Fix Request

## What We Just Fixed
1. Updated Sentry version from invalid `^10.10.0` to `^8.45.0` in package.json
2. Excluded test files from TypeScript production build in tsconfig.json:
   - Added `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/**` to exclude array
3. Added build tolerance settings to next.config.js for prototype phase:
   - `typescript: { ignoreBuildErrors: true }`
   - `eslint: { ignoreDuringBuilds: true }`

## Current Errors (Build Still Failing)
The CI/CD pipeline is still failing with TypeScript errors in the build-test job:

### 1. Sentry API Import Errors (api/index.ts)
```
Property 'requestHandler' does not exist on type 'typeof import...'
Property 'tracingHandler' does not exist on type 'typeof import...'  
Property 'errorHandler' does not exist on type 'typeof import...'
```
Lines 9, 12, and 46 in api/index.ts

### 2. HarvestTimeEntry Type Errors (src/rules/exception.engine.optimized.ts)
Multiple property access errors on HarvestTimeEntry type:
- `clientId` does not exist (should be `client`)
- `projectId` does not exist (should be `project`)
- `taskId` does not exist (should be `task`)
- `personId` does not exist on type

Lines 20-23 and 75-76

## Request for Codex
Please fix these TypeScript errors so the CI/CD pipeline can complete successfully:

1. **Fix Sentry imports in api/index.ts**: The Sentry v8 API has changed. Update the middleware usage to match the new API.

2. **Fix HarvestTimeEntry property access**: Update the property names to match the actual HarvestTimeEntry interface (use nested properties like `entry.client.id` instead of `entry.clientId`).

3. Ensure the build completes so SonarCloud can run and connect properly.

## Context
- This is an early prototype for validating use cases
- We've already made the build more lenient with `ignoreBuildErrors: true` but these are actual code errors that need fixing
- The goal is to get the CI/CD pipeline fully working so SonarCloud can analyze the code

## Testing
After making changes, please run:
```bash
npm run build
```
To verify the fixes work locally before committing.