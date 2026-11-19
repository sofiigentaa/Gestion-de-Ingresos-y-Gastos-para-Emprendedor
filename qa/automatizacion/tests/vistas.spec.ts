import { expect, test } from '../fixtures/app';
import { totales } from '../data/ds';

const nota = (texto: string) => parseFloat(texto.match(/([\d.]+)%/)![1]);

test.describe('Vista general e indicadores', () => {
  test('IYG-VIS-01 los indicadores del mes coinciden con el cálculo manual de DS-01 @P0', async ({ app }) => {
    const g = app.general;
    const verificar = async (mes: keyof typeof totales) => {
      const t = totales[mes];
      await app.irAMes(mes);
      await expect(g.valor('Ingresos del Mes')).toHaveText(t.ingresos);
      await expect(g.valor('Egresos del Mes')).toHaveText(t.egresos);
      await expect(g.valor('Insumos & Corte Láser')).toHaveText(t.insumosLaser);
      await expect(g.valor('Balance Neto')).toHaveText(t.balance);
      await expect(g.nota('Balance Neto')).toHaveText(`Canon Feria & Nafta: ${t.canonNafta}`);
      await expect(g.nota('Egresos del Mes')).toHaveText(`${t.registrosEgreso} registros de egreso`);
      if (t.margen === null) await expect(g.nota('Ingresos del Mes')).toHaveText('Sin ingresos');
      else expect(nota(await g.nota('Ingresos del Mes').innerText())).toBeCloseTo(t.margen, 1);
    };
    await test.step('noviembre 2026', async () => {
      await verificar('2026-11');
      await expect(app.barraIngresos).toHaveText('$ 50.000');
      await expect(app.barraEgresos).toHaveText('$ 31.000,25');
      await expect(app.balanceMensual).toHaveText('+$ 18.999,75');
      await expect(app.almacenamiento).toHaveText('Local');
    });
    await test.step('octubre, diciembre y un mes sin datos', async () => {
      await verificar('2026-10');
      await verificar('2026-12');
      await verificar('2026-09');
      await expect(g.sinMovimientos).toBeVisible();
      await expect(app.page.locator('main')).not.toContainText('NaN');
    });
    await test.step('un mes con solo un egreso: sin ingresos, sin NaN, balance negativo', async () => {
      await app.nuevoMovimiento({ tipo: 'egreso', monto: '1000', fecha: '2026-09-10', categoria: 'Nafta' });
      await expect(g.nota('Ingresos del Mes')).toHaveText('Sin ingresos');
      await expect(g.valor('Balance Neto')).toHaveText('-$ 1.000');
      await expect(app.page.locator('main')).not.toContainText(/NaN|Infinity/);
    });
    await test.step('un ingreso y un egreso iguales: balance +$ 0 y margen 0', async () => {
      await app.irAMes('2026-08');
      await app.nuevoMovimiento({ tipo: 'ingreso', monto: '1000', fecha: '2026-08-10', categoria: 'Ventas en Feria' });
      await app.nuevoMovimiento({ tipo: 'egreso', monto: '1000', fecha: '2026-08-10', categoria: 'Nafta' });
      await expect(g.valor('Balance Neto')).toHaveText('+$ 0');
      expect(nota(await g.nota('Ingresos del Mes').innerText())).toBe(0);
    });
  });

  test('IYG-VIS-01 el gráfico diario y los registros recientes de noviembre @P0', async ({ app }) => {
    const g = app.general;
    await test.step('el gráfico llega al día 30 y muestra los valores del día en el globo', async () => {
      await expect(g.diasDelGrafico.last()).toHaveText('30');
      const dia18 = await g.globoDelDia(18);
      expect(dia18).toContain('$ 20.000');
      expect(dia18).toContain('$ 3.000');
      const dia1 = await g.globoDelDia(1);
      expect(dia1).toContain('$ 30.000');
      expect(dia1).toContain('$ 12.000');
      expect(await g.globoDelDia(30)).toContain('$ 8.000,25');
    });
    await test.step('siete registros recientes, del más nuevo al más viejo, sin el enlace "Ver todos"', async () => {
      expect(await g.descripciones()).toEqual([
        'Sin subcategoria', 'Corte fin de noviembre', 'Nafta del dia', 'Venta del dia',
        'Canon feria noviembre', 'Vinilo primero de noviembre', 'Cartel primero de noviembre',
      ]);
      await expect(g.verTodos).toHaveCount(0);
    });
    await test.step('con un movimiento más aparece el enlace y la lista sigue en siete', async () => {
      await app.nuevoMovimiento({ tipo: 'egreso', monto: '100', fecha: '2026-11-05', categoria: 'Nafta', descripcion: 'Octavo' });
      await expect(g.verTodos).toHaveText(/Ver todos los 8 registros del mes/);
      expect(await g.descripciones()).toHaveLength(7);
    });
  });

  test('IYG-VIS-02 al cambiar de mes todas las cifras y el gráfico muestran ese mes @P0', async ({ app }) => {
    const g = app.general;
    await test.step('octubre: 31 días y los movimientos de octubre (m02 del 31 incluido)', async () => {
      await app.mesAnterior.click();
      await expect(app.mes).toHaveText('Octubre de 2026');
      await expect(app.barraMes).toHaveText('2026-10');
      await expect(g.valor('Egresos del Mes')).toHaveText('$ 15.000,5');
      await expect(g.diasDelGrafico.last()).toHaveText('31');
      expect(await g.descripciones()).toContain('Madera fin de octubre');
      expect(await g.descripciones()).not.toContain('Cartel primero de noviembre');
    });
    await test.step('noviembre: m04, m05, m09 y m10 dentro; m02 y m11 fuera', async () => {
      await app.mesSiguiente.click();
      await expect(g.valor('Egresos del Mes')).toHaveText('$ 31.000,25');
      const d = await g.descripciones();
      expect(d).toEqual(expect.arrayContaining(['Cartel primero de noviembre', 'Vinilo primero de noviembre', 'Corte fin de noviembre', 'Sin subcategoria']));
      expect(d).not.toContain('Madera fin de octubre');
      expect(d).not.toContain('Evento primero de diciembre');
    });
    await test.step('diciembre: solo m11; enero de 2027: cambio de año', async () => {
      await app.mesSiguiente.click();
      expect(await g.descripciones()).toEqual(['Evento primero de diciembre']);
      await app.mesSiguiente.click();
      await expect(app.mes).toHaveText('Enero de 2027');
      await expect(app.barraMes).toHaveText('2027-01');
    });
    await test.step('mes anterior desde enero de 2027 y desde enero de 2026', async () => {
      await app.mesAnterior.click();
      await expect(app.mes).toHaveText('Diciembre de 2026');
      await app.irAMes('2026-01');
      await app.mesAnterior.click();
      await expect(app.mes).toHaveText('Diciembre de 2025');
    });
    await test.step('febrero de 2027 tiene 28 días y el de 2028, 29', async () => {
      await app.irAMes('2027-02');
      await expect(g.diasDelGrafico.last()).toHaveText('28');
      await app.irAMes('2028-02');
      await expect(g.diasDelGrafico.last()).toHaveText('29');
    });
    await test.step('Insumos y categorías y la etiqueta de exportar muestran el mismo mes', async () => {
      await app.irAMes('2026-10');
      await app.irA('categories');
      await expect(app.categorias.egresos).toHaveText('Egresos ($ 15.000,5)');
      await app.abrirExportar();
      await expect(app.exportar.mes).toHaveText('Descargar Mes (Octubre de 2026)');
    });
  });

  test('IYG-VIS-05 el detalle por categoría y subcategoría suma bien y usa "General" sin subcategoría @P1', async ({ app }) => {
    await app.irA('categories');
    await expect(app.categorias.total('Compra de Insumos')).toHaveText('$ 13.500');
    await app.categorias.tarjeta('Compra de Insumos').click();
    await expect(app.categorias.detalle('Compra de Insumos')).toBeVisible();
    await expect(app.categorias.subcategoria('Vinilo')).toContainText('$ 12.000');
    await expect(app.categorias.subcategoria('General')).toContainText('$ 1.500');
  });
});

