# Documento funcional — Sistema de Gestión de Ingresos y Gastos

| | |
| --- | --- |
| **Producto** | Gestión de Ingresos y Gastos para Emprendedor (instancia: GER-MANIA · Trabajos en madera) |
| **Versión del documento** | 1.0 |
| **Fecha** | 18/11/2026 |
| **Autora** | María Sofía Genta — Análisis Funcional & QA · [tecnoros.ar](https://www.tecnoros.ar) |
| **Estado** | Vigente (describe el sistema tal como está en la rama `main`) |

---

## 1. Objetivo

Darle a un emprendedor una herramienta simple para **registrar todo lo que entra y sale de su negocio**, ver **cuánto gana cada mes**, **en qué gasta** y **de dónde vienen sus ingresos**, sin necesidad de saber de contabilidad.

El sistema incluye **Golondrina**, un asistente al que se le piden las cosas con palabras y que aprende de lo que hace el usuario para ofrecérselo en el momento justo.

## 2. Alcance

**Incluye**
- Registro de ingresos y egresos (alta, edición y baja).
- Vista general mensual con indicadores y gráfico diario.
- Registro por día.
- Análisis por categoría (rubro) y subcategoría.
- Historial completo con búsqueda, filtros y orden.
- Exportación a Excel (CSV), copia de seguridad y restauración (JSON) y reporte imprimible (PDF).
- Inicio de sesión y datos separados por usuario (modo nube).
- Asistente Golondrina.

**No incluye (fuera de alcance de esta versión)**
- Facturación electrónica ni integración con AFIP/ARCA.
- Gestión de stock o de costos de producto.
- Varios usuarios con distintos permisos dentro del mismo negocio.
- Conciliación bancaria automática.

## 3. Usuarios

| Usuario | Descripción | Qué puede hacer |
| --- | --- | --- |
| **Dueño/a del negocio** | Única persona que usa el sistema. Ingresa con email y contraseña (modo nube). | Todas las funciones. |
| **Administrador técnico** | Quien publica el sistema (tecnoros.ar). | Crea la cuenta del negocio en Supabase. No usa la app en el día a día. |

> No existe registro abierto: la cuenta del negocio la crea el administrador (ver `DEPLOY.md`).

## 4. Glosario

| Término | Significado |
| --- | --- |
| **Movimiento** | Un registro de dinero que entra (**ingreso**) o sale (**egreso**). |
| **Categoría / rubro** | Agrupa movimientos del mismo tipo (ej. *Compra de Insumos*, *Ventas en Feria*). Cada una es de ingreso o de egreso. |
| **Subcategoría** | Detalle dentro de una categoría (ej. *Madera*, *Vinilo* dentro de *Compra de Insumos*). |
| **Balance / ganancia neta** | Ingresos − egresos de un período. |
| **Margen sobre ventas** | Ganancia neta ÷ ingresos × 100. |
| **Medio de pago** | Efectivo, transferencia, tarjeta de débito, tarjeta de crédito, Mercado Pago u otro. |
| **Modo nube** | Los datos se guardan en Supabase y se accede con login. |
| **Modo local** | Sin configuración de nube: los datos se guardan en el navegador, sin login. |

## 5. Mapa de pantallas

```
Inicio de sesión (sólo modo nube)
└── Aplicación
    ├── Vista general ........ indicadores del mes, gráfico diario, últimos movimientos, carga rápida
    ├── Registro por día ..... movimientos y resultado de un día
    ├── Insumos & categorías . reparto por categoría y subcategoría
    ├── Todos los movimientos  historial con búsqueda, filtros y orden
    ├── Exportar & respaldos . CSV, copia de seguridad, restaurar, imprimir
    ├── Restablecer datos .... vaciar, cargar ejemplo, restablecer categorías
    ├── Formulario de movimiento (ventana) .. alta y edición
    └── Golondrina (botón flotante) ......... asistente
```

En el celular el menú lateral pasa a una barra de navegación inferior.

## 6. Requerimientos funcionales

| ID | Requerimiento | Prioridad |
| --- | --- | --- |
| **RF-01** | El sistema debe permitir **iniciar sesión** con email y contraseña cuando está en modo nube, y **cerrar sesión**. | Alta |
| **RF-02** | El sistema debe permitir **registrar un movimiento** con: tipo (ingreso/egreso), monto, fecha, categoría, subcategoría, descripción, medio de pago y, opcionalmente, proveedor/cliente y número de comprobante. | Alta |
| **RF-03** | El sistema debe permitir **editar** y **eliminar** un movimiento existente. | Alta |
| **RF-04** | La **vista general** debe mostrar, para el mes seleccionado: total de ingresos, total de egresos, gasto en insumos y corte láser, balance neto y margen sobre ventas. | Alta |
| **RF-05** | La vista general debe mostrar un **gráfico diario** de ingresos contra egresos y los **últimos movimientos del mes**. | Media |
| **RF-06** | La vista general debe ofrecer una **carga rápida** de movimientos (tipo, descripción, categoría, monto, medio de pago) sin abrir el formulario completo. | Media |
| **RF-07** | El usuario debe poder **cambiar de mes** (anterior / siguiente) y todas las vistas mensuales se actualizan. | Alta |
| **RF-08** | El **registro por día** debe mostrar los movimientos de un día y su resultado, con navegación al día anterior y siguiente; desde la vista general hay un acceso directo al registro de hoy. | Media |
| **RF-09** | La vista de **categorías** debe mostrar el total por categoría y, al elegir una, el detalle por subcategoría y sus movimientos. | Media |
| **RF-10** | El **historial** debe permitir **buscar** por texto y **filtrar** por tipo, categoría, medio de pago y rango de fechas, y **ordenar** por fecha o monto (ascendente/descendente). | Alta |
| **RF-11** | El sistema debe **exportar a CSV** (Excel) el mes seleccionado o todos los movimientos. | Alta |
| **RF-12** | El sistema debe generar una **copia de seguridad** (JSON) con movimientos y categorías, y **restaurarla** desde un archivo. | Alta |
| **RF-13** | El sistema debe permitir **imprimir un reporte** del mes (o guardarlo como PDF) con totales y el listado de movimientos. | Media |
| **RF-14** | El sistema debe permitir **restablecer datos**: dejar todo vacío, cargar datos de ejemplo o volver a las categorías iniciales, siempre con confirmación. | Baja |
| **RF-15** | El sistema debe mostrar un **aviso** si un guardado en la nube falla y volver a leer los datos reales. | Alta |
| **RF-16** | **Golondrina** debe permitir registrar movimientos, consultar números, navegar, filtrar y exportar **pidiéndolo con palabras** (ver sección 9). | Alta |
| **RF-17** | Golondrina debe **aprender por repetición y contexto** lo que hace el usuario y **sugerirlo** en el momento justo, sin hacerlo sola. | Media |
| **RF-18** | Golondrina debe mostrar un **menú con todas las funciones** del sistema, agrupadas. | Media |

## 7. Reglas de negocio

| ID | Regla |
| --- | --- |
| **RN-01** | El **monto** de un movimiento debe ser un número **mayor a 0**. Si no, no se guarda y se avisa: *"Por favor ingrese un monto válido mayor a 0"*. |
| **RN-02** | La **fecha** tiene formato AAAA-MM-DD; por defecto es la del día. |
| **RN-03** | Cada categoría pertenece a **un solo tipo** (ingreso o egreso). Al cambiar el tipo de un movimiento, se ofrecen sólo las categorías de ese tipo. |
| **RN-04** | Si un movimiento no tiene subcategoría, en los reportes figura como **"General"**. |
| **RN-05** | **Balance** = ingresos − egresos del período. **Margen** = balance ÷ ingresos × 100; si no hay ingresos se muestra *"Sin ingresos"*. |
| **RN-06** | Medio de pago por defecto: **transferencia** en el formulario completo y **efectivo** en la carga rápida. |
| **RN-07** | En modo nube, **cada usuario ve y modifica sólo sus propios movimientos** (seguridad a nivel de fila en la base de datos). Sin login no se puede leer ni escribir nada. |
| **RN-08** | No hay registro de usuarios desde la app: las cuentas las crea el administrador. |
| **RN-09** | Eliminar un movimiento, borrar todo o restaurar un respaldo **pide confirmación** antes de hacerlo. |
| **RN-10** | Golondrina **no guarda montos** en su memoria de hábitos: aprende qué se registra (el rubro), no cuánto. |
| **RN-11** | Golondrina sólo sugiere un hábito después de **3 repeticiones**; lo que no se repite se va olvidando (vida media de 14 días); entre sugerencias pasan al menos **90 segundos**; una sugerencia rechazada **3 veces** o marcada *"No me muestres esto de nuevo"* no vuelve. |

### Categorías iniciales

| Tipo | Categoría | Subcategorías |
| --- | --- | --- |
| Egreso | Compra de Insumos | Madera, Vinilo, Cola, Clavos, Tornillos |
| Egreso | Corte Láser | Corte, Grabado |
| Egreso | Nafta | Nafta / Combustible, Peajes |
| Egreso | Pago de Canon para Feria | Canon de puesto feria, Alquiler de stand / mesa |
| Ingreso | Ventas en Feria | Puesto Feria, Feria Artesanal, Evento |
| Ingreso | Personalizados por Encargue | Cartelería, Souvenirs, Trabajos a Medida, Regalos |

## 8. Casos de uso principales

### CU-01 · Iniciar sesión
- **Actor:** dueño/a del negocio. **Precondición:** sistema en modo nube y cuenta creada.
- **Flujo principal:** 1) Ingresa email y contraseña. 2) El sistema valida con Supabase. 3) Muestra la vista general con sus datos.
- **Alternativo:** credenciales incorrectas → se muestra el error y no se ingresa.

