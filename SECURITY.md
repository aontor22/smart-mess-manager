# Security Policy

## Supported version

Security fixes are applied to the latest version on the `main` branch.

## Reporting a vulnerability

Please do not disclose a suspected vulnerability in a public GitHub issue.
Report it privately to the repository owner with:

- the affected page/API/database operation;
- reproduction steps;
- the expected and actual behaviour;
- whether another user's or another mess workspace's data can be accessed or changed;
- screenshots or logs with secrets and personal information removed.

## Secrets and environment configuration

The repository must not contain real `.env`, `.env.local`, service-role keys,
database passwords, OAuth client secrets, or other privileged credentials.
Only `.env.example` should be committed.

The Supabase publishable/anon key is a client-side identifier and is not a
substitute for authorization. Access to shared mess data must be enforced by
PostgreSQL Row Level Security and narrowly scoped RPCs.

If a privileged secret is ever committed, remove it from the repository,
rotate/revoke it at the provider, and clean the Git history where appropriate.

## Security boundaries

The UI is not an authorization boundary. Manager/member permissions and
cross-mess isolation must be enforced in Supabase policies/functions even when
the browser is modified or requests are sent directly.
