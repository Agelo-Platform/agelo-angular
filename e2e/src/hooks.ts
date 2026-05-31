import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from 'playwright';
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
  Wait,
} from 'testcontainers';
import * as path from 'path';
import * as fs from 'fs';
import { AgeloWorld } from './world';
import { ApiClient } from './support/api';

setDefaultTimeout(120 * 1000);

let network: StartedNetwork | null = null;
let db: StartedTestContainer | null = null;
let backend: StartedTestContainer | null = null;
let frontend: StartedTestContainer | null = null;

// Build contexts default to ../<repo> from this e2e folder. Override via
// env vars when running from a different layout (e.g. CI checks out the
// two repos into custom paths).
const ANGULAR_REPO = process.env['AGELO_ANGULAR_PATH']
  ? path.resolve(process.env['AGELO_ANGULAR_PATH']!)
  : path.resolve(__dirname, '..', '..');
const SERVER_REPO = process.env['AGELO_SERVER_PATH']
  ? path.resolve(process.env['AGELO_SERVER_PATH']!)
  : path.resolve(ANGULAR_REPO, '..', 'agelo-server');

const KEEP_STACK = process.env['AGELO_KEEP_STACK'] === '1';
const REUSE_RUNNING = process.env['AGELO_REUSE_RUNNING'] === '1';

const FRONTEND_PORT = 80;
const BACKEND_PORT = 3000;
const DB_PORT = 3306;

const DB_NAME = 'agelo';
const DB_USER = 'agelo';
const DB_PASSWORD = 'agelo';
const DB_ROOT_PASSWORD = 'rootpw';

/**
 * BeforeAll: build images for the .NET backend and the Angular SPA via
 * Testcontainers' GenericContainer.fromDockerfile, plus a fresh MySQL,
 * wired into a private network. No docker-compose dependency — each run
 * is self-contained and isolated. Override the source repo locations via
 * AGELO_ANGULAR_PATH / AGELO_SERVER_PATH if your checkout layout differs.
 */