### CU-02 · Registrar un movimiento
- **Actor:** dueño/a. **Precondición:** sesión iniciada (o modo local).
- **Flujo principal:** 1) Toca **+ Ingreso** o **+ Egreso**. 2) Completa monto, fecha, categoría, subcategoría, descripción y medio de pago (opcional: proveedor/cliente y comprobante). 3) Guarda. 4) El movimiento aparece en todas las vistas y los totales se recalculan.
- **Alternativos:** monto vacío, 0 o negativo → RN-01. · Falla el guardado en la nube → aviso y se vuelven a leer los datos (RF-15).

### CU-03 · Registrar un movimiento hablándole a Golondrina
- **Flujo principal:** 1) Abre Golondrina y escribe, por ejemplo, *"gasté 15 mil en madera en efectivo"*. 2) Golondrina identifica tipo, monto, rubro, medio de pago y fecha. 3) Lo guarda y confirma con un mensaje.
- **Alternativos:** sin monto (*"compré vinilo"*) → abre el formulario con el rubro ya elegido. · Frase ambigua → ofrece opciones; la elegida queda aprendida.

### CU-04 · Corregir o borrar un movimiento
- **Flujo principal:** 1) Desde el historial, el día o la vista general, toca el lápiz (editar) o el tacho (borrar). 2) Edita y guarda, o confirma el borrado.
- **Alternativo con Golondrina:** *"corregir el último"* / *"borrar el último"*.

