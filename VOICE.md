# Voz de Hatch.mon

Se llena una vez y se consulta antes de escribir cualquier texto visible. Zanja las discusiones de
estilo sin que nadie tenga que opinar. Todo texto pasa por `HatchI18n`, en ES y EN; el detector es
`tests/i18n-audit.cjs`.

## 1. Cuatro adjetivos

| Somos | Pero no | Bien | Mal |
|---|---|---|---|
| Cercanos | Empalagosos | «A Pika le vendría bien una limpieza.» | «¡Ay! ¡Tu amiguito está sucio! 🧼» |
| Claros | Secos | «No te quedan acciones. Recuperas una cada 10 minutos.» | «Sin AP.» |
| Observadores | Sentenciosos | «Tanta comida seguida no le ha sentado muy bien.» | «Le has dado demasiada comida.» |
| Serenos | Apáticos | «{name} necesita auxilio» | «Estado: crítico» |

## 2. Decisiones cerradas

- **Tratamiento**: tú, es-ES. Nunca usted, nunca vos.
- **El compañero va en tercera persona y con su nombre** siempre que el juego lo sepa:
  `companionName()` da el mote o, si no tiene, el nombre de la especie. Nunca frases sin sujeto
  («Tiene hambre.»), que en inglés ni siquiera son frases («Is hungry.»).
- **El juego no habla de sí mismo en primera persona**, salvo cuando la responsabilidad es nuestra:
  «Algo ha fallado por nuestra parte» sí; «He guardado tu partida» no.
- **Oak es una voz, no un menú.** Desde el 16-09-2026 no hay panel «Profesor Oak»: su ficha pasó a ser
  la pestaña Compañero de la Pokédex, y la crianza tiene botón propio. Oak sigue siendo quien habla en
  la banda inferior, y `oak.statusLabel` lo dice. No volver a usar su nombre para nombrar pantallas.
- **La banda inferior es el Profesor Oak.** Lleva su retrato y su `aria-label`: todo lo que aparece
  ahí se lee como si lo dijera él, también lo que no va del compañero («Has comprado Baya»).
  Decidido el 15-09-2026: una sola voz, sin segundo canal para los mensajes de sistema.
- **Exclamaciones**: una como mucho, y solo en una celebración real. Si todo grita, nada destaca.
- **Emoji en la interfaz**: no. El juego ya tiene pixel art.
- **Humor**: en los cuidados y las reacciones, sí. En errores, pagos, pérdidas de datos y esperas,
  nunca.

## 3. La banda LCD de Oak

Es el único sitio donde el juego habla seguido, así que es donde antes se nota la incoherencia. Todo
lo que aparece ahí cae en uno de estos cuatro moldes, y ninguno pasa de una línea y media:

| Canal | Qué es | Molde |
|---|---|---|
| Estado (`#health`) | se queda mientras dure la situación | nombra al compañero y apunta a la siguiente acción |
| Aviso (`#health`) | reemplaza al estado y escala por umbral y por tiempo desatendido | el mismo, subiendo la urgencia sin repetir palabras |
| Resultado (`#toast`) | aparece tras una acción tuya | cuenta qué ha pasado, en pasado |
| Bloqueo (`#toast`) | la acción no se ha podido hacer | por qué, y qué hacer para desbloquearla |

Dos textos del mismo momento no pueden decir lo mismo con otras palabras: si el estado ya dice
«{name} necesita un poco de espacio», la reacción al toque cuenta otra cosa («Se ha apartado»).

## 4. Vocabulario canónico

Un concepto, una palabra. La palabra de la derecha no aparece en el catálogo.

| Decimos | Nunca |
|---|---|
| acciones / Actions | AP, puntos de criador, Trainer Actions |
| Mochila / Bag | mochila en minúscula cuando es la pantalla |
| Memorias / Memories | recuerdos (como pantalla; sí como emoción: «su recuerdo permanece») |
| ronda / round | tanda |
| energía / Energy | puntos de energía |
| compañero / companion | mascota, criatura, bicho |
| Vínculo / Bond | cariño, amistad |

## 5. El tono cambia con el momento

- **Celebración**: una exclamación, corta. «¡Perfecto!»
- **Rutina**: enunciado, sin signo. «Hábitat limpio. Se le nota más a gusto.»
- **Error del jugador**: qué ha pasado y qué puede hacer ahora. Ni disculpa ni reproche.
  «Este compañero no tiene un género con el que criar.»
- **Fallo nuestro o riesgo de perder datos**: se pide perdón una vez, se dice qué está a salvo y se
  da la salida. «Tu partida no se ha guardado. Mantén esta pestaña abierta para no perderla.»

## 6. Excepción registrada

Los textos del **momento del huevo** —incubación, toques, eclosión y nacimiento— quedan fuera de
esta revisión por decisión de producto: `eggTitle`, `ui.warmEgg`, `ui.eggHint.1-4`, `ui.eggHatching`,
`ui.hatchTitle`, `ui.hatched`, `ui.birthMessage`, `birth.welcome`, `egg.hatchStart`, `egg.touch.1-5`,
`oak.eggEarly` y `oak.eggLate`. Conservan su tono original.
