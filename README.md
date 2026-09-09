# Hatch.mon

Tamagotchi Pokémon retro, local y sin backend, cuentas, compilación ni CDN. Abre `index.html` con sus archivos y carpetas al lado. La cámara QR puede requerir localhost/HTTPS y soporte del navegador; pegar el código funciona sin cámara.

## Arquitectura actual

| Archivo | Responsabilidad | Dependencias principales |
|---|---|---|
| `index.html` | UI, incubación, orquestación de partida, evolución y persistencia | Adapter, Vital, renderer, social y QR |
| `vitalSimulation.js` | Balance, cuidados, fisiología, lifespan, LifeStage y requisitos vitales de crianza | `pokemonDataAdapter.js` |
| `pokemonRenderer.js` | Render canvas y fallback retro | Adapter, PmdVisuals, assets locales |
| `pmdRenderer.js` | Resolución de estados y portraits temporales | Adapter, `assets/pmd/manifest.js` |
| `relationship.js` | Vínculo, atención e interacción directa | Estado de partida; sin assets |
| `pokedex.js` | Progreso por forma y selección ponderada | Adapter |
| `trainingActivities.js` | Handlers reemplazables de entrenamiento | Callback al entrenamiento existente |
| `tools/syncPmdAssets.py` | Importación selectiva y créditos PMD | Python + Pillow, Node, GitHub en desarrollo |
| `socialEngine.js` | HM1, validación, historial y compatibilidad offline | Adapter, Vital |
| `pokemonDataAdapter.js` | Consulta canónica, alias de IDs y compatibilidad biológica | Datos v2, repertorio legacy |
| `hatchmonData_v2.js` | Catálogo y reglas canónicas | Ninguna dependencia de runtime |
| `evolutionTable.js` | Repertorio histórico de 44 formas y nombres para resolver IDs | Consumido por adapter y orquestación |

`assets/` contiene huevos, logo y sprites; `vendor/` contiene QR y licencia. `tests/` reúne verificaciones y el inventario de assets. `master/` conserva fuentes archivadas, sin uso en runtime. `AGENTS.md` define el flujo de trabajo para futuras modificaciones.

**Ruta rápida por tarea:** cuidados → Vital y acciones concretas de index; sprites → renderer y assets; evolución → funciones evolutivas de index y consultas del adapter; breeding/QR → social, adapter y UI social de index (Vital solo para requisitos de salud/madurez); datos Pokémon → fuente v2 mediante consultas selectivas del adapter. Abrir únicamente los módulos necesarios.

## Reglas canónicas clave

- `hatchmonData_v2.js` es la única fuente de datos Pokémon y reglas evolutivas/biológicas. Consultar mediante el adapter; no completar datos ausentes por inferencia ni copiar el catálogo.
- `evolutionTable.js` conserva repertorio e IDs históricos; no decide reglas canónicas ni proporciona gráficos al compañero activo.
- LifeStage depende de edad/lifespan; EvolutionStage depende de la especie. Son independientes.
- Un solo compañero vivo activo, o un huevo incubándose. Los huevos guardados son inertes; no existe banco de criaturas vivas.
- Muertos → Memorias, nunca reactivables. Perfiles vivos de QR sirven para crianza, no para almacenar compañeros.
- El Pokémon se representa con assets propios; ante ausencia o fallo, marcador retro, nunca emoji.
- Runtime local sin backend obligatorio. Reglas y balance solo cambian cuando la tarea lo solicita.

## Jugabilidad vigente

La incubación activa dura 0,1 día (2 h 24 min). Cada clic resta 5 minutos y produce una reacción visual discreta y feedback breve en la franja inferior. Los huevos no tienen estadísticas ni edad vital. Las cinco hojas de incubación se mantienen: phase 4 a 4,5 fps y hatch a 5,5 fps, sin loop y con pausa final de 250 ms. Al nacer se ofrece mote; el género usa ratios canónicos.

