# Roadmap de Hatch.mon

Estado vivo del trabajo pendiente. Una entrada por tema, en el orden en que se irán abordando.
Cada punto cerrado se marca `Hecho` con la fecha y el commit; los que cambian comportamiento
actualizan además la sección correspondiente de README.md en el mismo cambio.

Leyenda de estado: `Pendiente` · `En curso` · `Bloqueado (espera decisión)` · `Hecho`

---

## Bloque A · Pipeline de contenido canónico

### A1 · Propagación automática del workbook canónico
**Estado:** Hecho · 2026-09-14

Al actualizar `master/pokemonTable_HatchMon_Canonical_v2.xlsx`, todos los artefactos generados
deben reflejar el cambio antes del siguiente deploy, sin pasos manuales recordados de memoria.

Regla de admisión acordada: **solo entran al juego las especies y las reglas de evolución cuya
regla tiene `MinAgeDays` informado.** Si una regla no lo tiene, ni la regla ni las especies que
solo aparecen en ella se añaden al runtime.

Hallazgo de partida: esa regla reproduce exactamente el repertorio actual de 75 formas y añade
dos especies que ya están en el workbook pero nunca llegaron al juego (`0238A0` Smoochum y
`0124A0` Jynx). Es decir, el repertorio hoy escrito a mano en `evolutionTable.js` es derivable.

Cadena de artefactos afectada por un alta de especie:

| Artefacto | Generador | Hoy |
| --- | --- | --- |
| `hatchmonData_v2.js`, `master/hatchmonData_v2.json` | `tools/generateCanonicalData.py` | automático (`--check` disponible) |
| `evolutionTable.js` (repertorio e IDs legacy) | — | **a mano** |
| `assets/pmd/<id>/**` + `manifest.js` + `CREDITS.md` | `tools/syncPmdAssets.py` | automático por ID |
| `assets/skins/themes.js` | `tools/generateShellThemes.py` | automático |
| `assets/pmd/listMetrics.js` | `tools/generateListMetrics.py` | automático |
| `tests/obtainable-roster.json` (golden) | — | **a mano** |
| `dist/**` | `tools/buildMobileRuntime.py --optimize` | automático |

Entregado:
1. `evolutionTable.js` y `hatchmonData_v2.js` se generan desde el workbook aplicando la regla.
2. IDs legacy anclados en `master/legacyIds.json`, en el orden histórico del repertorio. Las altas
   reciben un slug de `DisplayName` y se añaden al final; una colisión detiene la generación.
3. Orquestador `python3 tools/syncCanonical.py` (`--check`, `--optimize`, `--refresh-assets`).
4. `tests/canonical-pipeline.test.cjs`: 5 pruebas que fallan si un artefacto está desfasado, si una
   especie admitida llega sin assets/shiny/carcasa/métricas o si `dist/` no refleja el runtime.
5. Poda aplicada: el runtime pasó de 1100 especies y 526 reglas a 78 y 51 (597 KB → 48 KB en bruto,
   41 KB → 3 KB con gzip). El workbook completo sigue archivado en `master/hatchmonData_v2.json`.
6. Smoochum y Jynx entraron al repertorio (75 → 77 formas) con sus assets normales y shiny.
7. Ditto se admite sin regla evolutiva: `contract['Ditto']` lo define como pareja de crianza y el
   adapter necesita su ficha para enrutar el caso especial.

Pendiente opcional: hook `pre-commit` que dispare el `--check` cuando el `.xlsx` esté en el índice.
Hoy la garantía es la suite, que es donde de verdad se bloquea el deploy.

### A2 · Descarga automática de assets PMD para altas nuevas
**Estado:** Hecho · 2026-09-14 (entregado junto a A1: sin los assets de las altas nuevas la suite
queda en rojo, así que no eran separables)

`tools/syncPmdAssets.py` ya descarga normal y shiny desde el repositorio SpriteCollab que
alimenta sprites.pmdcollab.org, verifica identidad y subgrupo contra `tracker.json`, y regenera
manifiesto y créditos. Lo que falta es que se dispare solo con los IDs nuevos que produzca A1,
dentro del orquestador.

Límite conocido y deliberado: las formas alternativas (sufijo distinto de `A0`) exigen una
entrada explícita en el mapa `FORMS` del script. Sin ella el script falla en vez de adivinar.
Se mantiene ese comportamiento.

### A3 · Consumo de datos y caché de assets
**Estado:** Hecho · 2026-09-14

El reescalado vigente se mantiene (huevos a 832×832, logo a 264×104, sprites PMD sin reescalar
porque ya están por debajo de su tamaño útil; la escala visual se aplica en render con
`scale: 3`). El objetivo se replanteó como reducir datos y acelerar la carga:

- **Paleta exacta sin pérdida.** Los PNG con ≤256 colores RGBA se reescriben a PNG-8 con `tRNS`.
  Los sprites PMD usaban 7–15 colores en RGBA de 32 bits. Runtime PNG: 18,5 MB → 8,4 MB (−55 %),
  2131 de 2640 archivos en modo paleta, 2529 verificados píxel a píxel contra su original.
- **Poda de datos canónicos** (ver A1): `hatchmonData_v2.js` 597 KB → 48 KB en bruto.
- **Service worker** (`sw.js`): caché por build de medios inmutables bajo `assets/` y `vendor/`.
  Una segunda visita no vuelve a descargar sprites ni huevos. Verificado en Chrome real.

