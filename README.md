Sistema de Gestión de Ingresos y Gastos  |  React, TypeScript, Supabase

    • App de control financiero con dashboard interactivo, categorización de gastos, vista diaria de transacciones y exportación de reportes.

## Documentación

- [Documento funcional](docs/DOCUMENTO-FUNCIONAL.md): objetivo, alcance, requerimientos, reglas de negocio, casos de uso y criterios de aceptación.
- [Golondrina](GOLONDRINA.md): cómo funciona el asistente.
- [Publicación](DEPLOY.md): Render + Supabase.

## Asistente Golondrina

La app incluye **Golondrina**: un asistente al que se le cuentan los movimientos con palabras («gasté 15 mil en madera», «vendí 32.500 en la feria») y se le preguntan los números («¿cuánto gané este mes?»), y una automatización que aprende por repetición y contexto lo que hace la usuaria para ofrecérselo en el momento justo. Ver [GOLONDRINA.md](GOLONDRINA.md).

## Cómo levantarlo en modo local

Requiere Node 20 o superior. Sin variables de Supabase la aplicación arranca en **modo local**: sin inicio de sesión y con los datos guardados en el navegador (`localStorage`). La primera vez carga datos de ejemplo.

```bash
npm ci               # instala las dependencias
npm run dev          # servidor de desarrollo en http://localhost:3000
npm run lint         # verifica los tipos (tsc)
npm run build        # genera dist/
npm run preview      # sirve dist/
```

`VITE_BRAND=demo npm run dev` muestra una marca ficticia. Para el modo nube se cargan `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; los pasos están en [DEPLOY.md](DEPLOY.md).

## Pruebas

La carpeta `qa/` tiene el trabajo de QA:

- `qa/21.80-plan-de-pruebas.md`: plan, datos de prueba e inventario de casos.
- `qa/21.80-hallazgos.md`: registro de defectos y dudas, con su estado.
- `qa/ejecuciones/`: evidencia de cada corrida.
- `qa/automatizacion/`: pruebas automáticas con Playwright. Ver su `README.md`.

```bash
cd qa/automatizacion
./correr.sh instalar    # una vez
./correr.sh construir   # compila la aplicación (tipos y build)
./correr.sh             # corre todas las pruebas en un entorno aislado
```

Requiere Linux con `bwrap`, Node 20 o superior y Google Chrome. Las pruebas cubren el modo local; los casos de sesión y de nube necesitan un proyecto Supabase de pruebas.