Los cuidados mantienen decimales. El motor usa la misma simulación por minutos para actividad, ausencia y saltos de tiempo; las siguientes son tasas **base**, antes de dificultad canónica, etapa vital, enfermedad y suciedad:

| Cuidado | Despierto / h | Luz apagada / h |
|---|---:|---:|
| Hambre | −8 | −8 |
| Ánimo | −4 | −3 |
| Energía | −4 | +24 |
| Higiene | −5 | −5 |

La luz apagada bloquea las acciones de actividad. AP máximo 6, recuperación de 1 cada 10 minutos, sin botón de descanso. Alimentar cuesta 1 AP; jugar 2; entrenar 2. Entrenar aporta +5 al atributo, −10 energía, −4 hambre y +3 suciedad. Bayas de atributo aportan +1. Limpiar aporta +55 higiene (máximo 100), +3 Ánimo, elimina todas las deposiciones y resetea suciedad.

Las deposiciones mantienen su aspecto aprobado y un máximo de tres. Sus multiplicadores de desgaste de higiene son 1 / 1,25 / 1,6 / 2. Alcanzar hambre 100 no penaliza. Comidas o bayas adicionales a saciedad añaden una unidad a `recentFeedingLoad`, que disminuye 0,75/h. Riesgo por ingesta extra: 0 / 0 / 15 / 30 / 50%, techo 50%; se usa el nivel entero superior de la carga restante. Una tirada por ingesta, nunca tiradas pasivas de sobrealimentación; los riesgos de varias ingestas se acumulan probabilísticamente.

Pokérus depende de exposición y riesgos de la fisiología, no de una penalización instantánea por una sola deposición. Auxiliar y curar conservan sus reglas. Hambre o higiene agotadas causan debilitamiento; hambre y Ánimo agotadas causan muerte por abandono. También existe muerte natural.

Lifespan mantiene base 4 días, variación inicial ±0,15 días y ajuste por calidad de cuidados con límites 3,5–5 días. C.2 no altera ninguna fórmula ni el balance C.1.

`LifeStage` depende exclusivamente de **edad/lifespan**: CRÍA hasta 20%, JOVEN hasta 45%, MADURO hasta 80%, SENIOR después. `EvolutionStage` se lee de la especie canónica y es independiente: un Pichu puede ser MADURO y un Raichu JOVEN.

## Feedback y gráficos

UI compacta sobre LCD gris/verde: sprites presentados un 30% más grandes, identidad más próxima y AP discretos. Barras verdes (>50), ámbar (21–50) y rojas (≤20), sin efecto sobre las reglas. Iconos propios de cuadrícula 8×8 dibujados con sombras CSS, sin carga de máscaras externas ni emojis. Las fuentes SVG están en `assets/ui/`; los laterales representan mochila, pesas y bocadillo, todos de 24 px. Microanimaciones de comida, juego, limpieza, entrenamiento y enfermedad; se desactivan con movimiento reducido.

La pista de incubación permanece bajo el título del huevo dentro del LCD y cambia únicamente al pasar de fase. El feedback al tocar el huevo y los mensajes cotidianos están en una franja retro fija de 56 px entre LCD y botones, con dos líneas como máximo. Mantiene su espacio vacío; los diálogos narrativos suprimen feedback. La consola mide hasta 480 px de ancho y 684 px de alto (668 px con padding móvil); el bezel ocupa 358 px, el LCD 334 px y los botones 60 px. El viewport de criatura conserva la escala segura PMD por especie sin recortar animaciones. La franja usa texto de 13,5 px. Las hojas del huevo usan una referencia visual de 104 px, antes 130–160 px; mantienen frames y tiempos. Los paneles siguen siendo modales externos.

`assets/pokemon_logo.png` sustituye al texto superior derecho. Caja de 30 px de alto y ancho responsivo 72,5–105 px, `object-fit:contain`, sin deformación.

El renderer usa `assets/pmd/manifest.js` para las **44 formas jugables**: estados corporales y portraits locales. `assets/sprites/` y el mapping anterior permanecen como fallback local de Idle; no se amplía el repertorio. El inventario antiguo `tests/sprite-audit.json` solo describe ese paquete de reserva; la cobertura PMD actual la verifica `tests/pmd.test.cjs`.

