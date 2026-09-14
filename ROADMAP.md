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

### A4 · Recarga automática del servidor local
**Estado:** Pendiente

`tools/serveLocal.py` ya impide que el navegador cachee nada (`Cache-Control: no-store`), así que
editar un fichero y recargar a mano basta para ver el cambio. Falta que recargue solo al guardar:
un watcher sobre los ficheros de runtime que empuje un evento al navegador, por SSE o por un
WebSocket, y una línea en `index.html` que solo se active sirviendo desde localhost.

Se aplaza a propósito. Hoy el repositorio no compila nada y no tiene `package.json`; esto metería
la primera dependencia de desarrollo, o bien un watcher escrito a mano. Vale la pena cuando editar
textos y estilos a mano se vuelva pesado, no antes. Alternativa sin dependencias: `watchdog` no,
sino `os.scandir` con mtimes desde el propio `serveLocal.py`, que ya es un servidor en marcha.

Ojo con `dist/`: el servidor puede servir el árbol de fuentes o `dist/`, y solo el primero refleja
una edición sin pasar por `buildMobileRuntime.py`. La recarga automática solo tiene sentido en el
modo fuentes; en modo `--dist` confundiría más que ayudaría.

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

Poder enviar huevos del inventario a un amigo como regalo o intercambio.

La parte de «compartir un breeding code no debe registrar en la Pokédex» queda **descartada**: se
mantiene el registro, diferenciando visto de cuidado (ver D12).

---

## Bloque C · Feedback de beta testers

### C1 · Botón Dormir deshabilitado cuando no procede
**Estado:** Hecho · 2026-09-14

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

## Bloque D · Segunda tanda de testers

### D12 · Visto frente a cuidado en la Pokédex
**Estado:** Hecho · 2026-09-14

Leer el código de otra persona sigue registrando su forma en la Pokédex, como antes. Lo que cambia
es cómo se muestra: una entrada sin ningún `ownedIds` aparece como silueta —todos los píxeles
visibles al mismo gris oscuro, opacos— y solo se ve a color cuando has cuidado la especie.

La silueta se calcula sobre el canvas (`getImageData`/`putImageData`), no con un filtro CSS: el
modo LCD ya enseñó que WebKit no es de fiar aplicando filtros sobre un canvas (ver D5).

### D13 · Un fallo de acceso tiene que verse
**Estado:** Hecho · 2026-09-14

Escribir email y contraseña sin tener cuenta «no hacía nada»: el mensaje existía pero era texto
plano del mismo color que el resto, encima del formulario. Ahora un error se marca como tal —rojo,
negrita, barra lateral— y el texto de `invalid_credentials` señala el botón «Crear cuenta».

Supabase responde lo mismo para contraseña equivocada y cuenta inexistente, a propósito, para no
permitir enumerar usuarios. No se puede afirmar «usuario no registrado»; el texto cubre los dos
casos, que es la versión honesta.

### D14 · Quedarse sin acciones tiene que notarse
**Estado:** Hecho · 2026-09-14

Los botones se deshabilitaban pero nada decía por qué. Ahora, al gastar el último punto: un aviso
puntual («Te has quedado sin acciones. La siguiente llega en N min.») y la tira de acciones pasa a
estado agotado —«Sin acciones», en rojo, con cuenta atrás «+1 en N min» en lugar del «+1 / 10 min»
fijo—. El aviso salta una vez por agotamiento, no en cada repintado.

Se descartó el popup modal: interrumpe y hay que cerrarlo. La tira ya estaba en pantalla y es
donde el jugador va a mirar; el aviso solo llama la atención la primera vez.

### D15 · Shiny implica la forma normal en la Pokédex
**Estado:** Hecho · 2026-09-14

Registrar una forma shiny marca también la entrada normal —vista, cuidada y banderas—, nunca al
revés. Así la Pokédex shiny sigue siendo la difícil de completar. Los saves anteriores se rellenan
al cargar: toda entrada con `shiny.seen` vuelca sus datos sobre la entrada base.

