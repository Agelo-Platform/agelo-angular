// Cucumber configuration. Default profile compiles step files via ts-node and
// loads support code (hooks, world) before any feature scenarios run.
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['src/world.ts', 'src/hooks.ts', 'src/steps/**/*.ts'],
    paths: ['features/**/*.feature'],
    format: [
      'progress-bar',
      'summary',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
    parallel: 0,
    timeout: 120000,
  },
};
