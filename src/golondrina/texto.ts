/** Utilidades de lenguaje (español) sin dependencias. */

const STOPWORDS = new Set([
  'a', 'al', 'algo', 'como', 'con', 'de', 'del', 'el', 'en', 'es', 'esa', 'ese', 'eso', 'esta', 'este', 'esto',
  'la', 'las', 'le', 'lo', 'los', 'me', 'mi', 'mis', 'por', 'para', 'que', 'se', 'su', 'sus', 'te', 'tu', 'un',
  'una', 'unos', 'unas', 'y', 'o', 'u', 'favor', 'porfa', 'porfavor', 'quiero', 'quisiera', 'podes', 'puedes',
  'podrias', 'puedo', 'necesito', 'dame', 'hace', 'haceme', 'hazme', 'che', 'hola', 'golondrina', 'mas', 'ahi',
  'aca', 'aqui', 'ya', 'sobre', 'cual', 'cuales', 'donde', 'hay',
])

/** Palabras con el mismo sentido se llevan a una forma común. */
const SINONIMOS: Record<string, string> = {
  mostra: 'ver', muestra: 'ver', mostrame: 'ver', muestrame: 'ver', abri: 'abrir', abre: 'abrir', abrime: 'abrir',
  ir: 'abrir', anda: 'abrir', llevame: 'abrir', lleva: 'abrir', vamos: 'abrir', navega: 'abrir',
  busca: 'buscar', buscame: 'buscar', encontra: 'buscar', encuentra: 'buscar', encontrar: 'buscar',
  manda: 'enviar', mandar: 'enviar', envia: 'enviar', enviale: 'enviar', mandale: 'enviar', escribi: 'enviar',
  escribe: 'enviar', escribir: 'enviar', deci: 'enviar', decir: 'enviar', di: 'enviar', decile: 'enviar',
  filtra: 'filtrar', filtrame: 'filtrar', mostrar: 'ver', ensena: 'ver', ensename: 'ver',
  crea: 'crear', agrega: 'crear', agregar: 'crear', nuevo: 'crear', nueva: 'crear', alta: 'crear', cargar: 'crear',
  carga: 'crear', añadir: 'crear', anadir: 'crear',
  borra: 'borrar', elimina: 'borrar', eliminar: 'borrar', quita: 'borrar', quitar: 'borrar', saca: 'borrar',
  edita: 'editar', modifica: 'editar', modificar: 'editar', cambia: 'cambiar', corregir: 'editar', corregi: 'editar',
  contacta: 'contactar', contactar: 'contactar', consultar: 'consultar', consulta: 'consultar', pregunta: 'consultar',
  preguntar: 'consultar', salir: 'salir', sali: 'salir', cerrar: 'salir', desconectar: 'salir',
  entra: 'ingresar', entrar: 'ingresar', ingresa: 'ingresar', accede: 'ingresar', acceder: 'ingresar', acceso: 'ingresar',
  privado: 'directo', dm: 'directo', mp: 'directo', md: 'directo',
}

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Raíz muy simple: sinónimo o primeras 5 letras (plural/conjugación). */
export function raiz(palabra: string): string {
  const sinonimo = SINONIMOS[palabra]
  if (sinonimo) return sinonimo
  // Pronombres pegados al verbo: "escribirle", "mandame", "buscalos".
  const sinEnclitico = palabra.length > 5 ? palabra.replace(/(selo|sela|melo|mela|les|los|las|nos|le|lo|la|me|te)$/, '') : palabra
  if (sinEnclitico !== palabra) {
    const s = SINONIMOS[sinEnclitico] ?? SINONIMOS[`${sinEnclitico}r`]
    if (s) return s
  }
  let p = palabra
  if (p.length > 4 && p.endsWith('es')) p = p.slice(0, -2)
  else if (p.length > 3 && p.endsWith('s')) p = p.slice(0, -1)
  return p.slice(0, 5)
}

export function palabras(texto: string): string[] {
  return normalizar(texto).split(' ').filter(Boolean)
}

export function raices(texto: string, conStopwords = false): string[] {
  return palabras(texto)
    .filter((p) => conStopwords || !STOPWORDS.has(p))
    .filter((p) => !p.startsWith('{'))
    .map(raiz)
}

export function distancia(a: string, b: string): number {
  if (a === b) return 0
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0]
    fila[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = fila[j]
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1))
      previo = temp
    }
  }
  return fila[b.length]
}

export function parecidas(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < 5 || b.length < 5) return false
  return distancia(a, b) <= 1
}

/** Qué fracción de las raíces de `patron` aparecen en `consulta` (0..1). */
export function cobertura(consulta: string[], patron: string[]): number {
  if (patron.length === 0) return 0
  // Coincidencia exacta vale 1; aproximada (error de tipeo) vale menos, así
  // "gasto" no empata con "gasté" cuando hay una frase que lo dice exacto.
  let encontradas = 0
  for (const r of patron) {
    if (consulta.includes(r)) encontradas += 1
    else if (consulta.some((c) => parecidas(c, r))) encontradas += 0.75
  }
  return encontradas / patron.length
}

/**
 * Busca alguna de las opciones dentro del texto (tolerante a acentos, plurales
 * y errores de una letra). Devuelve la opción original o null.
 */
export function buscarOpcion(texto: string, opciones: string[]): string | null {
  const norm = ` ${normalizar(texto)} `
  // 1) coincidencia literal, la opción más larga gana
  const ordenadas = [...opciones].sort((a, b) => b.length - a.length)
  for (const op of ordenadas) {
    const n = normalizar(op)
    if (n && norm.includes(` ${n} `)) return op
  }
  // 2) por raíces
  const consulta = raices(texto, true)
  let mejor: string | null = null
  let mejorPuntaje = 0
  for (const op of opciones) {
    const r = raices(op, true)
    const c = cobertura(consulta, r)
    if (c > mejorPuntaje && c >= 0.99) {
      mejor = op
      mejorPuntaje = c
    }
  }
  return mejor
}

/** Firma corta de un texto libre para poder contarlo como hábito. */
export function claveTexto(texto: string): string {
  return normalizar(texto).slice(0, 60)
}