### D10 · Login por email y contraseña
**Estado:** Hecho en cliente · 2026-09-14 · **falta una comprobación en Supabase**

La sonda pública del proyecto (`/auth/v1/settings`) devuelve `email: true` y `disable_signup:
false`, así que el proveedor de email **está activo**; y `mailer_autoconfirm: false`, es decir, la
cuenta **no sirve hasta confirmar el correo**. Google funciona porque OAuth llega ya confirmado.
Esa es la explicación que encaja con «solo entran con Google».

Hecho en el cliente:
- `humanError` mapea todos los códigos de Supabase relevantes y, ante uno desconocido, muestra el
  mensaje del servidor en vez de una frase genérica. Antes casi cualquier fallo se veía igual.
- Botón de **reenviar el correo de confirmación** cuando el login responde `email_not_confirmed`
  o cuando el alta queda pendiente. Antes no había salida.
- Pista de contraseña (mínimo 6) visible antes de enviar, en alta y en cambio de contraseña.

Pendiente y **no arreglable desde el cliente**: si los correos de confirmación no llegan, ninguna
de estas mejoras da acceso. Comprobar en el panel de Supabase → Authentication:
1. **SMTP propio configurado.** El mailer por defecto tiene un límite muy bajo por hora y se
   comparte por proyecto; con varios testers se agota enseguida y los correos no salen.
2. **URL Configuration.** `Site URL` y `Redirect URLs` deben incluir la URL publicada de GitHub
   Pages; si no, el enlace de confirmación falla aunque el correo llegue.
3. Alternativa, si se acepta: activar *Confirm email* = off (`mailer_autoconfirm: true`) para que
   el alta con contraseña entre directa, como hace Google.

### D11 · Pantalla de carga separada del login
**Estado:** Hecho · 2026-09-14

El botón «Entrar» aparecía dos veces: el de envío del formulario y el enlace de la barra inferior
que solo cambia al modo en el que ya estabas. Ahora se oculta el enlace del modo activo.

Mientras se verificaba cuenta y compañero, el formulario seguía en pantalla y aceptaba clics.
Ahora la puerta tiene dos estados excluyentes: `loading` muestra un bloque con spinner y título
neutro («Un momento»), y saca el formulario del flujo; `form` lo devuelve. Un fallo de carga
devuelve el formulario en vez de dejar el spinner girando.


### D1 · Doble toque no debe hacer zoom en iPhone
**Estado:** Hecho · 2026-09-14 (`7d190f1`)

Safari iOS amplía al doble toque. En un juego de toques repetidos eso interrumpe el juego.

### D2 · Popups flotantes se cierran tocando fuera
**Estado:** Hecho · 2026-09-14 (`93384d1`)

Los popups que hoy solo se cierran con la X deben cerrarse también al tocar fuera del panel.
**Excepción: los minijuegos**, para no salir por accidente a media partida.

### D3 · Pokédex ordenada por número de Pokédex
**Estado:** Hecho · 2026-09-14 (`4a2cbce`)

Hoy no sigue el orden de la Pokédex; Growlithe y Arcanine deberían ir seguidos.

### D4 · Mochila ordenada por tipo y con tarjetas más compactas
**Estado:** Hecho · 2026-09-14

Confirmado que la petición era sobre la **Mochila**, no la tienda: la tienda solo muestra tres
objetos al día elegidos al azar por fecha, así que agrupar ahí no aporta. La Mochila agrupa por
`itemCatalog[id].kind` (bayas, objetos de evolución, medicina, bebidas), omite grupos vacíos y usa
filas compactas. La rotación diaria de la tienda no cambia.

### D5 · El sprite no entra en el modo LCD del juego en iPhone
**Estado:** Bloqueado (falta evidencia del dispositivo)

