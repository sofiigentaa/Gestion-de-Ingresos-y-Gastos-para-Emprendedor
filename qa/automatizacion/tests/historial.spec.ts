import { expect, test } from '../fixtures/app';
import { ds01, ds02, type Mov } from '../data/ds';

test.describe('Historial: búsqueda, filtros y orden', () => {
  test('IYG-HIS-01 los filtros combinados devuelven exactamente los movimientos que cumplen todos (50 movimientos) @P0', async ({ abrir }) => {
    const app = await abrir(ds02);
    const h = app.historial;
    const mensual = async () => [await app.general.valor('Ingresos del Mes').innerText(), await app.general.valor('Egresos del Mes').innerText()];
    const antes = await mensual();
    await app.irA('history');
    await expect(h.filas).toHaveCount(50);

    await test.step('egreso + Nafta + efectivo: 8 filas, egresos $ 8.000', async () => {
      await h.tipo.selectOption('egreso');
      await h.categoria.selectOption('nafta');
      await h.medio.selectOption('efectivo');
      await expect(h.filas).toHaveCount(8);
      expect((await h.conceptos()).every((c) => c.startsWith('Objetivo'))).toBe(true);
      await expect(h.total('Egresos')).toHaveText('$ 8.000');
      await expect(h.total('Ingresos')).toHaveText('$ 0');
    });
    await test.step('sin el medio de pago: 24 filas, $ 26.400', async () => {
      await h.medio.selectOption('all');
      await expect(h.filas).toHaveCount(24);
      await expect(h.total('Egresos')).toHaveText('$ 26.400');
    });
    await test.step('sin la categoría (egreso + efectivo): 18 filas, $ 19.400', async () => {
      await h.categoria.selectOption('all');
      await h.medio.selectOption('efectivo');
      await expect(h.filas).toHaveCount(18);
      await expect(h.total('Egresos')).toHaveText('$ 19.400');
    });
    await test.step('Solo Ingresos con Nafta: sin resultados y totales en cero', async () => {
      await h.tipo.selectOption('ingreso');
      await h.categoria.selectOption('nafta');
      await h.medio.selectOption('all');
      await expect(h.vacio).toBeVisible();
      await expect(h.total('Ingresos')).toHaveText('$ 0');
      await expect(h.total('Egresos')).toHaveText('$ 0');
    });
    await test.step('Limpiar filtros: vuelven los 50 y los controles en "Todos"', async () => {
      await h.limpiar.click();
      await expect(h.filas).toHaveCount(50);
      for (const combo of [h.tipo, h.categoria, h.medio]) await expect(combo).toHaveValue('all');
    });
    await test.step('los filtros no alteraron los totales mensuales', async () => {
      await app.irA('dashboard');
      expect(await mensual()).toEqual(antes);
    });
  });

  test.describe('con DS-01 y un movimiento adicional', () => {
    const adicional: Mov = {
      id: 'his02-extra', type: 'egreso', amount: 1000, date: '2026-11-02', categoryId: 'compra_insumos', categoryName: 'Compra de Insumos',
      subcategory: 'Madera', description: 'Caso HIS-02', paymentMethod: 'efectivo', supplierOrClient: 'Maderera Ejemplo', receiptNumber: 'FAC-001', createdAt: 1790000000012,
    };
    // Orden "Más recientes primero" calculado a mano: por fecha descendente y, a igual fecha, el cargado más tarde primero.
    const recientes = ['Evento primero de diciembre', 'Sin subcategoria', 'Corte fin de noviembre', 'Nafta del dia', 'Venta del dia', 'Canon feria noviembre',
      'Caso HIS-02', 'Vinilo primero de noviembre', 'Cartel primero de noviembre', 'Madera fin de octubre', 'Peajes octubre', 'Venta feria octubre'];
    const porMonto = ['+$ 40.000', '+$ 30.000', '+$ 20.000', '-$ 12.000', '-$ 10.000', '+$ 9.000', '-$ 8.000', '-$ 6.500,25', '-$ 5.000,5', '-$ 3.000', '-$ 1.500', '-$ 1.000'];

    test('IYG-HIS-02 búsqueda por texto, orden y rango de fechas con sus límites @P0', async ({ abrir }) => {
      const app = await abrir([...ds01, adicional]);
      const h = app.historial;
      await app.irA('history');

      await test.step('búsqueda sin distinguir mayúsculas, por concepto, subcategoría, proveedor y comprobante', async () => {
        for (const texto of ['madera', 'MADERA']) {
          await h.buscar.fill(texto);
          expect(await h.conceptos(), texto).toEqual(['Caso HIS-02', 'Madera fin de octubre']);
        }
        await h.buscar.fill('Madera fin');
        expect(await h.conceptos()).toEqual(['Madera fin de octubre']);
        await h.buscar.fill('cartelería');
        expect(await h.conceptos()).toEqual(['Cartel primero de noviembre']);
        await h.buscar.fill('ejemplo');
        expect(await h.conceptos()).toEqual(['Caso HIS-02']);
        await h.buscar.fill('fac-001');
        expect(await h.conceptos()).toEqual(['Caso HIS-02']);
        await h.buscar.fill('');
      });
      await test.step('orden por fecha y por monto, ascendente y descendente', async () => {
        expect(await h.conceptos()).toEqual(recientes);
        await h.orden.selectOption('date_asc');
        expect(await h.conceptos()).toEqual([...recientes].reverse());
        await h.orden.selectOption('amount_desc');
        expect(await h.montos()).toEqual(porMonto);
        await h.orden.selectOption('amount_asc');
        expect(await h.montos()).toEqual([...porMonto].reverse());
        await h.orden.selectOption('date_desc');
      });
      await test.step('el rango incluye ambos extremos', async () => {
        await h.desde.fill('2026-11-01');
        await h.hasta.fill('2026-11-30');
        await expect(h.filas).toHaveCount(8); // m04 a m10 y el adicional
        const c = await h.conceptos();
        expect(c).toEqual(expect.arrayContaining(['Cartel primero de noviembre', 'Vinilo primero de noviembre', 'Corte fin de noviembre', 'Sin subcategoria']));
        await h.desde.fill('2026-10-31');
        await h.hasta.fill('2026-10-31');
        expect(await h.conceptos()).toEqual(['Madera fin de octubre']);
      });
      await test.step('solo "Desde" y solo "Hasta"', async () => {
        await h.hasta.fill('');
        await h.desde.fill('2026-11-30');
        expect(await h.conceptos()).toEqual(['Evento primero de diciembre', 'Sin subcategoria', 'Corte fin de noviembre']);
        await h.desde.fill('');
        await h.hasta.fill('2026-10-01');
        expect(await h.conceptos()).toEqual(['Venta feria octubre']);
      });
      await test.step('búsqueda + tipo + rango juntos; los totales filtrados coinciden con la suma manual', async () => {
        await h.limpiar.click();
        await h.buscar.fill('noviembre');
        await h.tipo.selectOption('egreso');
        await h.desde.fill('2026-11-01');
        await h.hasta.fill('2026-11-30');
        expect((await h.conceptos()).sort()).toEqual(['Canon feria noviembre', 'Corte fin de noviembre', 'Vinilo primero de noviembre']);
        await expect(h.total('Egresos')).toHaveText('$ 26.500,25'); // 8.000 + 6.500,25 + 12.000
        await expect(h.total('Ingresos')).toHaveText('$ 0');
      });
    });

    test('IYG-HIS-03 el filtro de medio de pago ofrece todos los medios y el resultado vacío se anuncia @P1', async ({ abrir }) => {
      const otro: Mov = { ...adicional, id: 'his03-otro', description: 'Pago con otro medio', paymentMethod: 'otro' };
      const app = await abrir([...ds01, otro]);
      await app.irA('history');
      await app.historial.medio.selectOption('tarjeta_debito');
      expect(await app.historial.conceptos()).toEqual(['Corte fin de noviembre']);
      await app.historial.medio.selectOption('tarjeta_credito');
      await expect(app.historial.vacio).toBeVisible();
      // RF-10 permite filtrar por medio de pago y el formulario ofrece "Otro medio": el filtro debería poder encontrarlo.
      await expect(app.historial.medio.locator('option', { hasText: /^Otro/ })).toHaveCount(1);
    });
  });
});