### CU-05 · Consultar cómo viene el mes
- **Flujo principal:** 1) Entra a la vista general y elige el mes. 2) Ve ingresos, egresos, balance, margen y el gráfico diario.
- **Alternativo con Golondrina:** *"¿cuánto gané este mes?"* → responde con lo que entró, lo que salió, la ganancia neta, el margen y la comparación con el mes anterior.

### CU-06 · Buscar y filtrar movimientos
- **Flujo principal:** 1) Entra a *Todos los movimientos*. 2) Escribe un texto y/o elige tipo, categoría, medio de pago y fechas. 3) Ordena por fecha o monto.
- **Alternativo con Golondrina:** *"mostrar gastos de madera"*, *"ventas de octubre"* → abre el historial con los filtros puestos.

### CU-07 · Exportar y respaldar
- **Flujo principal:** 1) Abre *Exportar & respaldos*. 2) Elige: CSV del mes, CSV completo, copia de seguridad (JSON) o imprimir reporte. 3) Se descarga el archivo o se abre la impresión.
- **Restaurar:** elige un archivo JSON de respaldo → confirma → se reemplazan los datos.

### CU-08 · Aceptar una sugerencia de Golondrina
- **Precondición:** Golondrina aprendió un hábito o una secuencia (RN-11).
- **Flujo principal:** 1) La golondrina llega volando con la sugerencia (ej. *"Después de la venta de feria solés cargar el canon. ¿Lo cargo?"*). 2) El usuario toca el botón y se hace la acción. 
- **Alternativos:** *"Ahora no"* → se descarta por un rato. · *"No me muestres esto de nuevo"* → no vuelve.

