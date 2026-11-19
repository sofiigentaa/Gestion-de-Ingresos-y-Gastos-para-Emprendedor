import { expect, test } from '../fixtures/app';

test.describe('Interfaz: responsive y accesibilidad', () => {
  test('IYG-RNF-01 en móvil la navegación pasa a la barra inferior y el "+" registra un ingreso @P1 @movil', async ({ app }) => {
    await expect(app.page.locator('#mobile-bottom-nav')).toBeVisible();
    await expect(app.botonEgreso).toBeHidden();
    await expect(app.page.getByRole('button', { name: 'Dashboard', exact: true })).not.toBeInViewport();
    expect(await app.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desplazamiento horizontal').toBe(true);
    for (const [boton, titulo] of [['#mobile-nav-daily', 'Registro Diario'], ['#mobile-nav-categories', 'Desglose de Egresos & Rubros'], ['#mobile-nav-history', 'Historial de Movimientos'], ['#mobile-nav-dashboard', 'Vista General']]) {
      await app.page.locator(boton).click();
      await expect(app.tituloDeVista).toHaveText(titulo);
    }
    await app.page.getByTitle('Registrar Ingreso').click();
    await app.formulario.abierto();
    await expect(app.formulario.categoriasVisibles).toHaveCount(2);
    await expect(app.formulario.guardar).toBeVisible();
  });

  test('IYG-RNF-02 las ventanas se anuncian como diálogos (IYG-HAL-64) @P2', async ({ app }) => {
    await app.botonEgreso.click();
    await app.formulario.abierto();
    await expect(app.page.getByRole('dialog'), 'el formulario de movimiento debe tener role="dialog"').toHaveCount(1);
  });

  test('IYG-RNF-02 los botones de solo icono tienen nombre accesible (IYG-HAL-65) @P2', async ({ app }) => {
    await app.botonEgreso.click();
    await expect.soft(app.formulario.cerrar, 'cerrar el formulario').toHaveAccessibleName(/.+/);
    await app.formulario.cerrar.click();
    await app.abrirExportar();
    await expect.soft(app.exportar.botonX, 'cerrar el panel de exportar').toHaveAccessibleName(/.+/);
  });

  test('IYG-RNF-02 los campos del formulario tienen etiqueta asociada (IYG-HAL-66) @P2', async ({ app }) => {
    await app.botonEgreso.click();
    await app.formulario.abierto();
    await expect.soft(app.formulario.raiz.getByLabel(/^Monto/), 'campo Monto').toHaveCount(1);
    await expect.soft(app.formulario.raiz.getByLabel(/^Fecha del Movimiento/), 'campo Fecha').toHaveCount(1);
    await expect.soft(app.formulario.raiz.getByLabel(/^Método de Pago/), 'campo Método de Pago').toHaveCount(1);
    await app.formulario.cerrar.click();
    await app.irA('history');
    await expect.soft(app.page.getByRole('combobox', { name: /.+/ }), 'los filtros del historial deben tener nombre').toHaveCount(4);
  });

  test('IYG-RNF-02 las tarjetas de categoría se alcanzan con el teclado (IYG-HAL-67) @P2', async ({ app }) => {
    await app.irA('categories');
    const tarjeta = app.categorias.tarjeta('Compra de Insumos');
    const alcanzable = await tarjeta.evaluate((el) => el.tabIndex >= 0 || ['BUTTON', 'A'].includes(el.tagName) || el.getAttribute('role') === 'button');
    expect(alcanzable, 'la tarjeta se elige con un clic pero el teclado no llega').toBe(true);
  });
});
