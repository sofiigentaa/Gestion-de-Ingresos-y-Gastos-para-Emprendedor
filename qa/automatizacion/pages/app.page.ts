import { expect, type Dialog, type Locator, type Page } from '@playwright/test';

/* Objetos de página de "Gestión de ingresos y gastos". Es el único lugar con selectores.
   Los campos del formulario, la carga rápida y los filtros no tienen etiqueta asociada (IYG-HAL-66):
   para ellos se usan los `id`, el texto de las opciones o el marcador de posición que ya trae la aplicación. */

export const CLAVE_TRANSACCIONES = 'artisan_finance_transactions_v2';
export const CLAVE_CATEGORIAS = 'artisan_finance_categories_v2';
export const CLAVE_GOLONDRINA = 'golondrina:germania-finanzas';

export type Medio = 'efectivo' | 'transferencia' | 'mercado_pago' | 'tarjeta_debito' | 'tarjeta_credito' | 'otro';
export type NuevoMovimiento = {
  tipo?: 'ingreso' | 'egreso';
  monto?: string;
  fecha?: string;
  categoria?: string; // nombre visible de la categoría
  subcategoria?: string; // botón de subcategoría
  propia?: string; // subcategoría escrita a mano
  descripcion?: string;
  medio?: Medio;
  proveedor?: string;
  comprobante?: string;
};
export type Vista = 'dashboard' | 'daily' | 'categories' | 'history';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* Diálogos nativos (alert y confirm). Se responde de forma explícita y se guarda cada mensaje. */
export class Dialogos {
  readonly mensajes: { tipo: string; texto: string }[] = [];
  private respuestas: boolean[] = [];

  constructor(page: Page) {
    page.on('dialog', (d: Dialog) => {
      this.mensajes.push({ tipo: d.type(), texto: d.message() });
      // Sin respuesta preparada: se acepta un alert y se cancela un confirm (nunca se confirma algo sin querer).
      const aceptar = this.respuestas.length ? this.respuestas.shift()! : d.type() !== 'confirm';
      return aceptar ? d.accept() : d.dismiss();
    });
  }
  /* La próxima confirmación se acepta. */
  aceptar() { this.respuestas.push(true); }
  /* La próxima confirmación se cancela. */
  cancelar() { this.respuestas.push(false); }
  get textos() { return this.mensajes.map((m) => m.texto); }
  limpiar() { this.mensajes.length = 0; }
}

