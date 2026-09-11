# Hatch.mon

Tamagotchi Pokémon retro como web estática, sin compilación. Se sirve por HTTP/HTTPS; Supabase proporciona acceso y guardado cloud, con SDK por CDN. La cámara QR puede requerir localhost/HTTPS y soporte del navegador; pegar el código funciona sin cámara.

## Arquitectura actual

| Archivo | Responsabilidad | Dependencias principales |
|---|---|---|
| `index.html` | Acceso visual, UI de juego, incubación y orquestación | Bootstrap, adapter, Vital, renderer, social y QR |
| `authService.mjs` | Cliente Supabase, email, Google y recuperación | SDK oficial supabase-js por esm.sh (versión fijada) |
| `cloudSaveService.mjs` | Envelope, caché por usuario, carga y autosave | Cliente Supabase, localStorage |
| `appBootstrap.mjs` | Puerta de sesión/carga, arranque diferido y Cuenta | Auth, cloud save, módulos de juego |
| `i18n.js` | Catálogo único ES/EN, interpolaciones, fallback y actualización de textos | DOM; preferencia local/cloud en servicios existentes |
| `appEnvironment.js` | Detección central de entorno de testing | Hostname |
| `vitalSimulation.js` | Balance, cuidados, fisiología, lifespan, LifeStage y requisitos vitales de crianza | `pokemonDataAdapter.js` |
| `pokemonRenderer.js` | Render canvas, reproducción visual del huevo y fallback retro | Adapter, PmdVisuals, assets locales |
| `pmdRenderer.js` | Resolución de animaciones, cadencia y validación visual de Eat | Adapter, `assets/pmd/manifest.js` |
| `relationship.js` | Vínculo e interacción directa | Estado de partida; sin assets |
| `attentionEngine.js` | Prioridad, persistencia y entrega web de avisos de atención | Estado de partida, personalidad y `vitalSimulation.js` |
| `pokedex.js` | Progreso normal/shiny, roster alcanzable y selección ponderada | Adapter |
| `shellSkins.js` | Desbloqueo y selección de carcasas cosméticas | Vital, adapter, `assets/skins/themes.js` |
| `shiny.js` | Política shiny preparada, activación pendiente de assets | Rareza canónica vía adapter |
| `styleTracing.js` | Recorridos, precisión espacial y Pointer Events de Estilo | Canvas, callback de resultado |
| `trainingActivities.js` | Sesiones y minijuegos de entrenamiento, puntuación y cancelación | DOM, callback de resultado a `train` |
| `tools/syncPmdAssets.py` | Importación selectiva y créditos PMD | Python + Pillow, Node, GitHub en desarrollo |
| `socialEngine.js` | HM1, validación, historial y compatibilidad offline | Adapter, Vital |
| `pokemonDataAdapter.js` | Consulta canónica, alias de IDs y compatibilidad biológica | Datos v2, repertorio legacy |
| `hatchmonData_v2.js` | Catálogo y reglas generados para runtime | Excel master, `tools/generateCanonicalData.py` |
| `evolutionTable.js` | Repertorio histórico de 61 formas y nombres para resolver IDs | Consumido por adapter y orquestación |

`assets/` contiene huevos, logo y sprites; `vendor/` contiene QR y licencia. `tests/` reúne verificaciones y el inventario de assets. `master/` conserva fuentes archivadas, sin uso en runtime. `AGENTS.md` define el flujo de trabajo para futuras modificaciones.

**Ruta rápida por tarea:** cuidados → Vital y acciones concretas de index; sprites → renderer y assets; evolución → funciones evolutivas de index y consultas del adapter; breeding/QR → social, adapter y UI social de index (Vital solo para requisitos de salud/madurez); datos Pokémon → fuente v2 mediante consultas selectivas del adapter. Abrir únicamente los módulos necesarios.

## Reglas estructurales clave