test.describe('Registro por día', () => {
  const dia = async (app: any, fecha: string) => { await app.dia.fecha.fill(fecha); };
  const enFecha = (fecha: string) => async (app: any) => expect.soft(app.dia.fecha).toHaveValue(fecha);

  async function recorrido(app: any) {
    await test.step('se abre en el día de hoy y el calendario muestra el mes', async () => {
      await app.irA('daily');
      await expect(app.dia.fecha).toHaveValue('2026-11-19');
      await expect(app.dia.calendarioMes).toHaveText('2026-11');
    });
    await test.step('2026-11-18: m07 y m08', async () => {
      await dia(app, '2026-11-18');
      await expect(app.dia.ingresos).toHaveText('$ 20.000');
      await expect(app.dia.egresos).toHaveText('$ 3.000');
      await expect(app.dia.balance).toHaveText('+$ 17.000');
    });
    await test.step('de 2026-10-31 al siguiente (2026-11-01) y de vuelta; el mes del encabezado acompaña', async () => {
      await dia(app, '2026-10-31');
      await app.dia.siguiente.click();
      await enFecha('2026-11-01')(app);
      await expect(app.dia.ingresos).toHaveText('$ 30.000');
      await expect(app.dia.egresos).toHaveText('$ 12.000');
      await expect(app.dia.balance).toHaveText('+$ 18.000');
      await expect(app.mes).toHaveText('Noviembre de 2026');
      await app.dia.anterior.click();
      await enFecha('2026-10-31')(app);
      await expect(app.dia.balance).toHaveText('-$ 10.000');
      await expect(app.mes).toHaveText('Octubre de 2026');
    });
    await test.step('2026-11-30 → 2026-12-01 → 2026-11-30', async () => {
      await dia(app, '2026-11-30');
      await app.dia.siguiente.click();
      await enFecha('2026-12-01')(app);
      await expect(app.dia.ingresos).toHaveText('$ 9.000');
      await app.dia.anterior.click();
      await enFecha('2026-11-30')(app);
      await expect(app.dia.egresos).toHaveText('$ 8.000,25');
    });
    await test.step('cambio de año: 2026-12-31 → 2027-01-01 → 2026-12-31', async () => {
      await dia(app, '2026-12-31');
      await app.dia.siguiente.click();
      await enFecha('2027-01-01')(app);
      await app.dia.anterior.click();
      await enFecha('2026-12-31')(app);
    });
    await test.step('febrero: 2027 no es bisiesto y 2028 sí', async () => {
      await dia(app, '2027-02-28');
      await app.dia.siguiente.click();
      await enFecha('2027-03-01')(app);
      await dia(app, '2028-02-28');
      await app.dia.siguiente.click();
      await enFecha('2028-02-29')(app);
      await app.dia.siguiente.click();
      await enFecha('2028-03-01')(app);
    });
    await test.step('"Ir a Hoy" vuelve a la fecha de hoy', async () => {
      await app.dia.hoy.click();
      await enFecha('2026-11-19')(app);
    });
  }

  test('IYG-VIS-03 registro por día y límites de día (America/Argentina/Buenos_Aires) @P0', async ({ app }) => {
    await recorrido(app);
  });

  test.describe('zona Europe/Madrid', () => {
    test.use({ timezoneId: 'Europe/Madrid' });
    test('IYG-VIS-03 registro por día y límites de día (Europe/Madrid) @P0', async ({ app }) => {
      await recorrido(app);
    });
  });

  test('IYG-VIS-03 en un día sin movimientos, "+ Ingreso Día" y "+ Egreso Día" traen la fecha del día elegido @P0', async ({ app }) => {
    await app.irA('daily');
    await dia(app, '2026-11-25');
    await expect(app.dia.sinMovimientos).toBeVisible();
    await app.dia.egresoDia.click();
    await expect(app.formulario.fecha).toHaveValue('2026-11-25');
    await app.formulario.completar({ monto: '300', categoria: 'Nafta', descripcion: 'Caso VIS-03 día' });
    await app.formulario.guardar.click();
    await app.formulario.cerrado();
    await expect(app.dia.fecha).toHaveValue('2026-11-25');
    await expect(app.dia.descripciones).toHaveText(['Caso VIS-03 día']);
    expect((await app.guardados()).find((t) => t.description === 'Caso VIS-03 día').date).toBe('2026-11-25');
  });

  test('IYG-VIS-03 desde la vista general hay un acceso directo al registro de hoy con más de 7 movimientos @P0', async ({ app }) => {
    await app.nuevoMovimiento({ tipo: 'egreso', monto: '100', fecha: '2026-11-05', categoria: 'Nafta', descripcion: 'Octavo' });
    await app.general.verTodos.click();
    await expect(app.dia.fecha).toHaveValue('2026-11-19');
  });
});
