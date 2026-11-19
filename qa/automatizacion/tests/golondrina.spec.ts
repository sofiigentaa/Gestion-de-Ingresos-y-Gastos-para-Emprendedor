import { expect, test } from '../fixtures/app';
import { F } from '../data/ds';
import type { App } from '../pages/app.page';

const ultimo = async (app: App) => (await app.guardados()).reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
const nota = (texto: string) => parseFloat(texto.match(/([\d.]+)%/)![1]);

test.describe('Golondrina: registrar un movimiento con una frase', () => {
  test('IYG-GOL-01 la frase del documento guarda el egreso correcto y los demás ejemplos también @P0', async ({ app }) => {
    await test.step('el panel saluda y muestra el menú de funciones agrupado', async () => {
      await app.golondrina.abrir();
      await expect(app.golondrina.respuestas.first()).toContainText('¡Hola! Soy Golondrina');
      await expect(app.page.locator('golondrina-asistente .titulo-grupo').filter({ hasText: 'Registrar' })).toBeVisible();
    });
    await test.step('"gasté 15 mil en madera en efectivo" (CA-08)', async () => {
      const respuesta = await app.golondrina.decir('gasté 15 mil en madera en efectivo');
      expect(respuesta).toContain('Registré un gasto de $ 15.000 · Compra de Insumos › Madera · efectivo.');
      expect(respuesta).toContain('corregir el último');
      expect(await ultimo(app)).toMatchObject({ type: 'egreso', amount: 15000, categoryId: 'compra_insumos', subcategory: 'Madera', paymentMethod: 'efectivo', date: F.dia });
      await expect(app.general.valor('Egresos del Mes')).toHaveText('$ 46.000,25');
    });
    for (const variante of ['Gasté 15 mil en madera en efectivo', 'gaste 15 mil en madera en efectivo', 'GASTÉ 15 MIL EN MADERA EN EFECTIVO', '   gasté 15 mil en madera en efectivo   ']) {
      await test.step(`variante "${variante.trim()}"`, async () => {
        const antes = (await app.guardados()).length;
        await app.golondrina.decir(variante);
        expect.soft(await app.guardados(), 'se guardó un movimiento').toHaveLength(antes + 1);
        expect.soft(await ultimo(app)).toMatchObject({ type: 'egreso', amount: 15000, categoryId: 'compra_insumos', subcategory: 'Madera', paymentMethod: 'efectivo' });
      });
    }
    const ejemplos: [string, object, string?][] = [
      ['ayer cargué nafta 12500', { type: 'egreso', amount: 12500, categoryId: 'nafta', subcategory: 'Nafta / Combustible', paymentMethod: 'efectivo', date: F.ayer }, '· 18/11/2026'],
      ['pagué el canon 8.000 por transferencia', { type: 'egreso', amount: 8000, categoryId: 'canon_feria', subcategory: 'Canon de puesto feria', paymentMethod: 'transferencia', date: F.dia }],
      ['vendí 32.500 en la feria', { type: 'ingreso', amount: 32500, categoryId: 'venta_feria', subcategory: 'Puesto Feria', paymentMethod: 'efectivo', date: F.dia }],
      ['me pagaron 45000 por un encargo de carteles con mercado pago', { type: 'ingreso', amount: 45000, categoryId: 'pedido_personalizado', subcategory: 'Cartelería', paymentMethod: 'mercado_pago', date: F.dia }],
    ];
    for (const [frase, esperado, fecha] of ejemplos) {
      await test.step(`ejemplo del documento: "${frase}"`, async () => {
        const respuesta = await app.golondrina.decir(frase);
        if (fecha) expect(respuesta).toContain(fecha);
        expect(await ultimo(app)).toMatchObject(esperado);
      });
    }
  });

  test('IYG-GOL-02 cada formato de monto que Golondrina declara entender guarda el monto correcto @P0', async ({ app }) => {
    const formatos: [string, number][] = [
      ['15000', 15000], ['15.000', 15000], ['$15.000,50', 15000.5], ['15 mil', 15000], ['15k', 15000], ['15 lucas', 15000],
      ['15 Mil', 15000], ['15K', 15000], ['$ 15.000', 15000], ['1.500', 1500], ['15000,5', 15000.5], ['1,5 millones', 1500000],
    ];
    for (const [valor, monto] of formatos) {
      await test.step(`"gasté ${valor} en madera en efectivo"`, async () => {
        const antes = (await app.guardados()).length;
        await app.golondrina.decir(`gasté ${valor} en madera en efectivo`);
        const guardados = await app.guardados();
        expect.soft(guardados, `se guardó un movimiento con "${valor}"`).toHaveLength(antes + 1);
        expect.soft((await ultimo(app)).amount, `monto guardado con "${valor}"`).toBe(monto);
      });
    }
  });

  test('IYG-GOL-03 las palabras de fecha guardan la fecha correcta, incluidos los límites de mes y año @P0', async ({ app }) => {
    // F = 2026-11-19: ayer 2026-11-18, anteayer 2026-11-17. "el 12/10" es día/mes del año de F.
    const casos: [string, string][] = [
      ['gasté 3000 en nafta', '2026-11-19'],
      ['ayer cargué nafta 3000', '2026-11-18'],
      ['gasté 3000 en nafta anteayer', '2026-11-17'],
      ['gasté 3000 en nafta el 12/10', '2026-10-12'],
      ['gasté 3000 en nafta el 31/10', '2026-10-31'],
      ['gasté 3000 en nafta el 1/11', '2026-11-01'],
      ['gasté 3000 en nafta el 31/12', '2026-12-31'],
      ['gasté 3000 en nafta el 1/1', '2026-01-01'],
      ['gasté 3000 en nafta el 12/10/25', '2025-10-12'],
    ];
    for (const [frase, fecha] of casos) {
      await test.step(frase, async () => {
        const antes = (await app.guardados()).length;
        await app.golondrina.decir(frase);
        expect.soft(await app.guardados(), `se guardó un movimiento con "${frase}"`).toHaveLength(antes + 1);
        const tx = await ultimo(app);
        expect.soft(tx.date, `fecha de "${frase}"`).toBe(fecha);
        expect.soft(tx.amount).toBe(3000);
      });
    }
  });

  test('IYG-GOL-03 en "gasté 15 el 12/10" la fecha no se toma como monto @P0', async ({ app }) => {
    const antes = await app.guardadosCrudo();
    const r = await app.golondrina.decir('gasté 15 el 12/10');
    expect(r).toContain('por $ 15:');
    expect(await app.guardadosCrudo(), 'sin rubro no se guarda: abre el formulario').toBe(antes);
  });

  test('IYG-GOL-03 fechas sin criterio definido en el documento: se registra lo observado @P0', async ({ app }) => {
    for (const frase of ['gasté 3000 en nafta hoy', 'gasté 3000 en nafta el 29/02', 'gasté 3000 en nafta el 31/04', 'gasté 3000 en nafta el 1/13']) {
      const antes = (await app.guardados()).length;
      await app.golondrina.decir(frase);
      const despues = await app.guardados();
      test.info().annotations.push({
        type: 'observado',
        description: `«${frase}»: ${despues.length > antes ? `guardó fecha ${(await ultimo(app)).date}` : 'no guardó nada'}`,
      });
    }
  });

  test('IYG-GOL-04 montos en cero, negativos o vacíos no se guardan; los grandes y los de "mil" sí @P0', async ({ app }) => {
    const sinGuardar = async (frase: string, rubro?: string) => {
      const antes = await app.guardadosCrudo();
      await app.golondrina.decir(frase);
      expect.soft(await app.guardadosCrudo(), `«${frase}» no debe guardar nada`).toBe(antes);
      await expect.soft(app.formulario.raiz, `«${frase}» abre el formulario`).toBeVisible();
      if (rubro) await expect.soft(app.formulario.subcategoriaElegida).toHaveText(new RegExp(rubro));
      await app.formulario.cerrar.click();
      await app.formulario.cerrado();
    };
    await test.step('0, 0,00, sin monto y solo la palabra: abre el formulario y no guarda', async () => {
      await sinGuardar('gasté 0 en madera', 'Madera');
      await sinGuardar('gasté 0,00 en madera', 'Madera');
      await sinGuardar('gasté en madera', 'Madera');
      await sinGuardar('gasté');
    });
    await test.step('un monto negativo no es válido (RN-01) y no debe guardarse', async () => {
      const antes = (await app.guardados()).length;
      await app.golondrina.decir('gasté -500 en nafta');
      const guardado = (await app.guardados()).length > antes ? (await ultimo(app)).amount : null;
      expect.soft(guardado, 'monto guardado con "-500" (RN-01: debe ser mayor a 0 y no se guarda otro distinto del escrito)').toBeNull();
      if (await app.formulario.raiz.isVisible()) { await app.formulario.cerrar.click(); await app.formulario.cerrado(); }
    });
    for (const [frase, monto] of [['gasté 0,5 en nafta', 0.5], ['gasté 15 mil pesos en madera', 15000], ['gasté 1.000.000 en madera', 1000000], ['gasté 999.999.999.999 en madera', 999999999999]] as [string, number][]) {
      await test.step(frase, async () => {
        await app.golondrina.decir(frase);
        expect.soft((await ultimo(app)).amount, frase).toBe(monto);
      });
    }
  });

  test('IYG-GOL-04 frases con varios números o separadores ambiguos: se registra lo observado (el plan no define el esperado) @P0', async ({ app }) => {
    for (const frase of ['gasté 15,000 en nafta', 'gasté 12.5 en nafta', 'compré 4 placas MDF por 42000', 'gasté 3 mil 500 en madera']) {
      const antes = (await app.guardados()).length;
      await app.golondrina.decir(frase);
      test.info().annotations.push({
        type: 'observado',
        description: `«${frase}»: ${(await app.guardados()).length > antes ? `guardó monto ${(await ultimo(app)).amount}` : 'no guardó'}`,
      });
      if (await app.formulario.raiz.isVisible()) { await app.formulario.cerrar.click(); await app.formulario.cerrado(); }
    }
  });
});

