# Database Configuration

The application connects to PostgreSQL through the shared `getPool` helper in
`src/models/database.ts`. Connections now default to full TLS certificate
verification so that production environments (for example Vercel -> Neon or
RDS) remain secure without extra configuration.

## SSL mode

| Mode | Description | When to use |
| --- | --- | --- |
| `verify-full` *(default)* | TLS with certificate verification enabled. Loads CA/cert/key values when provided. | Production and staging deployments. |
| `allow-invalid` | TLS enabled but certificate verification disabled (`rejectUnauthorized: false`). | Short-lived local testing against self-signed certificates. |
| `disable` | Turns TLS off entirely. | Only when connecting to a local database that does not support TLS. |

Set the mode with `DATABASE_SSL_MODE`. Any value other than the options above
falls back to `verify-full` and logs a warning.

## Certificate material

You can supply custom certificates with the following environment variables:

- `DATABASE_SSL_CA`
- `DATABASE_SSL_CERT`
- `DATABASE_SSL_KEY`

Provide PEM-encoded values. When storing them inline (for example in Vercel
Environment Variables) replace literal newlines with `\n`; the loader will
expand them automatically at runtime.

## Development tips

If you previously relied on SSL being disabled by default, set
`DATABASE_SSL_MODE=disable` or `allow-invalid` in your local `.env.local` file.
Remember to remove the override before deploying to any shared environment.
