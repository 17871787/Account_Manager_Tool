# 🔍 Codex/ChatGPT Code Review Prompt

## Instructions for AI Code Review

Copy and paste this prompt into ChatGPT/Codex along with the codebase or specific files:

---

## PROMPT:

You are a senior software architect conducting a comprehensive code review of the MoA Account Manager AI (AM Copilot) codebase. Please analyze the code using the CODEX-CODEBASE-GUIDE.md as your reference standard.

### ⚠️ IMPORTANT CONTEXT - EARLY PROTOTYPE PHASE ⚠️
**This is an EARLY PROTOTYPE focused on:**
- Validating functional use cases and workflows
- Testing business logic accuracy (profitability calculations)
- Proving integration capabilities (Harvest, HubSpot, SFT)
- Getting user feedback on the exception-driven approach

**NOT current priorities:**
- API authentication/authorization (internal tool, not public)
- Comprehensive input validation (trusted users only)
- Rate limiting (low volume usage expected)
- Production-grade security hardening

Please adjust your review severity accordingly. Focus on functionality, business logic correctness, and user experience over security hardening.

### Review Scope:
- **Repository**: https://github.com/17871787/Account_Manager_Tool
- **Tech Stack**: Next.js 15, TypeScript, PostgreSQL, Node.js, Vercel
- **Purpose**: Profitability and billing management for Map of Ag
- **Stage**: Early Prototype / Proof of Concept

### Perform the following analysis:

## 1. 🏗️ Architecture Review
- [ ] Is the separation of concerns properly maintained (frontend/backend/services)?
- [ ] Are the data flow patterns consistent with the documented architecture?
- [ ] Is the folder structure logical and scalable?
- [ ] Are there any circular dependencies?
- [ ] Rate the overall architecture (1-10) with justification

## 2. 🔒 Security Audit (PROTOTYPE CONTEXT)
**Note: This is an internal prototype - security hardening will come in production phase**
- [ ] Check for exposed API keys or secrets in code (HIGH PRIORITY)
- [ ] Check for SQL injection vulnerabilities (HIGH PRIORITY)
- [ ] Review error handling (no sensitive data in errors) (MEDIUM PRIORITY)
- [ ] ~~Validate input sanitization~~ (DEFER - trusted internal users)
- [ ] ~~Review authentication/authorization~~ (DEFER - internal tool)
- [ ] ~~Assess CORS configuration~~ (DEFER - not public facing)
- [ ] ~~Identify OWASP Top 10~~ (DEFER - prototype phase)

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

**IMPORTANT: Adjust scoring for PROTOTYPE phase**
Provide scores (1-10) considering this is an early prototype:

- **Functionality**: __/10 (Does it work? Are calculations correct?)
- **Business Logic**: __/10 (Profitability formula, exception rules)
- **User Experience**: __/10 (Dashboard usability, workflow clarity)
- **Integration Quality**: __/10 (Harvest/HubSpot/SFT connections)
- **Code Quality**: __/10 (TypeScript usage, structure)
- **Documentation**: __/10 (Is the code understandable?)
- **Overall Prototype Score**: __/10

**Production Readiness** (for context, not current priority):
- Security: __/10 (will be addressed before production)
- Performance: __/10 (will optimize after validation)
- Test Coverage: __/10 (will expand after core features stable)

## Output Format:

Please provide your review in the following format:

```markdown
# Code Review Report - AM Copilot (PROTOTYPE PHASE)

## Executive Summary
[2-3 sentence overview focusing on functionality and business value, not security]

## Functionality Issues 🔴 (BLOCKS PROTOTYPE TESTING)
[Issues that prevent the app from working or calculating correctly]

## Business Logic Issues 🟠 (AFFECTS USER VALIDATION)
[Issues with profitability calculations, exception rules, or workflows]

## User Experience Issues 🟡 (IMPACTS FEEDBACK QUALITY)
[Dashboard, navigation, or workflow issues that confuse users]

## Positive Findings ✅
[What's working well for the prototype goals]

## Detailed Findings
[Analysis focused on prototype priorities]

## Recommendations for Prototype Phase
[What to fix NOW to enable user testing]

## Recommendations for Production Phase
[What to address LATER before go-live]

## Prototype Success Assessment
[Is this ready for user testing? What's blocking validation?]
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