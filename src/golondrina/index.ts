/**
 * Golondrina — asistente + automatización que aprende por repetición y contexto.
 *
 * Uso mínimo:
 *   const g = crearGolondrina({ app: 'mi-sistema', acciones: [...] })
 *   g.contexto('inicio')                       // dónde está el usuario
 *   g.registrar('buscar', { consulta: 'x' })   // algo que hizo a mano
 *
 * El usuario le habla al asistente ("buscá puertas de roble") y el asistente
 * ejecuta la acción. Golondrina observa todo (lo manual y lo pedido), aprende
 * los hábitos y los muestra en el momento justo, sin que el usuario tenga que
 * aprender dónde está cada cosa.
 */
import { ejemploFrase, generarSugerencias, resumenAprendido, tituloDe } from './aprendizaje'
import {
  accionAplica,
  esCancelar,
  esOlvido,
  esPedidoDeAyuda,
  esPreguntaAprendizaje,
  esSilencio,
  interpretar,
  type Interpretacion,
} from './interprete'
import { Memoria } from './memoria'
import { buscarOpcion, normalizar } from './texto'
import type { Accion, Contexto, OpcionesGolondrina, ParametroAccion, Parametros, Sugerencia, ValorContexto, Via } from './tipos'
import { InterfazGolondrina, type Boton } from './ui'

export type * from './tipos'

/** Pausa mínima entre dos sugerencias "en vuelo". */
const PAUSA_ENTRE_VUELOS_MS = 90 * 1000

interface Pendiente {
  accion: Accion
  parametros: Parametros
  faltante: ParametroAccion
  frase: string
}

export class Golondrina {
  readonly memoria: Memoria
  private acciones = new Map<string, Accion>()
  private ctx: Contexto = { seccion: 'inicio' }
  private readonly op: Required<Pick<OpcionesGolondrina, 'app' | 'nombre' | 'minRepeticiones' | 'sugerir'>> & OpcionesGolondrina
  private ui: InterfazGolondrina | null = null
  private pendiente: Pendiente | null = null
  private ultimoVuelo = 0
  private vueloActual: Sugerencia | null = null
  private temporizador: ReturnType<typeof setTimeout> | null = null
  private intervalo: ReturnType<typeof setInterval> | null = null
  private saludado = false
  private ejecutando = 0
  private temaActual: 'auto' | 'claro' | 'oscuro' = 'auto'
  private readonly alClic = (e: Event) => this.capturarClic(e)

  constructor(opciones: OpcionesGolondrina) {
    this.op = { nombre: 'Golondrina', minRepeticiones: 3, sugerir: true, ...opciones }
    this.memoria = new Memoria(opciones.app, opciones.almacenamiento, this.ahora)
    this.definirAcciones(opciones.acciones)
  }

  private readonly ahora = () => (this.op?.ahora ?? Date.now)()

  /** Monta la interfaz. Se llama solo desde crearGolondrina en el navegador. */
  montar() {
    if (this.ui || typeof document === 'undefined') return this
    this.ui = new InterfazGolondrina({
      nombre: this.op.nombre,
      colorPrimario: this.op.colorPrimario ?? '#1f4e8c',
      colorTexto: this.op.colorTexto ?? '#ffffff',
      posicion: this.op.posicion ?? 'derecha',
      abajo: this.op.abajo ?? 20,
      contenedor: this.op.contenedor ?? document.body,
      alEnviar: (texto) => void this.escuchar(texto),
      alAbrir: () => this.alAbrirPanel(),
    })
    this.ui.definirTema(this.temaActual)
    if (this.op.capturarClics !== false) document.addEventListener('click', this.alClic, true)
    this.intervalo = setInterval(() => this.evaluar(), 60 * 1000)
    this.programarEvaluacion(2500)
    return this
  }

  destruir() {
    if (this.temporizador) clearTimeout(this.temporizador)
    if (this.intervalo) clearInterval(this.intervalo)
    document.removeEventListener('click', this.alClic, true)
    this.ui?.destruir()
    this.ui = null
  }

  // ───────────────────────── API para el sistema anfitrión ─────────────────────────

  /** Reemplaza el catálogo de acciones (útil en React, donde cambian los closures). */
  definirAcciones(acciones: Accion[]) {
    this.acciones = new Map(acciones.map((a) => [a.id, a]))
  }

  /** Informa dónde está el usuario. */
  contexto(seccion: string, extra?: Record<string, ValorContexto>) {
    const cambio = seccion !== this.ctx.seccion
    this.ctx = { seccion, extra }
    if (cambio) {
      this.memoria.visitarSeccion(seccion)
      this.memoria.guardar()
      this.programarEvaluacion(1500)
    }
  }

  get contextoActual(): Contexto {
    return this.ctx
  }

