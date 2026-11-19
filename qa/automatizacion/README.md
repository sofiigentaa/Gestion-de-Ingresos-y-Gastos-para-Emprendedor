# Pruebas automáticas de Gestión de ingresos y gastos

Pruebas de extremo a extremo con [Playwright](https://playwright.dev) sobre el `dist/` compilado de
`gestion-de-ingresos-y-gastos-para-emprendedor`, en **modo local** (sin variables de Supabase: sin login y con
los datos en `localStorage`). Los ID de las pruebas (`IYG-…`) son los del plan de pruebas (`../21.80-plan-de-pruebas.md`).

El resultado esperado de cada prueba es el que fijan el documento funcional y el plan, no el comportamiento actual:
si la aplicación tiene el defecto, la prueba falla.

## Estructura

| Carpeta o archivo | Contenido |
|---|---|
| `tests/` | Un archivo por área: arranque, movimientos, vistas, historial, exportación, reinicio, Golondrina (interpretación), aprendizaje de Golondrina e interfaz |
| `pages/` | Objetos de página: lo único que conoce los selectores. Incluye los diálogos nativos (`alert`, `confirm`) y las rutinas de Golondrina |
| `fixtures/` | Preparación común: reloj simulado, siembra de datos, corte de cualquier origen que no sea el propio servidor |
| `data/` | Datos de prueba del plan (DS-01, DS-02, DS-03) con los totales calculados a mano |
| `scripts/servir.mjs` | Servidor estático mínimo para `dist/` (solo loopback) |
| `scripts/informe.mjs` | Escribe el registro de la ejecución en `../ejecuciones/` |
| `playwright.config.ts` | Proyectos `escritorio` (1366 × 768) y `movil` (390 × 844, solo pruebas `@movil`), informes, trazas |
| `correr.sh` | Instala, compila y corre todo dentro de un entorno aislado (`bwrap`, sin red) |

## Cómo se usa

Requisitos: Linux con `bwrap`, Node 20 o superior, Google Chrome instalado y el repositorio de la aplicación
clonado con sus dependencias instaladas (`node_modules/`).

```bash
./correr.sh instalar          # una vez: dependencias de las pruebas (único paso con red, sin scripts de instalación)
./correr.sh construir         # tipos (tsc) y build de la aplicación; hay que repetirlo después de cambiar el código
./correr.sh                   # todas las pruebas
./correr.sh --grep @P0        # solo prioridad alta
./correr.sh --project=movil   # solo móvil
./correr.sh tests/vistas.spec.ts
IYG_INFORME=original ./correr.sh   # el informe termina en "-original.md"
IYG_REPO=/ruta/al/clon ./correr.sh # otro clon de la aplicación
```

`correr.sh` funciona igual desde el espacio de QA y copiado en `<repo>/qa/automatizacion/`: busca el repositorio
en `../..` y en la ruta del espacio de QA. Avisa si el código es más nuevo que `dist/`.

No se ejecuta nada de la aplicación fuera de `bwrap`. Las pruebas corren sin red: el servidor y Chrome comparten
el loopback del entorno aislado y la página no puede pedir ningún otro origen (la prueba falla si lo intenta).

## Resultados
- `../ejecuciones/21.80-evidencia-AAAA-MM-DD-playwright.md`: resumen de la corrida.
- `playwright-report/`: informe HTML (`npm run reporte`).
- `test-results/`: captura y traza de cada prueba que falla. Se borran al terminar.

## Reglas para agregar pruebas
- El título empieza con el ID del plan y termina con la prioridad: `IYG-MOV-01 … @P0`. Las pruebas de móvil
  llevan además `@movil`.
- Una prueba no depende de otra: cada una abre la aplicación en un contexto nuevo con DS-01 sembrado
  (o con los datos que indique el caso).
- Los selectores van en `pages/`. Se prefiere lo que ve el usuario (rol, texto). Los campos del formulario, de la
  carga rápida y de los filtros no tienen etiqueta asociada (IYG-HAL-66): para ellos se usan los `id` y las
  opciones que ya trae la aplicación.
- El resultado esperado se calcula a mano y se escribe en la prueba o en `data/`.
- Sin esperas fijas: se usan las aserciones de Playwright. Las esperas de Golondrina (90 s, 20 min) se adelantan con
  `page.clock`.
- Las fechas dependen del reloj simulado (F = 2026-11-19 12:00, Buenos Aires), nunca del día real.
- Los diálogos `alert` y `confirm` se responden de forma explícita (`app.dialogos.aceptar()` o `.cancelar()`): sin
  respuesta preparada, una confirmación se cancela.
- Un paso sin resultado esperado definido en el plan (`[A]`) no se afirma: se anota lo observado con
  `test.info().annotations` (tipo `observado`).

## Alcance
Cubre todos los casos P0 ejecutables en modo local, más P1 y P2 que salen baratos. Los casos de sesión y de nube
(`IYG-SES-01`, `02`, `03` y `IYG-MOV-06`, y las variantes en nube) quedan fuera: requieren Supabase.
La lista completa de automatizados y bloqueados está al final del inventario del plan (sección 8).
