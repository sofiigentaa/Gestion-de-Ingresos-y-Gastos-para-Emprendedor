import { test as base, expect } from '@playwright/test';
import { App, CLAVE_TRANSACCIONES } from '../pages/app.page';
import { ds01, F, type Mov } from '../data/ds';

/* Cada prueba corre en un contexto nuevo (localStorage vacío) con el reloj fijado en F (2026-11-19 12:00,
   Buenos Aires). El reloj sigue corriendo: las pruebas de Golondrina lo adelantan con `page.clock`.
   La aplicación se sirve en loopback y no debe pedir ningún otro origen: cualquier otro se corta y la prueba falla. */
const ORIGEN = 'http://127.0.0.1:4173';

export type Datos = Mov[] | 'ejemplo';

type Fixtures = {
  /* Orígenes ajenos que la página intentó pedir durante la prueba. */
  ajenos: string[];
  /* Abre la aplicación (modo local) con los movimientos indicados ya guardados; por defecto DS-01. */
  abrir: (datos?: Datos) => Promise<App>;
  /* La aplicación abierta con DS-01. */
  app: App;
};

export const test = base.extend<Fixtures>({
  ajenos: async ({ context }, use) => {
    const ajenos: string[] = [];
    await context.route(/^https?:/, (ruta) => {
      const url = new URL(ruta.request().url());
      if (url.origin === ORIGEN) return ruta.continue();
      ajenos.push(url.origin);
      return ruta.abort();
    });
    await use(ajenos);
    expect(ajenos, 'la página pidió orígenes externos').toEqual([]);
  },

  abrir: async ({ page, ajenos: _ }, use) => {
    await page.clock.install({ time: new Date(F.iso) });
    await use(async (datos = ds01) => {
      if (datos !== 'ejemplo') {
        // Se siembra una sola vez por pestaña: un reload posterior conserva lo que hizo la prueba.
        await page.addInitScript(
          ({ clave, json }) => {
            if (!sessionStorage.getItem('qa-sembrado')) {
              localStorage.setItem(clave, json);
              sessionStorage.setItem('qa-sembrado', '1');
            }
          },
          { clave: CLAVE_TRANSACCIONES, json: JSON.stringify(datos) },
        );
      }
      await page.goto('/');
      await expect(page.locator('header h1')).toBeVisible();
      return new App(page);
    });
  },

  app: async ({ abrir }, use) => use(await abrir()),
});

export { expect };
