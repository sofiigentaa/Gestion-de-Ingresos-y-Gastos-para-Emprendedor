/**
 * Golondrina — tipos compartidos.
 *
 * Una "acción" es algo que el sistema sabe hacer (navegar, buscar, enviar un
 * mensaje...). El asistente las ejecuta a pedido del usuario y Golondrina las
 * observa para aprender hábitos y luego sugerirlas en el momento oportuno.
 */

export type ValorContexto = string | number | boolean | null | undefined

/** Dónde está el usuario y qué está pasando en el sistema. */
export interface Contexto {
  /** Pantalla o sección actual (ej: "catalogo", "admin", "chat-general"). */
  seccion: string
  /** Datos extra que la app quiera aportar (ej: { conversacion: 'dm' }). */
  extra?: Record<string, ValorContexto>
}

export type Parametros = Record<string, string>

export interface ParametroAccion {
  nombre: string
  /** Valores posibles; el asistente los reconoce dentro de la frase del usuario. */
  opciones?: () => string[]
  /** Solo para que Golondrina recuerde el valor: no se busca en la frase. */
  soloMemoria?: boolean
  /** Si es texto libre, se toma lo que sigue a las palabras de la frase. */
  libre?: boolean
  /** Con libre: recibe la frase completa del usuario (útil si la acción la analiza sola). */
  completo?: boolean
  requerido?: boolean
  /** Pregunta que hace el asistente si falta el parámetro. */
  pregunta?: string
  /**
   * Si es false, el valor no forma parte del "hábito" aprendido
   * (útil para textos largos o datos sensibles). Por defecto true.
   */
  memorizable?: boolean
}

export type ResultadoAccion = void | string | Promise<void | string>

export interface Accion {
  id: string
  /** Texto corto que se muestra en botones: "Ver puertas". Puede usar {param}. */
  titulo: string
  descripcion?: string
  icono?: string
  /**
   * Frases de ejemplo en lenguaje natural. Usá {nombreParametro} para marcar
   * dónde va un parámetro: "buscar {consulta}", "enviar {texto}".
   */
  frases?: string[]
  parametros?: ParametroAccion[]
  /** Secciones donde la acción tiene sentido. Vacío = en todas. */
  secciones?: string[]
  /** Si devuelve false la acción no se ofrece ni se ejecuta. */
  disponible?: (ctx: Contexto) => boolean
  /** Qué le falta al usuario cuando no está disponible (ej: "Primero ingresá a gestión"). */
  requisito?: string
  ejecutar: (parametros: Parametros, ctx: Contexto) => ResultadoAccion
  /** Frase de ejemplo concreta para enseñar la acción ("cuánto gasté en nafta"). */
  ejemplo?: string
  /** Grupo en el menú de funciones del asistente (ej: "Registrar", "Consultar"). */
  grupo?: string
  /** Texto del botón en el menú (por defecto, el título sin parámetros). */
  menu?: string
  /**
   * Qué pasa al tocarla en el menú: 'ejecutar' la hace al instante; 'escribir'
   * deja la frase de ejemplo lista para completar. Por defecto: 'escribir' si
   * tiene parámetros obligatorios, si no 'ejecutar'.
   */
  alTocar?: 'ejecutar' | 'escribir'
  /** Golondrina puede presentarla al usuario aunque nunca la haya usado. */
  descubrible?: boolean
  /** Cómo hacerlo a mano (se muestra al enseñar la acción). */
  comoHacerlo?: string
}

export type Via = 'manual' | 'asistente' | 'golondrina'

export interface Evento {
  accion: string
  firma: string
  parametros: Parametros
  seccion: string
  franja: Franja
  via: Via
  t: number
}

export type Franja = 'madrugada' | 'manana' | 'tarde' | 'noche'

export type TipoSugerencia = 'siguiente' | 'habito' | 'entrada' | 'atajo' | 'descubrir'

export interface Sugerencia {
  /** Identificador estable para no repetir / silenciar. */
  clave: string
  tipo: TipoSugerencia
  accion: string
  parametros: Parametros
  /** Mensaje que muestra Golondrina. */
  mensaje: string
  /** Texto del botón principal. */
  boton: string
  /** 0..1 */
  confianza: number
}

export interface OpcionesGolondrina {
  /** Identifica el sistema; separa la memoria entre apps. */
  app: string
  /** Nombre visible del asistente. */
  nombre?: string
  acciones: Accion[]
  saludo?: string
  colorPrimario?: string
  colorTexto?: string
  posicion?: 'derecha' | 'izquierda'
  /** Distancia al borde inferior en px (para no tapar otros botones flotantes). */
  abajo?: number
  /** Repeticiones mínimas para considerar algo un hábito. Default 3. */
  minRepeticiones?: number
  /** Mostrar sugerencias automáticamente. Default true. */
  sugerir?: boolean
  /** Contenedor donde montar la UI. Default document.body. */
  contenedor?: HTMLElement
  /** Escuchar clics en elementos con data-golondrina="idAccion". Default true. */
  capturarClics?: boolean
  /**
   * Intérprete opcional (por ejemplo un LLM) para frases que el motor local no
   * entiende. Debe devolver la acción y sus parámetros, o null.
   */
  interpretar?: (texto: string, acciones: Accion[], ctx: Contexto) => Promise<{ accion: string; parametros?: Parametros } | null>
  /** Almacenamiento; por defecto localStorage. */
  almacenamiento?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  /** Reloj inyectable (tests). */
  ahora?: () => number
}
