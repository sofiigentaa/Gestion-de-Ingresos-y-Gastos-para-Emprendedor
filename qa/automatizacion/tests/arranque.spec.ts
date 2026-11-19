import { expect, test } from '../fixtures/app';

test.describe('Arranque en modo local', () => {
  test('IYG-SES-04 sin variables de nube no hay login y la primera vez carga datos de ejemplo @P1', async ({ abrir }) => {
    const app = await abrir('ejemplo');
    await expect(app.tituloDeVista).toHaveText('Vista General');
    await expect(app.page.getByLabel('Contraseña')).toHaveCount(0);
    await expect(app.almacenamiento).toHaveText('Local');
    await expect(app.barra.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);
    expect(await app.guardados()).toHaveLength(12);
  });
});
