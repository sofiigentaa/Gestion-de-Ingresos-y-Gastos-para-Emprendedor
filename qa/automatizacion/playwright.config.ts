import { defineConfig, devices } from '@playwright/test';

/* Chrome instalado en el equipo: no se descargan navegadores. */
const chrome = { channel: 'chrome', launchOptions: { chromiumSandbox: false } };
const PUERTO = 4173;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/resultados.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  /* La aplicación se prueba desde su `dist/` ya compilado, servido en loopback. IYG_DIST lo fija correr.sh. */
  webServer: {
    command: 'node scripts/servir.mjs',
    env: { IYG_DIST: process.env.IYG_DIST ?? '', PUERTO: String(PUERTO) },
    url: `http://127.0.0.1:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', grepInvert: /@movil/, use: { ...devices['Desktop Chrome'], ...chrome, viewport: { width: 1366, height: 768 } } },
    { name: 'movil', grep: /@movil/, use: { ...devices['Pixel 7'], ...chrome, viewport: { width: 390, height: 844 } } },
  ],
});