La resolución está centralizada en `PMD_STATE_FALLBACKS`: normal→Idle; juego→Walk/Pose/Idle; sueño→Sleep/Idle; despertar tocando→Wake/Pain/Hurt/Idle; encender luz con botón→Idle; comer→Eat validado/Idle con gesto propio; enfermedad→Hurt/Pain/Idle; cansancio→Laying/Sleep/Idle; sobresalto→Cringe/Idle; caricias→Pose/Nod/Rotate/Idle; limpieza→Nod/Pose/Idle; entrenamiento→Hop/Idle (único uso de Hop); muerte→Faint/HitGround/Hurt/Idle antes de la lápida. Si un archivo falla, intenta el siguiente; si todos fallan, usa el marcador retro propio. Gameplay nunca espera a una imagen.

PNG, sheets, bitmap y matrices siguen soportados. La escala principal parte de Idle (objetivo aproximado de 109 px de altura visible) y se ajusta a los cuerpos de los frames representativos, sin incluir el recorrido completo del salto. `frameBounds` separa cuerpo y desplazamiento; offsets internos mantienen centro y baseline y limitan el desplazamiento al borde sin cambiar escala. Animaciones extremas que no caben usan el siguiente fallback. El viewport y la consola siguen fijos. Pokédex y Memorias comparten `collectionSprite`, con Idle estático dimensionado para listas de 80 × 80 px. No hay portraits de reacción en la pantalla principal. Eat se acepta si los bounds de cada frame mantienen dimensiones próximas a Idle (tolerancia del 10 %) y desplazamientos internos de hasta 2 píxeles fuente; si falla o falta el archivo, Idle recibe un gesto de masticar de tres pulsos de 5 px y 3° durante 840 ms, sin escala ni elementos añadidos. Este filtro geométrico necesita revisión visual de las especies. El huevo baja 6 px sin cambiar tamaño; la pista sigue dentro del LCD. La cadencia sigue centralizada en `PMD_TIMING_CONFIG`. Las animaciones se pausan al ocultar la pestaña y respetan movimiento reducido. Los temporizadores visuales no alteran la simulación.

## Importación PMDCollab

La utilidad requiere Python 3 con Pillow y Node disponible en PATH (o `--node /ruta/a/node`). Desde la raíz:

```sh
python3 tools/syncPmdAssets.py --list
python3 tools/syncPmdAssets.py --ids 0172A0,0026L0
python3 tools/syncPmdAssets.py
python3 tools/syncPmdAssets.py --offline
```

Sin IDs sincroniza el repertorio del adapter; no hay una segunda lista de especies. Verifica nombre exacto y subgrupo de tracker, con alias explícitos para Raichu Alola y Toxtricity Amped/Lowkey. Una forma nueva sin correspondencia verificable produce un error, no una suposición. Lee los estados del módulo visual, descarga solo las hojas necesarias y emociones seleccionadas. Guarda `assets/pmd/<PokemonId>/{sprites,portraits,metadata.json}` y genera `manifest.js`; el juego solo lee archivos locales, nunca hace hotlinking.