Confirmado que se trata del **modo LCD del propio juego**, no del filtro de accesibilidad de iOS.
El modo aplica `filter:url(#lcd-palette)` —un filtro SVG con cuantización discreta a cuatro
tonos— sobre `.screen`; el sprite es un `<canvas>` descendiente que debería heredarlo. En iOS
(Safari y Chrome comparten WebKit) el sprite se queda en color.

No se puede arreglar a ciegas: si el filtro del ancestro sí llega al canvas en algunos iOS,
aplicarlo también al canvas lo pasaría dos veces, y esta cuantización **no es idempotente** —la
segunda pasada vuelve a calcular luminancia sobre los cuatro tonos y los reasigna—. Hace falta
saber qué falla exactamente antes de tocar CSS.

`tools/lcdProbe.html` aísla las cinco hipótesis en una página autónoma: colores planos bajo el
filtro, canvas heredando el filtro, canvas animado heredando el filtro, filtro aplicado al propio
canvas e imagen heredando el filtro. Se sirve con `python3 tools/serveLocal.py --lan` y se abre
desde el iPhone; el bloque que salga en color nombra la causa y el arreglo:

- Falla el 1 → el filtro SVG no se aplica en absoluto; hay que cambiar de técnica.
- Falla solo el 2 → WebKit no lleva el filtro del ancestro al canvas; arreglo, el caso 4.
- Va el 2 y falla el 3 → la promoción a capa por animación; arreglo, evitarla o forzar la capa.
- Falla el 5 igual que el 2 → no es específico del canvas sino de cualquier contenido con imagen.

### D6 · Carcasa al obtener el Pokémon, no al madurar
**Estado:** Hecho · 2026-09-14 (`d41f6da`)

Hoy la carcasa se desbloquea al llegar a etapa madura. Debe desbloquearse al conseguir la
especie: al obtenerla si es primera fase, y en cuanto se evolucione en las siguientes.

### D7 · Los muertos por descuido no entran en Memorias
**Estado:** Hecho · 2026-09-14

Memorias debe reservarse para los que llegaron al final de su vida, no para los abandonados.

### D8 · Pantalla propia de crianza y huevos
**Estado:** Pendiente

Botón nuevo debajo de Tienda que abre una pantalla dedicada a crianza y huevos, en lugar de
repartir eso por otros paneles.

### D9 · Buzón de feedback
**Estado:** Pendiente

Canal dentro del juego para que los jugadores envíen consejos y recomendaciones.

---

## Incidencias abiertas

### ~~Flake intermitente en `tests/vital.test.cjs`~~ · Resuelto · 2026-09-14

**Causa, reproducida:** los ficheros de prueba leían `index.html` con `readFileSync` y extraían el
bloque `game-source` con una expresión regular. Si algo reescribía `index.html` en ese instante
—una pasada de generador, un guardado del editor— la lectura devolvía el fichero a medias, el
`match` daba `null` y `[1]` reventaba en la primera línea con un `TypeError` sin relación. De ahí
el fallo en 42–69 ms y el `'test failed'` sin texto: el error ocurría antes del `try/catch`.

Se reprodujo a voluntad reescribiendo `index.html` con contenido idéntico mientras corría la suite.
No era un fallo del juego, sino de las pruebas.

**Arreglo:** la extracción vivía copiada en cinco sitios; ahora es `gameSource()`/`runtimeHtml()` en
`tests/uiHarness.cjs`, que reintenta la lectura y, si aún así no aparece el bloque, falla diciendo
que el fichero se está reescribiendo y cuántos bytes leyó. Además, `generateCanonicalData.py` y
`buildMobileRuntime.py` escriben ahora mediante fichero temporal y `replace`, así que un lector
nunca puede pillarlos a medias.

**Verificación:** con `index.html` reescribiéndose cinco veces por segundo —mucho más agresivo que
cualquier build o guardado real— la suite pasa 5 de 5; antes bastaba una sola reescritura.

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