  /** Separa la memoria por usuario (llamar al iniciar/cerrar sesión). */
  usuario(nombre: string | null) {
    this.memoria.cambiarUsuario(this.op.app, nombre)
    this.saludado = false
  }

  /** Registra una acción que el usuario hizo por su cuenta (clic, formulario...). */
  registrar(accionId: string, parametros: Parametros = {}, via: Via = 'manual') {
    // Lo que la app registre mientras el asistente ejecuta ya lo cuenta el asistente.
    if (via === 'manual' && this.ejecutando > 0) return
    const accion = this.acciones.get(accionId)
    const memorizables = this.memorizables(accion, parametros)
    const firmaNueva = `${accionId}|${JSON.stringify(memorizables)}`
    const ultimo = this.memoria.estado.recientes.at(-1)
    // Evita contar dos veces lo mismo (p. ej. el asistente ejecuta y la app también registra).
    if (ultimo && `${ultimo.accion}|${JSON.stringify(ultimo.parametros)}` === firmaNueva && this.ahora() - ultimo.t < 400) return
    this.memoria.registrar(accionId, memorizables, this.ctx.seccion, via)
    this.programarEvaluacion(1800)
  }

  /** Sincroniza la apariencia con el tema del sistema anfitrión. */
  tema(tema: 'auto' | 'claro' | 'oscuro') {
    this.temaActual = tema
    this.ui?.definirTema(tema)
  }

  abrir(texto?: string) {
    this.ui?.abrir(texto)
  }

  /** Procesa un mensaje del usuario como si lo hubiera escrito en el panel. */
  async escuchar(texto: string) {
    const ui = this.ui
    ui?.agregarMensaje('usuario', texto)
    const respuesta = await this.responder(texto)
    if (respuesta) ui?.agregarMensaje('golondrina', respuesta.texto, respuesta.botones)
    this.actualizarChips()
    return respuesta
  }

  /** Sugerencias actuales (para mostrarlas también dentro de la propia app). */
  sugerencias(paraPanel = false): Sugerencia[] {
    return generarSugerencias({
      ignorarDescanso: paraPanel,
      memoria: this.memoria,
      acciones: this.acciones,
      ctx: this.ctx,
      ahora: this.ahora(),
      minRepeticiones: this.op.minRepeticiones,
    })
  }

  /** Ejecuta una acción del catálogo y la registra. */
  async ejecutar(accionId: string, parametros: Parametros = {}, via: Via = 'asistente'): Promise<string> {
    const accion = this.acciones.get(accionId)
    if (!accion) return 'No encontré esa acción.'
    if (!accionAplica(accion, this.ctx)) return `Ahora mismo no puedo «${tituloDe(accion, parametros)}» desde acá.`
    this.ejecutando++
    try {
      const resultado = await accion.ejecutar(parametros, this.ctx)
      this.ejecutando--
      this.registrar(accionId, parametros, via)
      return resultado || `Listo: ${tituloDe(accion, parametros)}.`
    } catch (error) {
      this.ejecutando--
      return `No pude completarlo: ${error instanceof Error ? error.message : 'error inesperado'}.`
    }
  }

  // ───────────────────────── Conversación ─────────────────────────