## 9. Golondrina (asistente)

**Qué se le puede pedir**

| Función | Ejemplos |
| --- | --- |
| Registrar gasto | "gasté 15 mil en madera en efectivo", "ayer cargué nafta 12500", "pagué el canon 8.000 por transferencia" |
| Registrar ingreso | "vendí 32.500 en la feria", "me pagaron 45000 por un encargo de carteles con mercado pago" |
| Corregir / borrar | "corregir el último", "borrar el último" |
| Ganancia | "¿cuánto gané este mes?", "¿cuánto gané en octubre?" |
| Totales | "¿cuánto gasté en nafta?", "¿cuánto vendí en ferias?", "¿en qué gasto más?" |
| Navegar | "ver el panel", "ver insumos", "registro de hoy", "ir a octubre", "mes pasado" |
| Filtrar | "mostrar gastos de madera", "ventas de octubre", "buscar Juan" |
| Exportar | "exportar a Excel", "exportar el mes", "hacer copia de seguridad", "imprimir reporte" |
| Control | "¿qué aprendiste?", "no me sugieras", "volvé a sugerir", "olvidá todo", "ayuda", "funciones" |

**Cómo entiende los datos**
- **Montos:** "15000", "15.000", "$15.000,50", "15 mil", "15k", "15 lucas".
- **Medios de pago:** efectivo, transferencia, Mercado Pago, débito, crédito.
- **Fechas:** hoy (por defecto), ayer, anteayer, "el 12/10".
- **Rubros:** madera, MDF, fibrofácil, vinilo, cola, clavos, tornillos, láser, grabado, nafta, peaje, canon, stand (egresos) · feria, evento, encargo, carteles, souvenirs, regalos (ingresos), más las subcategorías propias que se agreguen.

**Qué aprende** (por repetición y contexto)
- **Secuencias:** después de X casi siempre hace Y (ej. venta de feria → canon).
- **Entrada:** lo primero que hace al llegar.
- **Hábitos:** lo que hace en cierta pantalla y franja horaria (ej. la nafta a la mañana).
- **Atajos:** lo que hace siempre a mano y podría pedírselo con una frase.
- **Descubrir:** funciones útiles que todavía no usó.

**Privacidad:** lo que aprende se guarda sólo en el navegador del usuario; no se envía a ningún servidor.

Detalle técnico en [`GOLONDRINA.md`](../GOLONDRINA.md).

## 10. Datos

**Movimiento** (`transactions`)

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| id | texto | Sí | Identificador único. |
| user_id | uuid | Sí (nube) | Dueño del movimiento (RN-07). |
| type | `ingreso` / `egreso` | Sí | Tipo. |
| amount | número (14,2) | Sí | Monto, mayor a 0. |
| date | AAAA-MM-DD | Sí | Fecha del movimiento. |
| category_id / category_name | texto | Sí | Categoría. |
| subcategory | texto | No | Subcategoría. |
| description | texto | No | Detalle. |
| payment_method | texto | Sí | Medio de pago (por defecto efectivo en la base). |
| supplier_or_client | texto | No | Proveedor o cliente. |
| receipt_number | texto | No | Número de comprobante. |
| created_at | fecha y hora | Sí | Momento de carga (desempata el orden). |