test.describe('Golondrina: consultas', () => {
  test('IYG-GOL-05 las cifras de ganancia coinciden con las de la vista general del mismo mes @P0', async ({ app }) => {
    const g = app.general;
    const margenDelPanel = async () => nota(await g.nota('Ingresos del Mes').innerText());
    const margenDeLaRespuesta = (r: string) => nota(r.match(/margen ([\d.]+)%/)![0]);

    await test.step('noviembre: mismas cifras que el panel (CA-09)', async () => {
      const r = await app.golondrina.decir('¿cuánto gané este mes?');
      expect(r).toContain('Noviembre de 2026:');
      expect(r).toContain('• Entró $ 50.000');
      expect(r).toContain('• Salió $ 31.000,25');
      expect(r).toContain('• Ganancia neta $ 18.999,75');
      expect(margenDeLaRespuesta(r)).toBeCloseTo(await margenDelPanel(), 1);
      expect(r).toContain('El mes anterior la ganancia fue $ 24.999,5 (venías mejor)');
    });
    await test.step('octubre pedido por nombre estando en noviembre: mismas cifras y mismo margen que el panel de octubre', async () => {
      const r = await app.golondrina.decir('¿cuánto gané en octubre?');
      expect(r).toContain('Octubre de 2026:');
      expect(r).toContain('• Entró $ 40.000');
      expect(r).toContain('• Salió $ 15.000,5');
      expect(r).toContain('• Ganancia neta $ 24.999,5');
      await app.golondrina.cerrar();
      await app.irAMes('2026-10');
      expect.soft(margenDeLaRespuesta(r), 'margen de Golondrina frente al de la vista general (CA-09: iguales)').toBeCloseTo(await margenDelPanel(), 1);
      await app.irAMes('2026-11');
    });
    await test.step('un mes sin movimientos', async () => {
      expect(await app.golondrina.decir('¿cuánto gané en septiembre?')).toBe('No hay movimientos en Septiembre de 2026.');
    });
    await test.step('un gasto nuevo se refleja en la respuesta y en el panel; al borrarlo vuelve', async () => {
      await app.golondrina.decir('gasté 2000 en nafta');
      const r = await app.golondrina.decir('¿cuánto gané este mes?');
      expect(r).toContain('• Salió $ 33.000,25');
      expect(r).toContain('• Ganancia neta $ 16.999,75');
      await expect(g.valor('Egresos del Mes')).toHaveText('$ 33.000,25');
      app.dialogos.aceptar();
      await app.golondrina.decir('borrar el último');
      await expect.poll(async () => (await app.guardados()).length).toBe(11);
      expect(await app.golondrina.decir('¿cuánto gané este mes?')).toContain('• Salió $ 31.000,25');
    });
  });

  test('IYG-GOL-05 meses sin criterio definido: se registra lo observado @P0', async ({ app }) => {
    const r = await app.golondrina.decir('¿cuánto gané en diciembre?');
    test.info().annotations.push({ type: 'observado', description: `«¿cuánto gané en diciembre?» estando en noviembre de 2026: «${r.split('\n')[0]}»` });
  });
});

