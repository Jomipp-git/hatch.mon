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
**Estado:** Hecho · 2026-09-16

Sin dependencias nuevas, como pedía la entrada: un hilo dentro de `serveLocal.py` mira cada 0,4 s la
fecha de los ficheros que el navegador carga —los `*.html`, `*.js` y `*.mjs` de la raíz, más
`vendor/`, `themes.js` y los manifiestos PMD— y sube una marca cuando algo cambia. La página pregunta
por `/__reload` una vez por segundo y se recarga cuando la marca sube.

**Se descartó el sondeo largo**, que era la primera versión y parecía mejor: dejar la petición
aparcada impide que la página llegue nunca a *network idle*, que es lo que esperan Playwright y los
scripts de captura de `tools/design/`. El sondeo corto deja huecos a propósito.

`assets/pmd/` queda fuera de la vigilancia: son 2.600 sprites y mirarles la fecha cada medio segundo
sería trabajo tirado sobre lo que no cambia. El servidor pasa a `ThreadingTCPServer`.

Apagada bajo `--dist`, como avisaba la entrada: solo el árbol de fuentes refleja una edición sin
pasar por `buildMobileRuntime.py`. El bloque del navegador viaja a `dist/` pero está detrás de
`HatchEnvironment.isDevelopmentEnvironment()`, así que en producción no hace ni una petición.

---

## Bloque B · Features de producto

### B1 · Mejoras de shiny
**Estado:** Hecho · 2026-09-16

Las tres partes:

- **Icono junto al nombre de especie.** Un destello de 8×8 en la misma rejilla `--pixels` que el
  resto de iconos, así que hereda `currentColor` y el modo LCD. Importa más de lo que parecía: **en
  modo LCD la forma shiny era indistinguible de la normal**, porque la paleta de cuatro tonos se come
  la diferencia de color. Ahora se anuncia.
- **Cobertura de assets.** Ya estaba: `node tools/projectStatus.cjs` informa de PMD shiny 77/77.
- **Precarga antes de la eclosión.** Cuando el huevo declara especie se calientan sus dos variantes.
  Si salía shiny y el asset no estaba cargado, el primer fotograma del nacimiento aparecía con el
  marcador retro. `preloadNearby` ya llevaba su propio registro, así que solo hacía falta exponerlo.

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
**Estado:** Hecho · 2026-09-16

Renombrar al Pokémon a través del Prof. Oak por **120 monedas**, en la pestaña Compañero de la
Pokédex, que es donde vive su ficha. Sumidero de entrenador y se repite con cada compañero, así que
absorbe ingreso de forma continua.

**No pasa por `nicknamePending`**: esa bandera bloquea toda la interacción mientras está puesta, y
volver a levantarla a media vida dejaría al compañero congelado hasta contestar. Rechaza el mote
vacío y el que ya tiene, así que no cobra por no hacer nada.

### B7 · Familia de crianza en la interfaz de Oak
**Estado:** Hecho · 2026-09-16 (verificado en código; se entregó antes y la entrada se quedó sin marcar)

Mostrar la familia evolutiva del Pokémon en la sección del Prof. Oak. La ficha muestra la línea
completa, no solo el paso inmediato.

### B8 · Regalo e intercambio de huevos
**Estado:** Hecho · 2026-09-16 (verificado en código; se entregó antes y la entrada se quedó sin marcar)

El panel Crianza tiene el flujo «Compartir huevo», separado de los perfiles vivos.

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
**Estado:** En curso · Amabilidad rehecho el 18-09-2026

Revisar los minijuegos en conjunto: dificultad, ritmo, claridad, controles, feedback visual y
sensación de juego. Salida esperada: qué minijuegos necesitan retoques concretos y cuáles.

La auditoría (bloque 4 de `DESIGN_AUDIT.md`) ya respondió la pregunta: Intelecto, Fuerza y Estilo
están afinados; Amabilidad se replanteaba entero, con un pliego de 8 puntos.

**Hecho, 16-09-2026:** afinado del ritmo sobre la rejilla de casillas (rondas deterministas, ventana
proporcional al trabajo, pausa nunca más larga que el juego). Quedó superado por el rediseño.

**Hecho, 18-09-2026: Amabilidad es un minijuego nuevo.** Decisión del autor: la rejilla de toques pasó
a ser una **caída continua con cesto**, en `cleanupCatch.js`. Caen 32 objetos durante 25,7 s —22 latas
y 10 plantas, siempre los mismos— a velocidades distintas, y se recogen las latas arrastrando un cesto
de lado a lado; una planta en el cesto descuenta una lata. Eso cierra los ocho puntos del pliego del
bloque 4 de `DESIGN_AUDIT.md`, incluidos los dos que quedaban abiertos: el eje ya no es la velocidad de
toque sino la puntería en movimiento, y la categoría va por dos canales (tinta llena para las latas,
verde claro para las plantas) en vez de solo la silueta.

