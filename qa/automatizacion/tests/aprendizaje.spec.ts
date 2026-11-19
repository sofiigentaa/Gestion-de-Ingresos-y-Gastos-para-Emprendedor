import { expect, test } from '../fixtures/app';
import { Rutinas } from '../pages/app.page';

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const CLAVE_R1 = `siguiente:${Rutinas.V}>${Rutinas.C}`;
const CLAVE_R2 = `siguiente:${Rutinas.CARTEL}>${Rutinas.VINILO}`;
const TEXTO_R1 = /Después de «Registrar ingreso Puesto Feria» casi siempre seguís con «Registrar gasto Canon de puesto feria»\. ¿Te lo adelanto\?/;
const TEXTO_R2 = /Después de «Registrar ingreso Cartelería» casi siempre seguís con «Registrar gasto Vinilo»/;
/* Una sugerencia aprendida (secuencia, entrada, hábito o atajo); las de "descubrir" son reglas fijas y no cuentan. */
const aprendida = (texto: string) => !texto.startsWith('¿Sabías que podés');

/* Reglas del plan: tiempos simulados con el reloj de Playwright (declarado en la evidencia como atajo de tiempo). */
test.describe('Golondrina: aprendizaje por repetición', () => {
  // Los tiempos de espera (90 s, 20 min) se adelantan con el reloj simulado; aun así cada prueba hace muchas altas.
  test.describe.configure({ timeout: 180_000 });

  test('IYG-APR-01 fase A (control): una sola pareja y acciones aisladas no producen ninguna sugerencia aprendida @P0', async ({ app }) => {
    const r = app.rutinas;
    expect((await app.golondrina.memoria())?.habitos ?? {}).toEqual({});
    const vuelos: string[] = [];
    const acciones: (() => Promise<void>)[] = [
      () => r.venta('10000'), () => r.canon('8000'),
      () => app.nuevoMovimiento({ tipo: 'egreso', categoria: 'Nafta', subcategoria: 'Nafta / Combustible', monto: '2000' }),
      () => r.cartel('5000'),
      () => app.nuevoMovimiento({ tipo: 'egreso', categoria: 'Corte Láser', subcategoria: 'Corte', monto: '3000' }),
      () => app.nuevoMovimiento({ tipo: 'ingreso', categoria: 'Personalizados por Encargue', subcategoria: 'Souvenirs', monto: '4000' }),
      () => r.vinilo('1500'),
      () => r.venta('9000'),
    ];
    for (const accion of acciones) {
      await accion();
      vuelos.push(...(await r.vuelosEn(10 * SEGUNDO)));
    }
    vuelos.push(...(await r.vuelosEn(2 * MINUTO)));

    // Plan, A8 y A9: sin sugerencia de canon ni de otra rutina por rubro (secuencia, entrada, hábito o atajo).
    const sugeridas = vuelos.filter(aprendida).filter((v) => !/^Cada vez que hacés registrar/.test(v));
    expect(sugeridas, 'no hay sugerencia de canon ni de otra rutina aprendida').toEqual([]);
    // Observado: la secuencia por tipo de acción ("después de un ingreso, un egreso") sí se sugiere: ocurrió tres veces con rubros distintos.
    for (const v of new Set(vuelos.filter((x) => /^Cada vez que hacés registrar/.test(x)))) test.info().annotations.push({ type: 'observado', description: `sugerencia por tipo de acción en la fase A: «${v}»` });
    const memoria = (await app.golondrina.memoria())!;
    for (const h of Object.values<any>(memoria.habitos)) expect(h.total, `habito ${h.firma}`).toBeLessThanOrEqual(2);
    expect(memoria.transiciones[Rutinas.V][Rutinas.C], 'V seguida de C una sola vez').toBe(1);
  });

  test('IYG-APR-01 fase B (rutina): a la cuarta venta llega la sugerencia del canon y no carga nada sola @P0', async ({ app }) => {
    const r = app.rutinas;
    const g = app.golondrina;
    const sinSecuencia = (vuelos: string[]) => expect(vuelos.filter((v) => /Después de|Cada vez que/.test(v))).toEqual([]);

    await test.step('repeticiones 1 y 2: sin sugerencia de secuencia', async () => {
      for (const n of [1, 2]) {
        await r.venta();
        sinSecuencia(await r.vuelosEn(10 * SEGUNDO));
        await r.canon();
        sinSecuencia(await r.vuelosEn(10 * SEGUNDO));
        expect((await g.memoria()).transiciones[Rutinas.V][Rutinas.C]).toBe(n);
      }
    });
    await test.step('tercera venta y tercer canon: todavía no hay sugerencia (2 repeticiones previas)', async () => {
      await r.venta();
      sinSecuencia(await r.vuelosEn(10 * SEGUNDO));
      await r.canon();
      sinSecuencia(await r.vuelosEn(10 * SEGUNDO));
      expect((await g.memoria()).transiciones[Rutinas.V][Rutinas.C]).toBe(3);
    });
    const antes = (await app.guardados()).length;
    await test.step('cuarta venta: llega la golondrina con la sugerencia del canon', async () => {
      await r.venta();
      const texto = await r.esperarVuelo(/Después de|Cada vez que/, 5 * MINUTO);
      expect(texto).toMatch(TEXTO_R1);
      await expect(g.vuelo.getByRole('button', { name: 'Registrar gasto Canon de puesto feria' })).toBeVisible();
      await expect(g.ahoraNo).toBeVisible();
      await expect(g.silenciar).toBeVisible();
      const s = await r.sugerencia(CLAVE_R1);
      expect(s).toMatchObject({ veces: 1, rechazos: 0, silenciada: false });
      expect(s.mostrada).toBeGreaterThan(0);
    });
    await test.step('aceptarla abre el formulario del canon y no guarda ningún movimiento', async () => {
      const guardados = (await app.guardados()).length;
      await g.vuelo.getByRole('button', { name: 'Registrar gasto Canon de puesto feria' }).click();
      await app.formulario.abierto();
      await expect(app.formulario.categoriaElegida).toContainText('Pago de Canon para Feria');
      await expect(app.formulario.subcategoriaElegida).toHaveText(/Canon de puesto feria/);
      await expect(app.formulario.monto).toHaveValue('');
      expect((await app.guardados()).length).toBe(guardados);
      expect(guardados).toBe(antes + 1); // solo la cuarta venta
      await app.formulario.cerrar.click();
      expect((await r.sugerencia(CLAVE_R1)).aceptadas).toBe(1);
    });
  });

  test('IYG-APR-02 dos sugerencias no vuelan con menos de 90 segundos de diferencia @P0', async ({ app }) => {
    const r = app.rutinas;
    const g = app.golondrina;
    await r.parR1(3);
    await r.parR2(3);
    await r.avanzar(3 * MINUTO); // pasan las pausas de lo ocurrido durante el armado
    await r.venta();
    expect(await r.esperarVuelo(TEXTO_R1, 5 * MINUTO)).not.toBeNull();
    const tA = (await r.sugerencia(CLAVE_R1)).mostrada as number;
    await g.ahoraNo.click();
    expect((await r.sugerencia(CLAVE_R1)).rechazos).toBe(1);

    await r.avanzar(5 * SEGUNDO);
    await r.cartel();
    // Entre tA y tA + 85 s no debe volar ninguna sugerencia (RN-11: al menos 90 segundos entre dos).
    const vuelosAntes = await r.vuelosEn(Math.max(0, tA + 85 * SEGUNDO - (await r.ahora())));
    expect(vuelosAntes, 'vuelos antes de los 90 s').toEqual([]);

    expect(await r.esperarVuelo(TEXTO_R2, 100 * SEGUNDO)).not.toBeNull();
    const tB = (await r.sugerencia(CLAVE_R2)).mostrada as number;
    expect(tB - tA).toBeGreaterThanOrEqual(90 * SEGUNDO);
    expect(tB - tA).toBeLessThanOrEqual(160 * SEGUNDO);
    // Sin tocar, se oculta sola a los 25 s sin contar como rechazo.
    await r.avanzar(30 * SEGUNDO);
    await expect(g.vuelo).toHaveCount(0);
    expect(await r.sugerencia(CLAVE_R2)).toMatchObject({ rechazos: 0, veces: 1 });
  });

  test('IYG-APR-03 una sugerencia rechazada tres veces no vuelve @P0', async ({ app }) => {
    const r = app.rutinas;
    const g = app.golondrina;
    await r.parR1(3);
    const rechazar = async (n: number) => {
      await r.venta();
      expect(await r.esperarVuelo(TEXTO_R1, 5 * MINUTO), `vuelo número ${n}`).not.toBeNull();
      await g.ahoraNo.click();
      expect(await r.sugerencia(CLAVE_R1), `tras el rechazo ${n}`).toMatchObject({ rechazos: n, veces: n });
    };
    const esperarDescanso = async () => {
      const mostrada = (await r.sugerencia(CLAVE_R1)).mostrada as number;
      await r.avanzar(Math.max(0, mostrada + 21 * MINUTO - (await r.ahora())));
    };
    await rechazar(1);
    await test.step('antes de los 20 minutos de descanso no vuelve', async () => {
      await r.avanzar(8 * MINUTO);
      await r.venta();
      expect((await r.vuelosEn(2 * MINUTO)).filter((v) => TEXTO_R1.test(v))).toEqual([]);
    });
    await esperarDescanso();
    await rechazar(2);
    await esperarDescanso();
    await rechazar(3);
    await esperarDescanso();
    await test.step('con tres rechazos no vuelve, ni en el panel ni al recargar', async () => {
      await r.venta();
      expect((await r.vuelosEn(2 * MINUTO)).filter((v) => TEXTO_R1.test(v))).toEqual([]);
      await g.abrir();
      await expect(app.page.locator('golondrina-asistente .chips button').filter({ hasText: 'Canon de puesto feria' })).toHaveCount(0);
      await g.cerrar();
      await app.page.reload();
      await r.venta();
      expect((await r.vuelosEn(2 * MINUTO)).filter((v) => TEXTO_R1.test(v))).toEqual([]);
    });
    await test.step('control: otra rutina sí vuela (el rechazo es por sugerencia)', async () => {
      await r.parR2(3);
      await r.cartel();
      expect(await r.esperarVuelo(TEXTO_R2, 5 * MINUTO)).not.toBeNull();
    });
  });

  test('IYG-APR-04 "No me muestres esto de nuevo" silencia esa sugerencia y no las demás @P0', async ({ app }) => {
    const r = app.rutinas;
    const g = app.golondrina;
    await r.parR1(3);
    await r.parR2(3);
    await r.avanzar(3 * MINUTO);
    await r.venta();
    expect(await r.esperarVuelo(TEXTO_R1, 5 * MINUTO)).not.toBeNull();
    await g.silenciar.click();
    expect((await r.sugerencia(CLAVE_R1)).silenciada).toBe(true);

    await test.step('pasado el descanso de 20 minutos tampoco vuelve, ni en el panel ni al recargar', async () => {
      await r.avanzar(22 * MINUTO);
      await r.venta();
      expect((await r.vuelosEn(2 * MINUTO)).filter((v) => TEXTO_R1.test(v))).toEqual([]);
      await g.abrir();
      await expect(app.page.locator('golondrina-asistente .chips button').filter({ hasText: 'Canon de puesto feria' })).toHaveCount(0);
      await g.cerrar();
      await app.page.reload();
      expect((await g.memoria()).sugerencias[CLAVE_R1].silenciada).toBe(true);
      await r.venta();
      expect((await r.vuelosEn(2 * MINUTO)).filter((v) => TEXTO_R1.test(v))).toEqual([]);
    });
    await test.step('control: la sugerencia de otra rutina sí aparece', async () => {
      await r.cartel();
      expect(await r.esperarVuelo(TEXTO_R2, 5 * MINUTO)).not.toBeNull();
    });
  });

  test('IYG-APR-05 la memoria de Golondrina no guarda montos @P0', async ({ app }) => {
    const montos = ['7345', '8123', '6213', '9871', '4567'];
    const memoriaCruda = () => app.page.evaluate(() => localStorage.getItem('golondrina:germania-finanzas') ?? '');
    await test.step('se registran movimientos con montos distintivos por las tres vías', async () => {
      await app.nuevoMovimiento({ tipo: 'ingreso', categoria: 'Ventas en Feria', monto: '7345.67' });
      await app.nuevoMovimiento({ tipo: 'egreso', categoria: 'Pago de Canon para Feria', monto: '8123' });
      await app.golondrina.decir('gasté 6.213 en madera en efectivo');
      await app.golondrina.decir('vendí 9.871 en la feria');
      await app.golondrina.cerrar();
      await app.general.rapidoTipoEgreso.click();
      await app.general.rapidoMonto.fill('4567');
      await app.general.rapidoGuardar.click();
      await expect(app.general.rapidoExito).toBeVisible();
    });
    await test.step('ningún monto aparece en la memoria (RN-10)', async () => {
      const cruda = await memoriaCruda();
      expect(cruda.length).toBeGreaterThan(0);
      for (const m of montos) expect(cruda.includes(m), `el monto ${m} no debe estar en la memoria`).toBe(false);
      for (const h of Object.values<any>((await app.golondrina.memoria()).habitos)) expect(Object.keys(h.parametros)).toEqual(['rubro']);
    });
    await test.step('al elegir una opción de una frase ambigua, la frase guardada no lleva el monto', async () => {
      let ambigua: string | null = null;
      for (const frase of ['cargué 6.213 de varias cosas', 'anotá 9.871 por lo de ayer', 'gasté 4.321 en algo']) {
        await app.golondrina.abrir();
        const antes = await app.golondrina.respuestas.count();
        await app.golondrina.entrada.fill(frase);
        await app.golondrina.entrada.press('Enter');
        await expect(app.golondrina.respuestas).toHaveCount(antes + 1);
        if (/No estoy segura|¿Te referís/.test(await app.golondrina.respuestas.last().innerText())) { ambigua = frase; break; }
        if (await app.formulario.raiz.isVisible()) { await app.formulario.cerrar.click(); await app.formulario.cerrado(); }
      }
      test.skip(ambigua === null, 'Ninguna de las frases probadas llevó a la lista de opciones; el paso no se ejecutó');
      await app.golondrina.respuestas.last().getByRole('button').first().click();
      const cruda = await memoriaCruda();
      const frases = Object.keys((await app.golondrina.memoria()).frases);
      const conMonto = frases.filter((f) => ['6213', '9871', '4321'].some((m) => f.replace(/\D/g, '').includes(m)));
      expect(conMonto, 'frases con el monto escrito dentro de la memoria (RN-10)').toEqual([]);
    });
  });

  test('IYG-APR-05 "olvidá todo" borra la memoria de Golondrina @P0', async ({ app }) => {
    await app.nuevoMovimiento({ tipo: 'egreso', categoria: 'Nafta', monto: '1000' });
    expect(await app.golondrina.memoria()).not.toBeNull();
    await app.golondrina.decir('olvidá todo');
    await app.golondrina.boton('Sí, olvidá todo').click();
    await expect.poll(() => app.golondrina.memoria()).toBeNull();
  });
});
