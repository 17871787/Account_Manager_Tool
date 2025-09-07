# CI/CD Pipeline Setup Guide

## Overview

This project implements a comprehensive CI/CD pipeline with automated testing, code quality checks, and deployment to Vercel.

## 🚀 Pipeline Components

### 1. Continuous Integration (CI)

- **Automated Testing**: Unit tests, integration tests
- **Code Quality**: ESLint, TypeScript checking
- **Security Scanning**: npm audit, Snyk
- **Performance Testing**: Lighthouse CI
- **Code Analysis**: SonarCloud/SonarQube

### 2. Continuous Deployment (CD)

- **Production**: Auto-deploy to Vercel on main branch
- **Preview**: Deploy PRs to preview environments
- **Rollback**: Automatic via Vercel dashboard

## 🔧 Required GitHub Secrets

Add these secrets in GitHub repository settings → Secrets and variables → Actions:

```yaml
# Vercel Deployment
VERCEL_TOKEN: Your Vercel API token
VERCEL_ORG_ID: Your Vercel organization ID
VERCEL_PROJECT_ID: Your project ID

# Code Quality
SONAR_TOKEN: SonarCloud token
CODECOV_TOKEN: Codecov token (optional)
SNYK_TOKEN: Snyk security token (optional)

# Lighthouse CI
LHCI_GITHUB_APP_TOKEN: Lighthouse CI GitHub App token

# API Keys (for runtime)
HARVEST_ACCESS_TOKEN: Harvest API token
HUBSPOT_API_KEY: HubSpot private app key
DATABASE_URL: PostgreSQL connection string
```

## 📊 Quality Gates

### Lighthouse CI Thresholds

- Performance: 85%
- Accessibility: 90%
- Best Practices: 90%
- SEO: 90%

### SonarQube Quality Gates

- Code Coverage: 80%
- Security Hotspots: 0
- Code Duplications: <3%
- Maintainability Rating: A

### Test Coverage Requirements

- Branches: 70%
- Functions: 75%
- Lines: 80%
- Statements: 80%

## 🛡️ Branch Protection Rules

Configure in GitHub → Settings → Branches → Add rule:

### Main Branch Protection

```yaml
Branch name pattern: main

✅ Require pull request reviews before merging
  - Required approving reviews: 1
  - Dismiss stale pull request approvals
  - Require review from CODEOWNERS

✅ Require status checks to pass before merging
  - build-test
  - lighthouse
  - sonarcloud
  - security
  - quality-gate

✅ Require branches to be up to date before merging
✅ Require conversation resolution before merging
✅ Require signed commits (optional)
✅ Include administrators
✅ Restrict who can push to matching branches
```

## 🔄 Workflow Triggers

The CI/CD pipeline runs on:

- **Push to main**: Full pipeline + production deploy
- **Push to develop**: CI tests only
- **Pull Requests**: CI tests + preview deploy
- **Manual trigger**: Via GitHub Actions tab

## 📈 Monitoring & Reporting

### Lighthouse CI Reports

- View at: GitHub Actions → Workflow run → Artifacts
- Metrics: Core Web Vitals, Performance scores

### SonarCloud Dashboard

- URL: https://sonarcloud.io/project/overview?id=17871787_Account_Manager_Tool
- Metrics: Code smells, vulnerabilities, coverage

### Test Coverage

- Local: `npm test -- --coverage`
- CI: Automatically uploaded to Codecov

## 🧪 Running Tests Locally

```bash
# Install dependencies
npm ci

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run Lighthouse locally
npm install -g @lhci/cli
lhci autorun

# Run ESLint
npm run lint

# Type checking
npm run typecheck
```

## 🚨 Troubleshooting

### Pipeline Failures

1. **Build failures**: Check TypeScript errors

   ```bash
   npm run typecheck
   ```

2. **Test failures**: Run tests locally

   ```bash
   npm test
   ```

3. **Lighthouse failures**: Check performance

   ```bash
   npm run build
   npm run start
   # In another terminal:
   lighthouse http://localhost:3000
   ```

4. **SonarCloud issues**: Check code quality
   - View detailed report in SonarCloud dashboard
   - Fix security hotspots and code smells

## 📝 Commit Message Convention

Use conventional commits for better automation:

```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes
refactor: Code refactoring
test: Test changes
chore: Build/config changes
perf: Performance improvements
```

## 🔐 Security Considerations

1. **Secrets Management**: Never commit secrets
2. **Dependency Updates**: Automated via Dependabot
3. **Security Scanning**: Snyk runs on every PR
4. **SAST**: SonarCloud static analysis

## 📊 Performance Budgets

Defined in `lighthouserc.js`:

- First Contentful Paint: <2s
- Largest Contentful Paint: <2.5s
- Total Blocking Time: <300ms
- Cumulative Layout Shift: <0.1

## 🎯 Integration with ChatGPT/Codex

For code auditing via ChatGPT web app:

1. Pipeline generates reports in Actions artifacts
2. Download lighthouse-results.zip
3. Upload to ChatGPT for analysis
4. Review recommendations and create issues

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Vercel CI/CD](https://vercel.com/docs/concepts/deployments/overview)
