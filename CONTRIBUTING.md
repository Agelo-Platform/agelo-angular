# Contributing to agelo-angular

Thank you for considering a contribution. This guide covers the
mechanics — file an issue first if you'd like to discuss the design
behind a larger change before opening a PR.

## Development setup

Requirements:

- Node 20+
- A running [agelo-server](https://github.com/Agelo-Platform/agelo-server)
  reachable somewhere — the easiest path is the
  [`local-compose`](https://github.com/Agelo-Platform/local-compose) wrapper.

```bash
git clone https://github.com/Agelo-Platform/agelo-angular.git
cd agelo-angular
npm install
npm start    # ng serve on :4200, proxies to the backend at :3000
```

`npm run build` produces a production bundle in `dist/`; the bundled
`Dockerfile` + `docker-entrypoint.sh` rewrite the API base URL at
container start time so one image works everywhere.

## Code conventions

- Standalone components with explicit `imports`. No NgModules.
- Signals + `computed()` for state. Avoid RxJS BehaviorSubjects.
- OnPush change detection on every component.
- Control-flow `@if` / `@for` syntax — NOT `*ngIf` / `*ngFor`.
- Read 2-3 existing components in the same area before adding a new
  feature so your patterns match.
- Talk to the API exclusively through `core/api.service.ts`. Don't
  call `HttpClient` directly from feature components.

## End-to-end tests

`tests/` is a Cucumber + Playwright + Testcontainers suite that boots
a fresh stack per run. Add a `.feature` + matching step file when you
add or change a route. Run the suite before sending the PR:

```bash
cd tests
AGELO_COMPOSE_FILE=../docker-compose.yml AGELO_COMPOSE_DIR=.. npm test
```

## Pull request checklist

- [ ] `npm run build` succeeds (no new warnings).
- [ ] e2e suite passes.
- [ ] No `console.log` / `debugger` left in the diff.
- [ ] User-facing strings are concrete, technical, and free of marketing fluff.
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).

## Commit messages

We use Conventional Commits. Examples:

```
feat(board): filter status select to reachable columns
fix(prompt): use toast.warn (not toast.warning)
docs: link Appearance section in Settings shell
```

## Code of conduct

Be kind, be specific, and assume good faith. Harassment of any form
is not tolerated.

## License

By contributing you agree your work will be released under the project's
MIT [LICENSE](LICENSE).
