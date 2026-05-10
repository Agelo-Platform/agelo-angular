# agelo-angular

The Angular 18 single-page app for the [Agelo](https://agelo.app)
platform. Talks to [agelo-server](https://github.com/Agelo-Platform/agelo-server)
over `/api/v1`.

Standalone components, signals + computed everywhere, OnPush change
detection, control-flow `@if` / `@for`, ng-zorro-antd 18 for the
component library, ngx-markdown for prose rendering, `@swimlane/ngx-graph`
for the board-flow diagrams.

```
src/app/
├── core/        # api client, auth, theme, project context, shortcut listener
├── features/   # auth · organizations · projects · board · board-flow ·
│                # cards · prompts · teams · settings · permissions · mcp · …
└── shared/     # brand mark, dialogs, markdown editor, helpers
```

## Pull and run from GHCR

Every push to `master` builds a new image and publishes it to
`ghcr.io/agelo-platform/agelo-angular` tagged with the GitVersion-derived
`AssemblySemVer` plus `:latest` and a `sha-…` tag.

```bash
# Authenticate against GHCR (the package is currently private to the org).
echo $GH_TOKEN | docker login ghcr.io -u <your-github-user> --password-stdin

# Pull and run the latest published image
docker pull ghcr.io/agelo-platform/agelo-angular:latest
docker run --rm -p 4200:80 \
  -e API_BASE_URL=http://localhost:3000/api/v1 \
  ghcr.io/agelo-platform/agelo-angular:latest
```

Pin a specific build with a tag:

```bash
docker pull ghcr.io/agelo-platform/agelo-angular:0.0.1.0
```

For the full stack (backend + database + website) use the
[`local-compose`](https://github.com/Agelo-Platform/local-compose)
project — its `docker-compose.ghcr.yml` boots all four services
straight from GHCR.

## Run locally (from source)

### With Docker

```bash
docker build -t agelo-angular .
docker run --rm -p 4200:80 agelo-angular
```

The container runs nginx and rewrites `__API_BASE_URL__` at start time
via the bundled `docker-entrypoint.sh`, so the same image works in
every environment.

For the full stack (backend + database + website) use the
[`local-compose`](https://github.com/Agelo-Platform/local-compose)
project.

### From source

```bash
npm install
npm start              # ng serve on :4200, proxying to a backend at :3000
npm run build          # production bundle in dist/
```

## End-to-end tests

```bash
cd e2e
AGELO_COMPOSE_FILE=../docker-compose.yml AGELO_COMPOSE_DIR=.. npm test
```

The suite uses Cucumber + Playwright + Testcontainers to spin up a fresh
backend + SPA + MySQL per run, drive 58 scenarios covering every
module, then tear the stack down. Reports + failure screenshots land
in `e2e/reports/`.

## Theme + accessibility

Three theme modes (light, dark, system) backed by the
`prefers-color-scheme` media query. Keyboard shortcuts via
`Settings → Shortcuts`; the global listener supports single combos and
2-step VS Code-style chords (e.g. `ctrl+b o`).

## Releases & CI/CD

GitOps end-to-end: every PR merged to `master` is automatically built
and published as a new image to GHCR.

| Workflow | Trigger | Result |
|---|---|---|
| [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml) | `pull_request` → `master` | Pulls the published `agelo-server` image from GHCR, builds the SPA from PR HEAD, runs all 58 e2e scenarios via Cucumber + Playwright + Testcontainers. Failure screenshots upload as a workflow artifact. Blocks merge on red. |
| [`.github/workflows/build-image.yml`](.github/workflows/build-image.yml) | `push` → `master` (and `workflow_dispatch`) | GitVersion → AssemblySemVer → multi-stage Dockerfile → push `ghcr.io/agelo-platform/agelo-angular:{version,latest,sha-…}`. |

GitVersion config lives in [`gitversion.yml`](gitversion.yml). Push a
`v0.1.0` git tag to anchor the next published image at that version.

## License

[MIT](LICENSE).
