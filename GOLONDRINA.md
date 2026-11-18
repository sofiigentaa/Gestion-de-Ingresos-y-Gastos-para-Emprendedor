# Golondrina - asistente que aprende de cada usuario

Golondrina tiene dos partes que trabajan juntas:

1. **El asistente** (botón con la golondrina). El usuario le pide las cosas con sus palabras («buscame puertas de roble», «abrí Cubaeduca», «decile a Ana que llego tarde») y el asistente ejecuta la acción en el sistema. Ya no hace falta aprender dónde está cada botón.
2. **La automatización Golondrina**. Observa lo que el usuario hace —a mano o a través del asistente— junto con su **contexto** (pantalla, franja horaria, qué hizo antes) y, cuando algo se **repite**, lo aprende y se lo muestra en el momento justo: la golondrina llega volando con una sugerencia de un toque.

## Qué aprende

| Tipo | Cuándo aparece | Ejemplo |
|---|---|---|
| **Secuencia** | Después de X, el usuario casi siempre hace Y | «Cada vez que abrís la ficha de un producto, después seguís con *Consultar por WhatsApp*. ¿Te lo adelanto?» |
| **Entrada** | Lo primero que hace al llegar, repetido en varias sesiones | «Cada vez que llegás, lo primero que hacés es *Abrir Cubaeduca*.» |
| **Hábito** | Algo que hace en esta pantalla y a esta hora del día | «Por la mañana solés enviar *buen día gente*. ¿Lo hago por vos?» |
| **Atajo** | Algo que hace siempre a mano y podría pedírselo al asistente | «Veo que hacés *ver Puertas de interior* seguido. Escribime eso y lo hago yo.» |
| **Descubrir** | Una función útil que todavía no usó, en la pantalla donde pasa tiempo | «¿Sabías que podés pedirme qué productos se quedaron sin stock?» |

Además, cuando el asistente no está seguro, ofrece opciones; si el usuario elige una, **aprende esa frase** y la próxima vez la entiende directo.

Reglas para no molestar: un hábito necesita **3 repeticiones** (`minRepeticiones`), lo que no se repite se va olvidando (vida media de 14 días), hay al menos 90 s entre sugerencias, cada una descansa 20 min después de mostrarse, y si se rechaza 3 veces o se toca «No me muestres esto de nuevo», no vuelve.

## Privacidad y control del usuario

Todo se guarda **solo en el navegador** del usuario (`localStorage`, clave `golondrina:<app>[:usuario]`); no se envía nada a ningún servidor. El usuario puede escribirle al asistente:

- «¿qué aprendiste?» → le muestra sus hábitos y secuencias aprendidas.
- «no me sugieras» / «volvé a sugerir» → silencia o reactiva las sugerencias.
- «olvidá todo» → borra su memoria.
- «ayuda» → lista lo que puede pedir en la pantalla actual.

## Cómo está armado

```
golondrina/            ← núcleo común, idéntico en los tres sistemas, sin dependencias
  tipos.ts             ← Accion, Contexto, Sugerencia, opciones
  texto.ts             ← normalización del español, sinónimos, raíces, tolerancia a errores
  interprete.ts        ← convierte una frase en acción + parámetros (motor local, sin IA externa)
  memoria.ts           ← registra eventos, hábitos, secuencias, frases aprendidas
  aprendizaje.ts       ← decide qué sugerir según repetición + contexto
  ui.ts                ← botón, panel y "vuelo" (Shadow DOM: no choca con los estilos del sistema)
  index.ts             ← clase Golondrina y crearGolondrina()
```

### Agregar una acción nueva

```ts
{
  id: 'buscar',
  titulo: 'Buscar «{consulta}»',                    // texto de botones; {param} se reemplaza
  descripcion: 'buscar piezas por nombre o código',  // se usa al enseñar la función
  frases: ['buscar {consulta}', 'tenés {consulta}'], // ejemplos en lenguaje natural
  parametros: [{ nombre: 'consulta', libre: true, requerido: true, pregunta: '¿Qué busco?' }],
  secciones: ['catalogo'],          // opcional: dónde tiene sentido
  disponible: (ctx) => true,        // opcional: si hoy se puede hacer
  requisito: 'Primero ingresá…',    // opcional: qué falta cuando no está disponible
  descubrible: true,                // opcional: Golondrina puede enseñarla
  ejecutar: ({ consulta }) => { /* hacer la acción */ return 'Texto de respuesta' },
}
```

Parámetros: `opciones: () => string[]` (se reconocen dentro de la frase, con o sin acentos/plurales) o `libre: true` (toma el texto que sigue a la frase). `memorizable: false` evita que un valor forme parte del hábito.