- `master/pokemonTable_HatchMon_Canonical_v2.xlsx` es la fuente maestra; `hatchmonData_v2.js` es su artefacto canónico de runtime para datos Pokémon y reglas evolutivas/biológicas. Consultar mediante el adapter; no completar datos ausentes por inferencia ni copiar el catálogo.
- `evolutionTable.js` conserva repertorio e IDs históricos; no decide reglas canónicas ni proporciona gráficos al compañero activo.
- LifeStage depende de edad/lifespan; EvolutionStage depende de la especie. Son independientes.
- Un solo compañero vivo activo, o un huevo incubándose. Los huevos guardados son inertes; no existe banco de criaturas vivas.
- Muertos → Memorias, nunca reactivables. Perfiles vivos de QR sirven para crianza, no para almacenar compañeros.
- El Pokémon se representa con assets propios; ante ausencia o fallo, marcador retro, nunca emoji.
- No se arranca el juego sin resolver sesión y carga cloud. Caché aislada por `session.user.id`; cloud manda al cargar. Reglas y balance solo cambian cuando la tarea lo solicita.

## Jugabilidad vigente

La incubación activa dura 0,1 día (2 h 24 min). Cada clic resta 5 minutos y produce una reacción visual discreta y feedback breve en la franja inferior. Oak explica que tocarlo puede acelerar la eclosión, aunque esperar sigue siendo válido. Los huevos no tienen estadísticas ni edad vital. Las cinco hojas de incubación se mantienen: phase 4 a 4,5 fps y hatch a 5,5 fps, sin loop y con pausa final de 250 ms. Al nacer se ofrece mote; el género usa ratios canónicos.

Las monedas empiezan en 0 y persisten dentro de la partida. Completar un minijuego concede 2, 4, 7, 11 o 16 monedas según el resultado +1 a +5. SHOP aparece bajo Configuración y ofrece tres objetos distintos por día local; la selección determinista usa la fecha y no cambia al recargar. Bayas cuestan 35, bayas de atributo 75, medicina 70, objetos de evolución de especie 170 y piedras evolutivas 180–190.

Los cuidados mantienen decimales. El motor usa la misma simulación por minutos para actividad, ausencia y saltos de tiempo; las siguientes son tasas **base**, antes de dificultad canónica, etapa vital, enfermedad y suciedad:

| Cuidado | Despierto / h | Luz apagada / h |
|---|---:|---:|
| Hambre | −8 | −8 |
| Ánimo | −4 | −3 |
| Energía | −4 | +24 |
| Higiene | −5 | −5 |

La luz apagada bloquea las acciones de actividad. AP máximo 6, recuperación de 1 cada 10 minutos, sin botón de descanso. Alimentar, jugar, limpiar, curar y entrenar cuestan 1 AP; auxiliar cuesta 1 AP por paso. Luz y objetos evolutivos cuestan 0 AP; bayas y medicina, 1 AP. Completar entrenamiento aporta de +1 a +5 al atributo, −10 energía, −4 hambre y +3 suciedad. Bayas de atributo aportan +5, con máximo 100. Los IDs retirados `alola`, `galar`, `dawn` y `oval` se descartan del inventario al cargar; su historial de consumo se admite para preservar Memorias y saves antiguos. Limpiar aporta +55 higiene (máximo 100), +3 Ánimo, elimina todas las deposiciones y resetea suciedad.

Las deposiciones mantienen su aspecto aprobado y un máximo de tres. Sus multiplicadores de desgaste de higiene son 1 / 1,25 / 1,6 / 2. Alcanzar hambre 100 no penaliza. Comidas o bayas adicionales a saciedad añaden una unidad a `recentFeedingLoad`, que disminuye 0,75/h. Riesgo por ingesta extra: 0 / 0 / 15 / 30 / 50%, techo 50%; se usa el nivel entero superior de la carga restante. Una tirada por ingesta, nunca tiradas pasivas de sobrealimentación; los riesgos de varias ingestas se acumulan probabilísticamente.

Pokérus depende de exposición y riesgos de la fisiología, no de una penalización instantánea por una sola deposición. Auxiliar y curar conservan sus reglas. Hambre o higiene agotadas causan debilitamiento; hambre y Ánimo agotadas causan muerte por abandono. También existe muerte natural.

Lifespan mantiene base 4 días, variación inicial ±0,15 días y ajuste por calidad de cuidados con límites 3,5–5 días. C.2 no altera ninguna fórmula ni el balance C.1.

