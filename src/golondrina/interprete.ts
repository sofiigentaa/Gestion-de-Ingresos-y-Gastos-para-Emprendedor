/**
 * Intérprete local del asistente: entiende frases en español y las convierte
 * en una acción del sistema con sus parámetros. No usa servicios externos.
 */
import type { Accion, Contexto, ParametroAccion, Parametros } from './tipos'
import { buscarOpcion, cobertura, normalizar, parecidas, raices, raiz } from './texto'
import type { FraseAprendida } from './memoria'

export interface Interpretacion {
  accion: Accion
  parametros: Parametros
  faltantes: ParametroAccion[]
  puntaje: number
}

const CONECTORES = new Set(['que', 'a', 'por', 'de', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'en', 'con', 'sobre', 'al', 'algo', 'alguna', 'alguno', 'algun', 'algunas', 'algunos', 'mis', 'tus'])

export function accionAplica(accion: Accion, ctx: Contexto): boolean {
  if (accion.secciones?.length && !accion.secciones.includes(ctx.seccion)) return false
  try {
    return accion.disponible ? accion.disponible(ctx) : true
  } catch {
    return false
  }
}

/** Texto entre comillas, si el usuario lo marcó explícitamente. */
function entreComillas(texto: string): string | null {
  const m = texto.match(/["“«']([^"”»']+)["”»']/)
  return m ? m[1].trim() : null
}

/**
 * Extrae el texto libre que sigue a las palabras "disparadoras" de la frase.
 * "decí hola a todos" con la frase "enviar {texto}" → "hola a todos".
 */
function extraerLibre(texto: string, frase: string, nombre: string, consumidas: string[]): string | null {
  const comillas = entreComillas(texto)
  if (comillas) return comillas
  const indice = frase.indexOf(`{${nombre}}`)
  if (indice < 0) return null
  const disparadoras = raices(frase.slice(0, indice), true)
  const originales = texto.trim().split(/\s+/)
  const normales = originales.map((p) => normalizar(p))
  let corte = -1
  normales.forEach((n, i) => {
    if (n && disparadoras.some((d) => parecidas(raiz(n), d))) corte = i
  })
  if (corte < 0 && disparadoras.length > 0) return null
  let resto = originales.slice(corte + 1)
  // Quita conectores iniciales ("que", "a", "por"...) y valores ya usados por otros parámetros.
  while (resto.length && (CONECTORES.has(normalizar(resto[0])) || resto[0] === ':')) resto = resto.slice(1)
  let valor = resto.join(' ').replace(/^[:,\s]+/, '').trim()
  for (const usada of consumidas) {
    const n = normalizar(valor)
    if (n.startsWith(normalizar(usada))) valor = valor.split(/\s+/).slice(usada.split(/\s+/).length).join(' ')
  }
  while (valor && CONECTORES.has(normalizar(valor.split(/\s+/)[0]))) valor = valor.split(/\s+/).slice(1).join(' ')
  return valor.trim() || null
}

function puntuarFrase(consulta: string[], frase: string): number {
  const patron = raices(frase)
  if (patron.length === 0) return 0
  const recall = cobertura(consulta, patron)
  const precision = consulta.length ? cobertura(patron, consulta) : 0
  return recall * 0.75 + precision * 0.25
}