  async responder(texto: string): Promise<{ texto: string; botones?: Boton[] } | null> {
    const pendiente = this.pendiente
    if (pendiente) {
      this.pendiente = null
      if (esCancelar(texto)) return { texto: 'Listo, lo dejamos.' }
      const opciones = pendiente.faltante.opciones?.()
      const valor = opciones ? buscarOpcion(texto, opciones) : texto
      // Si la respuesta no es una opción válida, se toma como un pedido nuevo.
      if (valor) return this.completar(pendiente.accion, { ...pendiente.parametros, [pendiente.faltante.nombre]: valor }, pendiente.frase)
    }

    if (esPedidoDeAyuda(texto)) return this.ayuda()
    if (esPreguntaAprendizaje(texto)) {
      return { texto: resumenAprendido(this.memoria, this.acciones, this.ahora(), this.op.minRepeticiones) }
    }
    if (esOlvido(texto)) {
      return {
        texto: '¿Seguro? Voy a olvidar todos tus hábitos y frases aprendidas.',
        botones: [
          { texto: 'Sí, olvidá todo', principal: true, alHacer: () => { this.memoria.olvidarTodo(); this.ui?.agregarMensaje('golondrina', 'Hecho. Empiezo de cero.') } },
          { texto: 'No', alHacer: () => this.ui?.agregarMensaje('golondrina', 'Perfecto, no borro nada.') },
        ],
      }
    }
    const silencio = esSilencio(texto)
    if (silencio) {
      this.memoria.estado.silencio = silencio === 'silenciar'
      this.memoria.guardar()
      return {
        texto: silencio === 'silenciar'
          ? 'Entendido, no voy a interrumpirte con sugerencias. Sigo aprendiendo; pedime «volvé a sugerir» cuando quieras.'
          : '¡Vuelvo a volar! Te aviso cuando vea algo útil.',
      }
    }

    const acciones = [...this.acciones.values()]
    const candidatos = interpretar(texto, acciones, this.ctx, this.memoria.estado.frases)
    const mejor = candidatos[0]
    const frase = normalizar(texto)

    if (mejor && mejor.puntaje >= 0.6 && (!candidatos[1] || mejor.puntaje - candidatos[1].puntaje >= 0.08 || mejor.puntaje > 1)) {
      return this.completar(mejor.accion, mejor.parametros, frase, mejor)
    }

    if (this.op.interpretar) {
      try {
        const externo = await this.op.interpretar(texto, acciones.filter((a) => accionAplica(a, this.ctx)), this.ctx)
        const accion = externo && this.acciones.get(externo.accion)
        if (accion) return this.completar(accion, externo.parametros ?? {}, frase)
      } catch {
        /* si el intérprete externo falla, seguimos con el local */
      }
    }

    // ¿Lo pidió bien pero ahora no se puede? Explicar qué falta en vez de adivinar.
    const noDisponible = interpretar(texto, acciones, this.ctx, {}, false)[0]
    if (noDisponible && noDisponible.puntaje >= 0.6 && noDisponible.puntaje > (mejor?.puntaje ?? 0)) {
      const titulo = tituloDe(noDisponible.accion, noDisponible.parametros)
      return { texto: `${titulo}: eso lo sé hacer, pero no desde acá. ${noDisponible.accion.requisito ?? ''}`.trim() }
    }

    const dudosos = candidatos.filter((c) => c.puntaje >= 0.3).slice(0, 3)
    if (dudosos.length) {
      return {
        texto: dudosos.length === 1 ? '¿Te referís a esto?' : 'No estoy segura de haber entendido. ¿Es alguna de estas?',
        botones: [
          ...dudosos.map((c) => ({
            texto: c.faltantes.length && c.accion.descripcion
              ? c.accion.descripcion.charAt(0).toUpperCase() + c.accion.descripcion.slice(1)
              : tituloDe(c.accion, c.parametros),
            principal: true,
            alHacer: () => {
              // Aprende la frase: la próxima vez la entiende directo.
              this.memoria.aprenderFrase(frase, c.accion.id, this.memorizables(c.accion, c.parametros))
              void this.completar(c.accion, c.parametros, frase).then((r) => r && this.ui?.agregarMensaje('golondrina', r.texto, r.botones))
            },
          })),
          { texto: 'Ninguna', alHacer: () => this.ui?.agregarMensaje('golondrina', 'Gracias por avisar. Probá decirlo de otra forma o escribí «ayuda» para ver lo que sé hacer.') },
        ],
      }
    }
    return {
      texto: 'Todavía no sé hacer eso. Escribí «ayuda» y te muestro lo que puedo hacer en esta pantalla.',
      botones: this.botonesDeSugerencias(),
    }
  }

  private async completar(accion: Accion, parametros: Parametros, frase: string, interpretacion?: Interpretacion) {
    const faltante = (interpretacion?.faltantes ?? accion.parametros?.filter((p) => p.requerido && !parametros[p.nombre]) ?? [])[0]
    if (faltante && !parametros[faltante.nombre]) {
      this.pendiente = { accion, parametros, faltante, frase }
      const opciones = faltante.opciones?.().slice(0, 6) ?? []
      return {
        texto: faltante.pregunta ?? `¿Qué ${faltante.nombre}?`,
        botones: opciones.map((o) => ({
          texto: o,
          alHacer: () => void this.escuchar(o),
        })),
      }
    }
    const texto = await this.ejecutar(accion.id, parametros, 'asistente')
    return { texto }
  }

  private ayuda() {
    const disponibles = [...this.acciones.values()].filter((a) => accionAplica(a, this.ctx) && a.frases?.length)
    const lista = disponibles.slice(0, 8).map((a) => `• «${ejemploFrase(a, {})}» — ${a.descripcion ?? a.titulo}`)
    return {
      texto: `Soy ${this.op.nombre}. Pedime las cosas con tus palabras y las hago por vos. Mientras tanto aprendo tus costumbres y te las adelanto.\n\nAquí puedo:\n${lista.join('\n')}\n\nTambién: «¿qué aprendiste?», «no me sugieras», «olvidá todo».`,
      botones: disponibles.slice(0, 3).map((a) => ({ texto: ejemploFrase(a, {}), alHacer: () => this.ui?.abrir(ejemploFrase(a, {})) })),
    }
  }

  // ───────────────────────── Automatización ─────────────────────────