BeforeAll({ timeout: 25 * 60 * 1000 }, async () => {
  if (REUSE_RUNNING) {
    AgeloWorld.frontendUrl = 'http://localhost:4200';
    AgeloWorld.apiBaseUrl = 'http://localhost:3000/api/v1';
  } else {
    if (!fs.existsSync(path.join(SERVER_REPO, 'Dockerfile'))) {
      throw new Error(
        `Could not find Dockerfile at ${SERVER_REPO}. ` +
        `Set AGELO_SERVER_PATH to the agelo-server repo root.`,
      );
    }
    if (!fs.existsSync(path.join(ANGULAR_REPO, 'Dockerfile'))) {
      throw new Error(
        `Could not find Dockerfile at ${ANGULAR_REPO}. ` +
        `Set AGELO_ANGULAR_PATH to the agelo-angular repo root.`,
      );
    }

    // eslint-disable-next-line no-console
    console.log(`[e2e] Building images and bringing the stack up…`);
    // eslint-disable-next-line no-console
    console.log(`[e2e]   server context : ${SERVER_REPO}`);
    // eslint-disable-next-line no-console
    console.log(`[e2e]   angular context: ${ANGULAR_REPO}`);

    network = await new Network().start();

    db = await new GenericContainer('mysql:8.0')
      .withNetwork(network)
      .withNetworkAliases('agelo-db')
      .withEnvironment({
        MYSQL_ROOT_PASSWORD: DB_ROOT_PASSWORD,
        MYSQL_DATABASE: DB_NAME,
        MYSQL_USER: DB_USER,
        MYSQL_PASSWORD: DB_PASSWORD,
      })
      .withCommand(['--default-authentication-plugin=mysql_native_password'])
      .withWaitStrategy(Wait.forLogMessage(/ready for connections/i, 2))
      .withStartupTimeout(180_000)
      .start();

    const backendImage = await GenericContainer
      .fromDockerfile(SERVER_REPO)
      .build('agelo-backend:e2e', { deleteOnExit: false });

    backend = await backendImage
      .withNetwork(network)
      .withNetworkAliases('agelo-backend')
      .withEnvironment({
        ConnectionStrings__Default:
          `Server=agelo-db;Port=3306;Database=${DB_NAME};User=${DB_USER};Password=${DB_PASSWORD};`,
        ASPNETCORE_ENVIRONMENT: 'Production',
        ASPNETCORE_URLS: `http://+:${BACKEND_PORT}`,
        Jwt__Secret: 'agelo-e2e-jwt-secret-do-not-ship',
        Jwt__Issuer: 'agelo',
        Jwt__Audience: 'agelo-spa',
        Jwt__Lifetime: '12:00:00',
        Cors__Origins: '*',
        Sa__BootstrapEmail: 'architect@agelo.local',
        Sa__BootstrapPassword: 'Architect#1',
        RateLimit: 'off',
      })
      .withExposedPorts(BACKEND_PORT)
      // Listening-port probe — the Testcontainers log stream sometimes
      // closes before the .NET host prints "Application started". The
      // waitForBackend probe below handles real readiness via a fetch.
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(20 * 60 * 1000)
      .start();

    const frontendImage = await GenericContainer
      .fromDockerfile(ANGULAR_REPO)
      .build('agelo-frontend:e2e', { deleteOnExit: false });

    frontend = await frontendImage
      .withNetwork(network)
      .withNetworkAliases('agelo-frontend')
      .withExposedPorts(FRONTEND_PORT)
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(180_000)
      .start();

    // Use 127.0.0.1 explicitly — Node 20+ undici on Windows occasionally
    // resolves "localhost" to ::1 first and fails before falling back.
    const beHost = backend.getHost() === 'localhost' ? '127.0.0.1' : backend.getHost();
    const feHost = frontend.getHost() === 'localhost' ? '127.0.0.1' : frontend.getHost();
    AgeloWorld.apiBaseUrl = `http://${beHost}:${backend.getMappedPort(BACKEND_PORT)}/api/v1`;
    AgeloWorld.frontendUrl = `http://${feHost}:${frontend.getMappedPort(FRONTEND_PORT)}`;
  }

  // Final readiness probe — call /auth/login with empty body to confirm
  // any HTTP response (the .NET DatabaseInitializer takes ~30s on first
  // boot to run EnsureCreated + seed).
  await waitForBackend(AgeloWorld.apiBaseUrl);

  AgeloWorld.browser = await chromium.launch({ headless: true });

  // eslint-disable-next-line no-console
  console.log(
    `[e2e] Stack ready. Backend: ${AgeloWorld.apiBaseUrl}  Frontend: ${AgeloWorld.frontendUrl}`,
  );
});

/**
 * AfterAll: tear down the browser, then stop every container we started
 * and the network they ran on.
 */
AfterAll({ timeout: 5 * 60 * 1000 }, async () => {
  try {
    await AgeloWorld.browser?.close();
  } catch {
    /* noop */
  }
  if (KEEP_STACK) return;
  // eslint-disable-next-line no-console
  console.log('[e2e] Tearing down stack…');
  await frontend?.stop().catch(() => {});
  await backend?.stop().catch(() => {});
  await db?.stop().catch(() => {});
  await network?.stop().catch(() => {});
});

Before(async function (this: AgeloWorld) {
  this.context = await AgeloWorld.browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  // Inject the resolved API base into every page in this scenario so the
  // SPA (built with a placeholder URL) can reach the actual mapped
  // backend.
  await this.context.addInitScript((api: string) => {
    (window as any).__AGELO_API__ = api;
  }, AgeloWorld.apiBaseUrl);

  this.page = await this.context.newPage();
  this.api = new ApiClient(AgeloWorld.apiBaseUrl);
  this.vars = {};
  this.page.setDefaultTimeout(30 * 1000);
});

After(async function (this: AgeloWorld, scenario) {
  // On failure, capture a screenshot for triage.
  if (scenario.result?.status === 'FAILED' && this.page) {
    try {
      const name = `failure-${Date.now()}.png`;
      const file = path.resolve('reports', name);
      fs.mkdirSync('reports', { recursive: true });
      await this.page.screenshot({ path: file, fullPage: true });
      this.attach(`Screenshot saved: ${file}`);
    } catch {
      /* noop */
    }
  }
  await this.context?.close();
});

async function waitForBackend(baseUrl: string) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (res.status > 0) return;
    } catch {
      /* backend not yet listening */
    }
    await sleep(1500);
  }
  throw new Error(`Backend at ${baseUrl} never came online`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