Las dos propiedades que hacen que la nota sea habilidad y no sorteo están medidas con
`tools/design/kindness-reach.cjs`: **ningún par de objetos coincide en la banda del cesto**, así que
nunca hay que elegir entre una lata y una planta; y sobre 10.000 partidas con columnas reales **no hay
una sola transición imposible**, con 34 ms de margen en la más ajustada. Duración 25,7 s y 37
monedas/min, frente a las 36 de Fuerza.

**Pendiente:** los otros tres minijuegos. La auditoría los dio por afinados, pero el barrido conjunto
que pide esta entrada no se ha hecho con ellos en mano.

### C8 · Repertorio ampliado, Ditto comprable y piedad de rareza
**Estado:** Hecho · 2026-09-18

Diez líneas nuevas del libro (Treecko, Chikorita, Aron, Vulpix, Ralts, Piplup, Rattata, Caterpie,
Pidgey y Tinkatink) con sus variantes de Alola, más **Mew y Lapras** por la columna `Standalone`:
**112 especies y 40 raíces**, frente a 77 y 26. Hicieron falta dos objetos que las reglas pedían y no
existían —Piedra Alba y Recuerdo Extraño— y sin los cuales el runtime no arrancaba.

**Ditto** sale de la estantería y pasa a la vitrina con los dos huevos; una de cada 50 veces aparece
el **Ditto shiny** (600) en su lugar, y el huevo criado con él nace shiny garantizado. Comprar
cualquiera registra a Ditto en la Pokédex, que es su única vía porque nunca es compañero.

**Piedad de rareza, variante C:** tras 2 comienzos cuya mejor oferta fuera rareza 1–2 la siguiente
reparte 60/35/5 entre 3, 4 y 5; tras 40 sin una rareza 5, se fuerza. Contador una vez por comienzo.
Se descartó la garantía a 10 tiradas: medido, disparaba la rareza 5 del 1,1 % al 9,9 %, y con un solo
legendario eso es el mismo legendario cada dos semanas.

Precios: todas las piedras a 180, los objetos de especie concreta a 200, carcasas 300 y marcos 150.
Y un regalo único de 100 monedas a quien ya estaba jugando, con su aviso.

### C5 · La pantalla de minijuego no debe mover la página
**Estado:** Hecho · 2026-09-18

Jugando a Estilo, un arrastre que se saliera del lienzo desplazaba la página de detrás y se jugaba
peor. Medido a 375×667: el diálogo no se desplaza, pero detrás quedan **144 px de página que sí**; un
`<dialog>` modal no lo impide y en iOS `overflow:hidden` en el body tampoco. Ahora el `<body>` pasa a
`position:fixed` mientras el diálogo está abierto y recupera el desplazamiento al cerrar. Afecta a los
cuatro minijuegos y también a la pantalla de reglas.

### C6 · Los huevos tienen que parecer huevos
**Estado:** Hecho · 2026-09-18

La lista de huevos pintaba el sprite de la **especie**, y el huevo shiny de tienda viaja con
`offspring:null` —no revela especie hasta que eclosiona—, así que caía en el sprite por defecto. Ahora
todos los huevos se pintan como huevos, con la hoja de incubación, y el shiny lleva la misma chispa
que marca al compañero shiny.

### C7 · Elegir entre tres huevos al empezar de nuevo
**Estado:** Hecho · 2026-09-18

Tras una muerte había un único «huevo misterioso» a ciegas, y sin huevos guardados ni siquiera se
preguntaba. Ahora se elige siempre entre **tres huevos, cada uno con el tipo 1 del Pokémon que saldrá**
y sin revelar la especie. Son de tres tipos distintos, porque el tipo es lo único visible y dos iguales
serían dos opciones indistinguibles. El sorteo usa `Pokedex.choose` —el mismo ponderado del huevo
misterioso, así que elegir no cuesta progreso de Pokédex— y cuelga del ID del compañero que acaba de
morir: recargar no rebaraja, y no hace falta tocar el esquema de save 12.

### C3 · Carcasas con más personalidad
**Estado:** Hecho · 2026-09-16 (verificado en código; se entregó antes y la entrada se quedó sin marcar)

`MOTIF_COLORS_BY_DEPTH` en `tools/generateShellThemes.py` implementa el criterio literal: la base va
monocroma y cada evolución suma un color. Las 21 carcasas de boutique (16-09-2026) son un set aparte
de pago, no sustituyen a esto.

Alejar la estética principal del LCD monocromo. Criterio acordado:

- Primeras evoluciones (base): monocromo es suficiente.
- Evoluciones posteriores de la misma línea: 2–3 colores de la paleta del sprite, con patrones
  suaves y geométricos ligados a la estética del Pokémon.
