# Secret Management and Rotation Workflow

## Scope
This workflow covers all sensitive values used by the server and mobile/web integration environments, including:
- API keys
- Database connection strings
- Access tokens
- Session or signing secrets

## Source of truth
- Secrets must be provisioned through the deployment platform's secrets manager.
- `.env` files are for local development only and must never be committed.

## Rotation policy
- Rotate all production secrets on a 90-day cadence.
- Rotate immediately after any suspected exposure.
- For high-risk credentials (database/admin tokens), use a maximum 30-day cadence.

## Rotation procedure
1. Create a new secret version in the secret manager.
2. Deploy with dual-read support when possible (accept old + new for a short window).
3. Validate health/readiness and critical auth flows.
4. Revoke the old secret version.
5. Record rotation timestamp and owner in the operations log.

## Incident response
- If leakage is suspected:
  - Revoke and rotate affected secrets immediately.
  - Invalidate active sessions/tokens when applicable.
  - Review logs for anomalous access.
  - Document remediation steps and follow-up actions.