export function interpretar(
  texto: string,
  acciones: Accion[],
  ctx: Contexto,
  aprendidas: Record<string, FraseAprendida> = {},
  soloDisponibles = true,
): Interpretacion[] {
  const norm = normalizar(texto)
  const consulta = raices(texto)
  const resultados: Interpretacion[] = []

  for (const accion of acciones) {
    if (accionAplica(accion, ctx) !== soloDisponibles) continue
    const frases = accion.frases?.length ? accion.frases : [accion.titulo]
    let mejorFrase = frases[0]
    let base = -1
    for (const frase of frases) {
      const p = puntuarFrase(consulta, frase)
      if (p > base) {
        base = p
        mejorFrase = frase
      }
    }

    const parametros: Parametros = {}
    const faltantes: ParametroAccion[] = []
    let bonus = 0
    const consumidas: string[] = []
    for (const param of accion.parametros ?? []) {
      if (param.opciones && !param.soloMemoria) {
        const valor = buscarOpcion(texto, param.opciones())
        if (valor) {
          parametros[param.nombre] = valor
          consumidas.push(valor)
          bonus += 0.2
        }
      }
    }
    for (const param of accion.parametros ?? []) {
      if (param.libre && !parametros[param.nombre]) {
        // La frase que mejor coincide entre las que llevan este parámetro.
        const conParam = frases.filter((f) => f.includes(`{${param.nombre}}`))
        let frase = conParam[0] ?? mejorFrase
        let mejor = -1
        for (const f of conParam) {
          const disp = raices(f.slice(0, f.indexOf(`{${param.nombre}}`)))
          const p = disp.length ? cobertura(consulta, disp) * 10 + disp.length : 0
          if (p > mejor) {
            mejor = p
            frase = f
          }
        }
        const valor = param.completo ? texto.trim() : extraerLibre(texto, frase, param.nombre, consumidas)
        if (valor) {
          parametros[param.nombre] = valor
          bonus += 0.05
          // Si están todas las palabras disparadoras, el resto es texto libre: no penaliza.
          // Más disparadoras = frase más específica ("cuánto gasté" le gana a "gasté").
          const disparadoras = raices(frase.slice(0, frase.indexOf(`{${param.nombre}}`)))
          if (disparadoras.length && cobertura(consulta, disparadoras) === 1) {
            base = Math.max(base, Math.min(0.95, 0.65 + 0.1 * disparadoras.length))
          }
        }
      }
      if (param.requerido && !parametros[param.nombre]) faltantes.push(param)
    }

    // Una opción reconocida por sí sola ("puertas") ya es una buena pista.
    const soloOpcion = bonus >= 0.2 && base < 0.4 ? 0.45 : 0
    // Si falta un dato obligatorio, otra acción completa debería ganarle.
    const penalizacion = faltantes.length ? 0.7 : 1
    const puntaje = Math.min(1, (Math.max(base, soloOpcion) + bonus) * penalizacion)
    if (puntaje > 0.2) resultados.push({ accion, parametros, faltantes, puntaje })
  }

  // Frases que el usuario ya me enseñó tienen prioridad.
  const aprendida = aprendidas[norm]
  if (aprendida) {
    const accion = acciones.find((a) => a.id === aprendida.accion && accionAplica(a, ctx))
    if (accion) {
      resultados.push({ accion, parametros: { ...aprendida.parametros }, faltantes: [], puntaje: 1.1 })
    }
  } else {
    for (const [frase, dato] of Object.entries(aprendidas)) {
      const p = puntuarFrase(consulta, frase)
      if (p < 0.85) continue
      const accion = acciones.find((a) => a.id === dato.accion && accionAplica(a, ctx))
      if (accion) resultados.push({ accion, parametros: { ...dato.parametros }, faltantes: [], puntaje: 0.8 + Math.min(dato.veces, 5) * 0.02 })
    }
  }

  // Una sola entrada por acción (la de mayor puntaje).
  const porAccion = new Map<string, Interpretacion>()
  for (const r of resultados) {
    const previo = porAccion.get(r.accion.id)
    if (!previo || r.puntaje > previo.puntaje) porAccion.set(r.accion.id, r)
  }
  return [...porAccion.values()].sort((a, b) => b.puntaje - a.puntaje)
}

export function esPedidoDeAyuda(texto: string): boolean {
  const n = normalizar(texto)
  return /^(ayuda|help|\?|menu)$/.test(n) || /que (podes|puedes|sabes) hacer|como (funciona|te uso|se usa)|en que (me )?(podes|puedes) ayudar/.test(n)
}

export function esPreguntaAprendizaje(texto: string): boolean {
  const n = normalizar(texto)
  return /que (aprendiste|sabes de mi|sabes sobre mi|recordas|recuerdas)|mis (habitos|costumbres)/.test(n)
}

export function esOlvido(texto: string): boolean {
  return /^(olvida|olvidate|borra) (todo|lo que sabes|mis datos|lo aprendido)/.test(normalizar(texto))
}

export function esSilencio(texto: string): 'silenciar' | 'activar' | null {
  const n = normalizar(texto)
  if (/(no me sugieras|deja de sugerir|silencio|no me molestes|calla|desactiva (las )?sugerencias)/.test(n)) return 'silenciar'
  if (/(volve a sugerir|activa (las )?sugerencias|sugerime|podes sugerir)/.test(n)) return 'activar'
  return null
}

export function esCancelar(texto: string): boolean {
  return /^(cancelar|cancela|nada|dejalo|deja|olvidalo|no)$/.test(normalizar(texto))
}

