/**
 * Memoria de Golondrina: guarda lo que el usuario hace, en qué contexto y en
 * qué orden. Todo vive en el navegador del usuario (localStorage).
 */
import type { Evento, Franja, Parametros, Via } from './tipos'

const VERSION = 1
/** Vida media de un hábito: lo que no se repite se va olvidando. */
export const VIDA_MEDIA_MS = 14 * 24 * 60 * 60 * 1000
/** Tiempo sin actividad que inicia una nueva sesión. */
export const PAUSA_SESION_MS = 30 * 60 * 1000
/** Ventana para considerar que una acción "sigue" a otra. */
export const VENTANA_SECUENCIA_MS = 10 * 60 * 1000

export interface Habito {
  firma: string
  accion: string
  parametros: Parametros
  /** Repeticiones con olvido gradual. */
  peso: number
  total: number
  ultima: number
  franjas: Record<Franja, number>
  secciones: Record<string, number>
  manual: number
  asistente: number
  golondrina: number
  /** Veces que fue lo primero que hizo el usuario en una sesión. */
  entradas: number
}

export interface EstadoSugerencia {
  mostrada: number
  veces: number
  rechazos: number
  aceptadas: number
  silenciada: boolean
}

export interface FraseAprendida {
  accion: string
  parametros: Parametros
  veces: number
}

export interface Estado {
  v: number
  habitos: Record<string, Habito>
  transiciones: Record<string, Record<string, number>>
  /** Igual que transiciones pero por tipo de acción (sin parámetros). */
  transicionesAccion: Record<string, Record<string, number>>
  frases: Record<string, FraseAprendida>
  sugerencias: Record<string, EstadoSugerencia>
  ultimo: { firma: string; accion?: string; t: number } | null
  sesion: { inicio: number; firmas: string[]; secciones: Record<string, number> }
  silencio: boolean
  recientes: Evento[]
}

function estadoVacio(t: number): Estado {
  return {
    v: VERSION,
    habitos: {},
    transiciones: {},
    transicionesAccion: {},
    frases: {},
    sugerencias: {},
    ultimo: null,
    sesion: { inicio: t, firmas: [], secciones: {} },
    silencio: false,
    recientes: [],
  }
}

export function franjaDe(t: number): Franja {
  const h = new Date(t).getHours()
  if (h < 6) return 'madrugada'
  if (h < 13) return 'manana'
  if (h < 20) return 'tarde'
  return 'noche'
}

export function decaer(peso: number, desde: number, hasta: number): number {
  if (hasta <= desde) return peso
  return peso * Math.pow(0.5, (hasta - desde) / VIDA_MEDIA_MS)
}

export function firmaDe(accion: string, parametros: Parametros): string {
  const claves = Object.keys(parametros).sort()
  if (claves.length === 0) return accion
  return `${accion}?${claves.map((k) => `${k}=${parametros[k]}`).join('&')}`
}

