# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please email security concerns to **mhmdez@me.com** or open a [GitHub Security Advisory](https://github.com/mhmdez/voicebench/security/advisories/new).

We will acknowledge your report within 48 hours and aim to provide a fix or mitigation within 7 days for critical issues.

## Scope

VoiceBench runs locally and connects to voice AI provider APIs. Security concerns include:

- **API key exposure** — Provider API keys should never be committed or exposed in client-side code.
- **Database access** — SQLite database contains eval session data and should be protected.
- **Audio data** — Recorded audio and transcripts may contain sensitive content.
- **Dependency vulnerabilities** — We monitor dependencies and update regularly.

## Best Practices for Contributors

- Never commit secrets, tokens, or credentials.
- Use environment variables for sensitive configuration.
- Sanitize all user input before rendering or database operations.
- Keep dependencies up to date (`npm audit`).
