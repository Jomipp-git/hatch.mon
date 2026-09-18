# Utilidades de diseño

Scripts de medición que salieron de la auditoría de diseño (ver `DESIGN_AUDIT.md`). No participan en
el runtime ni en el build: se ejecutan a mano para responder preguntas de balance con el código real
en vez de por intuición.

Todos cargan el runtime con `tests/uiHarness.cjs`, así que **miden el juego de verdad**, no un modelo
aparte. Se lanzan desde la raíz del repositorio:

```bash
node tools/design/reachability.cjs
```

## Límite del método, que aplica a todos

El harness fija `Math.random` en 0,5, así que **nada probabilístico se ejercita**: las tiradas de
deposición, shiny o enfermedad no ocurren. Y son simulaciones, no telemetría: dicen qué pasa con la
cadencia de cuidado que el script define, no con la de una persona real. Al informar de un número, di
con qué script y con qué cadencia salió.

## Qué mide cada uno

| Script | Pregunta que responde |
|---|---|
| `reachability.cjs` | De los estados que un sistema declara, ¿cuáles puede producir alguna entrada? Aísla cada necesidad neutralizando las demás, para que la prioridad no enmascare un nivel alcanzable. Es el que encontró las severidades muertas del bucle de atención |
| `care-budget.cjs` | Cuántas acciones cuesta «dejarlo todo a 100» al volver, según el tiempo fuera. Descubrió que la factura de mantenimiento crece con la ausencia y el presupuesto no |
| `bond-curve.cjs` | Cuándo cruza el Vínculo los umbrales de 40/60/80/100 puntos en tres cadencias de juego. Sirve para comprobar que los `MinBond` del workbook llegan a tiempo |
| `lifespan-range.cjs` | Rango real de esperanza de vida sobre 4.000 compañeros, y qué compra cada nivel de calidad de cuidados. Encontró que `minDays`/`maxDays` no se alcanzaban |
| `lifespan-payoff.cjs` | Si un empujón de atención vale lo mismo al principio, en medio o al final de la vida |
| `shop-catalog.cjs` | Catálogo, precios y frecuencia de aparición de cada objeto en la rotación diaria |
| `coin-income.cjs` | Monedas por día y tiempo hasta poder comprar cada cosa, por nivel de habilidad. Rota los cuatro atributos: entrenando solo uno, `beginTraining` lo rechaza a 100 y la fuente se cierra sola |
| `evolution-pacing.cjs` | En qué día termina de evolucionar cada línea, y cuánta vida queda después |
| `breeding-gate.cjs` | Probabilidad de poder criar, condición a condición, por las dos vías: QR entre dos jugadores y Ditto en solitario. La ventana de etapa se lee de `LIFE_CONFIG`, no escrita a mano |
| `minigame-duration.cjs` | Duración, pago por minuto y curva de dificultad de los cuatro minijuegos |
| `kindness-reach.cjs` | Si el cesto de Amabilidad llega siempre a tiempo caiga donde caiga, o si el sorteo de columnas decide la nota. Comprueba también que no haya dos objetos en la banda del cesto a la vez |

## Compatibilidad de saves entre versiones

El par más importante antes de un push: comprueba que los saves del build publicado siguen cargando.

```bash
git archive origin/main | tar -x -C /tmp/hatchmon-old
node tools/design/save-generate.cjs /tmp/hatchmon-old   # genera saves con el runtime publicado
node tools/design/save-load.cjs                          # los carga con el runtime actual
```

Cubre cinco estados —huevo, vivo, vivo con aviso pendiente, evolucionado y entrenado, y muerto con
Memorias— y valida, guarda y vuelve a validar cada uno. Ya cazó dos regresiones: un check colocado en
`validSnapshot` que invalidaba todas las Memorias, y un campo del entrenador que no sobrevivía al
cambio de compañero.

## Capturas de pantalla

```bash
python3 tools/serveLocal.py --offline    # en otra terminal
node tools/design/screenshot.cjs
```

El juego no arranca sin sesión de Supabase, así que el script reproduce lo que hace `appBootstrap`
—cargar los `script[data-game-src]` en orden, evaluar `#game-source`, ocultar `auth-gate` y mostrar
`game-root`— y desde ahí monta el estado que quiera y abre el panel con `showPanel()`. Es la página
real con su CSS y sus sprites, no una reconstrucción. Necesita `npx playwright install chromium`.
