import { expect, test } from '../fixtures/app';
import { AVISO_MONTO, ds01, F } from '../data/ds';

test.describe('Movimientos: alta, edición, baja y carga rápida', () => {
  test('IYG-MOV-01 alta de un egreso de $ 15.000 recalcula los totales en todas las vistas @P0', async ({ app }) => {
    const g = app.general;
    await test.step('valores de partida de noviembre (DS-01)', async () => {
      await expect(g.valor('Egresos del Mes')).toHaveText('$ 31.000,25');
      await expect(g.valor('Insumos & Corte Láser')).toHaveText('$ 20.000,25');
      await expect(g.valor('Balance Neto')).toHaveText('+$ 18.999,75');
    });
    await test.step('la ventana de alta trae tipo Egreso, monto vacío, fecha de hoy y medio transferencia', async () => {
      await app.botonEgreso.click();
      await app.formulario.abierto();
      await expect(app.formulario.titulo).toHaveText('Registrar Nuevo Movimiento');
      await expect(app.formulario.categoriasVisibles).toHaveCount(4);
      await expect(app.formulario.monto).toHaveValue('');
      await expect(app.formulario.monto).toBeFocused();
      await expect(app.formulario.fecha).toHaveValue(F.dia);
      await expect(app.formulario.medio).toHaveValue('transferencia');
    });
    await test.step('se guarda con monto 15000, fecha 2026-11-15, Compra de Insumos / Madera', async () => {
      await app.formulario.completar({ monto: '15000', fecha: '2026-11-15', categoria: 'Compra de Insumos', subcategoria: 'Madera', descripcion: 'Caso MOV-01' });
      await app.formulario.guardar.click();
      await app.formulario.cerrado();
    });
    await test.step('vista general', async () => {
      await expect(g.valor('Egresos del Mes')).toHaveText('$ 46.000,25');
      await expect(g.valor('Insumos & Corte Láser')).toHaveText('$ 35.000,25');
      await expect(g.valor('Balance Neto')).toHaveText('+$ 3.999,75');
      await expect(g.nota('Egresos del Mes')).toHaveText('6 registros de egreso');
      await expect(g.fila('Caso MOV-01')).toBeVisible();
      const margen = parseFloat((await g.nota('Ingresos del Mes').innerText()).match(/([\d.]+)%/)![1]);
      expect(margen).toBeCloseTo(7.9995, 1); // (50.000 - 46.000,25) / 50.000
    });
    await test.step('barra lateral', async () => {
      await expect(app.barraEgresos).toHaveText('$ 46.000,25');
      await expect(app.balanceMensual).toHaveText('+$ 3.999,75');
    });
    await test.step('registro por día, 2026-11-15', async () => {
      await app.irA('daily');
      await app.dia.fecha.fill('2026-11-15');
      await expect(app.dia.descripciones).toHaveText(['Caso MOV-01']);
      await expect(app.dia.egresos).toHaveText('$ 15.000');
      await expect(app.dia.balance).toHaveText('-$ 15.000');
    });
    await test.step('insumos y categorías', async () => {
      await app.irA('categories');
      await expect(app.categorias.total('Compra de Insumos')).toHaveText('$ 28.500');
      await app.categorias.tarjeta('Compra de Insumos').click();
      await expect(app.categorias.subcategoria('Madera')).toContainText('$ 15.000');
    });
    await test.step('historial', async () => {
      await app.irA('history');
      const fila = app.historial.fila('Caso MOV-01');
      await expect(fila.monto).toHaveText('-$ 15.000');
      await expect(fila.tipo).toHaveText('Egreso');
      await expect(fila.raiz.locator('td').nth(4)).toHaveText('transferencia');
    });
    await test.step('un movimiento sin tocar la fecha queda con la fecha de hoy y todo persiste al recargar', async () => {
      await app.irA('dashboard');
      await app.nuevoMovimiento({ tipo: 'egreso', monto: '100', categoria: 'Nafta', descripcion: 'Caso MOV-01 hoy' });
      const guardado = (await app.guardados()).find((t) => t.description === 'Caso MOV-01 hoy');
      expect.soft(guardado.date, 'fecha por defecto del alta (RN-02: la de hoy)').toBe(F.dia);
      await app.page.reload();
      const tras = await app.guardados();
      expect(tras).toHaveLength(ds01.length + 2);
      expect(tras.find((t) => t.description === 'Caso MOV-01').amount).toBe(15000);
    });
  });

  test('IYG-MOV-02 un monto vacío, 0 o negativo nunca se guarda @P0', async ({ app }) => {
    const antes = await app.guardadosCrudo();
    const rechazado = async (monto: string, texto: string) => {
      app.dialogos.limpiar();
      await app.formulario.monto.fill(monto);
      await app.formulario.guardar.click();
      await expect.poll(() => app.dialogos.textos.length, `monto ${monto}`).toBe(1);
      expect.soft(app.dialogos.textos[0], `aviso con monto ${monto}`).toBe(texto);
      await expect(app.formulario.raiz).toBeVisible();
    };
    await test.step('formulario completo: 0, 0.00, -1 y -0.01 avisan con el texto de RN-01', async () => {
      await app.botonEgreso.click();
      await app.formulario.abierto();
      await app.formulario.completar({ categoria: 'Compra de Insumos', descripcion: 'No debe guardarse' });
      for (const monto of ['0', '0.00', '-1', '-0.01']) await rechazado(monto, AVISO_MONTO);
    });
    await test.step('formulario completo: monto vacío no se guarda', async () => {
      await app.formulario.monto.fill('');
      await app.formulario.guardar.click();
      await expect(app.formulario.raiz).toBeVisible();
      expect(await app.guardadosCrudo()).toBe(antes);
    });
    await test.step('carga rápida: vacío, 0 y -5 avisan con el mismo texto de RN-01', async () => {
      await app.formulario.cerrar.click();
      await app.formulario.cerrado();
      await app.general.rapidoTipoEgreso.click();
      for (const monto of ['', '0', '-5']) {
        app.dialogos.limpiar();
        await app.general.rapidoMonto.fill(monto);
        await app.general.rapidoGuardar.click();
        await expect.poll(() => app.dialogos.textos.length, `carga rápida ${monto || '(vacío)'}`).toBe(1);
        expect.soft(app.dialogos.textos[0], `aviso de la carga rápida con monto ${monto || '(vacío)'}`).toBe(AVISO_MONTO);
      }
    });
    await test.step('tras cada rechazo no cambió nada guardado', async () => {
      expect(await app.guardadosCrudo()).toBe(antes);
      await expect(app.general.valor('Egresos del Mes')).toHaveText('$ 31.000,25');
    });
    await test.step('0.01 sí se guarda y se ve $ 0,01; al eliminarlo los totales vuelven', async () => {
      await app.nuevoMovimiento({ tipo: 'egreso', monto: '0.01', categoria: 'Compra de Insumos', descripcion: 'Caso MOV-02' });
      await expect(app.general.fila('Caso MOV-02')).toContainText('-$ 0,01');
      app.dialogos.aceptar();
      await app.general.fila('Caso MOV-02').getByTitle('Eliminar').click();
      await expect(app.general.fila('Caso MOV-02')).toHaveCount(0);
      await expect(app.general.valor('Egresos del Mes')).toHaveText('$ 31.000,25');
    });
  });

  test('IYG-MOV-03 montos con decimales y muy grandes se guardan y se muestran como se escribieron @P0', async ({ app }) => {
    const filas = [
      { escrito: '10.5', guardado: 10.5, visto: '-$ 10,5' },
      { escrito: '10.55', guardado: 10.55, visto: '-$ 10,55' },
      { escrito: '1000000', guardado: 1000000, visto: '-$ 1.000.000' },
      { escrito: '999999999999.99', guardado: 999999999999.99, visto: '-$ 999.999.999.999,99' },
      { escrito: '1e3', guardado: 1000, visto: '-$ 1.000' },
    ];
    for (const [i, f] of filas.entries()) {
      await test.step(`monto ${f.escrito}`, async () => {
        await app.nuevoMovimiento({ tipo: 'egreso', monto: f.escrito, fecha: '2026-11-15', categoria: 'Compra de Insumos', descripcion: `MOV-03 fila ${i + 1}` });
        const guardado = (await app.guardados()).find((t) => t.description === `MOV-03 fila ${i + 1}`);
        expect.soft(guardado.amount, 'monto guardado').toBe(f.guardado);
        await app.irA('history');
        await expect.soft(app.historial.fila(`MOV-03 fila ${i + 1}`).monto).toHaveText(f.visto);
        await app.irA('dashboard');
      });
    }
  });

  test('IYG-MOV-04 editar cambia el mismo movimiento y eliminar siempre confirma @P0', async ({ app }) => {
    await app.nuevoMovimiento({ tipo: 'egreso', monto: '15000', fecha: '2026-11-15', categoria: 'Compra de Insumos', subcategoria: 'Madera', descripcion: 'Caso MOV-04' });
    const original = (await app.guardados()).find((t) => t.description === 'Caso MOV-04');
    const cantidad = (await app.guardados()).length;
    await app.irA('history');

    await test.step('la edición abre con los datos cargados', async () => {
      await app.historial.fila('Caso MOV-04').editar.click();
      await expect(app.formulario.titulo).toHaveText('Editar Movimiento');
      await expect(app.formulario.monto).toHaveValue('15000');
      await expect(app.formulario.fecha).toHaveValue('2026-11-15');
      await expect(app.formulario.descripcion).toHaveValue('Caso MOV-04');
      await expect(app.formulario.guardar).toHaveText('Guardar Cambios');
    });
    await test.step('Cancelar y la X no cambian nada', async () => {
      const antes = await app.guardadosCrudo();
      await app.formulario.cancelar.click();
      await app.formulario.cerrado();
      await app.historial.fila('Caso MOV-04').editar.click();
      await app.formulario.cerrar.click();
      await app.formulario.cerrado();
      expect(await app.guardadosCrudo()).toBe(antes);
    });
    await test.step('cambiar monto, fecha, categoría y medio: mismo id, sin duplicar, totales por mes', async () => {
      await app.historial.fila('Caso MOV-04').editar.click();
      await app.formulario.completar({ monto: '18000', fecha: '2026-10-31', categoria: 'Nafta', medio: 'mercado_pago' });
      await app.formulario.guardar.click();
      await app.formulario.cerrado();
      const editado = (await app.guardados()).find((t) => t.description === 'Caso MOV-04');
      expect(editado.id).toBe(original.id);
      expect(editado.createdAt).toBe(original.createdAt);
      expect(editado.amount).toBe(18000);
      expect(editado.paymentMethod).toBe('mercado_pago');
      expect(await app.guardados()).toHaveLength(cantidad);
      await app.irA('dashboard');
      await expect(app.general.valor('Egresos del Mes')).toHaveText('$ 31.000,25');
      await app.irAMes('2026-10');
      await expect(app.general.valor('Egresos del Mes')).toHaveText('$ 33.000,5');
    });
    await test.step('el mismo movimiento se edita desde la vista general, el registro por día y el detalle de categorías', async () => {
      await app.general.fila('Caso MOV-04').getByTitle('Editar').click();
      await expect(app.formulario.descripcion).toHaveValue('Caso MOV-04');
      await expect(app.formulario.monto).toHaveValue('18000');
      await app.formulario.cancelar.click();
      await app.irA('daily');
      await app.dia.fecha.fill('2026-10-31');
      await app.dia.lapiz('Caso MOV-04').click();
      await expect(app.formulario.monto).toHaveValue('18000');
      await app.formulario.cancelar.click();
      await app.irA('categories');
      await app.categorias.tarjeta('Nafta').click();
      await app.page.getByText('Caso MOV-04').locator('xpath=ancestor::div[contains(@class,"space-y-2")]//button[@title="Editar"]').first().click();
      await expect(app.formulario.monto).toHaveValue('18000');
      await app.formulario.cancelar.click();
    });
    await test.step('cambiar el tipo a Ingreso ofrece solo categorías de ingreso y recalcula', async () => {
      await app.irA('history');
      await app.historial.fila('Caso MOV-04').editar.click();
      await app.formulario.tipo('ingreso').click();
      await expect(app.formulario.categoriasVisibles).toHaveCount(2);
      await app.formulario.guardar.click();
      await app.formulario.cerrado();
      await app.irA('dashboard');
      await expect(app.general.valor('Ingresos del Mes')).toHaveText('$ 58.000');
      await expect(app.general.valor('Egresos del Mes')).toHaveText('$ 15.000,5');
    });
    await test.step('eliminar pide confirmación; cancelar conserva, aceptar quita y no reaparece', async () => {
      await app.irA('history');
      app.dialogos.cancelar();
      await app.historial.fila('Caso MOV-04').eliminar.click();
      expect(app.dialogos.textos).toEqual(['¿Estás seguro de que deseas eliminar este registro?']);
      await expect(app.historial.fila('Caso MOV-04').raiz).toHaveCount(1);
      app.dialogos.aceptar();
      await app.historial.fila('Caso MOV-04').eliminar.click();
      await expect(app.historial.fila('Caso MOV-04').raiz).toHaveCount(0);
      await app.page.reload();
      expect((await app.guardados()).map((t) => t.description)).not.toContain('Caso MOV-04');
    });
    await test.step('eliminar el único movimiento de un día deja el día en cero, sin error', async () => {
      await app.irA('history');
      app.dialogos.aceptar();
      await app.historial.fila('Peajes octubre').eliminar.click();
      await app.irA('daily');
      await app.dia.fecha.fill('2026-10-12');
      await expect(app.dia.sinMovimientos).toBeVisible();
      await expect(app.dia.balance).toHaveText(/\$ 0$/);
    });
  });

  test('IYG-MOV-05 carga rápida y medios de pago por defecto @P0', async ({ app }) => {
    const g = app.general;
    const nuevo = async (descripcion: string) => (await app.guardados()).find((t) => t.description === descripcion);
    await test.step('estado inicial: Ingreso, Efectivo, primera categoría de ingreso, sin descripción', async () => {
      await expect(g.rapidoCategoria).toHaveValue('venta_feria');
      await expect(g.rapidoMedio).toHaveValue('efectivo');
      await expect(g.rapidoDescripcion).toHaveValue('');
    });
    await test.step('Egreso: solo categorías de egreso, la primera Compra de Insumos', async () => {
      await g.rapidoTipoEgreso.click();
      await expect(g.rapidoCategoria.locator('option')).toHaveCount(4);
      await expect(g.rapidoCategoria).toHaveValue('compra_insumos');
    });
    await test.step('egreso de 2500 sin descripción: aviso de éxito, campos vacíos, valores por defecto', async () => {
      await g.rapidoMonto.fill('2500');
      await g.rapidoGuardar.click();
      await expect(g.rapidoExito).toBeVisible();
      await expect(g.rapidoMonto).toHaveValue('');
      await expect(g.rapidoDescripcion).toHaveValue('');
      const tx = await nuevo('Compra de Insumos');
      expect(tx).toMatchObject({ type: 'egreso', amount: 2500, date: F.dia, paymentMethod: 'efectivo', subcategory: 'Madera', categoryId: 'compra_insumos' });
    });
    await test.step('ingreso de 4000 con descripción aparece en los registros recientes', async () => {
      await g.rapidoTipoIngreso.click();
      await g.rapidoDescripcion.fill('Caso MOV-05');
      await g.rapidoMonto.fill('4000');
      await g.rapidoGuardar.click();
      await expect(g.fila('Caso MOV-05')).toContainText('+$ 4.000');
      expect((await nuevo('Caso MOV-05'))!.paymentMethod).toBe('efectivo');
    });
    await test.step('el formulario completo abre con transferencia, tanto para ingreso como para egreso', async () => {
      for (const boton of [app.botonIngreso, app.botonEgreso]) {
        await boton.click();
        await expect(app.formulario.medio).toHaveValue('transferencia');
        await app.formulario.cerrar.click();
        await app.formulario.cerrado();
      }
    });
  });
});

