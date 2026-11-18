/**
 * Interfaz de Golondrina: botón flotante, panel del asistente y la "golondrina"
 * que llega volando con una sugerencia. Usa Shadow DOM para no mezclar estilos
 * con el sistema anfitrión (funciona igual en React, Angular o HTML plano).
 */

export interface Boton {
  texto: string
  principal?: boolean
  alHacer: () => void
}

export interface OpcionesUI {
  nombre: string
  colorPrimario: string
  colorTexto: string
  posicion: 'derecha' | 'izquierda'
  abajo: number
  contenedor: HTMLElement
  alEnviar: (texto: string) => void
  alAbrir: () => void
}

const SILUETA = `
<svg viewBox="0 0 64 64" aria-hidden="true" class="silueta">
  <path d="M6 30c8-1 15 1 21 5 2-7 7-13 15-16 6-2 12-1 16 2-4 0-7 1-9 3l7 1-8 3c-2 7-7 13-15 16l-9 12-1-11c-5-1-9-4-12-8l-11 9 6-13c-1-1-1-2 0-3z" fill="currentColor"/>
  <circle cx="47" cy="22" r="1.6" fill="var(--g-fondo)"/>
</svg>`

const ESTILOS = (o: OpcionesUI) => `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.raiz { --g-color: ${o.colorPrimario}; --g-texto: ${o.colorTexto}; --g-fondo: #ffffff; --g-tinta: #1d2330; --g-suave: #f2f4f8;
  position: fixed; ${o.posicion === 'derecha' ? 'right' : 'left'}: 20px; bottom: ${o.abajo}px; z-index: 2147483000;
  display: flex; flex-direction: column; align-items: ${o.posicion === 'derecha' ? 'flex-end' : 'flex-start'}; gap: 12px; }
.lanzador { width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer; background: var(--g-color); color: var(--g-texto);
  box-shadow: 0 8px 24px rgba(0,0,0,.25); display: grid; place-items: center; transition: transform .2s; position: relative; }
.lanzador:hover { transform: translateY(-2px) scale(1.04); }
.lanzador:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid #7aa7ff; outline-offset: 2px; }
.lanzador .silueta { width: 34px; height: 34px; }
.lanzador .punto { position: absolute; top: 4px; right: 4px; width: 12px; height: 12px; border-radius: 50%; background: #ffb020; border: 2px solid var(--g-fondo); display: none; }
.lanzador.aviso .punto { display: block; }
.panel { width: min(370px, calc(100vw - 32px)); height: min(520px, calc(100vh - 120px)); background: var(--g-fondo); color: var(--g-tinta);
  border-radius: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.28); display: none; flex-direction: column; overflow: hidden; }
.panel.abierto { display: flex; animation: aparecer .22s ease-out; }
.cabecera { background: var(--g-color); color: var(--g-texto); padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
.cabecera .silueta { width: 28px; height: 28px; }
.cabecera strong { font-size: 15px; display: block; }
.cabecera small { opacity: .85; font-size: 12px; }
.cabecera button { margin-left: auto; background: transparent; border: none; color: inherit; font-size: 22px; cursor: pointer; line-height: 1; }
.mensajes { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: var(--g-suave); }
.msg { max-width: 86%; padding: 9px 12px; border-radius: 14px; font-size: 14px; line-height: 1.4; white-space: pre-line; word-wrap: break-word; }
.msg.golondrina { background: var(--g-fondo); align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.msg.usuario { background: var(--g-color); color: var(--g-texto); align-self: flex-end; border-bottom-right-radius: 4px; }
.botones { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.botones button, .chips button { border: 1px solid var(--g-color); background: var(--g-fondo); color: var(--g-tinta); border-radius: 999px;
  padding: 6px 11px; font-size: 13px; cursor: pointer; }
.botones button.principal { background: var(--g-color); color: var(--g-texto); }
.chips { display: flex; gap: 6px; padding: 8px 12px 0; overflow-x: auto; background: var(--g-fondo); }
.chips:empty { display: none; }
.chips button { white-space: nowrap; }
.chips::before { content: '✦'; color: var(--g-color); align-self: center; font-size: 13px; }
form { display: flex; gap: 8px; padding: 10px 12px 12px; background: var(--g-fondo); }
input { flex: 1; border: 1px solid #d5d9e2; border-radius: 999px; padding: 10px 14px; font-size: 14px; color: var(--g-tinta); background: var(--g-fondo); }
form button { border: none; background: var(--g-color); color: var(--g-texto); border-radius: 999px; padding: 0 16px; cursor: pointer; font-size: 14px; }
.vuelo { width: min(320px, calc(100vw - 32px)); background: var(--g-fondo); color: var(--g-tinta); border-radius: 16px; padding: 14px 14px 12px;
  box-shadow: 0 14px 40px rgba(0,0,0,.25); position: relative; display: none; border-top: 4px solid var(--g-color); }
.vuelo.visible { display: block; animation: volar .7s cubic-bezier(.2,.9,.3,1.2); }
.vuelo .ave { position: absolute; top: -22px; ${o.posicion === 'derecha' ? 'right' : 'left'}: 18px; width: 36px; height: 36px; color: var(--g-color); animation: aletear 1.4s ease-in-out infinite; }
.vuelo .ave .silueta { width: 36px; height: 36px; }
.vuelo p { margin: 4px 0 0; font-size: 14px; line-height: 1.45; }
.vuelo .etiqueta { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--g-color); font-weight: 700; }
.vuelo .cerrar { position: absolute; top: 6px; right: 8px; background: none; border: none; font-size: 18px; cursor: pointer; color: #8a90a0; }
.vuelo .silenciar { background: none; border: none; color: #8a90a0; font-size: 12px; cursor: pointer; padding: 6px 2px 0; text-decoration: underline; }
@keyframes aparecer { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes volar { 0% { opacity: 0; transform: translate(${o.posicion === 'derecha' ? '-' : ''}60px, -60px) rotate(${o.posicion === 'derecha' ? '-' : ''}6deg) scale(.9); } 100% { opacity: 1; transform: none; } }
@keyframes aletear { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-4px) rotate(4deg); } }
@media (prefers-reduced-motion: reduce) { .vuelo.visible, .panel.abierto, .vuelo .ave { animation: none; } }
@media (prefers-color-scheme: dark) { .raiz:not(.claro) { --g-fondo: #1f2430; --g-tinta: #eef1f7; --g-suave: #171b24; } .raiz:not(.claro) input { border-color: #3a4152; } }
.raiz.oscuro { --g-fondo: #1f2430; --g-tinta: #eef1f7; --g-suave: #171b24; } .raiz.oscuro input { border-color: #3a4152; }
`