**Ajustes del usuario** (`user_settings`): categorías propias del negocio (JSON).

En modo local los mismos datos se guardan en el navegador.

## 11. Requerimientos no funcionales

| ID | Requerimiento |
| --- | --- |
| **RNF-01** | **Responsive:** funciona en celular (navegación inferior) y en computadora (menú lateral). |
| **RNF-02** | **Seguridad:** acceso con login; aislamiento de datos por usuario con RLS; la clave pública de Supabase no permite leer nada sin sesión. |
| **RNF-03** | **Disponibilidad sin nube:** sin configuración de Supabase, la app funciona en modo local. |
| **RNF-04** | **Idioma:** español rioplatense; montos en pesos con separador de miles. |
| **RNF-05** | **Accesibilidad:** botones con texto o etiqueta, foco visible en Golondrina, respeta "reducir movimiento". |
| **RNF-06** | **Publicación:** sitio estático en Render + base en Supabase (`DEPLOY.md`). |
| **RNF-07** | **Golondrina sin servicios externos:** el intérprete funciona localmente; una IA externa es opcional. |

## 12. Criterios de aceptación (QA)

| ID | Dado | Cuando | Entonces |
| --- | --- | --- | --- |
| **CA-01** | el formulario de movimiento abierto | guardo con monto 0 o vacío | no se guarda y aparece el aviso de monto inválido |
| **CA-02** | un egreso de $15.000 en Compra de Insumos hoy | lo guardo | el total de egresos del mes y el de Insumos suben $15.000 y el balance baja $15.000 |
| **CA-03** | movimientos en noviembre y octubre | cambio al mes anterior | todas las cifras y el gráfico muestran octubre |
| **CA-04** | el historial con 50 movimientos | filtro "egreso" + categoría Nafta + efectivo | sólo veo egresos de Nafta pagados en efectivo |
| **CA-05** | movimientos del mes | exporto el CSV del mes | el archivo trae sólo los movimientos de ese mes y abre en Excel |
| **CA-06** | una copia de seguridad descargada | la restauro y confirmo | los movimientos y categorías quedan como en el respaldo |
| **CA-07** | dos cuentas en modo nube | ingreso con la cuenta A | no veo ningún movimiento de la cuenta B |
| **CA-08** | Golondrina abierta | escribo "gasté 15 mil en madera en efectivo" | se guarda un egreso de $15.000 en Compra de Insumos / Madera, efectivo, con fecha de hoy |
| **CA-09** | Golondrina abierta | pregunto "¿cuánto gané este mes?" | responde ingresos, egresos, ganancia neta y margen, iguales a los de la vista general |
| **CA-10** | registré 3 veces el canon justo después de la venta de feria | registro otra venta de feria | Golondrina sugiere cargar el canon (no lo carga sola) |
| **CA-11** | una sugerencia de Golondrina | toco "No me muestres esto de nuevo" | esa sugerencia no vuelve a aparecer |

## 13. Supuestos, restricciones y pendientes

- **Supuesto:** un negocio = una cuenta; no hay roles ni usuarios múltiples.
- **Restricción:** la memoria de Golondrina vive en el navegador; si se cambia de dispositivo o se borran los datos del navegador, empieza a aprender de nuevo.
- **Pendiente:** cargar categorías propias desde la interfaz (hoy se restablecen o se restauran desde un respaldo).
- **Pendiente:** filtros guardados y reportes anuales.
- **Pendiente:** conectar una IA externa (opcional) para preguntas libres.

## 14. Historial de versiones

| Versión | Fecha | Cambio | Autor/a |
| --- | --- | --- | --- |
| 1.0 | 18/11/2026 | Primera versión del documento funcional (sistema + Golondrina). | María Sofía Genta |