- Siempre sencillo, nunca recargado. El objetivo es que cada carcasa se sienta coleccionable.

### C4 · Curva de Bond más exigente
**Estado:** Hecho · 2026-09-16 (verificado en código; se entregó antes y la entrada se quedó sin marcar)

La capa 1 bajó `goodCarePerMinute` de .04 a .005. Medido con `tools/design/bond-curve.cjs`: los cinco
corazones llegan el día 2,88 cuidando cada 30 min, el 4,00 cada 2 h y el 4,39 cada 4 h. El objetivo
era «alrededor del 3,5».

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

### D16 · Scroll roto en los paneles en iOS
**Estado:** Hecho · 2026-09-16 · confirmado en iPhone real

Al desplazarse dentro de un panel el texto se rompía y aparecía fondo en blanco. El panel hacía
scroll **él mismo** y llevaba encima `filter:url(#lcd-palette)`; en iOS un filtro SVG sobre un
contenedor con scroll se cachea como capa y no se repinta al desplazarse. Encajaba con que solo
ocurriera en la Pokédex, el único panel con ese filtro.

El scroll pasa a `#panel-content`, así que el filtro queda sobre un elemento quieto, y la cabecera
deja de necesitar `sticky` por el mismo motivo. De paso, abrir un menú lo sitúa arriba: el diálogo
conservaba el desplazamiento del panel anterior.

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
**Estado:** Hecho · 2026-09-16 · **confirmado en iPhone real**

**Lo que desbloqueó esto fue descubrir que la nota de arriba era falsa.** Decía que la cuantización
no es idempotente y que por eso no se podía aplicar el filtro dos veces; de ahí salía el bloqueo.
Comprobado numéricamente y después en Chromium y en WebKit con diez colores de prueba: **dos pasadas
devuelven exactamente los mismos píxeles que una**, porque la luminancia de cada uno de los cuatro
tonos cae dentro de su propia banda. La segunda pasada no hace nada.

Antes de eso, la sonda se pasó por el WebKit de Playwright —el mismo motor que Safari— y los cinco
casos salieron filtrados, igual que en Chromium. Eso descartó las hipótesis 1, 2, 4 y 5: el motor
aplica el filtro SVG, el canvas lo hereda del ancestro y una imagen también. Lo que queda es del
compositor de iOS, que el WebKit de escritorio no reproduce.

**Arreglo:** el sprite se cuantiza dentro del canvas cuando el modo LCD está activo
(`quantise()` en `pokemonRenderer.js`, con los cuatro tonos en `POKEMON_RENDER_CONFIG.lcdPalette` y
el mismo cálculo de luminancia y bandas que el filtro SVG). El filtro CSS se queda **exactamente como
estaba**: donde sí llega al canvas se aplica dos veces, que está probado que es inofensivo. Así iOS
obtiene el resultado correcto sin depender del compositor y ninguna otra plataforma cambia.

Confirmado en un iPhone por el autor: el sprite entra en la paleta.

**Y la causa estaba mal documentada.** La nota original decía que la cuantización no es idempotente,
y ese era el bloqueo. Comprobado en Chromium y WebKit con diez colores: dos pasadas devuelven los
mismos píxeles, porque la luminancia de cada tono cae dentro de su propia banda. Conviene recordarlo:
lo que bloqueó esta entrada durante días no fue el fallo, fue una afirmación sin verificar sobre él.

### D6 · Carcasa al obtener el Pokémon, no al madurar
**Estado:** Hecho · 2026-09-14 (`d41f6da`)

Hoy la carcasa se desbloquea al llegar a etapa madura. Debe desbloquearse al conseguir la
especie: al obtenerla si es primera fase, y en cuanto se evolucione en las siguientes.

### D7 · Los muertos por descuido no entran en Memorias
**Estado:** Hecho · 2026-09-14

Memorias debe reservarse para los que llegaron al final de su vida, no para los abandonados.

### D8 · Pantalla propia de crianza y huevos
**Estado:** Hecho · 2026-09-16 (verificado en código; se entregó antes y la entrada se quedó sin marcar)

Crianza tiene su botón propio y su panel, con cuatro flujos, separado de la ficha de Oak.

Botón nuevo debajo de Tienda que abre una pantalla dedicada a crianza y huevos, en lugar de
repartir eso por otros paneles.

### D9 · Buzón de feedback
**Estado:** Aparcado · 2026-09-16 — los jugadores siguen escribiendo por WhatsApp

Al concretarlo apareció una restricción: **un sitio estático no puede enviar correos**. Las vías eran
una tabla en Supabase (sin infraestructura nueva y firmada con el `user_id`, así que se sabe quién
escribe), un `mailto:` (que deja la dirección a la vista de cualquiera) o una Edge Function con un
servicio de email (cuenta y clave nuevas). Se aparca hasta que haga falta.

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