`LifeStage` depende exclusivamente de **edad/lifespan**: CRÍA hasta 20%, JOVEN hasta 45%, MADURO hasta 80%, SENIOR después. `EvolutionStage` se lee de la especie canónica y es independiente: un Pichu puede ser MADURO y un Raichu JOVEN.

## Feedback y gráficos

UI compacta sobre LCD gris/verde: sprites presentados un 30% más grandes, identidad más próxima y AP discretos. Barras verdes (>50), ámbar (21–50) y rojas (≤20), sin efecto sobre las reglas. Iconos propios de cuadrícula 8×8 dibujados con sombras CSS, sin carga de máscaras externas ni emojis. Las fuentes SVG están en `assets/ui/`; los laterales representan mochila, pesas y bocadillo, todos de 24 px. Microanimaciones de comida, juego, limpieza, entrenamiento y enfermedad; se desactivan con movimiento reducido.

La pista de incubación permanece bajo el título del huevo dentro del LCD y cambia únicamente al pasar de fase. El feedback al tocar el huevo y los mensajes cotidianos están en una franja retro fija de 56 px entre LCD y botones, con dos líneas como máximo. Mantiene su espacio vacío; los diálogos narrativos suprimen feedback. La consola mide hasta 480 px de ancho y 684 px de alto (668 px con padding móvil); el bezel ocupa 358 px, el LCD 334 px y los botones 60 px. El viewport de criatura conserva la escala segura PMD por especie sin recortar animaciones. La franja usa texto de 13,5 px. Las hojas del huevo usan una referencia visual de 104 px, antes 130–160 px; mantienen frames y tiempos. Los paneles siguen siendo modales externos.

`assets/pokemon_logo.png` sustituye al texto superior derecho. Caja de 30 px de alto y ancho responsivo 72,5–105 px, `object-fit:contain`, sin deformación.

El renderer usa `assets/pmd/manifest.js` para 44 formas con estados corporales y portraits locales. Las 17 formas añadidas usan el fallback retro propio hasta disponer de assets PMD; nunca usan emojis. El inventario antiguo `tests/sprite-audit.json` solo describe ese paquete de reserva; la cobertura PMD actual la verifica `tests/pmd.test.cjs`.

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

`TrainingActivities.launch()` coordina sesiones y garantiza una única entrega o cancelación. IQ es memoria, Fuerza timing, Amabilidad identificación y Estilo trazado mediante `styleTracing.js`. Costes y requisitos permanecen en el motor de entrenamiento.

## Rendimiento móvil y build de runtime

Fuerza actualiza su marcador con `requestAnimationFrame` y puntúa el valor que se ha dibujado, tomado en `pointerdown`; no espera al `click`. La zona central visible y perfecta es exactamente 40–60 % del recorrido. Cinco rondas dentro de esa zona producen +5, independientemente de que el dispositivo repinte a 60, 90 o 120 Hz. Los timers visuales se cancelan al cerrar, cancelar u ocultar el minijuego.

Mientras un minijuego está abierto, la fisiología y el guardado siguen usando timestamps, pero se pausan el renderer PMD, el huevo, toasts y repintados de la escena que queda detrás del diálogo. Al cerrarlo se sincroniza y se pinta una sola vez. Estilo conserva todas las muestras coalescidas del puntero, pero limita el canvas a un repintado por frame; Amabilidad mantiene la misma tanda mientras haya un puntero activo.

El renderer PMD cachea cada URL cargada y precarga de forma diferida Idle, Sleep, Hurt, Eat, Hop y reacciones cercanas del compañero activo. El huevo carga su fase actual y la siguiente, no las cinco hojas al iniciar. `tools/buildMobileRuntime.py --optimize` conserva originales en `master/asset-originals/`, aplica PNG sin pérdida a los assets del runtime y genera `dist/` mediante allowlist. No incluye `assets/pmd/source/tracker.json`, metadata de sincronización, herramientas, tests ni el master. El informe reproducible queda en `master/mobile-asset-audit.json`.

Las hojas de huevo se sirven a 832×832 px (208 px por celda, suficiente para el viewport de 104 CSS px a DPR 2) con reescalado nearest-neighbor; logo a 264×104 px. Los PNG PMD, portraits e iconos ya estaban por debajo de su tamaño útil de pantalla y solo se recomprimen sin alterar píxeles. No se cambian saves, escala visual del Pokémon ni la geometría de sus animaciones.