export class Formulario {
  readonly raiz: Locator;
  constructor(private page: Page) { this.raiz = page.locator('#transaction-modal'); }
  get titulo() { return this.raiz.getByRole('heading'); }
  get monto() { return this.raiz.locator('#input-transaction-amount'); }
  get fecha() { return this.raiz.locator('#input-transaction-date'); }
  get descripcion() { return this.raiz.locator('#input-transaction-desc'); }
  get medio() { return this.raiz.locator('#select-payment-method'); }
  get proveedor() { return this.raiz.locator('#input-supplier-client'); }
  get comprobante() { return this.raiz.locator('#input-receipt-num'); }
  get subcategoriaPropia() { return this.raiz.getByPlaceholder(/O escribe otro insumo/); }
  get guardar() { return this.raiz.getByRole('button', { name: /^(Registrar Movimiento|Guardar Cambios)$/ }); }
  get cancelar() { return this.raiz.getByRole('button', { name: 'Cancelar' }); }
  get cerrar() { return this.raiz.locator('#btn-close-modal'); }
  tipo(t: 'ingreso' | 'egreso') { return this.raiz.getByRole('button', { name: t === 'ingreso' ? /^Ingreso \(Venta/ : /^Egreso \(Insumo/ }); }
  categoria(nombre: string) { return this.raiz.getByRole('button', { name: nombre }); }
  /* Las subcategorías son botones dentro del bloque que tiene el campo de subcategoría propia. */
  subcategoria(nombre: string) { return this.raiz.locator('button[id^="subcat-btn-"]').filter({ hasText: nombre }); }
  get categoriasVisibles() { return this.raiz.locator('button[id^="cat-btn-"]'); }
  /* La aplicación no expone el estado "elegido" por accesibilidad: se distingue por sus clases. */
  get categoriaElegida() { return this.raiz.locator('button[id^="cat-btn-"][class*="ring-indigo-600"]'); }
  get subcategoriaElegida() { return this.raiz.locator('button[id^="subcat-btn-"][class*="bg-indigo-600"]'); }
  get subcategoriasVisibles() { return this.raiz.locator('button[id^="subcat-btn-"]'); }

  async abierto() { await expect(this.raiz).toBeVisible(); }
  async cerrado() { await expect(this.raiz).toBeHidden(); }

  async completar(m: NuevoMovimiento) {
    if (m.tipo) await this.tipo(m.tipo).click();
    if (m.categoria) await this.categoria(m.categoria).click();
    if (m.subcategoria) await this.subcategoria(m.subcategoria).click();
    if (m.propia !== undefined) await this.subcategoriaPropia.fill(m.propia);
    if (m.monto !== undefined) await this.monto.fill(m.monto);
    if (m.fecha) await this.fecha.fill(m.fecha);
    if (m.descripcion !== undefined) await this.descripcion.fill(m.descripcion);
    if (m.medio) await this.medio.selectOption(m.medio);
    if (m.proveedor !== undefined) await this.proveedor.fill(m.proveedor);
    if (m.comprobante !== undefined) await this.comprobante.fill(m.comprobante);
  }
}

/* Una fila del historial (tabla de escritorio). Columnas: fecha, tipo, concepto, categoría, medio, proveedor, monto, acciones. */
export class Fila {
  constructor(readonly raiz: Locator) {}
  get concepto() { return this.raiz.locator('td').nth(2); }
  get tipo() { return this.raiz.locator('td').nth(1); }
  get monto() { return this.raiz.locator('td').nth(6); }
  get editar() { return this.raiz.getByTitle('Editar'); }
  get eliminar() { return this.raiz.getByTitle('Eliminar'); }
}

export class Historial {
  constructor(private page: Page) {}
  private combo(opcion: string) { return this.page.locator('select').filter({ has: this.page.locator('option', { hasText: opcion }) }); }
  get buscar() { return this.page.getByPlaceholder('Buscar por concepto o proveedor...'); }
  get tipo() { return this.combo('Todos los Tipos'); }
  get categoria() { return this.combo('Todas las Categorías'); }
  get medio() { return this.combo('Todos los Medios de Pago'); }
  get orden() { return this.combo('Más recientes primero'); }
  get desde() { return this.page.getByTitle('Fecha inicial'); }
  get hasta() { return this.page.getByTitle('Fecha final'); }
  get limpiar() { return this.page.getByRole('button', { name: 'Limpiar filtros' }); }
  get botonVaciar() { return this.page.locator('#btn-table-reset-data'); }
  get filas() { return this.page.locator('main table tbody tr').filter({ hasNotText: 'No se encontraron movimientos' }); }
  get vacio() { return this.page.locator('main table tbody').getByText('No se encontraron movimientos'); }
  fila(texto: string | RegExp) { return new Fila(this.page.locator('main table tbody tr').filter({ hasText: texto })); }
  total(que: 'Ingresos' | 'Egresos' | 'Balance') {
    return this.page.locator('span', { hasText: `${que === 'Balance' ? 'Balance' : `Total ${que}`} Filtrados:` }).locator('xpath=following-sibling::span');
  }
  /* Conceptos de las filas visibles, en el orden en que aparecen. */
  async conceptos() { return this.filas.locator('td:nth-child(3) p.font-bold').allTextContents(); }
  async montos() { return this.filas.locator('td:nth-child(7)').allTextContents(); }
}

export class VistaGeneral {
  constructor(private page: Page) {}
  /* Tarjeta de indicador: el título está en un <p> y el valor en el <p> siguiente. */
  private tarjeta(titulo: string) { return this.page.locator('section p', { hasText: new RegExp(`^${titulo}$`) }).locator('xpath=..'); }
  valor(titulo: 'Ingresos del Mes' | 'Egresos del Mes' | 'Insumos & Corte Láser' | 'Balance Neto') { return this.tarjeta(titulo).locator('p').nth(1); }
  nota(titulo: 'Ingresos del Mes' | 'Egresos del Mes' | 'Insumos & Corte Láser' | 'Balance Neto') { return this.tarjeta(titulo).locator('span'); }
  get recientes() { return this.page.locator('main table tbody tr'); }
  get sinMovimientos() { return this.page.getByText('No hay movimientos registrados en este mes'); }
  get verTodos() { return this.page.getByRole('button', { name: /^Ver todos los \d+ registros del mes/ }); }
  get graficoVacio() { return this.page.locator('.recharts-wrapper'); }
  get distribucionVacia() { return this.page.getByText('Sin egresos en este mes'); }
  get nuevoRegistro() { return this.page.getByRole('button', { name: 'Nuevo registro' }); }

  /* Carga rápida ("Registro Rápido"): sus campos no tienen etiqueta asociada. */
  get rapido() { return this.page.locator('form').filter({ hasText: 'Tipo de Operación' }); }
  get rapidoTipoIngreso() { return this.rapido.getByRole('button', { name: /Ingreso \(Venta\)/ }); }
  get rapidoTipoEgreso() { return this.rapido.getByRole('button', { name: /Egreso \(Insumo\)/ }); }
  get rapidoDescripcion() { return this.rapido.locator('input[type="text"]'); }
  get rapidoCategoria() { return this.rapido.locator('select').nth(0); }
  get rapidoMonto() { return this.rapido.locator('input[type="number"]'); }
  get rapidoMedio() { return this.rapido.locator('select').nth(1); }
  get rapidoGuardar() { return this.rapido.locator('button[type="submit"]'); }
  get rapidoExito() { return this.rapido.getByText('¡REGISTRADO CON ÉXITO!'); }
  get rapidoFormularioCompleto() { return this.page.getByRole('button', { name: /Abrir formulario completo/ }); }

  /* Filas de "Registros Recientes del Mes": columnas fecha, concepto, categoría, monto, acciones. */
  fila(texto: string | RegExp) { return this.page.locator('main table tbody tr').filter({ hasText: texto }); }
  async descripciones() { return this.page.locator('main table tbody tr td:nth-child(2) p.font-semibold').allTextContents(); }

  /* Gráfico diario (el primero de la pantalla): marcas del eje de días. */
  get diasDelGrafico() { return this.page.locator('.recharts-wrapper').first().locator('text.recharts-cartesian-axis-tick-value').filter({ hasText: /^\d+$/ }); }
  /* Pasa el cursor por la marca del día y devuelve el texto del globo. */
  async globoDelDia(dia: number) {
    const grafico = this.page.locator('.recharts-wrapper').first();
    await grafico.scrollIntoViewIfNeeded();
    const marca = this.diasDelGrafico.filter({ hasText: new RegExp(`^${dia}$`) });
    const caja = (await marca.boundingBox())!;
    const area = (await grafico.boundingBox())!;
    await this.page.mouse.move(caja.x + caja.width / 2, area.y + area.height / 2);
    const globo = grafico.locator('.recharts-tooltip-wrapper');
    await expect(globo).toContainText(`Día ${dia} de`);
    return globo.innerText();
  }
}

export class VistaDia {
  constructor(private page: Page) {}
  get titulo() { return this.page.locator('h2').filter({ hasText: /\d{4}/ }).first(); }
  get fecha() { return this.page.locator('input[type="date"]'); }
  get anterior() { return this.page.getByTitle('Día anterior'); }
  get siguiente() { return this.page.getByTitle('Día siguiente'); }
  get hoy() { return this.page.getByRole('button', { name: 'Ir a Hoy' }); }
  get ingresoDia() { return this.page.getByRole('button', { name: 'Ingreso Día' }); }
  get egresoDia() { return this.page.getByRole('button', { name: 'Egreso Día' }); }
  private kpi(titulo: string) { return this.page.locator('span', { hasText: new RegExp(`^${titulo}$`) }).locator('xpath=../..').locator('p'); }
  get ingresos() { return this.kpi('Ingresos Hoy'); }
  get egresos() { return this.kpi('Egresos Hoy'); }
  get balance() { return this.kpi('Balance Día'); }
  get calendarioMes() { return this.page.locator('h3', { hasText: 'Calendario del Mes' }).locator('xpath=following-sibling::span'); }
  get detalle() { return this.page.getByRole('heading', { name: 'Detalle de Movimientos del Día' }); }
  get sinMovimientos() { return this.page.getByText('Sin movimientos para esta fecha'); }
  /* Movimientos listados: una fila por <p> de descripción dentro del bloque de detalle. */
  get descripciones() { return this.page.locator('div.divide-y p.font-semibold'); }
  tacho(descripcion: string) { return this.page.locator('div.divide-y > div').filter({ hasText: descripcion }).getByTitle('Eliminar'); }
  lapiz(descripcion: string) { return this.page.locator('div.divide-y > div').filter({ hasText: descripcion }).getByTitle('Editar'); }
}

export class VistaCategorias {
  constructor(private page: Page) {}
  get ingresos() { return this.page.getByRole('button', { name: /^Ingresos \(/ }); }
  get egresos() { return this.page.getByRole('button', { name: /^Egresos \(/ }); }
  tarjeta(nombre: string) { return this.page.locator('h3', { hasText: new RegExp(`^${nombre}$`) }).locator('xpath=../../../..'); }
  total(nombre: string) { return this.tarjeta(nombre).locator('p.font-extrabold'); }
  detalle(nombre: string) { return this.page.getByRole('heading', { name: `${nombre} — Detalle de Subcategorías` }); }
  subcategoria(nombre: string) { return this.page.locator('div.bg-slate-50\\/70').filter({ has: this.page.locator('span', { hasText: new RegExp(`^${nombre}$`) }) }); }
}

export class Exportar {
  constructor(private page: Page) {}
  get titulo() { return this.page.getByRole('heading', { name: 'Exportar & Respaldos' }); }
  get mes() { return this.page.getByRole('button', { name: /^Descargar Mes \(/ }); }
  get completo() { return this.page.getByRole('button', { name: 'Historial Completo' }); }
  get respaldo() { return this.page.getByRole('button', { name: 'Descargar Respaldo' }); }
  get archivo() { return this.page.locator('input[type="file"]'); }
  get restaurar() { return this.page.getByRole('button', { name: 'Restaurar Archivo' }); }
  get cerrar() { return this.page.getByRole('button', { name: 'Cerrar', exact: true }); }
  /* La X de la esquina (solo ícono). */
  get botonX() { return this.page.locator('button:has(svg.lucide-x)').last(); }
  get abrirReset() { return this.page.getByRole('button', { name: /Abrir panel para Restablecer Datos/ }); }
  async descargar(boton: Locator) {
    const [descarga] = await Promise.all([this.page.waitForEvent('download'), boton.click()]);
    return descarga;
  }
  /* Elige un archivo en memoria (sin tocar el disco). */
  async elegir(nombre: string, contenido: string) {
    await this.archivo.setInputFiles({ name: nombre, mimeType: 'application/json', buffer: Buffer.from(contenido) });
  }
}

export class Reinicio {
  constructor(private page: Page) {}
  get titulo() { return this.page.getByRole('heading', { name: 'Restablecer Datos', exact: true }); }
  get conteo() { return this.page.getByText(/Actualmente tienes/); }
  get vaciar() { return this.page.getByRole('button', { name: 'Vaciar todos los movimientos' }); }
  get confirmaVaciar() { return this.page.getByText(/¿Confirmas que deseas borrar todos los/); }
  get siVaciar() { return this.page.getByRole('button', { name: 'Sí, vaciar todos los datos' }); }
  get ejemplos() { return this.page.getByRole('button', { name: 'Restablecer datos de muestra' }); }
  get siEjemplos() { return this.page.getByRole('button', { name: 'Sí, cargar ejemplos' }); }
  get categorias() { return this.page.getByRole('button', { name: 'Restablecer categorías originales' }); }
  get siCategorias() { return this.page.getByRole('button', { name: 'Sí, restablecer categorías' }); }
  get cancelar() { return this.page.getByRole('button', { name: 'Cancelar' }); }
  get cerrar() { return this.page.getByRole('button', { name: 'Cerrar', exact: true }); }
  get exito() { return this.page.getByText(/¡Se vaciaron todos los movimientos!/); }
}

/* Golondrina vive en un Shadow DOM abierto: los localizadores por rol y etiqueta lo atraviesan. */
export class Golondrina {
  constructor(private page: Page) {}
  get lanzador() { return this.page.getByRole('button', { name: 'Abrir asistente Golondrina' }); }
  get panel() { return this.page.getByRole('dialog', { name: 'Asistente Golondrina' }); }
  get entrada() { return this.page.getByLabel('Mensaje para Golondrina'); }
  get mensajes() { return this.page.locator('golondrina-asistente .msg'); }
  get respuestas() { return this.page.locator('golondrina-asistente .msg.golondrina'); }
  get vuelo() { return this.page.locator('golondrina-asistente .vuelo.visible'); }
  get textoDelVuelo() { return this.vuelo.locator('p'); }
  get ahoraNo() { return this.vuelo.getByRole('button', { name: 'Ahora no' }); }
  get silenciar() { return this.vuelo.getByRole('button', { name: 'No me muestres esto de nuevo' }); }
  get cerrarVuelo() { return this.vuelo.getByRole('button', { name: 'Cerrar sugerencia' }); }
  async abrir() {
    if (!(await this.panel.isVisible())) await this.lanzador.click();
    await expect(this.panel).toBeVisible();
  }
  async cerrar() { await this.page.getByRole('button', { name: 'Cerrar asistente' }).click(); }
  /* Escribe una frase, la envía y devuelve el texto de la respuesta nueva. */
  async decir(frase: string) {
    await this.abrir();
    const antes = await this.respuestas.count();
    await this.entrada.fill(frase);
    await this.entrada.press('Enter');
    await expect(this.respuestas).toHaveCount(antes + 1);
    return this.respuestas.last().innerText();
  }
  /* Envía una frase que no produce respuesta de texto (por ejemplo, el menú de ayuda). */
  async enviar(frase: string) {
    await this.abrir();
    await this.entrada.fill(frase);
    await this.entrada.press('Enter');
  }
  boton(nombre: string | RegExp) { return this.page.locator('golondrina-asistente .msg button').filter({ hasText: nombre }); }
  async memoria(): Promise<any | null> {
    const crudo = await this.page.evaluate((k) => localStorage.getItem(k), CLAVE_GOLONDRINA);
    return crudo ? JSON.parse(crudo) : null;
  }
}

/* Rutinas de Golondrina del plan (IYG-APR-*): venta de feria seguida del canon (R1) y cartelería seguida de vinilo (R2).
   El tiempo se adelanta con el reloj simulado de Playwright: no hay esperas reales. Ninguna acción usa elementos con
   `data-golondrina` (menú, flechas de mes, exportar), porque cada clic en ellos cuenta como una acción y corta la secuencia. */
export class Rutinas {
  static readonly V = 'registrar-ingreso?rubro=Puesto Feria';
  static readonly C = 'registrar-egreso?rubro=Canon de puesto feria';
  static readonly CARTEL = 'registrar-ingreso?rubro=Cartelería';
  static readonly VINILO = 'registrar-egreso?rubro=Vinilo';
  constructor(private app: App) {}
  private get reloj() { return this.app.page.clock; }
  venta(monto = '10000') { return this.app.nuevoMovimiento({ tipo: 'ingreso', categoria: 'Ventas en Feria', subcategoria: 'Puesto Feria', monto }); }
  canon(monto = '8000') { return this.app.nuevoMovimiento({ tipo: 'egreso', categoria: 'Pago de Canon para Feria', subcategoria: 'Canon de puesto feria', monto }); }
  cartel(monto = '5000') { return this.app.nuevoMovimiento({ tipo: 'ingreso', categoria: 'Personalizados por Encargue', subcategoria: 'Cartelería', monto }); }
  vinilo(monto = '1500') { return this.app.nuevoMovimiento({ tipo: 'egreso', categoria: 'Compra de Insumos', subcategoria: 'Vinilo', monto }); }
  async parR1(n: number) { for (let i = 0; i < n; i++) { await this.venta(); await this.canon(); } }
  async parR2(n: number) { for (let i = 0; i < n; i++) { await this.cartel(); await this.vinilo(); } }
  async ahora(): Promise<number> { return this.app.page.evaluate(() => Date.now()); }
  async avanzar(ms: number) { await this.reloj.runFor(ms); }
  /* Un vuelo dura 25 s en pantalla: avanzar de a 4 s alcanza para verlo y es mucho más barato que de a 1 s. */
  private static readonly PASO = 4000;
  /* Avanza el reloj y devuelve los textos de todos los vuelos que aparecieron. */
  async vuelosEn(ms: number): Promise<string[]> {
    const vistos = new Set<string>();
    for (let t = 0; t < ms; t += Rutinas.PASO) {
      await this.reloj.runFor(Rutinas.PASO);
      if (await this.app.golondrina.vuelo.count()) vistos.add(await this.app.golondrina.textoDelVuelo.innerText());
    }
    return [...vistos];
  }
  /* Avanza hasta que aparezca un vuelo cuyo texto cumpla el patrón; devuelve null si no aparece en `ms`. */
  async esperarVuelo(patron: RegExp, ms: number): Promise<string | null> {
    for (let t = 0; t < ms; t += Rutinas.PASO) {
      await this.reloj.runFor(Rutinas.PASO);
      if (await this.app.golondrina.vuelo.count()) {
        const texto = await this.app.golondrina.textoDelVuelo.innerText();
        if (patron.test(texto)) return texto;
      }
    }
    return null;
  }
  async sugerencia(clave: string) { return (await this.app.golondrina.memoria())?.sugerencias?.[clave]; }
}

export class App {
  readonly dialogos: Dialogos;
  readonly formulario: Formulario;
  readonly historial: Historial;
  readonly general: VistaGeneral;
  readonly dia: VistaDia;
  readonly categorias: VistaCategorias;
  readonly exportar: Exportar;
  readonly reinicio: Reinicio;
  readonly golondrina: Golondrina;
  readonly rutinas: Rutinas;

  constructor(readonly page: Page) {
    this.dialogos = new Dialogos(page);
    this.formulario = new Formulario(page);
    this.historial = new Historial(page);
    this.general = new VistaGeneral(page);
    this.dia = new VistaDia(page);
    this.categorias = new VistaCategorias(page);
    this.exportar = new Exportar(page);
    this.reinicio = new Reinicio(page);
    this.golondrina = new Golondrina(page);
    this.rutinas = new Rutinas(this);
  }

  // --- Barra lateral y encabezado ---
  get barra() { return this.page.locator('aside'); }
  get balanceMensual() { return this.barra.locator('p.text-lg'); }
  get barraIngresos() { return this.barra.locator('span', { hasText: 'Ing:' }).locator('strong'); }
  get barraEgresos() { return this.barra.locator('span', { hasText: 'Egr:' }).locator('strong'); }
  get barraMes() { return this.barra.locator('span.font-mono'); }
  get almacenamiento() { return this.barra.getByText(/^(Local|Nube Supabase)$/); }
  get tituloDeVista() { return this.page.locator('header h1'); }
  get mes() { return this.page.locator('header span.font-bold').filter({ hasText: /\d{4}/ }); }
  get mesAnterior() { return this.page.locator('header').getByTitle('Mes anterior'); }
  get mesSiguiente() { return this.page.locator('header').getByTitle('Mes siguiente'); }
  get botonIngreso() { return this.page.locator('#btn-header-add-income'); }
  get botonEgreso() { return this.page.locator('#btn-header-add-expense'); }
  get avisoDeNube() { return this.page.getByRole('alert'); }

  async irA(vista: Vista) {
    const nombres: Record<Vista, string> = { dashboard: 'Dashboard', daily: 'Registro por Día', categories: 'Insumos & Categorías', history: 'Todos los Movimientos' };
    const lateral = this.page.getByRole('button', { name: nombres[vista], exact: true });
    if (await lateral.isVisible()) { await lateral.click(); return; }
    await this.page.locator(`#mobile-nav-${vista === 'dashboard' ? 'dashboard' : vista}`).click();
  }
  async abrirExportar() { await this.barra.getByRole('button', { name: 'Exportar & Respaldos' }).click(); await expect(this.exportar.titulo).toBeVisible(); }
  async abrirReinicio() { await this.barra.getByRole('button', { name: 'Restablecer Datos' }).click(); await expect(this.reinicio.titulo).toBeVisible(); }

  /* Selecciona un mes con las flechas del encabezado ("2026-11" → "Noviembre de 2026"). */
  async irAMes(clave: string) {
    const [a, m] = clave.split('-').map(Number);
    const etiqueta = `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a}`;
    for (let i = 0; i < 60; i++) {
      if ((await this.mes.innerText()).trim() === etiqueta) return;
      const [ma, mm] = (await this.barraMes.innerText()).split('-').map(Number);
      await ((ma * 12 + mm) > (a * 12 + m) ? this.mesAnterior : this.mesSiguiente).click();
    }
    throw new Error(`No se pudo llegar a ${etiqueta}`);
  }

  async nuevoMovimiento(m: NuevoMovimiento) {
    await (m.tipo === 'ingreso' ? this.botonIngreso : this.botonEgreso).click();
    await this.formulario.abierto();
    await this.formulario.completar(m);
    await this.formulario.guardar.click();
    await this.formulario.cerrado();
  }

  /* Movimientos guardados en el navegador (modo local). */
  async guardados(): Promise<any[]> {
    return this.page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), CLAVE_TRANSACCIONES);
  }
  async guardadosCrudo(): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), CLAVE_TRANSACCIONES);
  }
  async categoriasGuardadas(): Promise<any[]> {
    return this.page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), CLAVE_CATEGORIAS);
  }
}