Pendiente por decidir, no aplicado:

- **WebP sin pérdida.** Mediría −68 % sobre los sprites (frente al −55 % de la paleta) y −24 % en
  las hojas de huevo, que son lo más pesado de la primera carga. Es exacto en alfa y en todo píxel
  visible; solo difiere el RGB oculto bajo alfa 0. Implica renombrar ~2600 archivos y tocar
  `syncPmdAssets.py`, el manifiesto y el builder, así que se deja como paso aparte.
- **Huevos.** Las cinco hojas suman 1,9 MB y la primera carga baja dos (~800 KB). Son arte suavizado
  de 50 000 colores, no pixel-art, así que la paleta no les aplica. Además se reescalan de
  1256→832 con nearest en ratio no entero, lo que duplica píxeles de forma irregular: merece
  revisión propia.

---

## Bloque B · Features de producto

### B1 · Mejoras de shiny
**Estado:** Pendiente

Icono pixel-art de shiny junto al nombre de especie, verificación de cobertura de assets shiny y
precarga de sprites shiny antes de la eclosión.

### B2 · Mystery Gifts
**Estado:** Pendiente

Canje de códigos cortos respaldados por servidor para huevos especiales: controles de admin,
fecha de caducidad, límite de usos y canje seguro.

### B3 · Hatch Codes v2
**Estado:** Pendiente

Sustituir los códigos largos de breeding por un formato estandarizado de 12 caracteres con
soporte QR, manteniendo compatibilidad con los `HM1` existentes.

Objetivo real detrás de la propuesta: **un único formato de código corto compartido entre friend
code, hatch code y mystery gift**, para que la UX sea una sola cosa que aprender.

### B4 · Sistema de build y actualización
**Estado:** Pendiente

Mostrar el build vigente y refrescar el sitio del usuario automáticamente, guardando y
sincronizando el progreso antes de recargar.

### B5 · Perfiles de jugador y amigos
**Estado:** Pendiente

Nombre de jugador, Friend Code permanente, solicitudes de amistad y vista limitada del Pokémon
actual de cada amigo.

### B6 · Cambio de mote
**Estado:** Pendiente

Renombrar al Pokémon a través del Prof. Oak por un coste en monedas.

### B7 · Familia de crianza en la interfaz de Oak
**Estado:** Pendiente

Mostrar la familia evolutiva del Pokémon en la sección del Prof. Oak.

### B8 · Regalo e intercambio de huevos
**Estado:** Pendiente

Hoy compartir un breeding code registra automáticamente el Pokémon propio en la Pokédex del
amigo: eso no se quiere. En su lugar, poder enviar huevos del inventario a un amigo como regalo
o intercambio.

---

## Bloque C · Feedback de beta testers

### C1 · Botón Dormir deshabilitado cuando no procede
**Estado:** Pendiente

Si el Pokémon no puede dormir en ese momento, el botón debe aparecer deshabilitado y la interfaz
debe dejar claro que la acción no está disponible **antes** de pulsarla.

### C2 · Revisión general de minijuegos
**Estado:** Pendiente

Revisar los minijuegos en conjunto: dificultad, ritmo, claridad, controles, feedback visual y
sensación de juego. Salida esperada: qué minijuegos necesitan retoques concretos y cuáles.

### C3 · Carcasas con más personalidad
**Estado:** Pendiente

Alejar la estética principal del LCD monocromo. Criterio acordado:

- Primeras evoluciones (base): monocromo es suficiente.
- Evoluciones posteriores de la misma línea: 2–3 colores de la paleta del sprite, con patrones
  suaves y geométricos ligados a la estética del Pokémon.
- Siempre sencillo, nunca recargado. El objetivo es que cada carcasa se sienta coleccionable.

### C4 · Curva de Bond más exigente
**Estado:** Pendiente

Hoy se llega al Bond máximo el día 2. Objetivo: alcanzarlo alrededor del día 3.5 jugando bien.
Curva no lineal: los primeros niveles suben relativamente rápido, los altos cuestan
progresivamente más. Definir la curva **después** de analizar el cálculo actual en
`relationship.js`.

---

## Preguntas abiertas

1. **IDs legacy (A1).** Las claves de `evolutionTable.js` (`pichu`, `raichualola`) son las que se
   guardan en los saves. ¿Se acepta anclarlas en `master/legacyIds.json` y derivar solo las
   altas nuevas por slug del `DisplayName`?
2. **Smoochum y Jynx (A1).** Cumplen la regla `MinAgeDays` y entrarían al repertorio en cuanto se
   automatice. ¿Se quieren dentro, o hay que excluirlos en el workbook?
3. **Reescalado (A3).** ¿«Aplicar el rescaling» significa la pasada `--optimize` ya documentada,
   o hay un reescalado distinto de los sprites que no está en el repositorio?
4. **Poda de datos canónicos.** `hatchmonData_v2.js` embarca 1100 especies y 526 reglas (597 KB)
   cuando el runtime solo usa 77 y 51. Podar al repertorio admitido lo deja en ~47 KB sin romper
   referencias (`BaseOffspringId` y `PreEvolutionId` del repertorio apuntan siempre dentro).
   Es un 92 % menos de descarga en móvil. ¿Se aplica?
