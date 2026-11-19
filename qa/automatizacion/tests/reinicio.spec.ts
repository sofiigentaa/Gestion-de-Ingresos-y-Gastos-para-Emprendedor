import { readFileSync } from 'node:fs';
import { expect, test } from '../fixtures/app';
import { categoriasConResina, ds01, respaldo } from '../data/ds';

test.describe('Restablecer datos', () => {
  test('IYG-RES-01 vaciar todo pide confirmación, solo actúa si se confirma y deja la base vacía @P0', async ({ app }) => {
    await test.step('el diálogo lista las tres opciones y dice cuántos movimientos hay', async () => {
      await app.abrirReinicio();
      await expect(app.reinicio.vaciar).toBeVisible();
      await expect(app.reinicio.ejemplos).toBeVisible();
      await expect(app.reinicio.categorias).toBeVisible();
      await expect.soft(app.reinicio.conteo, 'el texto debe decir cuántos movimientos hay').toContainText('11 movimientos');
    });
    await test.step('pide confirmación con la cantidad; Cancelar deja los 11 movimientos', async () => {
      await app.reinicio.vaciar.click();
      await expect.soft(app.reinicio.confirmaVaciar).toHaveText('¿Confirmas que deseas borrar todos los 11 movimientos?');
      await expect(app.reinicio.siVaciar).toBeVisible();
      await app.reinicio.cancelar.first().click();
      expect(await app.guardados()).toHaveLength(11);
    });
    await test.step('confirmar vacía todo y avisa', async () => {
      await app.reinicio.vaciar.click();
      await app.reinicio.siVaciar.click();
      await expect(app.reinicio.exito).toHaveText('¡Se vaciaron todos los movimientos! La app quedó limpia para producción.');
      await expect(app.reinicio.titulo).toBeHidden();
      expect(await app.guardados()).toEqual([]);
    });
    await test.step('todas las vistas quedan vacías', async () => {
      await expect(app.general.valor('Ingresos del Mes')).toHaveText('$ 0');
      await expect(app.general.nota('Ingresos del Mes')).toHaveText('Sin ingresos');
      await expect(app.general.sinMovimientos).toBeVisible();
      await app.irA('history');
      await expect(app.historial.vacio).toBeVisible();
      await app.irA('daily');
      await expect(app.dia.sinMovimientos).toBeVisible();
      await app.irA('dashboard');
      await app.abrirExportar();
      const texto = readFileSync((await (await app.exportar.descargar(app.exportar.completo)).path())!, 'utf8');
      expect(texto.slice(1)).toBe('ID;Fecha;Tipo;Monto;Categoría;Subcategoría;Descripción;Método de Pago;Cliente o Proveedor;Comprobante');
    });
    await test.step('al recargar sigue vacío y las categorías no cambiaron', async () => {
      await app.page.reload();
      expect(await app.guardados()).toEqual([]);
      await app.botonEgreso.click();
      await expect(app.formulario.categoriasVisibles).toHaveCount(4);
    });
    await test.step('Golondrina responde que no hay movimientos', async () => {
      await app.formulario.cerrar.click();
      expect(await app.golondrina.decir('¿cuánto gané este mes?')).toBe('No hay movimientos en Noviembre de 2026.');
    });
  });

  test('IYG-RES-01 el diálogo de restablecer se abre desde la barra lateral, el panel de exportar y el historial @P0', async ({ app }) => {
    await app.abrirReinicio();
    await app.reinicio.cerrar.click();
    await app.abrirExportar();
    await app.exportar.abrirReset.click();
    await expect(app.reinicio.titulo).toBeVisible();
    await app.reinicio.cerrar.click();
    await app.irA('history');
    await app.historial.botonVaciar.click();
    await expect(app.reinicio.titulo).toBeVisible();
  });

  test('IYG-RES-02 cargar datos de ejemplo pide confirmación y deja los 12 movimientos @P1', async ({ abrir }) => {
    const app = await abrir([]);
    await app.abrirReinicio();
    await app.reinicio.ejemplos.click();
    await app.reinicio.siEjemplos.click();
    await expect.poll(async () => (await app.guardados()).length).toBe(12);
  });

  test('IYG-RES-03 restablecer categorías vuelve a las originales @P1', async ({ app }) => {
    await app.abrirExportar();
    app.dialogos.aceptar();
    await app.exportar.elegir('ds03.json', respaldo(ds01, categoriasConResina));
    await expect(app.exportar.titulo).toBeHidden();
    await app.abrirReinicio();
    await app.reinicio.categorias.click();
    await app.reinicio.siCategorias.click();
    await expect.poll(async () => (await app.categoriasGuardadas()).find((c) => c.id === 'compra_insumos')?.subcategories).toEqual(['Madera', 'Vinilo', 'Cola', 'Clavos', 'Tornillos']);
  });
});
