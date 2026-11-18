/**
 * Aprendizaje de Golondrina: convierte la memoria (repeticiones + contexto)
 * en sugerencias concretas para el momento actual.
 */
import { decaer, firmaDe, franjaDe, VENTANA_SECUENCIA_MS, type Habito, type Memoria } from './memoria'
import type { Accion, Contexto, Franja, Parametros, Sugerencia } from './tipos'

export const NOMBRE_FRANJA: Record<Franja, string> = {
  madrugada: 'de madrugada',
  manana: 'por la mañana',
  tarde: 'por la tarde',
  noche: 'por la noche',
}

/** Minutos que una sugerencia descansa después de mostrarse. */
const DESCANSO_MS = 20 * 60 * 1000

export function tituloDe(accion: Accion, parametros: Parametros): string {
  return accion.titulo
    .replace(/\{(\w+)\}/g, (_, nombre: string) => parametros[nombre] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Entre comillas «», salvo que el texto ya las tenga. */
function cita(texto: string) {
  return texto.includes('«') ? texto : `«${texto}»`
}

function minuscula(texto: string) {
  return texto.charAt(0).toLowerCase() + texto.slice(1)
}

function aplica(accion: Accion, ctx: Contexto): boolean {
  if (accion.secciones?.length && !accion.secciones.includes(ctx.seccion)) return false
  try {
    return accion.disponible ? accion.disponible(ctx) : true
  } catch {
    return false
  }
}

export interface EntradaAprendizaje {
  memoria: Memoria
  acciones: Map<string, Accion>
  ctx: Contexto
  ahora: number
  minRepeticiones: number
  /** Para el panel: incluye las que se mostraron hace poco en vuelo. */
  ignorarDescanso?: boolean
}

export function generarSugerencias({ memoria, acciones, ctx, ahora, minRepeticiones: min, ignorarDescanso = false }: EntradaAprendizaje): Sugerencia[] {
  const estado = memoria.estado
  const candidatas: Sugerencia[] = []
  const hechasEnSesion = new Set(estado.sesion.firmas)
  const recientes = estado.sesion.firmas.slice(-1)
  const franjaActual = franjaDe(ahora)

  const habitoValido = (h: Habito | undefined): h is Habito => {
    if (!h) return false
    const accion = acciones.get(h.accion)
    if (!accion || !aplica(accion, ctx)) return false
    // Si un parámetro tiene opciones (usuarios en línea, categorías...), el valor tiene que seguir existiendo.
    return (accion.parametros ?? []).every((p) => {
      const valor = h.parametros[p.nombre]
      if (!valor || !p.opciones) return !p.requerido || !!valor || !!p.opciones
      return p.opciones().includes(valor)
    })
  }

  // 1) Secuencias: "después de X, solés hacer Y".
  const ultimo = estado.ultimo
  if (ultimo && ahora - ultimo.t <= VENTANA_SECUENCIA_MS) {
    const siguientes = estado.transiciones[ultimo.firma] ?? {}
    const total = Object.values(siguientes).reduce((a, b) => a + b, 0)
    const previo = estado.habitos[ultimo.firma]
    const accionPrevia = previo ? acciones.get(previo.accion) : undefined
    for (const [firma, veces] of Object.entries(siguientes)) {
      const h = estado.habitos[firma]
      if (!habitoValido(h) || recientes.includes(firma) || veces < min) continue
      const p = veces / total
      if (p < 0.45) continue
      const accion = acciones.get(h.accion)!
      const previoTxt = accionPrevia && previo ? cita(tituloDe(accionPrevia, previo.parametros)) : 'eso'
      candidatas.push({
        clave: `siguiente:${ultimo.firma}>${firma}`,
        tipo: 'siguiente',
        accion: h.accion,
        parametros: h.parametros,
        mensaje: `Después de ${previoTxt} casi siempre seguís con ${cita(tituloDe(accion, h.parametros))}. ¿Te lo adelanto?`,
        boton: tituloDe(accion, h.parametros),
        confianza: Math.min(1, 0.55 + p * 0.3 + Math.min(veces, 10) * 0.015),
      })
    }
  }

  // 1b) Secuencias generales: "después de ver un producto, solés consultarlo".
  if (ultimo?.accion && ahora - ultimo.t <= VENTANA_SECUENCIA_MS) {
    const siguientes = estado.transicionesAccion[ultimo.accion] ?? {}
    const total = Object.values(siguientes).reduce((a, b) => a + b, 0)
    const accionPrevia = acciones.get(ultimo.accion)
    for (const [id, veces] of Object.entries(siguientes)) {
      const accion = acciones.get(id)
      if (!accion || !accionPrevia || !aplica(accion, ctx) || veces < min) continue
      if (accion.parametros?.some((p) => p.requerido)) continue
      if (candidatas.some((c) => c.accion === id) || recientes.some((f) => f.split('?')[0] === id)) continue
      const p = veces / total
      if (p < 0.5) continue
      candidatas.push({
        clave: `secuencia:${ultimo.accion}>${id}`,
        tipo: 'siguiente',
        accion: id,
        parametros: {},
        mensaje: `Cada vez que hacés ${cita(minuscula(accionPrevia.descripcion ?? tituloDe(accionPrevia, {})))}, después seguís con ${cita(tituloDe(accion, {}))}. ¿Te lo adelanto?`,
        boton: tituloDe(accion, {}),
        confianza: Math.min(0.9, 0.5 + p * 0.3 + Math.min(veces, 10) * 0.01),
      })
    }
  }

  // 2) Entrada: lo primero que hace al llegar.
  if (estado.sesion.firmas.length === 0) {
    const entradas = Object.values(estado.habitos).filter((h) => h.entradas >= min && habitoValido(h))
    entradas.sort((a, b) => b.entradas - a.entradas)
    const h = entradas[0]
    if (h) {
      const accion = acciones.get(h.accion)!
      candidatas.push({
        clave: `entrada:${h.firma}`,
        tipo: 'entrada',
        accion: h.accion,
        parametros: h.parametros,
        mensaje: `Cada vez que llegás, lo primero que hacés es ${cita(tituloDe(accion, h.parametros))}. ¿Arrancamos por ahí?`,
        boton: tituloDe(accion, h.parametros),
        confianza: Math.min(0.95, 0.5 + (h.entradas / Math.max(h.total, 1)) * 0.4),
      })
    }
  }

  // 3) Hábitos por contexto: sección + franja horaria.
  for (const h of Object.values(estado.habitos)) {
    if (!habitoValido(h) || hechasEnSesion.has(h.firma)) continue
    const peso = decaer(h.peso, h.ultima, ahora)
    if (peso < min) continue
    const enSeccion = (h.secciones[ctx.seccion] ?? 0) / h.total
    const enFranja = h.franjas[franjaActual] / h.total
    if (enSeccion < 0.5 || enFranja < 0.5) continue
    const accion = acciones.get(h.accion)!
    candidatas.push({
      clave: `habito:${h.firma}:${franjaActual}`,
      tipo: 'habito',
      accion: h.accion,
      parametros: h.parametros,
      mensaje: `${NOMBRE_FRANJA[franjaActual].charAt(0).toUpperCase()}${NOMBRE_FRANJA[franjaActual].slice(1)} solés ${minuscula(tituloDe(accion, h.parametros))}. ¿Lo hago por vos?`,
      boton: tituloDe(accion, h.parametros),
      confianza: Math.min(0.9, 0.3 + Math.min(peso / (min * 3), 1) * 0.3 + enSeccion * enFranja * 0.3),
    })
  }

  // 4) Atajos: algo que hace a mano seguido y podría pedirme.
  const porAccion = new Map<string, { manual: number; asistente: number; ejemplo: Habito }>()
  for (const h of Object.values(estado.habitos)) {
    const acc = porAccion.get(h.accion) ?? { manual: 0, asistente: 0, ejemplo: h }
    acc.manual += h.manual
    acc.asistente += h.asistente + h.golondrina
    if (h.total > acc.ejemplo.total) acc.ejemplo = h
    porAccion.set(h.accion, acc)
  }
  for (const [id, uso] of porAccion) {
    const accion = acciones.get(id)
    if (!accion || !accion.frases?.length || !aplica(accion, ctx)) continue
    if (uso.manual < min || uso.asistente > 0) continue
    const ejemplo = ejemploFrase(accion, uso.ejemplo.parametros)
    candidatas.push({
      clave: `atajo:${id}`,
      tipo: 'atajo',
      accion: id,
      parametros: uso.ejemplo.parametros,
      mensaje: `Veo que hacés ${cita(minuscula(tituloDe(accion, uso.ejemplo.parametros)))} seguido. No hace falta buscarlo: escribime «${ejemplo}» y lo hago yo.`,
      boton: 'Probalo ahora',
      confianza: 0.45,
    })
  }

  // 5) Descubrir: funciones útiles que todavía no usó, en la sección donde pasa tiempo.
  const usadas = new Set(Object.values(estado.habitos).map((h) => h.accion))
  const visitas = estado.sesion.secciones[ctx.seccion] ?? 0
  const actividad = estado.sesion.firmas.length
  if (visitas + actividad >= 2) {
    for (const accion of acciones.values()) {
      if (!accion.descubrible || usadas.has(accion.id) || !aplica(accion, ctx)) continue
      if (accion.parametros?.some((p) => p.requerido && !p.opciones)) continue
      const frase = accion.frases?.length ? ` Pedímelo con «${ejemploFrase(accion, {})}».` : ''
      const como = accion.comoHacerlo ? ` ${accion.comoHacerlo}` : ''
      candidatas.push({
        clave: `descubrir:${accion.id}`,
        tipo: 'descubrir',
        accion: accion.id,
        parametros: {},
        mensaje: `¿Sabías que podés ${minuscula(accion.descripcion ?? tituloDe(accion, {}))}?${como}${frase}`,
        boton: tituloDe(accion, {}) || 'Mostrame',
        confianza: 0.3,
      })
    }
  }

  return candidatas
    .filter((s) => {
      const e = estado.sugerencias[s.clave]
      if (!e) return true
      if (e.silenciada || e.rechazos >= 3) return false
      if (!ignorarDescanso && ahora - e.mostrada < DESCANSO_MS) return false
      if ((s.tipo === 'atajo' || s.tipo === 'descubrir') && e.veces >= 2) return false
      return true
    })
    .sort((a, b) => b.confianza - a.confianza)
}

export function ejemploFrase(accion: Accion, parametros: Parametros): string {
  const frase = accion.frases?.[0] ?? accion.titulo
  return frase.replace(/\{(\w+)\}/g, (_, nombre: string) => {
    if (parametros[nombre]) return parametros[nombre]
    const opciones = accion.parametros?.find((p) => p.nombre === nombre)?.opciones?.() ?? []
    return opciones[0] ?? '…'
  })
}

/** Resumen legible de lo aprendido (transparencia para el usuario). */
export function resumenAprendido(memoria: Memoria, acciones: Map<string, Accion>, ahora: number, min: number): string {
  const habitos = Object.values(memoria.estado.habitos)
    .map((h) => ({ h, peso: decaer(h.peso, h.ultima, ahora) }))
    .filter(({ h, peso }) => peso >= min - 0.5 && acciones.has(h.accion))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 5)
  if (habitos.length === 0) {
    return 'Todavía estoy aprendiendo. Cuando repitas algo unas cuantas veces, voy a empezar a adelantártelo.'
  }
  const lineas = habitos.map(({ h }) => {
    const accion = acciones.get(h.accion)!
    const franja = (Object.entries(h.franjas) as [Franja, number][]).sort((a, b) => b[1] - a[1])[0]
    const cuando = franja && franja[1] / h.total >= 0.5 ? `, sobre todo ${NOMBRE_FRANJA[franja[0]]}` : ''
    return `• ${tituloDe(accion, h.parametros)} (${h.total} veces${cuando})`
  })
  const secuencias: string[] = []
  for (const [desde, hacia] of Object.entries(memoria.estado.transiciones)) {
    for (const [firma, veces] of Object.entries(hacia)) {
      if (veces < min) continue
      const a = memoria.estado.habitos[desde]
      const b = memoria.estado.habitos[firma]
      const accA = a && acciones.get(a.accion)
      const accB = b && acciones.get(b.accion)
      if (a && b && accA && accB) secuencias.push(`• ${tituloDe(accA, a.parametros)} → ${tituloDe(accB, b.parametros)}`)
    }
  }
  let texto = `Esto es lo que aprendí de vos:\n${lineas.join('\n')}`
  if (secuencias.length) texto += `\n\nY estas costumbres en orden:\n${secuencias.slice(0, 4).join('\n')}`
  return texto + '\n\nSi querés que lo olvide, escribime «olvidá todo».'
}

export { firmaDe }