## Evolución y testing

`MinMood` y `MinBond` son columnas independientes y opcionales: Ánimo **actual** (0–100) y Vínculo **acumulado** (MinBond expresado en 0–5 corazones). Vacío/null/ausente significa sin requisito; si hay ambos, se exigen ambos. El motor rechaza valores fuera de rango. Oak los presenta por separado y Force Evolution prepara ambos mínimos sin reducir valores.

`tools/generateCanonicalData.py` exporta las hojas Pokemon y EvolutionRules según sus encabezados y DataDictionary, sin tablas manuales. Ejecutar `python3 tools/generateCanonicalData.py` (requiere openpyxl); `--check` verifica reproducibilidad. Genera `hatchmonData_v2.js` y `master/hatchmonData_v2.json`. La única tabla activa es `master/pokemonTable_HatchMon_Canonical_v2.xlsx`; la versión anterior quedó en `archive/canonical-workbooks/` y no participa en runtime. MinBond vacío se exporta como null; MinMood, ausente en el Excel actual, sigue siendo opcional en el motor. MinBond usa corazones: `Relationship.evaluateMinBond` convierte a puntos con `RELATIONSHIP_CONFIG.perHeart` (20); motor, Oak y Force Evolution comparten esa evaluación. MinBond 2 exige 40 puntos; MinBond 3 exige 60. El master contiene un PokemonId duplicado (`0052L0`) preexistente; se conserva para no alterar datos fuera de esta integración.

La evolución ordinaria usa solo `evolutionRules` canónico: edad, atributos, acciones, cuidados sostenidos y objetos. No se completan reglas ausentes con la tabla legacy. Las medias de cuidados se muestrean por etapa; las condiciones sostenidas requieren continuidad. Atributos de entrenamiento son valores fijos.

Oak muestra los cuidados actuales de `state.care`, igual que Main; las medias de etapa se conservan internamente para evolución. Oak ofrece pistas. Configuración concentra +1/+3/+6 horas, Force Evolution y reinicio total; `HatchMon.reset()` también reinicia. Los saltos horarios sí simulan fisiología y pueden causar muerte.

**Forzar evolución C.2** permite elegir una ruta canónica. Aumenta edad al mínimo requerido (nunca la reduce), eleva solo atributos necesarios y completa contadores mínimos sin reducir los existentes. Prepara evidencia histórica de cuidados sostenidos exclusivamente para esa llamada de testing: duración y valor mínimo comprobados por `conditionsMet`. La evidencia sostenida no cambia las barras actuales; un requisito explícito MinMood sí eleva Ánimo hasta su mínimo. MinBond eleva Vínculo hasta su mínimo convertido a puntos. La recompensa de evolución existente (+5 puntos) se aplica después. Ninguno reduce valores ni altera los otros cuidados. El hito registra la evidencia y `testing:true`; no se trata de cuidado real realizado por el jugador.

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

La crianza no cambia: consulta EggGroup, Breedable, Ditto, género y descendencia canónicos; mantiene MADURO, Ánimo, salud y un huevo por criatura en este dispositivo. El resultado es siempre un huevo guardado. Historial de códigos y progenitores impide repetir operaciones; forma parte del guardado cloud de la cuenta. El intercambio de códigos sigue siendo offline, sin transacciones entre cuentas.

**Schema de partida 12.** Los saves de otras versiones se invalidan y comienza un huevo nuevo. El sobre HM1 y sus snapshots de crianza no cambian; Vínculo y Pokédex no se añaden al protocolo. No hay migraciones de partidas ni relleno legacy de fisiología en códigos. No se garantiza compatibilidad con códigos antiguos; los perfiles actuales incluyen fisiología para validar breeding.

## Verificación

Desde la raíz:

```sh
node --test tests/*.test.cjs
```

Las pruebas cubren simulación, evolución, breeding/QR, persistencia, huevos, interacción, colecciones y render. `node tests/sprites.audit.cjs` verifica por separado el paquete visual legacy. Las pruebas DOM/canvas y CSS no sustituyen la revisión visual en navegador.

## Nota de Futuro

