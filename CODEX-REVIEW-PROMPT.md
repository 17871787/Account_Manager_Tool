# 🔍 Codex/ChatGPT Code Review Prompt

## Instructions for AI Code Review

Copy and paste this prompt into ChatGPT/Codex along with the codebase or specific files:

---

## PROMPT:

You are a senior software architect conducting a comprehensive code review of the MoA Account Manager AI (AM Copilot) codebase. Please analyze the code using the CODEX-CODEBASE-GUIDE.md as your reference standard.

### Review Scope:
- **Repository**: https://github.com/17871787/Account_Manager_Tool
- **Tech Stack**: Next.js 15, TypeScript, PostgreSQL, Node.js, Vercel
- **Purpose**: Profitability and billing management for Map of Ag

### Perform the following analysis:

## 1. 🏗️ Architecture Review
- [ ] Is the separation of concerns properly maintained (frontend/backend/services)?
- [ ] Are the data flow patterns consistent with the documented architecture?
- [ ] Is the folder structure logical and scalable?
- [ ] Are there any circular dependencies?
- [ ] Rate the overall architecture (1-10) with justification

## 2. 🔒 Security Audit
- [ ] Check for exposed API keys or secrets
- [ ] Validate input sanitization in API endpoints
- [ ] Review authentication/authorization implementation
- [ ] Check for SQL injection vulnerabilities
- [ ] Assess CORS configuration
- [ ] Identify any OWASP Top 10 vulnerabilities
- [ ] Review error handling (no sensitive data in errors)

## 3. ⚡ Performance Analysis
- [ ] Identify any N+1 query problems
- [ ] Check for unnecessary re-renders in React components
- [ ] Review bundle size and code splitting
- [ ] Assess database query optimization
- [ ] Check for memory leaks
- [ ] Validate caching strategies
- [ ] Does it meet Lighthouse performance budgets (>85%)?

## 4. 📊 Code Quality Assessment
- [ ] TypeScript type coverage and any 'any' types
- [ ] Code duplication (should be <3%)
- [ ] Cyclomatic complexity of functions
- [ ] Test coverage (should be >80%)
- [ ] ESLint violations
- [ ] Consistency with style guide
- [ ] Comment quality and documentation

## 5. 🧪 Testing Evaluation
- [ ] Test coverage adequacy
- [ ] Quality of test cases (edge cases covered?)
- [ ] Mock implementation appropriateness
- [ ] Integration test coverage
- [ ] E2E test scenarios
- [ ] Are the tests actually testing business logic?

## 6. 💼 Business Logic Validation
- [ ] Verify profitability calculation formula:
    - Margin = Revenue - (Billable Cost + Exclusion Cost)
- [ ] Validate exception detection rules
- [ ] Check task categorization logic (billable/exclusion/non-billable)
- [ ] Verify budget vs burn calculations
- [ ] Validate invoice generation accuracy

## 7. 🔄 API & Integration Review
- [ ] RESTful design principles adherence
- [ ] Error handling consistency
- [ ] Response format standardization
- [ ] Rate limiting implementation
- [ ] Timeout handling
- [ ] Retry logic for external APIs
- [ ] Webhook security (if applicable)

## 8. 🗄️ Database Review
- [ ] Schema design efficiency
- [ ] Index optimization
- [ ] Query performance
- [ ] Data integrity constraints
- [ ] Migration strategy
- [ ] Backup considerations

## 9. 🚀 DevOps & CI/CD
- [ ] GitHub Actions workflow efficiency
- [ ] Build time optimization
- [ ] Deployment strategy appropriateness
- [ ] Environment variable management
- [ ] Monitoring and logging setup
- [ ] Rollback capabilities

## 10. 📱 Frontend Specific
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Responsive design implementation
- [ ] State management efficiency
- [ ] Component reusability
- [ ] Loading states and error boundaries
- [ ] SEO optimization

## 11. 🐛 Bug Detection
Identify and list any potential bugs, including:
- [ ] Race conditions
- [ ] Null pointer exceptions
- [ ] Unhandled promise rejections
- [ ] Infinite loops
- [ ] Memory leaks
- [ ] Edge case failures

## 12. 🔧 Improvement Recommendations
Provide specific, actionable recommendations for:
1. **Critical** - Must fix immediately (security/data loss risks)
2. **High** - Should fix soon (bugs, performance issues)
3. **Medium** - Plan to fix (code quality, maintainability)
4. **Low** - Nice to have (optimizations, refactoring)

## 13. 📈 Scalability Assessment
- [ ] Can it handle 10x current load?
- [ ] Database scaling strategy
- [ ] API rate limiting adequacy
- [ ] Caching effectiveness
- [ ] Microservices potential

## 14. 🎯 PRD Compliance Check
Based on the Product Requirements Document:
- [ ] Does it meet all Phase 1 MVP requirements?
- [ ] Is the Q-review profitability formula correctly implemented?
- [ ] Are all user personas' needs addressed?
- [ ] Is the exception-driven workflow properly implemented?

## 15. 📊 Metrics & Scoring

Provide scores (1-10) for:
- Security: __/10
- Performance: __/10
- Code Quality: __/10
- Test Coverage: __/10
- Maintainability: __/10
- Documentation: __/10
- **Overall Score: __/10**

## Output Format:

Please provide your review in the following format:

```markdown
# Code Review Report - AM Copilot

## Executive Summary
[2-3 sentence overview of findings]

## Critical Issues 🔴
[List any security vulnerabilities or critical bugs]

## High Priority Issues 🟠
[List important issues affecting functionality]

## Code Quality Observations 🟡
[List code quality and maintainability issues]

## Positive Findings ✅
[What's done well]

## Detailed Findings
[Detailed analysis for each section above]

## Recommendations
[Prioritized list of improvements]

## Risk Assessment
[Any risks to production deployment]

## Next Steps
[Actionable items in priority order]
```

## Additional Context Files to Review:
1. `CODEX-CODEBASE-GUIDE.md` - Architecture reference
2. `src/types/index.ts` - Type definitions
3. `src/services/profitability.service.ts` - Core business logic
4. `src/rules/exception.engine.ts` - Exception detection
5. `.github/workflows/ci-cd.yml` - CI/CD pipeline
6. `lighthouserc.js` - Performance requirements
7. `sonar-project.properties` - Quality gates

---

**Note**: Focus on actionable feedback that improves security, performance, and maintainability. Prioritize findings by business impact.