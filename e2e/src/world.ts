import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from 'playwright';
import { ApiClient } from './support/api';

// Custom World for the suite. One instance per scenario — Cucumber wires this
// up automatically via setWorldConstructor.
export class AgeloWorld extends World {
  // Set once in BeforeAll (see hooks.ts).
  static frontendUrl: string;
  static apiBaseUrl: string;
  static browser: Browser;

  context!: BrowserContext;
  page!: Page;
  api!: ApiClient;

  // Per-scenario scratch space — useful for chaining steps.
  vars: Record<string, any> = {};
  authToken?: string;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(AgeloWorld);