**Sistema de Eclosión por Pasos (PWA / Mobile):** En futuras actualizaciones, la incubación dependerá de sincronizar pasos reales del podómetro del móvil en lugar de clics estáticos, para convertir Hatch.mon en una experiencia portátil. No está implementado en esta versión.

## Configuración visual

Configuración se abre desde el botón superior derecho del LCD. Color/LCD se guarda en `hatch.mon.displayMode`, separado de la partida. `window.setDisplayMode('color' | 'lcd')` cambia inmediatamente la presentación. El filtro SVG cuantiza luminancia en cuatro tonos (`#263b30`, `#52694a`, `#91a477`, `#d5dfbb`) sobre pantalla, banda y mini-sprites, sin modificar assets ni geometría.

## Minijuegos de entrenamiento

Intelecto tiene cinco secuencias de 2 a 6 luces: cada ronda correcta a la primera suma un punto, con +1 mínimo. Mostrar la secuencia no consume los cuatro segundos de respuesta; completar una respuesta inicia la siguiente ronda. Duración aproximada: 12–32 s según respuestas.

Fuerza dispone de cinco rondas de 3 s y puntúa precisión con máxima puntuación dentro de la zona central. Amabilidad presenta diez tandas de tres residuos y tres distractores (30 residuos garantizados), con 1,5 s por tanda. Estilo ofrece cinco trazados progresivos, sin tiempo máximo ni tempo obligatorio. La preparación de 600 ms queda fuera de estos plazos; cada ventana comienza cuando se presenta su contenido.

Para Fuerza y Amabilidad, rendimiento normalizado `s`: +5 al alcanzar 1; en otro caso `1 + floor(4*s)`, limitado a +1–+4. Intelecto otorga directamente el número de rondas correctas, con mínimo +1. No hay bonus por terminar rápido.

El coste habitual se aplica una sola vez al completar (atributos limitados a 100). Cancelar, ocultar la pestaña o salir no concede puntos ni cobra la sesión. Vínculo añade 0,3 por punto obtenido, hasta 1,5. No cambia Ánimo. Force Evolution sigue funcionando sin minijuegos.

## Colecciones y presentación

El criador de la banda inferior ofrece consejos breves según cuidados; no altera estadísticas. Entrenamiento muestra barras y los menús resumen costes y requisitos. Pokédex conserva tabs de especies y Memorias, con variantes NORMAL/SHINY separadas.

`HatchMon.roster()` calcula alcance desde `PokemonData.roots()` por reglas activas del roster runtime. El roster contiene 61 formas, 19 raíces de huevo y 42 por evolución, sin formas desconectadas dentro del repertorio. No equivale a incorporar las 1.100 filas del catálogo canónico. El grafo verifica rutas configuradas, no garantiza cada condición mediante una partida completa.

### Shiny: preparación, sin encuentros activados

`shiny.js` contiene la probabilidad canónica `1/(10*Rarity)`, con activación deshabilitada. El tracker local identifica variantes para 43 formas; Raichu no está verificado. Falta sincronizar PNG shiny, comparar geometría/frameBounds/animaciones con normales y habilitar el selector de assets tras validar cobertura. No se inventan recolores.

`social.active.isShiny` es identidad local opcional (ausente = normal), conservada al evolucionar y copiada a Memorias. El QR base no exporta este campo. `Pokedex.record(..., isShiny)` separa progreso shiny en la entrada; no implica descubrir la variante contraria. El renderer admite `isShiny` y selecciona `PMD_ASSETS[id].shiny` cuando exista, compartiendo escala normal; mientras falten esos assets muestra el normal. No hay tiradas activas ni herencia shiny.

## Carcasas y diagnóstico

Configuración → Carcasa permite elegir Hatch.mon o una edición desbloqueada. Los colores se extraen de Idle con `tools/generateShellThemes.py`; las 44 definiciones deterministas están en `assets/skins/themes.js`. El navegador solo aplica variables CSS, sin crear archivos. Desbloquear requiere estado vivo y LifeStage MADURO; se comprueba durante los pasos de simulación (incluido tiempo offline) y al renderizar. Cada forma se registra una sola vez.

