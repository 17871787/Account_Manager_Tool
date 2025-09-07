# Sentry Setup Guide

## 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account (includes 5K errors/month)
3. Create a new project:
   - Platform: **Next.js**
   - Project name: **am-copilot**
   - Team: Your team name

## 2. Get Your DSN

After creating the project, you'll get a DSN that looks like:
```
https://abc123@o123456.ingest.sentry.io/1234567
```

## 3. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Required - Your project DSN
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Optional - For source maps (better error tracking)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=am-copilot
SENTRY_AUTH_TOKEN=your-auth-token

# Development debugging
SENTRY_DEBUG=false
NEXT_PUBLIC_SENTRY_DEBUG=false
```

## 4. Get Auth Token (Optional but Recommended)

For source map uploads and better error context:

1. Go to Settings → Account → API → Auth Tokens
2. Create new token with scopes:
   - `project:releases`
   - `org:read`
3. Add to `.env.local` as `SENTRY_AUTH_TOKEN`

## 5. Vercel Integration

Add Sentry environment variables to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all Sentry variables from `.env.local`
3. Deploy to apply changes

## 6. Test Integration

### Test Error Tracking

Add this temporary button to your dashboard:

```typescript
<button
  onClick={() => {
    throw new Error('Test Sentry Error');
  }}
  className="bg-red-500 text-white px-4 py-2 rounded"
>
  Test Sentry Error
</button>
```

### Test API Error

Make a request to a non-existent endpoint:

```typescript
fetch('/api/test-error')
  .then(res => res.json())
  .catch(err => console.error('Expected error:', err));
```

## 7. Features Configured

✅ **Error Tracking**: Automatic error capture
✅ **Performance Monitoring**: 10% of transactions in production
✅ **Session Replay**: Replay user sessions when errors occur
✅ **Release Tracking**: Track which release caused errors
✅ **Source Maps**: See exact code location of errors
✅ **User Context**: Track which user experienced error
✅ **Breadcrumbs**: See user actions before error

## 8. Dashboard Features

In your Sentry dashboard, you can:

- **Issues**: See all errors grouped by similarity
- **Performance**: Monitor API response times
- **Releases**: Track error rates per deployment
- **User Feedback**: Get feedback when errors occur
- **Alerts**: Set up Slack/email notifications

## 9. Alert Rules

Recommended alerts to set up:

1. **High Error Rate**: >10 errors in 5 minutes
2. **New Error Type**: First occurrence of new error
3. **Performance**: API response >3 seconds
4. **Failed Sync**: Harvest/HubSpot sync failures

## 10. Best Practices

### DO:
- Use `captureException` for handled errors
- Add user context when user logs in
- Use breadcrumbs for important actions
- Set transaction names for API routes

### DON'T:
- Log sensitive data (passwords, API keys)
- Capture expected errors (e.g., validation)
- Leave test errors in production code
- Ignore Sentry alerts

## 11. Monitoring Checklist

Weekly review:
- [ ] Check error trends
- [ ] Review slowest transactions
- [ ] Investigate error spikes
- [ ] Update alert thresholds
- [ ] Clean up resolved issues

## 12. Troubleshooting

**Not seeing errors?**
- Check DSN is correct
- Verify environment variables in Vercel
- Check browser console for Sentry initialization

**Too many errors?**
- Filter out expected errors in `beforeSend`
- Adjust `tracesSampleRate` if needed
- Use `ignoreErrors` option

**Missing context?**
- Ensure auth token is set for source maps
- Check that build uploads source maps
- Verify user context is being set

## Support

- [Sentry Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Integration](https://docs.sentry.io/product/integrations/deployment/vercel/)
- Support: support@sentry.io
