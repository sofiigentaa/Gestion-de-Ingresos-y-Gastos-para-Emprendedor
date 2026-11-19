import { readFileSync } from 'node:fs';
import { expect, test } from '../fixtures/app';
import { categoriasConResina, ds01, F, respaldo, type Mov } from '../data/ds';
import type { App } from '../pages/app.page';

const leer = async (descarga: { path(): Promise<string | null> }) => readFileSync((await descarga.path())!, 'utf8');
const columnas = 'ID;Fecha;Tipo;Monto;Categoría;Subcategoría;Descripción;Método de Pago;Cliente o Proveedor;Comprobante';

test.describe('Exportación a CSV', () => {
  test('IYG-EXP-01 el CSV del mes trae solo los movimientos de ese mes @P0', async ({ app }) => {
    await app.abrirExportar();
    const descarga = await app.exportar.descargar(app.exportar.mes);
    expect(descarga.suggestedFilename()).toBe(`registro_ingresos_egresos_${F.dia}.csv`);
    const texto = await leer(descarga);

    expect(texto.charCodeAt(0), 'marca BOM UTF-8 para que Excel lea las tildes').toBe(0xfeff);
    const lineas = texto.slice(1).split('\r\n');
    expect(lineas[0]).toBe(columnas);
    const datos = lineas.slice(1).map((l) => l.split(';'));
    expect(datos.map((d) => d[0].replaceAll('"', ''))).toEqual(
      ['ds01-m04', 'ds01-m05', 'ds01-m06', 'ds01-m07', 'ds01-m08', 'ds01-m09', 'ds01-m10'],
    );
    expect(datos.map((d) => d[3])).toEqual(['30000', '12000', '8000', '20000', '3000', '6500,25', '1500']);
    const suma = (tipo: string) => datos.filter((d) => d[2] === `"${tipo}"`).reduce((a, d) => a + Number(d[3].replace(',', '.')), 0);
    expect(suma('Ingreso')).toBe(50000);
    expect(suma('Egreso')).toBeCloseTo(31000.25, 2);
    expect(texto).toContain('"Corte Láser"');
    expect(texto).toContain('"Cartelería"');
  });

  test('IYG-EXP-01 un mes sin datos exporta solo la línea de encabezados @P0', async ({ app }) => {
    await app.irAMes('2026-09');
    await app.abrirExportar();
    const texto = await leer(await app.exportar.descargar(app.exportar.mes));
    expect(texto.slice(1)).toBe(columnas);
  });

  test('IYG-EXP-06 los textos con comillas, punto y coma y saltos de línea no rompen el CSV @P2', async ({ abrir }) => {
    const raro: Mov = { ...ds01[3], id: 'raro', description: 'Dice "hola"; y\nsigue', subcategory: '=1+1' };
    const app = await abrir([raro]);
    await app.abrirExportar();
    const texto = await leer(await app.exportar.descargar(app.exportar.completo));
    expect(texto).toContain('"Dice ""hola""; y\nsigue"');
  });

  test('IYG-EXP-06 un texto que empieza con "=" no se abre como fórmula en Excel (IYG-HAL-35) @P2', async ({ abrir }) => {
    const app = await abrir([{ ...ds01[3], id: 'formula', description: '=HYPERLINK("http://ejemplo.invalido","x")', subcategory: '=1+1' }]);
    await app.abrirExportar();
    const texto = await leer(await app.exportar.descargar(app.exportar.completo));
    // Los campos de texto deben salir neutralizados (por ejemplo con un apóstrofo delante), nunca como "=...".
    expect(texto, 'subcategoría "=1+1" sin neutralizar').not.toMatch(/;"=1\+1";/);
    expect(texto, 'descripción con fórmula sin neutralizar').not.toMatch(/;"=HYPERLINK/);
  });
});

async function restaurar(app: App, nombre: string, contenido: string, confirmar: boolean | null = true) {
  app.dialogos.limpiar();
  if (confirmar === true) app.dialogos.aceptar();
  if (confirmar === false) app.dialogos.cancelar();
  await app.exportar.elegir(nombre, contenido);
}

test.describe('Copia de seguridad y restauración', () => {
  const propios: Mov[] = ['a', 'b', 'c'].map((x, i) => ({ ...ds01[7], id: `exp02-${x}`, description: `Caso EXP-02-${x}`, createdAt: 1790000000020 + i }));

  test('IYG-EXP-02 restaurar un respaldo deja movimientos y categorías como en el respaldo @P0', async ({ abrir }) => {
    const app = await abrir([...ds01, ...propios]);
    await app.abrirExportar();
    let respaldo1: any;
    await test.step('el respaldo trae versión, fecha ISO, 14 movimientos y 6 categorías', async () => {
      respaldo1 = JSON.parse(await leer(await app.exportar.descargar(app.exportar.respaldo)));
      expect(respaldo1.version).toBe('1.0');
      expect(respaldo1.exportDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(respaldo1.transactions).toHaveLength(14);
      expect(respaldo1.categories).toHaveLength(6);
      expect(respaldo1.transactions).toEqual([...ds01, ...propios]);
    });
    await test.step('se cambia el estado: se eliminan dos, se edita uno y se agrega uno', async () => {
      await app.exportar.cerrar.click();
      await app.irA('history');
      for (const d of ['Caso EXP-02-a', 'Caso EXP-02-b']) {
        app.dialogos.aceptar();
        await app.historial.fila(d).eliminar.click();
      }
      await app.historial.fila('Caso EXP-02-c').editar.click();
      await app.formulario.monto.fill('1');
      await app.formulario.guardar.click();
      await app.nuevoMovimiento({ tipo: 'egreso', monto: '77', categoria: 'Nafta', descripcion: 'Agregado después' });
      expect(await app.guardados()).toHaveLength(13);
    });
    await test.step('cancelar la confirmación no cambia nada', async () => {
      const antes = await app.guardadosCrudo();
      await app.abrirExportar();
      await restaurar(app, 'respaldo-1.json', JSON.stringify(respaldo1), false);
      await expect.poll(() => app.dialogos.textos).toEqual(['Se van a reemplazar todos los movimientos actuales por los 14 del respaldo. ¿Continuar?']);
      expect(await app.guardadosCrudo()).toBe(antes);
    });
    await test.step('aceptar restaura: aviso de éxito y los mismos 14 movimientos', async () => {
      await restaurar(app, 'respaldo-1.json', JSON.stringify(respaldo1), true);
      await expect.poll(() => app.dialogos.textos).toEqual([
        'Se van a reemplazar todos los movimientos actuales por los 14 del respaldo. ¿Continuar?',
        '¡Copia de seguridad restaurada con éxito!',
      ]);
      await expect(app.exportar.titulo).toBeHidden();
      expect(await app.guardados()).toEqual(respaldo1.transactions);
      await app.page.reload();
      expect(await app.guardados()).toEqual(respaldo1.transactions);
    });
    await test.step('un segundo respaldo es idéntico al primero (solo cambia la fecha de exportación)', async () => {
      await app.abrirExportar();
      const respaldo2 = JSON.parse(await leer(await app.exportar.descargar(app.exportar.respaldo)));
      expect(respaldo2.transactions).toEqual(respaldo1.transactions);
      expect(respaldo2.categories).toEqual(respaldo1.categories);
    });
  });

  test('IYG-EXP-02 al restaurar un respaldo con categorías propias (DS-03) las subcategorías quedan disponibles @P0', async ({ app }) => {
    await app.abrirExportar();
    await restaurar(app, 'ds03.json', respaldo(ds01, categoriasConResina));
    await expect(app.exportar.titulo).toBeHidden();
    await app.botonEgreso.click();
    await app.formulario.categoria('Compra de Insumos').click();
    await expect(app.formulario.subcategoria('Resina')).toBeVisible();
    expect((await app.categoriasGuardadas()).find((c) => c.id === 'compra_insumos').subcategories).toContain('Resina');
  });

  test.describe('IYG-EXP-03 archivos inválidos', () => {
    const valido = ds01.map((m) => ({ ...m }));
    const conCambio = (cambio: (m: any) => void) => { const copia = JSON.parse(JSON.stringify(valido)); cambio(copia[1]); return respaldo(copia); };
    const rechazados: [string, string][] = [
      ['texto.json', 'hola'],
      ['otro-formato.json', '{"foo":1}'],
      ['monto-cero.json', conCambio((m) => { m.amount = 0; })],
      ['monto-texto.json', conCambio((m) => { m.amount = '1000'; })],
      ['monto-negativo.json', conCambio((m) => { m.amount = -5; })],
      ['tipo-otro.json', conCambio((m) => { m.type = 'gasto'; })],
      ['fecha-formato.json', conCambio((m) => { m.date = '18/11/2026'; })],
      ['id-numerico.json', conCambio((m) => { m.id = 7; })],
    ];

    test('IYG-EXP-03 un archivo mal armado avisa y no reemplaza ni altera los datos @P0', async ({ app }) => {
      const antes = await app.guardadosCrudo();
      await app.abrirExportar();
      for (const [nombre, contenido] of rechazados) {
        await test.step(nombre, async () => {
          await restaurar(app, nombre, contenido, null);
          await expect.poll(() => app.dialogos.mensajes.length, nombre).toBe(1);
          expect(app.dialogos.mensajes[0].tipo, `${nombre}: debe avisar, no pedir confirmación de reemplazo`).toBe('alert');
          expect(await app.guardadosCrudo(), `${nombre}: los datos no cambian`).toBe(antes);
          await expect(app.exportar.titulo).toBeVisible();
        });
      }
    });

    test('IYG-EXP-03 un respaldo con fecha imposible o lista vacía: se registra lo observado (sin resultado esperado definido en el plan) @P0', async ({ app }) => {
      const antes = await app.guardadosCrudo();
      await app.abrirExportar();
      for (const [nombre, contenido] of [['fecha-imposible.json', conCambio((m) => { m.date = '2026-13-45'; })], ['lista-vacia.json', '[]']]) {
        await restaurar(app, nombre, contenido, false); // se cancela cualquier confirmación de reemplazo
        await expect.poll(() => app.dialogos.mensajes.length).toBe(1);
        test.info().annotations.push({ type: 'observado', description: `${nombre}: ${app.dialogos.mensajes[0].tipo} «${app.dialogos.mensajes[0].texto}»` });
      }
      expect(await app.guardadosCrudo(), 'se canceló todo: nada cambia').toBe(antes);
    });
  });
});
