# Trabajo sobre Hatch.mon

## Contexto del repositorio

- Web estática sin compilación ni `package.json`. `index.html` orquesta el juego y carga los módulos como scripts diferidos (`data-game-src`); solo `appBootstrap.mjs`, `authService.mjs` y `cloudSaveService.mjs` son módulos ES. `appEnvironment.js` e `i18n.js` se cargan directos.
- Rama única `main`, sin ramas de trabajo. El agente entrega cambios en local y **nunca** ejecuta `git commit` ni `git push`; eso lo hace la persona. Un push a `main` publica el sitio, así que deja el árbol coherente y señala cualquier artefacto que quede pendiente de regenerar.
- `dist/` es artefacto generado y versionado (`python3 tools/buildMobileRuntime.py --optimize`, allowlist desde `index.html` más `sw.js`). No se edita a mano. El build sella el ID de compilación dentro de `sw.js`, así que esa línea también es generada. Tocar runtime (JS/HTML de raíz o assets incluidos) deja `dist/` desfasado: regenéralo o avísalo de forma explícita en la entrega.
- `master/palettes.json` es caché de red: lo llena `python3 tools/fetchPalettes.py` desde pokemonpalette.com y se versiona. Es el único paso con red del pipeline; `syncCanonical.py` no lo toca. Al añadir una especie hay que lanzarlo (`--only <PokemonId>`) o el generador de carcasas para con la lista de lo que falta.
- `hatchmonData_v2.js`, `evolutionTable.js` y `master/legacyIds.json` también son generados: se regeneran con `python3 tools/syncCanonical.py`, que propaga el Excel a datos, repertorio, assets PMD, carcasas, métricas y `dist/`. Solo entran al runtime las reglas con `MinAgeDays` informado y las especies que conectan. Los IDs legacy son claves de save: se anclan en `master/legacyIds.json` y nunca se reescriben.
- `master/` guarda fuentes archivadas (Excel canónico, originales de assets, informes) y no participa en runtime. `assets/pmd/` contiene las 75 formas con variante `shiny/`; `tools/` las utilidades Python/Node.
- `.rgignore` excluye `dist/`, catálogos, manifiestos y sprites, de modo que `rg` busca solo en fuente. Para inspeccionar lo excluido, usa rutas explícitas.
- El repositorio vive en `~/Projects/HATCH.MON` y **no debe colocarse en una carpeta sincronizada por iCloud** (Escritorio o Documentos con «Carpetas Escritorio y Documentos» activado). iCloud resuelve los conflictos duplicando el fichero con « 2» en el nombre, y `.git` no lo tolera: una copia dentro de `refs/` es un nombre de referencia inválido y deja el repositorio ilegible para GitHub Desktop. Regenerar `dist/` escribe miles de ficheros y dispara justo ese conflicto. Si aparecen ficheros acabados en « 2», « 3»…, es este problema.

## Prioridades y método

- Prioridad: corrección > seguridad de cambios > claridad > ahorro de contexto.
- Usa las secciones «Arquitectura actual» y «Reglas estructurales clave» de README.md como mapa. Es un mapa, no la fuente: ante discrepancia manda el código, y corrige en el mismo cambio la sección afectada.
- Localiza funciones, selectores y constantes con `rg`; abre rangos concretos. `index.html` e `i18n.js` usan líneas muy densas: edítalos por rangos acotados, nunca de una pieza. Si bastan uno o dos archivos, limita el trabajo a ellos y sus pruebas pertinentes.
- No vuelques `hatchmonData_v2.js` ni `master/hatchmonData_v2.json`: son catálogos en una línea. Consulta registros/campos específicos mediante el adapter o un script con salida acotada. No copies datos canónicos a otros módulos.
- Conserva las responsabilidades del mapa. Evita refactorizaciones masivas; propone extracciones solo si reducen un acoplamiento o una dificultad real de edición.
- Antes de añadir una constante, mapping, regla, mensaje o validación, busca su fuente existente y reutilízala. Los bloques `*_CONFIG` de `vitalSimulation.js`, `relationship.js` y `pokedex.js` centralizan balance; no dupliques valores en `index.html`. Usa nombres descriptivos y comentarios solo para lógica no obvia.
- Todo texto visible pasa por `HatchI18n.t` o los atributos `data-i18n*`, en ES y EN. Detector: `tests/i18n-audit.cjs`; excepciones registradas en `I18N_AUDIT.md`.
- Los saves usan `version:12`. Cambiar el esquema invalida partidas existentes: si no es el objetivo de la tarea, normaliza en `migrateSave` en lugar de subir la versión.

## Verificación

- Suite completa desde la raíz: `node --test tests/*.test.cjs` (44 archivos, 107 pruebas). Para leer `index.html` desde una prueba usa `gameSource()`/`runtimeHtml()` de `tests/uiHarness.cjs`: una lectura directa puede pillar el fichero a medio reescribir. `tests/canonical-pipeline.test.cjs` falla si un artefacto generado está desfasado respecto al workbook. `tests/i18n-audit.cjs` y `tests/uiHarness.cjs` no son suites: son módulos auxiliares de los que dependen otras pruebas.
- Comprobaciones aparte: `node tools/projectStatus.cjs` (roster y cobertura de assets) y `PLAYWRIGHT_MODULE="$(npm root -g)/playwright" node tests/browser-recovery.cjs`, que abre Chrome real con todas las peticiones interceptadas y valida la build de `dist/`.
- Servidor local: `python3 tools/serveLocal.py --offline` para pruebas aisladas; sin `--offline` la página habla con el Supabase de producción aunque sirvas desde localhost. Nunca `file://`; no existe `npm run dev`.
- Si una verificación no se puede ejecutar, dilo en la entrega y márcala como no ejecutada; no la des por hecha ni la deduzcas del código.
- Prefiere fixtures mínimos y representativos. Ejecuta las pruebas afectadas; amplía la verificación si hay cambios transversales, fallos o riesgos concretos. No repitas pruebas aprobadas sin motivo nuevo.

## Entrega

- En auditorías, muestra primero cantidades y anomalías. Guarda inventarios largos en un artefacto; no vuelques catálogos ni cientos de rutas al contexto.
- README describe el estado vigente, sin cronología redundante ni copias de configuraciones completas. Actualiza la sección existente antes de añadir otra, y hazlo en el mismo cambio que altera el comportamiento descrito.
- Responde con cambios, decisiones relevantes, pruebas y pendientes. No repitas decisiones consolidadas. Distingue pruebas DOM/CSS de inspección visual real.