test.describe('Movimientos: reglas del formulario', () => {
  test('IYG-MOV-07 alta de un ingreso: categorías por tipo y campos opcionales @P1', async ({ app }) => {
    await app.nuevoMovimiento({
      tipo: 'ingreso', monto: '2500.5', categoria: 'Personalizados por Encargue', subcategoria: 'Souvenirs',
      descripcion: 'Caso MOV-07', medio: 'tarjeta_credito', proveedor: 'Cliente Ejemplo', comprobante: 'TK-0001',
    });
    const tx = (await app.guardados()).find((t) => t.description === 'Caso MOV-07');
    expect(tx).toMatchObject({
      type: 'ingreso', amount: 2500.5, categoryId: 'pedido_personalizado', subcategory: 'Souvenirs',
      paymentMethod: 'tarjeta_credito', supplierOrClient: 'Cliente Ejemplo', receiptNumber: 'TK-0001',
    });
  });

  test('IYG-MOV-08 una subcategoría escrita a mano no sobrevive al cambio de categoría @P1', async ({ app }) => {
    await app.botonEgreso.click();
    await app.formulario.completar({ categoria: 'Compra de Insumos', propia: 'Barniz' });
    await app.formulario.categoria('Nafta').click();
    await app.formulario.monto.fill('500');
    await app.formulario.descripcion.fill('Caso MOV-08');
    await app.formulario.guardar.click();
    const tx = (await app.guardados()).find((t) => t.description === 'Caso MOV-08');
    expect(tx.categoryId).toBe('nafta');
    expect(tx.subcategory).toBe('Nafta / Combustible');
  });

  test('IYG-MOV-09 el medio de pago por defecto se repone después de editar otro movimiento @P1', async ({ app }) => {
    await app.irA('history');
    await app.historial.fila('Nafta del dia').editar.click();
    await expect(app.formulario.medio).toHaveValue('efectivo');
    await app.formulario.cancelar.click();
    await app.botonEgreso.click();
    await expect(app.formulario.medio).toHaveValue('transferencia');
  });
});