`hatch.mon.shells` guarda desbloqueos y selección fuera de la partida, por lo que sobreviven a evolución, muerte y nuevo comienzo. Oak usa una ficha de diagnóstico, barras de medias y detalles evolutivos plegados. Entrenamiento presenta Novato/Aprendiz/Competente/Experto/Maestro/Máximo junto a barra y valor discreto. No cambia requisitos, fisiología ni recompensas.

## Refinamiento de interacción y colección

Pedir espacio usa Hurt → Cringe → Pain → Idle. Amabilidad conserva los objetos durante una pulsación capturada y separa tandas con 300 ms sin input. Fuerza aumenta la velocidad por ronda, con preparación independiente; Estilo usa arrastre sobre curvas, onda, S, espiral y combinación final; marca progreso y una estela pixel-art. Intelecto conserva sus cinco rondas.

La colección muestra todas las posiciones del roster, incluidas `???`, con filtro de variante secundario y detalle plegable de formas descubiertas. Memorias mantiene tarjetas de individuos. La escala de listas utiliza el área alfa de Idle (`assets/pmd/listMetrics.js`, generado por `tools/generateListMetrics.py`), con masa objetivo y límites de encuadre; el renderer principal no cambia. Se revisó una lámina del trío Togepi/Togetic/Togekiss, no la app en navegador.

Los motivos especiales se centralizan en `assets/skins/motifOverrides.json`: la línea Togepi usa triángulos rojos/azules discretos. Para nuevas carcasas, revisar paleta y añadir un motivo reconocible antes de considerarlas terminadas; una banda genérica de los temas anteriores no sustituye esa revisión.

Estilo puntúa cobertura × precisión espacial, promediada sobre las cinco rondas: ≥90 % +5, ≥75 % +4, ≥60 % +3, ≥40 % +2, resto +1. La desviación se pondera por distancia recorrida, no por frecuencia de eventos ni tiempo. Al soltar puede retomarse el punto marcado; «Terminar recorrido» entrega la cobertura alcanzada y pasa al siguiente. Pointer capture y `touch-action:none` mantienen el gesto sin scroll. Cancelar sigue sin coste/recompensa.

## Acceso y guardado cloud

Ejecutar `python3 -m http.server 8080 --bind 127.0.0.1` en la raíz y abrir http://127.0.0.1:8080. No usar `file://` ni `npm run dev`: no hay package.json. Producción requiere HTTPS y conservar los módulos ES y assets junto a index.

Email usa `signUp`/`signInWithPassword`; si se exige confirmación, se espera el correo antes de iniciar. Google usa `signInWithOAuth`. Recuperación usa `resetPasswordForEmail`, vuelve con `?recovery=1` y permite `updateUser` sin arrancar el juego. La sesión persistida y su renovación las gestiona el SDK. Solo se incluye la publishable key pública; nunca contraseñas ni secretos de proveedores en el save.

`game_saves.game_state` contiene `{game, preferences: {shells, displayMode}}`, con `schema_version=1`; `game` conserva el esquema actual 12 y todos sus sistemas, incluidas identidades shiny, Pokédex, Memorias, huevos y entrenamiento. Se excluye el feedback temporal y se normaliza un nacimiento interrumpido para ofrecer el mote al volver. Las animaciones, DOM y temporizadores no se serializan. Una versión o partida inválida bloquea el arranque y no se reemplaza por un huevo.

El arranque consulta por el ID de la sesión antes de cargar los scripts del juego. Un usuario nuevo comienza con su propio huevo. La caché usa el prefijo `hatch.mon.user.<userId>.`, incluidas carcasas y modo LCD; las claves locales anteriores sin usuario no se importan automáticamente. Cambiar de cuenta detiene y oculta el runtime y recarga el documento.

La normalización completa campos parciales de personalidad, sueño y atención antes de validar, sin cambiar el esquema 12. Si la validación falla, conserva el save original y bloquea el arranque y las escrituras. Antes de cargar cloud se conserva una copia inicial local en `cloud-original-backup` dentro del prefijo del usuario. Una actualización remota debe ser aceptada por el runtime antes de sustituir la caché. La ausencia de fila cloud no elimina un save local del mismo usuario.

`node tests/browser-recovery.cjs` reproduce la regresión contra `8ba2d2e` y comprueba la build `dist/` en Chrome, con sesión y cloud simulados y todas las peticiones interceptadas. Requiere Playwright y Chrome; `PLAYWRIGHT_MODULE` permite indicar el módulo instalado. No accede a saves reales.