Los archivos existentes se reutilizan. `--refresh` vuelve a descargarlos; `--offline` reconstruye metadata/manifiesto/créditos usando lo ya disponible. Guarda XML, hashes SHA-256, índices y créditos de origen. No clona el repositorio. `assets/pmd/CREDITS.md` se genera con nombres/contactos del registro y logs de contribuciones de las animaciones incluidas; se conservan los logs completos por especie y `source/LICENSE.md`. PMDCollab publica su política de atribución y uso no comercial en su [repositorio oficial](https://github.com/PMDCollab/SpriteCollab#submission-and-use-policy).

## Ánimo, Vínculo e interacción

Ánimo mantiene la clave interna `felicidad` y exactamente su papel en cuidado, salud, evolución y crianza. Vínculo es independiente: 0–100 puntos locales por individuo, representados como 0–5 corazones pixel-art (un corazón completo cada 20 puntos). No decae; sus constantes están en `RELATIONSHIP_CONFIG`.

Aumenta con comida útil/limpieza necesaria (+0,6), juego/entrenamiento (+1,5), curación (+3), evolución (+5) y toques positivos (+0,25). Cada minuto de cuidados ≥70 y sin enfermedad aporta +0,04. Sobrealimentar o limpiar un hábitat ya limpio no da vínculo por esa acción. A partir de 60 puntos cambia la reacción positiva a Joyous y una respuesta más cercana cuando existen assets.

Tocar al compañero reacciona según sueño, enfermedad, cansancio y atención acumulada. Los tres primeros toques tolerados son positivos (+0,5 Ánimo, máximo 100); la carga baja 0,2 por minuto y tiene techo 12. Tras insistir, pide espacio sin dar vínculo. Despertarlo tocando enciende la luz y provoca sorpresa. Molestarlo o despertarlo puede restar 1 de Ánimo, con un máximo de una penalización por 5 minutos de vida: cien toques no dan cien recompensas ni cien penalizaciones. No cuesta AP. Huevos mantienen su calentamiento; los muertos y diálogos narrativos no admiten caricias.

## Pokédex y apariciones

Pendiente para futuro: badges Visto, Cuidado, Evolucionado y Criado; sin rediseño actual.

Memorias registra individuos muertos, con vínculo final, especie/forma, mote, género, edad y causa. Pokédex registra formas canónicas vistas y cuidadas, con IDs de individuos para no contar repetidamente al mismo; también hay flags de evolucionado, criado y recibido. Se consulta desde Mochila → Pokédex. Acceso: **Mochila → Pokédex y Memorias → MEMORIAS**. Cada recuerdo muestra sprite estático, especie/forma, mote, género, edad final, causa, corazones de Vínculo y fecha. No hay botones de activación ni simulación para estos registros. Ambas persisten entre nuevos comienzos, pero el reset total de testing las borra.

Solo el huevo misterioso usa selección ponderada del pool actual de raíces. Peso = `1 / Rarity × multiplicador`: nunca cuidado **8**, cuidado una vez **1**, cuidado varias veces **0,2**. Cuando todas las formas del pool ya fueron vistas, todos usan multiplicador **1** y solo queda rareza. Todos conservan probabilidad positiva. `ENCOUNTER_CONFIG` centraliza los valores; no hay condicionante adicional de calidad porque no existía en la selección anterior. Los huevos de descendencia conocida no se vuelven a sortear. No se añaden especies como Rattata si no pertenecen al repertorio.

## Entrenamiento preparado para minijuegos

`TrainingActivities.launch()` conserva el entrenamiento inmediato y sus costes/recompensa actuales. Los handlers se pueden reemplazar con `register()`: IQ memoria/patrones, Strength timing/reflejos, Kindness decisión/interacción y Style ritmo/secuencia. Una sesión expone completar/cancelar y solo permite un commit; no hay cuatro minijuegos implementados todavía. El motor de entrenamiento y sus requisitos evolutivos siguen siendo la autoridad.

## Evolución y testing

`MinMood` y `MinBond` son columnas independientes y opcionales (0–100): Ánimo **actual** y Vínculo **acumulado**. Vacío/null/ausente significa sin requisito; si hay ambos, se exigen ambos. El motor rechaza valores fuera de rango. Oak los presenta por separado y Force Evolution prepara ambos mínimos sin reducir valores.

La tabla JSON/JS vigente añade ambos campos vacíos, sin cambiar requisitos de especies. Al regenerarla desde Excel deben conservarse como columnas distintas; los libros históricos de `master/` no se han reescrito. Ejemplos de formato, **no nuevas reglas de especies**: `{ "MinMood": 70, "MinBond": null }` exige Ánimo 70; `{ "MinMood": null, "MinBond": 60 }` exige Vínculo 60. No se han convertido automáticamente los requisitos sostenidos existentes en amistad.

La evolución ordinaria usa solo `evolutionRules` canónico: edad, atributos, acciones, cuidados sostenidos y objetos. No se completan reglas ausentes con la tabla legacy. Las medias de cuidados se muestrean por etapa; las condiciones sostenidas requieren continuidad. Atributos de entrenamiento son valores fijos.

Oak ofrece pistas, +1/+3/+6 horas y reinicio total; `HatchMon.reset()` también reinicia. Los saltos horarios sí simulan fisiología y pueden causar muerte.

**Forzar evolución C.2** permite elegir una ruta canónica. Aumenta edad al mínimo requerido (nunca la reduce), eleva solo atributos necesarios y completa contadores mínimos sin reducir los existentes. Prepara evidencia histórica de cuidados sostenidos exclusivamente para esa llamada de testing: duración y valor mínimo comprobados por `conditionsMet`. La evidencia sostenida no cambia las barras actuales; un requisito explícito MinMood sí eleva Ánimo hasta su mínimo. MinBond eleva Vínculo hasta su mínimo. Ninguno reduce valores ni altera los otros cuidados. El hito registra la evidencia y `testing:true`; no se trata de cuidado real realizado por el jugador.

Después llama a `evolve`, el mismo flujo normal de verificación, transición y animación. El objeto se exime solo en esa llamada: no se añade al inventario ni se consume. No existe un bypass persistente. La siguiente evolución ordinaria vuelve a exigir sus condiciones y objetos reales. Los acumuladores de la nueva etapa se reinician como en la evolución normal; el hito conserva lo preparado.

Se conservan identidad, mote, género, edad acumulada, lifespan, cuidados (excepto el aumento explícito de Ánimo por MinMood), suciedad, deposiciones, enfermedad, fisiología, atributos no requeridos, inventario, AP y flags sociales. No se ejecutan ticks durante la preparación. LifeStage se recalcula al leer edad/lifespan; nunca se asigna directamente.

Ejemplo canónico real: **Magby → Magmar** requiere 24 h, **Style 50** y Ánimo ≥70 durante 6 h. Partiendo de 10 h, Style 8 y cuidados 75/21/61/88, queda en 24 h y Style 50, con evidencia de Ánimo 70 durante 6 h; las barras siguen exactamente 75/21/61/88. Con lifespan de 96 h, 24/96 = 25% → **JOVEN**. No se modifica lifespan. Encadenar evoluciones solo avanza hasta las edades requeridas: las rutas actuales no garantizan alcanzar SENIOR; para avanzar más están los saltos de tiempo, que sí desgastan.

## Un compañero, huevos y Memorias

Existe un único compañero vivo activo, o un único huevo incubándose cuando no hay compañero vivo. Se elimina el banco de criaturas y la función `activateEntity`. No hay pausa, archivo ni reactivación de compañeros vivos.

`social.eggs` solo acepta huevos. Los de crianza y QR se guardan con incubación completa pendiente, edad cero y sin fisiología. No avanzan con el tiempo, no generan cuidados, cacas ni enfermedad. `incubateStoredEgg` rechaza la operación mientras haya compañero vivo. Al cambiar entre huevos, el anterior vuelve a la reserva sin progreso de incubación. Solo el elegido incuba.

Al morir, el compañero se registra inmediatamente y una sola vez en `social.memorials`: identidad, especie histórica y canónica (incluye la forma), mote, género, edad final, lifespan, causa, fecha y snapshot relevante. Memorias no se exporta ni se activa. Nuevo comienzo abre «Elige tu próximo comienzo» si hay huevos guardados: muestra especie conocida y progenitores, y permite elegir uno o un huevo misterioso. Sin huevos guardados comienza directamente con el misterioso. Ambas opciones conservan recuerdos e inventario; solo se retira de la reserva el huevo elegido. El reinicio total de testing sí borra toda la partida.

## Intercambio y breeding offline

El panel Conectar separa cuatro flujos:

- **Compartir compañero:** genera QR del compañero activo; el código alternativo se copia con un botón o se despliega en un campo compacto.
- **Criar:** recibe un perfil remoto y muestra una tarjeta persistente con compatibilidad, motivo si falla, progenitores/géneros, EggGroup, huevo resultante y dispositivo responsable. Crear huevo revalida las condiciones; cambiar el código requiere comprobarlo otra vez.
- **Recibir huevo:** escanea o pega el código de un huevo existente y lo añade a Mis huevos.
- **Compartir huevo:** elige un huevo almacenado y genera su QR/código, sin mezclarlo con perfiles vivos.

La creación ocurre en el dispositivo de quien determina la descendencia: la hembra o, con Ditto, el Pokémon no-Ditto. El otro dispositivo no muestra Crear huevo y el motor también rechaza esa operación. Muestra «La hembra debe generar el huevo en su dispositivo. Comparte tu código con la otra persona.» (adaptado a no-Ditto cuando corresponde). Ditto sigue fuera del repertorio jugable actual; su encaminamiento se prueba directamente con datos canónicos, sin ampliar especies jugables. Las reglas de compatibilidad no cambian.

Se mantiene el sobre **HM1**, QR/manual, checksum de corrupción e historial de IDs. Los códigos de huevos se importan a la reserva. Los códigos de criaturas vivas se usan **solo como perfiles remotos de crianza**: importar como compañero se rechaza y no se almacenan snapshots vivos. La exportación no transfiere propiedad ni elimina al compañero; sin servidor no existe control global de copias o propiedad.

La crianza no cambia: consulta EggGroup, Breedable, Ditto, género y descendencia canónicos; mantiene MADURO, Ánimo, salud y un huevo por criatura en este dispositivo. El resultado es siempre un huevo guardado. Historial de códigos y progenitores impide repetir operaciones localmente; no sincroniza con otros dispositivos.

**Schema de partida 12.** Los saves anteriores se invalidan al abrir D y comienza un huevo nuevo. El sobre HM1 y sus snapshots de crianza no cambian; Vínculo y Pokédex no se añaden al protocolo. No hay migraciones de partidas ni relleno legacy de fisiología en códigos. Se elimina `abuseReadyAt`, que ya era inerte. No se garantiza compatibilidad con códigos antiguos; los perfiles actuales incluyen fisiología para validar breeding.

## Verificación

Desde la raíz con Node:

```sh
node tests/vital.test.cjs
node tests/rebalance.test.cjs
node tests/adjustment.test.cjs
node tests/renderer-feedback.test.cjs
node tests/feedback-anchor.test.cjs
node tests/sprites.audit.cjs
node tests/ui-polish.test.cjs
node tests/social-ux.test.cjs
node tests/emotional.test.cjs
node tests/pmd.test.cjs
node tests/mood-bond.test.cjs
node tests/memories.test.cjs
```

Cubren vínculo, anti-spam, portraits/fallbacks PMD, continuidad de Pokédex, selección ponderada y balance C.1, lifespan, ausencia, crianza, todas las rutas de testing conectadas, preservación fisiológica, inventario, cuidados sostenidos, contadores, modelo de compañero, memorias, huevos inertes, schema, renderer, rutas y duplicados. El test de feedback comprueba ascendencia HTML real, anclaje CSS absoluto y comportamiento DOM en los cinco contextos; no mide píxeles en un navegador real.

Se ha inspeccionado una lámina de los idle de assets de assets, no la aplicación renderizada. **Pendiente de inspección manual en navegador:** estados PMD en móvil, escala/encuadre entre animaciones, posición de portraits/corazones, logo, solapamientos y sensación emocional. La revisión anterior de navegador quedó bloqueada por la política de URLs; las pruebas DOM/canvas no sustituyen esa revisión.

## Nota de Futuro

**Sistema de Eclosión por Pasos (PWA / Mobile):** En futuras actualizaciones, la incubación dependerá de sincronizar pasos reales del podómetro del móvil en lugar de clics estáticos, para convertir Hatch.mon en una experiencia portátil. No está implementado en esta versión.