export class InterfazGolondrina {
  private readonly host: HTMLElement
  private readonly raiz: ShadowRoot
  private readonly panel: HTMLElement
  private readonly mensajes: HTMLElement
  private readonly chips: HTMLElement
  private readonly entrada: HTMLInputElement
  private readonly lanzador: HTMLButtonElement
  private readonly vuelo: HTMLElement
  private readonly opciones: OpcionesUI
  private temporizadorVuelo: ReturnType<typeof setTimeout> | null = null

  constructor(opciones: OpcionesUI) {
    this.opciones = opciones
    this.host = document.createElement('golondrina-asistente')
    this.raiz = this.host.attachShadow({ mode: 'open' })
    this.raiz.innerHTML = `
      <style>${ESTILOS(opciones)}</style>
      <div class="raiz">
        <section class="vuelo" role="status" aria-live="polite">
          <span class="ave">${SILUETA}</span>
          <button class="cerrar" aria-label="Cerrar sugerencia">×</button>
          <span class="etiqueta">${escapar(opciones.nombre)} aprendió algo</span>
          <p></p>
          <div class="botones"></div>
          <button class="silenciar">No me muestres esto de nuevo</button>
        </section>
        <section class="panel" role="dialog" aria-label="Asistente ${escapar(opciones.nombre)}">
          <header class="cabecera">${SILUETA}<div><strong>${escapar(opciones.nombre)}</strong><small>Tu asistente · aprende de lo que hacés</small></div>
            <button class="cerrar-panel" aria-label="Cerrar asistente">×</button></header>
          <div class="mensajes" aria-live="polite"></div>
          <div class="chips"></div>
          <form><input type="text" placeholder="Pedime lo que necesites..." aria-label="Mensaje para ${escapar(opciones.nombre)}" maxlength="300"/>
            <button type="submit">Enviar</button></form>
        </section>
        <button class="lanzador" aria-label="Abrir asistente ${escapar(opciones.nombre)}" title="${escapar(opciones.nombre)}">${SILUETA}<span class="punto"></span></button>
      </div>`
    this.panel = this.raiz.querySelector('.panel')!
    this.mensajes = this.raiz.querySelector('.mensajes')!
    this.chips = this.raiz.querySelector('.chips')!
    this.entrada = this.raiz.querySelector('input')!
    this.lanzador = this.raiz.querySelector('.lanzador')!
    this.vuelo = this.raiz.querySelector('.vuelo')!

    this.lanzador.addEventListener('click', () => this.alternar())
    this.raiz.querySelector('.cerrar-panel')!.addEventListener('click', () => this.cerrar())
    this.raiz.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault()
      const texto = this.entrada.value.trim()
      if (!texto) return
      this.entrada.value = ''
      this.opciones.alEnviar(texto)
    })
    this.raiz.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') this.cerrar()
    })
    opciones.contenedor.appendChild(this.host)
  }

  /** 'auto' sigue al sistema operativo; 'claro'/'oscuro' lo fuerzan. */
  definirTema(tema: 'auto' | 'claro' | 'oscuro') {
    const raiz = this.raiz.querySelector('.raiz')!
    raiz.classList.toggle('claro', tema === 'claro')
    raiz.classList.toggle('oscuro', tema === 'oscuro')
  }

  get abierto() {
    return this.panel.classList.contains('abierto')
  }

  alternar() {
    if (this.abierto) this.cerrar()
    else this.abrir()
  }

  abrir(textoInicial?: string) {
    this.ocultarVuelo()
    this.panel.classList.add('abierto')
    this.lanzador.classList.remove('aviso')
    this.opciones.alAbrir()
    if (textoInicial !== undefined) this.entrada.value = textoInicial
    setTimeout(() => this.entrada.focus(), 50)
  }

  cerrar() {
    this.panel.classList.remove('abierto')
  }

  agregarMensaje(de: 'usuario' | 'golondrina', texto: string, botones: Boton[] = []) {
    const div = document.createElement('div')
    div.className = `msg ${de}`
    div.textContent = texto
    if (botones.length) {
      const cont = document.createElement('div')
      cont.className = 'botones'
      for (const b of botones) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = b.texto
        if (b.principal) btn.classList.add('principal')
        btn.addEventListener('click', () => {
          cont.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true))
          b.alHacer()
        })
        cont.appendChild(btn)
      }
      div.appendChild(cont)
    }
    this.mensajes.appendChild(div)
    this.mensajes.scrollTop = this.mensajes.scrollHeight
    if (!this.abierto && de === 'golondrina') this.lanzador.classList.add('aviso')
  }

  mostrarChips(chips: Boton[]) {
    this.chips.replaceChildren(
      ...chips.map((c) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = c.texto
        b.addEventListener('click', c.alHacer)
        return b
      }),
    )
  }

  mostrarVuelo(mensaje: string, botones: Boton[], alCerrar: () => void, alSilenciar: () => void) {
    if (this.abierto) return false
    this.vuelo.querySelector('p')!.textContent = mensaje
    const cont = this.vuelo.querySelector('.botones')!
    cont.replaceChildren(
      ...botones.map((b) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = b.texto
        if (b.principal) btn.classList.add('principal')
        btn.addEventListener('click', () => {
          this.ocultarVuelo()
          b.alHacer()
        })
        return btn
      }),
    )
    const cerrar = this.vuelo.querySelector('.cerrar') as HTMLButtonElement
    cerrar.onclick = () => {
      this.ocultarVuelo()
      alCerrar()
    }
    const silenciar = this.vuelo.querySelector('.silenciar') as HTMLButtonElement
    silenciar.onclick = () => {
      this.ocultarVuelo()
      alSilenciar()
    }
    this.vuelo.classList.remove('visible')
    void this.vuelo.offsetWidth // reinicia la animación
    this.vuelo.classList.add('visible')
    if (this.temporizadorVuelo) clearTimeout(this.temporizadorVuelo)
    this.temporizadorVuelo = setTimeout(() => this.ocultarVuelo(), 25000)
    return true
  }

  get vueloVisible() {
    return this.vuelo.classList.contains('visible')
  }

  ocultarVuelo() {
    this.vuelo.classList.remove('visible')
    if (this.temporizadorVuelo) clearTimeout(this.temporizadorVuelo)
    this.temporizadorVuelo = null
  }

  destruir() {
    this.ocultarVuelo()
    this.host.remove()
  }
}

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}
