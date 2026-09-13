# Roadmap de Hatch.mon

Estado vivo del trabajo pendiente. Una entrada por tema, en el orden en que se irán abordando.
Cada punto cerrado se marca `Hecho` con la fecha y el commit; los que cambian comportamiento
actualizan además la sección correspondiente de README.md en el mismo cambio.

Leyenda de estado: `Pendiente` · `En curso` · `Bloqueado (espera decisión)` · `Hecho`

---

## Bloque A · Pipeline de contenido canónico

### A1 · Propagación automática del workbook canónico
**Estado:** En curso

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

Plan:
1. Generar `evolutionTable.js` desde el workbook aplicando la regla `MinAgeDays`.
2. Fijar los IDs legacy en un mapa versionado (`master/legacyIds.json`): son claves de save y no
   pueden cambiar aunque cambie el `DisplayName` del Excel. Las altas nuevas reciben un slug
   derivado del nombre; las existentes quedan ancladas.
3. Orquestador único `tools/syncCanonical.py` que encadena la tabla de arriba en orden.
4. Modo `--check` en toda la cadena + prueba en la suite que falla si algún artefacto está
   desfasado respecto al workbook. Esa prueba es la garantía real: no se puede llegar a `main`
   con estado obsoleto sin que `node --test tests/*.test.cjs` se ponga en rojo.
5. Opcional: hook `pre-commit` que dispare el `--check` cuando el `.xlsx` esté en el índice.

Decisiones abiertas: ver «Preguntas abiertas» al final.

### A2 · Descarga automática de assets PMD para altas nuevas
**Estado:** Pendiente (depende de A1)

`tools/syncPmdAssets.py` ya descarga normal y shiny desde el repositorio SpriteCollab que
alimenta sprites.pmdcollab.org, verifica identidad y subgrupo contra `tracker.json`, y regenera
manifiesto y créditos. Lo que falta es que se dispare solo con los IDs nuevos que produzca A1,
dentro del orquestador.

Límite conocido y deliberado: las formas alternativas (sufijo distinto de `A0`) exigen una
entrada explícita en el mapa `FORMS` del script. Sin ella el script falla en vez de adivinar.
Se mantiene ese comportamiento; el orquestador debe reportar el alta pendiente con claridad.

### A3 · Reescalado y optimización de imágenes al sincronizar
**Estado:** Bloqueado (espera decisión)

Lo que hoy existe: `tools/buildMobileRuntime.py --optimize` recomprime PNG sin pérdida,
reescala las hojas de huevo a 832×832 y el logo a 264×104 con nearest-neighbor, y guarda los
originales en `master/asset-originals/`. Los sprites y portraits PMD **no** se reescalan: ya
están por debajo de su tamaño útil en pantalla y solo se recomprimen. La escala visual del
compañero se aplica en render (`scale: 3` en el metadata de cada sprite).

Falta confirmar a qué reescalado se refiere la petición antes de tocar nada.

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