  private alAbrirPanel() {
    if (!this.saludado) {
      this.saludado = true
      const saludo = this.op.saludo ?? `¡Hola! Soy ${this.op.nombre}. Decime qué necesitás y lo hago. Con el uso aprendo tus costumbres para adelantarme.`
      this.ui?.agregarMensaje('golondrina', saludo)
    }
    this.actualizarChips()
  }

  private botonesDeSugerencias(): Boton[] {
    return this.sugerencias(true)
      .slice(0, 3)
      .map((s) => ({ texto: s.boton, alHacer: () => void this.aceptar(s) }))
  }

  private actualizarChips() {
    const chips = this.sugerencias(true)
      .filter((s) => s.tipo !== 'atajo')
      .slice(0, 4)
      .map((s) => ({ texto: s.boton, alHacer: () => void this.aceptar(s) }))
    this.ui?.mostrarChips(chips)
  }

  private programarEvaluacion(ms: number) {
    if (!this.ui) return
    if (this.temporizador) clearTimeout(this.temporizador)
    this.temporizador = setTimeout(() => this.evaluar(), ms)
  }

  /** Decide si Golondrina "sale volando" con una sugerencia. */
  evaluar() {
    const ui = this.ui
    if (!ui) return
    if (ui.abierto) {
      this.actualizarChips()
      return
    }
    if (!this.op.sugerir || this.memoria.estado.silencio) return
    if (typeof document !== 'undefined' && document.hidden) return
    const s = this.sugerencias().find((x) => x.confianza >= 0.3)
    if (!s) return
    // Una sugerencia mucho más pertinente puede reemplazar a la que está en pantalla.
    const reemplaza = ui.vueloVisible && !!this.vueloActual && s.clave !== this.vueloActual.clave && s.confianza >= this.vueloActual.confianza + 0.2
    if (ui.vueloVisible && !reemplaza) return
    if (!reemplaza && this.ahora() - this.ultimoVuelo < PAUSA_ENTRE_VUELOS_MS) return
    const estado = this.memoria.estadoSugerencia(s.clave)
    const mostrada = ui.mostrarVuelo(
      s.mensaje,
      [
        { texto: s.boton, principal: true, alHacer: () => void this.aceptar(s) },
        { texto: 'Ahora no', alHacer: () => this.rechazar(s) },
      ],
      () => this.rechazar(s),
      () => {
        this.memoria.estadoSugerencia(s.clave).silenciada = true
        this.memoria.guardar()
      },
    )
    if (mostrada) {
      this.vueloActual = s
      estado.mostrada = this.ahora()
      estado.veces += 1
      this.ultimoVuelo = this.ahora()
      this.memoria.guardar()
    }
  }

  async aceptar(s: Sugerencia) {
    const estado = this.memoria.estadoSugerencia(s.clave)
    estado.aceptadas += 1
    estado.rechazos = Math.max(0, estado.rechazos - 1)
    this.memoria.guardar()
    if (s.tipo === 'atajo') {
      const accion = this.acciones.get(s.accion)
      this.ui?.abrir(accion ? ejemploFrase(accion, s.parametros) : '')
      return
    }
    const texto = await this.ejecutar(s.accion, s.parametros, 'golondrina')
    if (this.ui?.abierto) this.ui.agregarMensaje('golondrina', texto)
  }

  private rechazar(s: Sugerencia) {
    this.memoria.estadoSugerencia(s.clave).rechazos += 1
    this.memoria.guardar()
  }

  // ───────────────────────── Utilidades ─────────────────────────

  private memorizables(accion: Accion | undefined, parametros: Parametros): Parametros {
    const salida: Parametros = {}
    for (const [k, v] of Object.entries(parametros)) {
      const def = accion?.parametros?.find((p) => p.nombre === k)
      if (def?.memorizable === false) continue
      if (def?.libre && v.length > 40) continue
      salida[k] = def?.libre ? v.trim().replace(/\s+/g, ' ') : v
    }
    return salida
  }

  /** Elementos con data-golondrina="accion" (y data-golondrina-xxx="valor") se registran solos. */
  private capturarClic(e: Event) {
    const destino = (e.target as Element | null)?.closest?.('[data-golondrina]') as HTMLElement | null
    if (!destino) return
    const accionId = destino.dataset['golondrina']
    if (!accionId) return
    const parametros: Parametros = {}
    for (const [clave, valor] of Object.entries(destino.dataset)) {
      if (clave.startsWith('golondrina') && clave !== 'golondrina' && valor !== undefined) {
        const nombre = clave.slice('golondrina'.length)
        parametros[nombre.charAt(0).toLowerCase() + nombre.slice(1)] = valor
      }
    }
    this.registrar(accionId, parametros, 'manual')
  }
}

export function crearGolondrina(opciones: OpcionesGolondrina): Golondrina {
  return new Golondrina(opciones).montar()
}

export { tituloDe, ejemploFrase } from './aprendizaje'
export { normalizar } from './texto'