test.describe('Golondrina: frases incompletas', () => {
  test('IYG-GOL-06 sin monto o sin rubro abre el formulario y no guarda por su cuenta @P0', async ({ app }) => {
    const cantidad = async () => (await app.guardados()).length;
    const inicial = await cantidad();

    await test.step('"compré vinilo": formulario de egreso con el rubro elegido y el monto vacío', async () => {
      const r = await app.golondrina.decir('compré vinilo');
      expect(r).toContain('Te abrí el formulario de gasto con «Vinilo» elegido. Completá el monto y guardá.');
      await expect(app.formulario.categoriaElegida).toContainText('Compra de Insumos');
      await expect(app.formulario.subcategoriaElegida).toHaveText(/Vinilo/);
      await expect(app.formulario.monto).toHaveValue('');
      expect(await cantidad()).toBe(inicial);
      await app.formulario.monto.fill('1800');
      await app.formulario.guardar.click();
      expect(await ultimo(app)).toMatchObject({ amount: 1800, subcategory: 'Vinilo', type: 'egreso' });
    });
    await test.step('"vendí en la feria": formulario de ingreso con "Puesto Feria"', async () => {
      await app.golondrina.decir('vendí en la feria');
      await expect(app.formulario.categoriaElegida).toContainText('Ventas en Feria');
      await expect(app.formulario.subcategoriaElegida).toHaveText(/Puesto Feria/);
      await app.formulario.cerrar.click();
    });
    await test.step('"gasté 8000" (monto sin rubro): el formulario trae el monto que dice el mensaje', async () => {
      const r = await app.golondrina.decir('gasté 8000');
      expect(r).toContain('Te abrí el formulario de gasto por $ 8.000: elegí el rubro y guardá.');
      await expect.soft(app.formulario.monto, 'el mensaje dice "por $ 8.000" pero el campo debe traerlo').toHaveValue('8000');
      await app.formulario.cerrar.click();
    });
    await test.step('"registrar gasto" abre el formulario general', async () => {
      const r = await app.golondrina.decir('registrar gasto');
      expect(r).toContain('Te abrí el formulario de gasto.');
      await expect(app.formulario.raiz).toBeVisible();
      await app.formulario.cerrar.click();
    });
    await test.step('solo la alta de "Vinilo" con 1800 aumentó el conteo', async () => {
      expect(await cantidad()).toBe(inicial + 1);
    });
  });

  test('IYG-GOL-06 un formulario abierto por Golondrina y cerrado sin guardar no cuenta como acción aprendida @P0', async ({ app }) => {
    await app.golondrina.decir('compré vinilo');
    await app.formulario.cerrar.click();
    await app.formulario.cerrado();
    const memoria = await app.golondrina.memoria();
    const aprendidas = Object.keys(memoria?.habitos ?? {});
    expect(aprendidas, 'el movimiento nunca se guardó: no debe quedar registrada la acción').toEqual([]);
  });
});