### Registrar lo que el usuario hace a mano

- En código: `asistente.registrar('filtrar-categoria', { categoria: 'Puertas' })`.
- Sin código: agregar atributos al elemento → `data-golondrina="abrir-plataforma" data-golondrina-plataforma="Cubaeduca"`.
- Contexto: `asistente.contexto('admin', { producto: 'Puerta Roble' })` cada vez que cambia la pantalla.

### Conectar una IA (opcional)

El intérprete local cubre las frases de las acciones. Si se quiere entender lenguaje más libre, se puede pasar `interpretar: async (texto, acciones, ctx) => ({ accion, parametros })` al crear Golondrina (por ejemplo llamando a un modelo de lenguaje desde el backend). Solo se usa cuando el motor local no está seguro.

## En este sistema (GER-MANIA · ingresos y gastos)

- Núcleo: `src/golondrina/` · Acciones: `src/asistente/index.ts` · Intérprete de movimientos: `src/asistente/movimientos.ts`.
- `App.tsx` monta Golondrina, le pasa las acciones con el estado actual e informa el contexto (pantalla y mes).
- `TransactionModal` acepta `defaultCategoryId` y `defaultSubcategory` (el asistente abre el formulario con el rubro elegido).
- `TransactionsTable` acepta `filtroExterno` (el asistente aplica filtros pedidos con palabras).
- Se registra lo que se hace a mano: cada movimiento guardado (por el rubro, no el monto), navegación, cambio de mes, filtros por categoría, exportaciones.

### Menú de funciones

Al abrir el asistente aparece el **menú con todas las funciones del sistema**, agrupadas (Registrar · Consultar · Ver · Filtrar y buscar · Exportar · Golondrina). Se vuelve a ver con el botón **☰ Funciones** o escribiendo «funciones» / «ayuda». Cada botón se usa con un toque: lo que no necesita datos se hace al instante («Ganancia del mes», «Exportar el mes a Excel»); lo que necesita datos deja escrito un ejemplo para completar («cuánto gasté en nafta este mes»). Para que una acción nueva aparezca en el menú alcanza con darle `grupo` y `menu`.

### Un asistente para cada función

| Función | Pedido de ejemplo | Qué hace |
|---|---|---|
| Registrar gasto | «gasté 15 mil en madera en efectivo», «ayer cargué nafta 12500», «pagué el canon 8.000 por transferencia» | Lo guarda directo con rubro, fecha y medio de pago |
| Registrar ingreso | «vendí 32.500 en la feria», «me pagaron 45000 por un encargo de carteles con mercado pago» | Igual, como ingreso |
| Sin monto | «compré vinilo» | Abre el formulario con el rubro ya elegido |
| Corregir | «corregir el último», «borrar el último» | Abre o borra (con confirmación) el último movimiento |
| Ganancia | «¿cuánto gané este mes?», «¿cuánto gané en octubre?» | Entró, salió, ganancia neta, margen y comparación con el mes anterior |
| Totales | «¿cuánto gasté en nafta?», «¿cuánto vendí en ferias?», «¿en qué gasto más?» | Totales por rubro y reparto de gastos |
| Panel | «ver el panel», «ver insumos», «registro de hoy» | Navega a cada vista |
| Mes | «ir a octubre», «mes pasado» | Cambia el mes del panel |
| Filtrar | «mostrar gastos de madera», «ventas de octubre», «buscar Juan» | Abre el historial con los filtros puestos |
| Exportar | «exportar a Excel», «exportar el mes», «hacer copia de seguridad», «imprimir reporte» | Descarga CSV / respaldo o imprime el reporte (PDF) |

Palabras que entiende como rubro: madera, MDF, fibrofácil, vinilo, cola/pegamento, clavos, tornillos, láser/corte, grabado, nafta/combustible, peaje, canon, stand/mesa (gastos) · feria, evento, encargo/pedido, carteles, souvenirs, regalos (ingresos). Además reconoce las subcategorías propias que se agreguen. Montos: «15000», «15.000», «$15.000,50», «15 mil», «15k», «15 lucas». Medios: efectivo, transferencia, Mercado Pago, débito, crédito. Fechas: hoy (por defecto), ayer, anteayer, «el 12/10».

### Qué aprende acá

- **Secuencias de feria**: si después de registrar la venta de feria siempre cargás el canon, al registrar la venta te ofrece cargar el canon.
- **Hábitos**: rubros que cargás a ciertas horas (la nafta a la mañana, por ejemplo).
- **Atajos**: si cargás siempre lo mismo con el formulario, te enseña la frase para decírselo.
- **Descubrir**: funciones que no usaste (preguntar la ganancia, exportar a Excel, filtrar con palabras).
