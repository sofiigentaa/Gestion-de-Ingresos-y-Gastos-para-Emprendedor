#!/usr/bin/env bash
# Corre Playwright dentro de un entorno aislado (bwrap): sin directorio personal, sin sesiones ni
# credenciales y SIN RED (bwrap levanta solo el loopback). El repositorio de la aplicación se monta en
# solo lectura; solo se escriben esta carpeta y la de ejecuciones. La aplicación se prueba desde su
# `dist/` ya compilado (modo local, sin variables de Supabase).
#
# Uso:
#   ./correr.sh instalar                 instala las dependencias de pruebas (único paso con red, sin scripts)
#   ./correr.sh construir                tipos (tsc) y build de la aplicación; escribe en el repositorio
#   ./correr.sh [opciones de playwright] corre las pruebas y escribe el informe
#   IYG_REPO=/ruta/repo ./correr.sh      prueba otro clon
#   IYG_INFORME=original ./correr.sh     agrega el sufijo "-original" al nombre del informe
#
# Ejemplos: ./correr.sh --grep @P0     ./correr.sh --project=movil     ./correr.sh tests/movimientos.spec.ts
#
# Funciona desde el espacio de QA y copiado en <repo>/qa/automatizacion/.
set -euo pipefail
shopt -s globstar nullglob
aqui="$(cd "$(dirname "$0")" && pwd)"
ejecuciones="$(realpath -m "$aqui/../ejecuciones")"; mkdir -p "$ejecuciones"
node_bin="$(dirname "$(readlink -f "$(asdf which node 2>/dev/null || command -v node)")")"
node_raiz="$(dirname "$node_bin")"

repo="${IYG_REPO:-}"
if [ -z "$repo" ]; then
  for candidato in "$aqui/../.." \
      "$aqui/../../../../30-39-codigo/31-repositorios/gestion-de-ingresos-y-gastos-para-emprendedor"; do
    if [ -f "$candidato/package.json" ] && [ -d "$candidato/src" ]; then repo="$(realpath "$candidato")"; break; fi
  done
fi

base=(--unshare-all --die-with-parent
  --ro-bind /usr /usr --ro-bind /opt /opt --ro-bind /etc/fonts /etc/fonts
  --symlink usr/lib /lib --symlink usr/lib /lib64 --symlink usr/bin /bin
  --proc /proc --dev /dev --tmpfs /tmp --tmpfs /home/aislado --setenv HOME /home/aislado
  --ro-bind "$node_raiz" "$node_raiz" --setenv PATH "$node_bin:/usr/bin" --setenv CI 1)

if [ "${1:-}" = instalar ]; then
  # Único paso con red: descarga los paquetes fijados en package-lock.json, sin scripts de instalación.
  bwrap "${base[@]}" --share-net --ro-bind /etc/resolv.conf /etc/resolv.conf --ro-bind /etc/ssl /etc/ssl \
    --ro-bind /etc/ca-certificates /etc/ca-certificates --ro-bind /etc/hosts /etc/hosts \
    --bind "$aqui" "$aqui" --chdir "$aqui" npm ci --ignore-scripts --no-audit --no-fund
  exit
fi

[ -n "$repo" ] && [ -d "$repo/src" ] || { echo "No se encuentra el repositorio de la aplicación; indicar IYG_REPO" >&2; exit 2; }

if [ "${1:-}" = construir ]; then
  # Sin red: usa las dependencias ya instaladas del clon.
  bwrap "${base[@]}" --bind "$repo" "$repo" --chdir "$repo" bash -c 'npm run lint && npm run build'
  exit
fi

dist="$repo/dist"
[ -f "$dist/index.html" ] || { echo "Falta $dist: correr ./correr.sh construir" >&2; exit 2; }
for f in "$repo"/src/**/* "$repo"/src/* "$repo/index.html"; do
  if [ -f "$f" ] && [ "$f" -nt "$dist/index.html" ]; then
    echo "AVISO: $f es más nuevo que dist/. Correr ./correr.sh construir para no probar una compilación vieja." >&2; break
  fi
done

version="rama \`$(git -C "$repo" branch --show-current)\`, commit \`$(git -C "$repo" rev-parse --short HEAD)\`"
if [ -n "$(git -C "$repo" status --porcelain -- . ':!qa' 2>/dev/null)" ]; then version="$version, con cambios sin confirmar"; fi
version="$version, dist compilado el $(date -r "$dist/index.html" '+%Y-%m-%d %H:%M')"

aislado() {
  bwrap "${base[@]}" --ro-bind "$repo" "$repo" --bind "$aqui" "$aqui" --bind "$ejecuciones" "$ejecuciones" \
    --setenv IYG_DIST "$dist" --setenv IYG_INFORME "${IYG_INFORME:-}" --chdir "$aqui" "$@"
}

estado=0
aislado node node_modules/@playwright/test/cli.js test "$@" || estado=$?
aislado node scripts/informe.mjs "$version"
exit $estado
