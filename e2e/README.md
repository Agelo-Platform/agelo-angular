# apps/tests — End-to-end suite (Playwright + Cucumber + Testcontainers)

End-to-end BDD test suite for Agelo. Implements [Feature 013](../../Features/013-e2e.md):

- BDD architecture (Gherkin features + Cucumber step definitions).
- **Testcontainers** spins up the full Agelo stack via `docker-compose.e2e.yml` before the suite runs and tears it down (volumes included) afterwards.
- **Headless Playwright** drives the SPA; raw HTTP exercises the MCP-facing API.
- 100% feature coverage — one Gherkin feature per major area.

## Running

```bash
cd apps/tests
npm install
npx playwright install chromium
npm test
```

`npm test` boots the docker stack defined in `../../docker-compose.e2e.yml`, runs every scenario sequentially, screenshots failures into `reports/`, and tears the stack down (including volumes).

### Env overrides

| Var | Purpose |
|---|---|
| `AGELO_COMPOSE_DIR` | Path to the directory containing `docker-compose.e2e.yml`. Default: `../../`. |
| `AGELO_REUSE_RUNNING=1` | Skip starting — point at an already-running stack. |
| `AGELO_KEEP_STACK=1` | Don't tear the stack down at the end (debug only). |

## Coverage

| Feature doc | Coverage |
|---|---|
| 003 — Settings | login + bad creds + logout, theme persistence, password change, full API key CRUD |
| 004 — Board Flow | card types CRUD, custom fields, agent-pickup toggle, columns CRUD, transitions, relationships, runtime card flow |
| 005 — Roles & Permissions | seeded permissions list, toggle round-trip |
| 006 — Prompt Library | category create, prompt create with versions, save-as-new vs replace, prompt delete |
| 007 — Organizations | CRUD + duplicate-title rejection |
| 008 — Teams + Agents | team CRUD, onboarding md editor, agent register / approve / stop / delete |
| 009 — MCP Contract | onboarding read, register + poll, permissions endpoint, card update gating |
| 010 — Onboarding | covered under teams |
| 011 — Home Analytics | totals + per-column bar chart |
| 014 — Projects | exercised implicitly via the auto-created default project |