type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function almacenPorDefecto(): Almacen | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export class Memoria {
  estado: Estado
  private clave: string
  private readonly almacen: Almacen | null
  private readonly ahora: () => number

  constructor(app: string, almacen?: Almacen, ahora: () => number = Date.now) {
    this.almacen = almacen ?? almacenPorDefecto()
    this.ahora = ahora
    this.clave = `golondrina:${app}`
    this.estado = this.cargar()
  }

  /** Cambia el espacio de memoria (por ejemplo, al iniciar sesión otro usuario). */
  cambiarUsuario(app: string, usuario: string | null) {
    this.clave = usuario ? `golondrina:${app}:${usuario.toLowerCase()}` : `golondrina:${app}`
    this.estado = this.cargar()
  }

  private cargar(): Estado {
    const t = this.ahora()
    try {
      const crudo = this.almacen?.getItem(this.clave)
      if (crudo) {
        const datos = JSON.parse(crudo) as Estado
        if (datos.v === VERSION) return { ...estadoVacio(t), ...datos }
      }
    } catch {
      /* memoria corrupta: se empieza de cero */
    }
    return estadoVacio(t)
  }

  guardar() {
    try {
      this.almacen?.setItem(this.clave, JSON.stringify(this.estado))
    } catch {
      /* almacenamiento lleno o bloqueado: Golondrina sigue funcionando en memoria */
    }
  }

  olvidarTodo() {
    this.estado = estadoVacio(this.ahora())
    try {
      this.almacen?.removeItem(this.clave)
    } catch {
      /* nada */
    }
  }

  /** Marca el paso del tiempo: abre una sesión nueva si hubo una pausa larga. */
  tocarSesion(): boolean {
    const t = this.ahora()
    const ultimo = this.estado.ultimo?.t ?? 0
    if (t - ultimo > PAUSA_SESION_MS && t - this.estado.sesion.inicio > PAUSA_SESION_MS) {
      this.estado.sesion = { inicio: t, firmas: [], secciones: {} }
      return true
    }
    return false
  }

  visitarSeccion(seccion: string) {
    this.tocarSesion()
    const s = this.estado.sesion.secciones
    s[seccion] = (s[seccion] ?? 0) + 1
  }

  registrar(accion: string, parametros: Parametros, seccion: string, via: Via): Evento {
    this.tocarSesion()
    const t = this.ahora()
    const firma = firmaDe(accion, parametros)
    const franja = franjaDe(t)
    const evento: Evento = { accion, firma, parametros, seccion, franja, via, t }

    const previo = this.estado.habitos[firma]
    const habito: Habito = previo ?? {
      firma,
      accion,
      parametros,
      peso: 0,
      total: 0,
      ultima: t,
      franjas: { madrugada: 0, manana: 0, tarde: 0, noche: 0 },
      secciones: {},
      manual: 0,
      asistente: 0,
      golondrina: 0,
      entradas: 0,
    }
    habito.peso = decaer(habito.peso, habito.ultima, t) + 1
    habito.total += 1
    habito.ultima = t
    habito.franjas[franja] += 1
    habito.secciones[seccion] = (habito.secciones[seccion] ?? 0) + 1
    habito[via] += 1
    if (this.estado.sesion.firmas.length === 0) habito.entradas += 1
    this.estado.habitos[firma] = habito

    // Secuencias: qué suele venir después de qué.
    const ultimo = this.estado.ultimo
    if (ultimo && ultimo.firma !== firma && t - ultimo.t <= VENTANA_SECUENCIA_MS) {
      const desde = (this.estado.transiciones[ultimo.firma] ??= {})
      desde[firma] = (desde[firma] ?? 0) + 1
    }
    if (ultimo?.accion && ultimo.accion !== accion && t - ultimo.t <= VENTANA_SECUENCIA_MS) {
      const desde = (this.estado.transicionesAccion[ultimo.accion] ??= {})
      desde[accion] = (desde[accion] ?? 0) + 1
    }
    this.estado.ultimo = { firma, accion, t }
    this.estado.sesion.firmas.push(firma)
    this.estado.recientes.push(evento)
    if (this.estado.recientes.length > 60) this.estado.recientes.splice(0, this.estado.recientes.length - 60)

    this.podar()
    this.guardar()
    return evento
  }

  aprenderFrase(frase: string, accion: string, parametros: Parametros) {
    if (!frase) return
    const previa = this.estado.frases[frase]
    this.estado.frases[frase] = { accion, parametros, veces: (previa?.accion === accion ? previa.veces : 0) + 1 }
    this.guardar()
  }

  estadoSugerencia(clave: string): EstadoSugerencia {
    return (this.estado.sugerencias[clave] ??= { mostrada: 0, veces: 0, rechazos: 0, aceptadas: 0, silenciada: false })
  }

  /** Mantiene la memoria acotada: olvida hábitos muy débiles. */
  private podar() {
    const t = this.ahora()
    const habitos = Object.values(this.estado.habitos)
    if (habitos.length <= 300) return
    habitos
      .sort((a, b) => decaer(a.peso, a.ultima, t) - decaer(b.peso, b.ultima, t))
      .slice(0, habitos.length - 300)
      .forEach((h) => {
        delete this.estado.habitos[h.firma]
        delete this.estado.transiciones[h.firma]
      })
  }
}
