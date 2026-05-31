# Security policy

## Reporting a vulnerability

**Please do not open public GitHub issues for security bugs.**

Use GitHub's private vulnerability reporting form on this repository:

> **Repo → Security → Report a vulnerability**

Or email <sir.jeff.nasseri@gmail.com> with the subject prefix
`[agelo-angular security]`.

Include:

- A short description of the issue and its impact
- Steps to reproduce or a proof-of-concept
- Affected versions / commits if known
- Whether the issue is currently public

## What to expect

- An acknowledgement within 72 hours.
- A triage decision and a target fix window within 7 days.
- A coordinated disclosure: we'll keep you in the loop until a patched
  release lands and a security advisory is published.

## Supported versions

Until Agelo cuts its first stable release, only `master` is supported.

## Out of scope

- Self-XSS that needs the user to paste arbitrary code into devtools
- Open redirects only reachable from URL parameters that the SPA
  sanitises before navigating
- Vulnerabilities in transitive npm dependencies that already have a
  public advisory and a fix in `master`

Thank you for helping keep Agelo safe.