La caché se actualiza inmediatamente. Alimentar, jugar, limpiar, entrenamiento completado, cambios de especie/fase, inventario, Pokédex, crianza/huevos, carcasas y configuración solicitan envío cloud inmediato al terminar. Los cambios fisiológicos se agrupan durante 15 segundos; snapshots idénticos no generan peticiones. Las escrituras son seriales y una confirmación anterior no limpia cambios posteriores pendientes. Cerrar sesión, desde Configuración → Cuenta, intenta vaciar el guardado antes de salir; `visibilitychange` y `pagehide` actualizan caché e intentan vaciar la cola.

Cada envelope nuevo incorpora `sync.revision` y un identificador efímero de dispositivo, manteniendo compatibilidad con envelopes existentes que no tienen esos campos. Supabase Realtime escucha una única fila `game_saves` del usuario autenticado: una revisión remota más nueva sustituye la caché y refresca la UI sin reenviarse. Antes de escribir, el dispositivo vuelve a consultar cloud; si ya hay una revisión más nueva, la aplica y descarta su pendiente obsoleto. En un conflicto real gana la revisión más nueva y, a igualdad, `updated_at`. Sin Realtime disponible se activa una reconciliación ligera cada 30 segundos. Un dispositivo offline conserva su caché, pero al reconectar cloud gana si avanzó mientras estaba fuera; la copia local incompatible queda como `cloud-backup`, descargable desde Cuenta.

Testing solo se construye para localhost, 127.0.0.1 o loopback IPv6; reset, saltos y Force Evolution también comprueban el entorno. En producción no se expone `HatchMon`; el motor está encapsulado. Esta limitación evita accesos accidentales, no convierte un juego cliente en un sistema antitrampas. La autorización de datos corresponde a RLS.

**Supabase:** no se han modificado tabla ni políticas. `user_id` debe tener unicidad para el upsert y las políticas SELECT/INSERT/UPDATE deben exigir `auth.uid() = user_id`. Para la actualización inmediata entre dispositivos, habilitar `game_saves` en la publicación `supabase_realtime`; si no está habilitada, la app conserva la reconciliación de 30 segundos. Autorizar las URLs exactas de entrada y recuperación (`http://127.0.0.1:8080/` y `http://127.0.0.1:8080/?recovery=1`, más `/index.html` si se usa esa ruta); añadir el dominio HTTPS al publicar. Mantener Google y correo habilitados. Flujos oficiales: [recuperación](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) y [eventos de sesión](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).

**Validación:** `node --test tests/*.test.cjs` cubre regresión, contrato de Auth simulado, carga previa al juego, aislamiento A/B, envelope, prioridad cloud, Realtime y controles de producción. La pantalla de acceso se revisa en navegador real; estos mocks no verifican RLS, publicación Realtime ni proveedores. Completar manualmente con dos dispositivos de la misma cuenta: una acción importante en cada uno, llegada sin recarga, conflicto de caché y logout; verificar también rechazo de SELECT/UPDATE cruzados bajo sus JWT.

## Internacionalización

`i18n.js` contiene el catálogo ES/EN. Usa `HatchI18n.t(key, params)` en toda presentación y `data-i18n`, `data-i18n-aria`, `data-i18n-title` o `data-i18n-placeholder` para HTML estático. Los textos dinámicos los actualiza su renderer. No se traducen nombres oficiales Pokémon, datos canónicos ni códigos.

`hatch.mon.language` conserva la preferencia local; el envelope cloud usa `preferences.language`. Un valor ausente o distinto de `es`/`en` vuelve a español. No cambia el schema de criatura. El mapa temporal de mensajes permite retraducir feedback visible; no se persiste. Al cargar se descarta únicamente el feedback transitorio antiguo.

`node --test tests/*.test.cjs` comprueba catálogo, persistencia, renders y detección razonable de literales visibles. El detector está en `tests/i18n-audit.cjs`; no sustituye una revisión de código. La auditoría y excepciones están en `I18N_AUDIT.md`. El build vigente es `python3 tools/buildMobileRuntime.py --optimize`: regenera `dist/` desde source, sin compilación npm ni typecheck configurado.
