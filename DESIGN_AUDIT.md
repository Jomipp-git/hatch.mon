# Auditoría de diseño de Hatch.mon

Barrida completa antes de tocar nada. Método: skill `game-design` — lectura estática +
simulación offline con `tests/uiHarness.cjs`. **Ningún cambio de diseño hasta cerrar los seis
bloques**; entonces sale una única propuesta de ajuste integral.

Iniciada 2026-09-15, decisiones cerradas el 2026-09-16. Barrida completa de los bloques 0–6 y plan
aprobado en dos capas. El registro de decisiones está al final; la versión navegable vive en
https://claude.ai/artifact/Nbi5uuxU4WXfHioPw2NPkR

## Decisiones ya cerradas

- **Apuesta A**: añadir sumideros a nivel de entrenador. (B descartada: se sentiría raro para el jugador.)
- Objetos dentro: **huevos comprables** (el shiny mucho más caro, y debe leerse visualmente que lo es),
  **carcasas comprables** en un set aparte de las de logro, **marco/retrato en Memorias**.
- Objetos fuera: reducir tiempos de espera o carga, y avanzar el tiempo. Venden alivio de una
  fricción propia; en un tamagotchi el tiempo es el juego.
- Las carcasas de logro **no** se pagan además. Doble condición: devalúa el logro y no crea deseo.
- `baseDays` no se toca. Los jugadores que piden «más tiempo» y los que dicen «se me hace pesado»
  describen lo mismo: al final no hay nada que hacer.
- El marco de Memorias se compra en la tienda, con un botón desde la ficha de Memorias que la abre
  con el objeto seleccionado. Un solo sitio donde salen monedas.
- Ya en código: escalada del bucle de atención (commit `58a15b1`).

### Reabierto, pendiente de decisión final
- **Vender esperanza de vida.** Aprobado y luego retirado por mí: si la queja es que el tramo final
  está vacío, vender más vida vende más vacío; y si la muerte da pena de verdad, hacerla evitable
  pagando desactiva lo único que ya funciona.

## Feedback de jugadores (25+ personas, vía el autor)

- Saben que cuidar alarga la vida **solo porque él lo ha explicado**. En producto es invisible.
- Ante la muerte dicen las tres cosas: **les sorprende**, **sienten alivio** y **les da pena de verdad**.
- Duración: a algunos les parece corta, a otros el tramo final se les hace pesado y tienen ansia de
  desbloquear uno nuevo.
- «¿Por qué no me deja hacer nada más?» ocurre **después de estar jugando un rato**, no al llegar.
  Rutina real: entran, ven barras bajas, quieren todo a 100, limpian, dan de comer, juegan para subir
  Ánimo, aceptan que la energía baje, y les quedan un par de acciones para entrenar.

---

# Bloque 0 · Economía de acciones y monedas

Flujos: monedas tienen **una** fuente (entrenar) y **un** sumidero (tienda diaria). Verificado:
`state.coins+=` y `state.coins-=` aparecen una vez cada uno en todo el runtime. Las carcasas se
desbloquean por logro, sin coste. La crianza es gratis.

- 🔴 **La fuente supera a la demanda en un orden de magnitud, cada vida, para siempre.** Ingreso por
  vida: 396 (nota 2) / 735 (nota 3) / 1.280 (nota 5). Demanda real: solo 13 de 51 reglas de evolución
  (25 %) exigen objeto, a ~185 monedas → gasto esperado ~46/vida. `coins` **no** está en
  `SNAPSHOT_FIELDS` (sobrevive al compañero) y `training` **sí** (se reinicia): cada compañero nuevo
  recarga la fuente y la demanda sigue plana. **La moneda es del entrenador y todos sus sumideros son
  del compañero.** Esa es la causa raíz.
- 🟠 **Bayas de atributo dominadas.** 75 monedas por +5; entrenar da +1..5 **y paga** 2..16. Además
  comprarla consume margen de atributo, o sea que cierra la fuente antes. Propuestas: (1) que dé
  energía en vez de atributo — recomendada; (2) que sea la única vía con la luz apagada o en descanso;
  (3) quitarlas. Decisión aplazada al final.
- 🟠 **La fuente se cierra sola, antes cuanto mejor juegas.** `beginTraining` rechaza con el atributo
  a 100: el experto tapa los cuatro en 80 sesiones (~día 3 de 4) y se queda sin minijuego ni ingreso.
- 🟡 `COIN_REWARDS[0] = 0` es inalcanzable: `Math.max(1,…)` fija el índice en 1..5.
- ✅ **No tocar:** la curva nota→monedas está bien hecha. Bandas que se estrechan (32/26/20/14/**8 %**)
  con pago acelerado (2/4/7/11/**16**). Clavar un 5 vale 200 monedas por punto de rendimiento; un 1, 6.
- ❌ **Descartado por el autor, con razón:** mi conclusión de que el AP no limita. Mi simulación daba
  una lista acotada de deseos al jugador; los reales tienen demanda ilimitada. Ver bloque 3.

---

# Bloque 1 · Etapas vitales y esperanza de vida

`baseLifespan` = 4 d ± 0,15, determinista por id. La calidad —media acumulada de hambre, Ánimo e
higiene de **cada minuto vivido**— ajusta: por debajo de 65 resta hasta −0,35 d; por encima suma
hasta +0,75 d.

- 🔴 **El último tercio no puede influir en nada.** Medido: impecable toda la vida → calidad 93,3 →
  **+14,5 h**; impecable solo el primer tercio → 75,2 → +5,3 h; **impecable solo el último tercio →
  37,2 → −3,6 h**; nunca cuidar → 39,1 → −3,4 h. Cuidar solo al final es indistinguible de no cuidar.
  La media acumulada está congelada. Y ese tramo es a la vez **más difícil** (SENIOR: hambre ×1,08,
  higiene ×1,10, recuperación ×0,85, riesgo ×1,15), **económicamente muerto** y **sin influencia**.
  Es la causa mecánica del «quiero que se muera ya».
- 🔴 **`minDays 3.5` y `maxDays 5` no se alcanzan nunca.** Sobre 4.000 compañeros, `baseLifespan` va de
  3,850 a 4,150 d. Con el ajuste máximo, el rango alcanzable es 3,50–4,90. El `bound()` no recorta
  jamás: `maxDays` queda a 0,1 d y `minDays` solo en la esquina exacta más desfavorable.
- 🟠 **La influencia del jugador es real pero invisible.** +15 % de vida por cuidar bien, sin indicador
  de esperanza de vida ni de calidad acumulada, y sin un texto que lo diga.
- 🟠 **Premio y castigo asimétricos.** +18 h como máximo frente a −8,4 h, y el abandono mata de hambre
  mucho antes de que la penalización importe: la rama negativa es casi decorativa.
- 🟡 **Dos de las cuatro etapas no hacen nada.** CRÍA y SENIOR tienen identidad mecánica; **JOVEN solo
  se diferencia en juego ×1,10 y MADURO tiene todos los multiplicadores a 1** — 2,4 de 4 días sin
  identidad de etapa.
- 🟠 **La vejez no se anuncia**, y por eso la muerte sorprende. Una muerte que ves venir da pena; una
  que te pilla desprevenido se lee como fallo del juego. Se está perdiendo duelo ya ganado.

---

# Bloque 2 · Evolución

- ✅ **Ninguna regla es inalcanzable por edad.** Las 51 piden entre 1 y 3,5 d sobre una vida típica de
  4,0. La cadena más larga (`dratini → dragonair → dragonite`) cierra a 3,5 d y cabe.
- 🔴 **El 81 % de las líneas termina de evolucionar el día 2, la mitad de la vida.** Reparto de
  `MinAgeDays`: 1,0 d → 10 reglas · **2,0 d → 33** · 2,5 d → 1 · 3,0 d → 3 · 3,5 d → 1. Por líneas, la
  última evolución cae el día 2 en **21 de 26**. Para 4 de cada 5 compañeros, media vida sin ningún hito.
- 🟠 **La cadena más larga cobra el premio justo antes de morir** (88 % de la vida, 0,5 d para
  disfrutarlo) y es frágil: con vida acortada por cuidado pobre el margen baja a 3,6 h, y en la esquina
  peor la regla de 3,5 d **deja de ser alcanzable**. Que cuidar mal te cierre la evolución final es
  defendible; que ocurra sin avisar, no.
- 🟡 **Dos de los siete tipos de condición están muertos.** `conditionsMet` evalúa edad, `minMood`,
  `minBond`, `careMean`, `training`, `sustained` y acción repetida. Uso real: 26 atributo, 17 Vínculo,
  13 objeto, 12 sostenido, 2 acción — y **`minMood` y `careMean`: ninguna**.
- Detalle: el umbral de atributo más alto que exige una evolución es **80**, con tope 100. Los últimos
  20 puntos no sirven para evolucionar, solo producen monedas.

---

# Bloque 3 · Cuidados y acciones

Medido: coste en acciones de «dejarlo todo a 100» al volver, con presupuesto de 6.

```
fuera | barras al volver (H/Hig/Án) | limpiar+comer+jugar | gastadas | quedan
  1 h |  91 / 95 / 96              | 0+1+0               | 1 de 6   | 5
  2 h |  82 / 90 / 92              | 1+1+0               | 2 de 6   | 4
  4 h |  63 / 80 / 84              | 1+2+1               | 4 de 6   | 2
  6 h |  45 / 70 / 76              | 1+3+1               | 5 de 6   | 1
  8 h |  26 / 60 / 68              | 1+3+2               | 6 de 6   | 0
 10 h |   8 / 50 / 60              | 1+4+1               | 6 de 6   | 0
```

- 🔴 **La factura de mantenimiento crece con la ausencia; el presupuesto no.** El AP tope es 6 y se
  llena en 1 h, así que estar más tiempo fuera **no** da más acciones: solo agranda el déficit. A las
  4 h el mantenimiento se come 4 de 6 —exactamente «me quedan un par»— y a partir de 8 h se lo come
  todo y no queda ninguna para entrenar. **El juego cobra lo mismo (1 acción) por la tarea obligatoria
  y por la elección interesante**, así que la parte divertida es la que se queda sin presupuesto.
  Esto es lo que producen las dos frases que le llegan al autor.
- 🟠 **Restaurar el hambre genera deuda de higiene.** Cada `alimentar` da +25 hambre y **+6 suciedad**;
  las 3–4 comidas de una vuelta de 8 h añaden 18–24 de suciedad, que vuelve a pedir limpieza.
- 🟠 **La meta natural del jugador choca con un castigo oculto.** Querer todo a 100 empuja a comidas
  seguidas, y `DIGESTION_CONFIG.abuseRisks` penaliza la carga acumulada (15 % a carga 3, 30 % a 4,
  50 % a 5). En las vueltas medidas la carga no llegó a 3 porque decae 0,75/h, pero el incentivo
  apunta ahí.
- 🟠 **Con la luz apagada no se puede alimentar, limpiar ni jugar** — solo curar y auxiliar
  (`allowed()`). Quien vuelve mientras el compañero duerme no puede hacer nada salvo encender la luz
  y despertarlo. Sin medir todavía cuántas vueltas caen en ese caso.
- ✅ La energía es el único recurso que los jugadores aceptan ver bajo, y es además el limitador real
  del entrenamiento (−8 por sesión, +2/h despierto, +24/h durmiendo).

---

# Bloque 4 · Entrenamiento y minijuegos

Los cuatro cuestan **exactamente lo mismo** (1 acción, −8 energía, −4 hambre, +3 suciedad, cobrado al
abrir) y pagan **exactamente lo mismo** (+1..5 de atributo y 2/4/7/11/16 monedas). Lo que no es igual
es lo que tardan.

```
              duración       pago por minuto a +5      curva de dificultad
Intelecto      43,5 s        22 monedas/min            secuencia 2 -> 6 luces (+200% de carga)
Fuerza         26,5 s        36 monedas/min            núcleo 67 ms -> 35 ms (-48%)
Amabilidad     22,0 s        44 monedas/min            ventana 1,80 s -> 1,08 s (-40%)
Estilo         sin tope      lo que el jugador decida  tolerancia 18 px -> 10 px (-44%)
```

- 🔴 **Mismo coste y mismo premio, el doble de tiempo.** Amabilidad paga **44 monedas/min** e Intelecto
  **22**: exactamente el doble por el mismo gasto de recursos. El modelo de coste ignora el tiempo, así
  que los cuatro minijuegos no son cuatro opciones equivalentes. Para quien solo quiera monedas,
  Amabilidad domina.
- 🟠 **Intelecto puntúa con otra regla que los demás.** Fuerza, Amabilidad y Estilo normalizan el
  rendimiento a `s` y lo pasan por `GRADE_THRESHOLDS [.92,.78,.58,.32]`, con crédito parcial en todo.
  Intelecto **no pasa por la curva**: `gain = rondas acertadas a la primera, mínimo 1`. Es una
  conjunción por ronda sin crédito parcial — un fallo en la ronda 1 te deja en 4 hagas lo que hagas
  después. Misma escala nominal, dureza distinta, y el jugador no tiene forma de saberlo.
- 🟠 **En Intelecto, 0 aciertos y 1 acierto pagan lo mismo** (nota 1, 2 monedas) por el `Math.max(1,…)`.
  Distinción muerta.
- 🟡 **Estilo es el único sin tope de tiempo**, así que es el único donde el jugador controla el coste
  temporal de la sesión.
- ✅ **Bien hecho:** el scorer de Estilo pondera el error **por distancia recorrida**, no por tiempo
  (`travel += weight` con weight ≈ 2 px por muestra), así que trazar despacio no diluye el error. Neutraliza
  el exploit obvio de un minijuego sin reloj.
- ✅ **Bien hecho:** las tres curvas temporales estrechan de forma parecida (−40 % a −48 %), lo que hace
  comparable la progresión. Intelecto es la excepción: +200 % de carga de memoria es una curva mucho
  más agresiva que el resto.
- Enlace con la economía: cada minijuego es un pozo finito (atributo tope 100) y la evolución solo
  necesita **80**. Los últimos 20 puntos de cada atributo son solo monedas.

### Dato real del autor
Amabilidad se percibe como el más difícil, **y él ya sospecha que es por falta de afinado**. Fuerza,
Estilo e Intelecto son consistentes entre sí, con dificultad percibida y puntuaciones similares, y
puede que Intelecto sea el de notas más altas.

Eso **invierte el impacto práctico del hallazgo rojo**: Amabilidad paga el doble por minuto pero es el
peor afinado, e Intelecto paga la mitad pero da las notas más altas. Los dos desequilibrios se están
cancelando por accidente. El desequilibrio es **latente, no activo** — y eso es una trampa: el día que
se afine Amabilidad pasará a ser a la vez el que mejor paga por minuto y el más justo, o sea
dominante. **Afinar Amabilidad sin revisar su pago por minuto crea el problema que hoy está tapado.**

## 🔴 Por qué Amabilidad no está afinado

`count = 2 + floor(random()*3)` → 2, 3 o 4 basuras por ronda, sorteadas uniformemente. **La ventana de
respuesta no depende de cuántas basuras haya**: es `1800 − 120·ronda` siempre.

```
ronda │ ventana │ 2 basuras   │ 3 basuras   │ 4 basuras
  0   │ 1800 ms │ 900 ms/toque│ 600 ms/toque│ 450 ms/toque
  3   │ 1440 ms │ 720         │ 480         │ 360
  6   │ 1080 ms │ 540         │ 360         │ 270
```

El presupuesto por toque va de **900 ms a 270 ms: un factor 3x.** La curva de dificultad diseñada
cubre −40 %. **El azar mueve la dificultad más que la curva**, y lo hace después de cobrar la sesión.

Reparto de notas para una habilidad fija (modelo: R = ms en reconocer y tocar una basura; 10.000
sesiones cada uno):

```
R=300 ms  ->  nota 5 el 100%                          16,0 monedas esperadas
R=350 ms  ->  4: 23%  5: 77%                          14,9
R=400 ms  ->  3: 1%   4: 73%  5: 27%                  12,3
R=500 ms  ->  3: 62%  4: 36%  5: 2%                    8,6
R=600 ms  ->  2: 8%   3: 89%  4: 3%                    6,9
```

Dos defectos distintos: (1) **un acantilado, no una curva** — entre 300 y 600 ms de reflejos, que es
el rango normal de una persona, se recorre la escala entera de notas; y (2) **las rondas tardías con 4
basuras son materialmente imposibles** para un jugador normal (270 ms por toque), y llegan al azar.
Por eso se percibe como injusto sin poder decir por qué.

Es además el único de los cuatro con azar de salida sobre la dificultad: Fuerza, Intelecto y Estilo
tienen la dificultad por ronda fijada por la ronda.

### Aclaración del autor: Amabilidad se replantea entero

«No está afinado» significa que **no lo ha revisado a fondo**, no que haya un bug concreto localizado.
Intelecto y Fuerza sí están revisados; Estilo funcionó bien desde el principio y solo le quedan detalles.
**Amabilidad lo va a replantear completo.**

Así que esta medición no es un parche, es el **pliego de condiciones del minijuego nuevo**. Y los otros
tres sirven de plantilla de lo que en este proyecto significa «afinado»:

| | Eje que pone a prueba | Dificultad por ronda | Crédito |
|---|---|---|---|
| Intelecto | memoria | determinista (2,3,4,5,6 luces) | por ronda, sin parcial |
| Fuerza | precisión temporal | determinista (67→35 ms) | parcial continuo |
| Estilo | precisión espacial | determinista (18→10 px) | parcial continuo |
| Amabilidad | ¿velocidad de toque? | **sorteada** (900→270 ms/toque) | parcial continuo |

### Los cuatro síntomas que reporta el autor, medidos

«Demasiado rápido, demasiado difícil, no distingue basura de no-basura (iconos poco intuitivos),
los tiempos entre ronda son frenéticos, dentro de la ronda no da tiempo a parpadear.» Cada uno tiene
su medida:

**1. Percepción.** Los cinco objetos son siluetas de 38×44 px recortadas con `clip-path`, **todas
pintadas con `background: currentColor`** — el mismo color plano — y **sin rótulo** («era una prueba de
lectura, no de reconocimiento»). El jugador tiene que discriminar cinco siluetas monocromas del mismo
color en ~450 ms. Hay una lógica visual latente (papel/lata/botella son angulares; flor/hoja son
orgánicas) pero está cifrada en la forma y en un solo canal.

**2. Ritmo invertido.** La pausa entre rondas es fija: `verdictDelay 700 + prepare 1000 = 1700 ms`.
La ventana de juego arranca en 1800 ms y baja a 1080.

```
ronda 0: juego 1800 ms  vs  pausa 1700 ms   -> juego
ronda 1: juego 1680 ms  vs  pausa 1700 ms   -> PAUSA
...
ronda 6: juego 1080 ms  vs  pausa 1700 ms   -> PAUSA
```

**Desde la segunda ronda, la espera es más larga que el juego**, y la diferencia crece. El patrón real
es: esperar 1,7 s, pánico 1,4 s, esperar 1,7 s, pánico 1,3 s. Eso es lo que se siente como frenético —
no la velocidad media, sino la alternancia.

**3. Cadencia.** Intelecto 8,7 s por ronda · Fuerza 5,3 s · **Amabilidad 3,1 s**. Cicla 2,8× más rápido
que Intelecto, y además es el que **más rondas tiene** (7 frente a 5).

**4. Ventana.** Ya medido arriba: 900→270 ms por basura, sorteado.

### La tensión de fondo

**A 450 ms por objeto no se puede tener discriminación y velocidad a la vez.** Hay que elegir:

- **(A) Discriminación instantánea** (color distinto por categoría, siluetas claras) y el reto pasa a ser
  la velocidad. Pero la velocidad es el eje de Fuerza, así que quedaría un Fuerza peor.
- **(B) La discriminación ES el reto**, y se quita la presión de reflejos: ventanas generosas, menos
  rondas, y la curva sube **la ambigüedad del juicio**, no la velocidad.

**(B) es la coherente, y es lo que piden los cuatro síntomas a la vez.** El juego quiere ser de criterio
y se está ejecutando como uno de reflejos. Además arregla de rebote el pago por minuto: ventanas más
largas = sesión más larga = 44 monedas/min bajan solas hacia las de Fuerza y Estilo.

**Pliego para el Amabilidad nuevo:**

1. **La dificultad de cada ronda la decide la ronda, no el azar.** El azar puede decidir qué aparece y
   dónde; nunca cuánto cuesta. Azar de entrada, no de salida.
2. **Una sola curva, en la misma familia que las otras:** entre −40 % y −48 % de la primera ronda a la
   última. No apiles dos ejes a la vez.
3. **Crédito parcial continuo**, como Fuerza y Estilo. El todo-o-nada de Intelecto solo funciona allí
   porque la tarea en sí es fácil.
4. **Duración objetivo 22–27 s**, para que el pago por minuto caiga cerca de Fuerza y Estilo en vez del
   doble. Si el juego nuevo dura 22 s y se afina bien, pasa a ser dominante.
5. **El eje es el criterio, no la velocidad de toque.** Fuerza ya es el juego de precisión temporal.
   Los cuatro deben medir cuatro cosas: memoria, tiempo, espacio y **criterio**.
6. **Bajar a 5 rondas** y subir la ventana, para que la cadencia se acerque a los 5,3 s de Fuerza en vez
   de 3,1 s.
7. **La pausa nunca más larga que el juego.** Si la ventana baja de 1700 ms, hay que recortar
   `verdictDelay`/`prepare` en ese minijuego o subir la ventana.
8. **Dos canales visuales para la categoría, no uno.** Hoy solo cambia la silueta y el color es el mismo
   para todos. Con la ambigüedad puesta en el juicio (¿es basura este objeto?) y no en la percepción
   (¿qué objeto es este?), la curva puede subir sin volverse injusta.

*Límite del método:* el modelo R es una simplificación (tiempo por toque constante, sin aprendizaje).
La forma del hallazgo —la ventana no escala con la cantidad— es sólida; los porcentajes exactos
dependen del modelo.

---

# Bloque 5 · Crianza, QR y Pokédex

**Dato del autor: ningún jugador ha criado nunca**, aunque lo han intentado. Nunca coincidieron
compatibilidad y madurez. La mayoría juega en solitario.

## 🔴 La puerta de crianza es aritméticamente inalcanzable

Para dos jugadores al azar en un momento al azar:

```
especies elegibles y compatibles ......... 9,1 %
ambos en MADURO a la vez ................. 12,2 %   (ventana 45–80 % = 35 % de la vida)
al menos uno hembra ...................... 75 %
producto ................................. 0,84 %  = 1 de cada 119
```

Y eso es **antes** de exigir, a los dos a la vez: Ánimo ≥ 70, cuidados ≥ 40, ≤1 deposición,
suciedad ≤ 50, luz encendida, sin enfermedad, sin mote pendiente, sin objeto encontrado, ninguno que
haya criado ya (`oncePerLife`) — más las dos personas juntas para escanear el QR.

Con 25 jugadores y la mayoría en solitario, cero crianzas **no es mala suerte: es la cuenta**.

### El filtro que más aprieta es la especie

- **19 de 77 formas tienen `Breedable: false`** y no pueden criar en absoluto.
- Las 58 elegibles se reparten en 10 grupos huevo, y **5 de esos grupos tienen 3 miembros o menos**:
  Monster 1, Water 3 1, Mineral 1, Amorphous 2, Water 1 3. Un compañero que caiga en Monster solo puede
  criar con otro de su misma especie exacta.
- Reparto: Human-Like 15 · Fairy 13 · Field 11 · Dragon 6 · Grass 5 · Water 1 3 · Amorphous 2 ·
  Monster/Water 3/Mineral 1 cada uno.

Detalle del bloque 3 que se cruza aquí: al volver tras 8 h, el Ánimo está en **68** — justo por debajo
del 70 que exige la puerta. Quien vuelve, escanea y lo intenta, falla por dos puntos y sin saber por qué.

## 🔴 Consecuencia: la herencia NO puede colgar de la crianza

Es la corrección más importante de toda la barrida. La herencia se propuso como arreglo del tramo final
muerto, colgada de la crianza. **Con la crianza en el 0,84 %, eso sería construir el arreglo sobre un
bucle que nadie recorre.**

El bucle meta real es otro y ya existe: **`startNewBeginning()`**, el «Empezar con huevo misterioso».
Por ahí pasa **todo** jugador, **cada vez** que se le muere un compañero, con o sin amigos. Y ya arrastra
estado entre compañeros de forma explícita:

```js
next.social = {...state.social, active: next.social.active};
next.inventory = state.inventory;  next.coins = state.coins;
next.trainer = state.trainer;      next.attentionSettings = state.attentionSettings;
next.pokedex = state.pokedex;
```

(Esto confirma además, leído y no supuesto, que **las monedas sí cruzan de compañero a compañero**:
el hallazgo del bloque 0 se sostiene.)

**La herencia debe colgar de ahí**, no de la crianza. Así el último tercio de vida se llena para el
100 % de los jugadores y no para el 0,84 %.

## 🟠 Un subsistema completo con 0 % de uso

`bredIds`, `hasProducedEgg`, `oncePerLife`, el generador de descendencia, la validación de
compatibilidad con sus mensajes, la UI de crianza y el QR de crianza están construidos y **ningún
jugador real los ha ejercitado nunca**. No es código muerto —funciona— pero hoy sirve al 0 % de las
sesiones.

## Si se quiere salvar la crianza, las palancas por orden de impacto

1. **Compatibilidad de especie (9,1 %)** — es el filtro dominante. El objeto que amplía la
   compatibilidad más allá del grupo huevo, que ya estaba en la lista de sumideros, pasa de idea bonita
   a pieza necesaria.
2. **Ambos en MADURO (12,2 %)** — abrir la ventana a JOVEN+MADURO la subiría del 35 % al 55 % de la
   vida, y la conjunción del 12,2 % al 30 %.
3. **Ánimo ≥ 70 en los dos** — está calibrado justo por encima de lo que deja una ausencia normal de
   8 h (68). O se baja, o se avisa.
4. **`oncePerLife`** — el objeto que lo levanta, también ya en la lista.

Pero ninguna de las cuatro convierte la crianza en un bucle habitual para quien juega solo, y **la
mayoría juega solo**. La crianza debería ser el bucle social opcional; **la continuidad y la herencia
tienen que vivir en el huevo misterioso.**

---

# Bloque 6 · Vínculo y Ánimo

**Dato del autor:** los jugadores hablan del Vínculo, saben que existe, lo miran, lo persiguen y les
gusta. Dicen que es **demasiado fácil**: sobre el día 2 ya tienen 5 corazones, lo que hace más aburrido
todavía el tramo final.

## 🔴 Se llena antes de lo que ellos creen: día 1,15

Medido con partidas completas:

```
cuidado cada 30 min  ->  5 corazones el día 1,15   (muerte día 4,46: 3,31 d inerte)
cuidado cada 2 h     ->  5 corazones el día 1,29   (muerte día 4,65: 3,36 d inerte)
```

Y el ritmo de juego **casi no importa**: cuidar cada media hora en vez de cada dos horas adelanta el
llenado 0,14 días. El esfuerzo del jugador no diferencia nada.

`RELATIONSHIP_CONFIG`: max 100, 20 por corazón, **sin decaimiento**. Fuentes: +0,6 comida útil o
limpieza necesaria, +1,5 juego o entrenamiento, +3 curación, +5 evolución, +0,25 toque, y **+0,04 por
minuto** de cuidados ≥70 sin enfermedad — eso solo son +2,4/h, +57,6/día.

**El Vínculo está lleno durante el 74 % de la vida del compañero.** Es la barra que más les gusta y la
que antes se apaga.

## 🔴 Y como condición de evolución no filtra absolutamente nada

17 de las 51 reglas exigen Vínculo. Los umbrales son **2, 3 y 5 puntos** sobre 100 — es decir, entre
0,1 y 0,3 corazones. El primer corazón llega el **día 0,25**.

- 10 de las 17 reglas tienen una edad mínima posterior al llenado completo: la condición ya está
  cumplida cuando la edad llega.
- Las 7 restantes piden Vínculo ≥ 2 con edad mínima de 1 día, y a esa altura el Vínculo ya pasa de 20.

**Es la tercera puerta muerta de la barrida**, después de las severidades inalcanzables del bucle de
atención y de `minMood`/`careMean`. Una condición sobre un tercio de las evoluciones que no condiciona nada.

## Umbrales de atributo, para contraste

```
atributo >= 30  ->  2 reglas
atributo >= 40  ->  3
atributo >= 50  ->  8
atributo >= 70  -> 13
atributo >= 80  ->  4
```

El tope es 100, así que hay **20 puntos por encima del requisito más duro** que no sirven para
evolucionar: solo producen monedas. Confirma el hallazgo del bloque 4.

## La oportunidad

El Vínculo es lo que más les gusta, es trivial de conseguir, **no tiene decaimiento y no tiene ningún
sumidero**. Es el mejor candidato para llenar el tramo final: si los umbrales significaran algo y el
Vínculo siguiera teniendo recorrido más allá del día 1, el último tercio tendría por fin algo que
perseguir. Y encaja con la herencia colgada del huevo misterioso: **lo que se hereda podría depender
del Vínculo alcanzado**, que es justo la barra que ya persiguen.

---

# La convergencia (hallazgo principal hasta ahora)

Tres sistemas independientes se apagan casi en el mismo punto de la vida:

| Sistema | Deja de tener efecto | Vida que queda inerte |
|---|---|---|
| **Vínculo** | **día 1,15** | **3,3 d — el 74 %** |
| Evolución | día 2,0 en el 81 % de las líneas | 2,0 d |
| Economía (entrenar y ganar) | ~día 3, y antes cuanto mejor juegas | 1,0 d |
| Esperanza de vida (media de calidad) | ~día 3, congelada por acumulación | 1,0 d |

**Cuatro** sistemas, no tres. Y el que más les gusta es el primero en apagarse.

El tramo final no está roto por un sistema: **está roto porque los tres terminan a la vez y no hay
nada después.** El arreglo no es subir números, es que **algo empiece donde esos tres acaban**.
Candidata principal: **herencia** — que el último tercio sea preparación de lo que pasa al siguiente
compañero. Responde además a los que se quejan de perder el progreso.

## Ideas de sumidero pendientes de desarrollar

Crianza hoy: `oncePerLife: true`, exige MADURO, Ánimo ≥ 70, cuidados ≥ 40, ≤1 deposición, suciedad
≤ 50. Especie por grupo huevo. **No se hereda nada.** Sumideros posibles, de más barato a más
ambicioso: (1) objeto que levanta `oncePerLife`; (2) objeto que sesga la especie de la cría;
(3) objeto que amplía la compatibilidad más allá del grupo huevo; (4) objeto que sube la probabilidad
shiny de la eclosión; (5) **herencia** de atributos o personalidad. La 5 es la única que hace que este
compañero mejore al siguiente. Recomendadas para ya: 1 y 4.

## Barrida cerrada

Los seis bloques están auditados. El siguiente entregable es la **propuesta de ajuste integral**.

---
---

# PROPUESTA DE AJUSTE INTEGRAL

Dos capas que se deciden por separado. **La capa 1 es requisito de la capa 2**: la herencia solo
significa algo si antes existe algo que el jugador pueda mover en el último tercio de vida.

Principio único que ordena todo: **el juego mide cuatro cosas y las cuatro terminan antes de la mitad
de la vida.** La capa 1 estira lo que ya existe hacia el final. La capa 2 pone algo nuevo donde hoy no
hay nada.

---

## CAPA 1 · Ajuste — sin mecánicas nuevas

### 1.1 Vínculo: quitarle el piloto automático y darle recorrido  ⭐ *la de mayor impacto*

**Problema:** 5 corazones el día 1,15 de una vida de 4,5. Inerte el 74 % de la vida. El ritmo de juego
casi no influye (0,14 d entre cuidar cada 30 min y cada 2 h). Y como condición de evolución no filtra
nada: los umbrales son 2, 3 y 5 puntos sobre 100.

**Cambio:**
- Recortar drásticamente el goteo pasivo `goodCarePerMinute: 0.04` (hoy +57,6/día, llena la barra solo).
  El Vínculo debe venir de **acciones**, no del reloj.
- Recalibrar para que los 5 corazones lleguen sobre el **día 3–3,5**, no el 1,15.
- Subir los `minBond` de las evoluciones de 2/3/5 a valores que filtren de verdad (orden de 40/60/80,
  es decir 2/3/4 corazones).

**Por qué primero:** es la barra que más les gusta, es la que antes se apaga, y es la única palanca que
toca a la vez el tramo final, la progresión y un tercio de las evoluciones. Y es la base de la herencia.

**Riesgo:** endurece la progresión para los jugadores actuales. Hay que vigilar que las 7 evoluciones
de bebé con edad mínima de 1 día sigan siendo alcanzables.

### 1.2 Calidad de cuidados: ventana reciente en vez de media de toda la vida

**Problema:** `qualitySum / qualityMinutes` es una media acumulada. Cuidar impecablemente **solo el
último tercio** da −3,6 h, prácticamente lo mismo que no cuidar nunca (−3,4 h). El jugador que vuelve
al final no puede cambiar nada.

**Cambio:** decaimiento exponencial sobre la media, o ventana móvil de las últimas ~12 h. Reutiliza los
campos que ya existen en `vital`, así que **no toca el esquema 12**.

**Efecto:** cuidar al final vuelve a importar. Es la condición para que el último tercio tenga sentido.

### 1.3 Evolución: repartir el segundo pulso

**Problema:** 33 de 51 reglas están exactamente en `MinAgeDays: 2.0`. El 81 % de las líneas termina de
evolucionar en la mitad de la vida.

**Cambio:** repartir ese pulso entre 2,0 y 3,2 días. Es **dato del workbook**, no código: se regenera
con `syncCanonical.py`. Mantener el último hito ≤3,2 d (80 % de la vida) para que no caiga en SENIOR.

### 1.4 Acciones: que la tarea obligatoria no se coma el presupuesto de la elección

**Problema:** el mantenimiento cuesta lo mismo que el juego (1 acción cada uno). A las 4 h de ausencia
se lleva 4 de 6; a las 8 h, las 6. La queja «¿por qué no me deja hacer nada más?» es literal: han
gastado seis acciones y no han jugado a nada.

**Cambio recomendado:** **alimentar y limpiar a 0 acciones**; entrenar, jugar, curar y auxiliar siguen
costando 1. El límite sigue existiendo —que es lo que tú quieres— pero recae sobre la elección
interesante en vez de sobre la casilla obligatoria.

Se autolimitan solos: `usefulCare` ya impide alimentar a 100 de hambre, y la carga de digestión
(`abuseRisks`) sigue castigando el atracón. **Descartadas:** subir el tope de 6 (no arregla la
proporción) y acumular acciones offline (premia la ausencia).

### 1.5 Matar las declaraciones muertas

| Qué | Estado | Acción |
|---|---|---|
| `minDays 3.5` / `maxDays 5` | el `bound()` no recorta nunca (rango real 3,50–4,90) | poner las constantes reales, o ampliar `variationDays` para que muerdan |
| `minMood` y `careMean` | evaluados en `conditionsMet`, ninguna regla los usa | usarlos o quitarlos |
| `COIN_REWARDS[0] = 0` | índice inalcanzable por `Math.max(1,…)` | quitar la entrada |
| JOVEN y MADURO | sin identidad mecánica (todos los multiplicadores a 1, salvo juego ×1,10) | diferenciar o fusionar |
| `poop.warning` / `sick.warning` | inalcanzables **por diseño** tras el cambio del bucle de atención | ya documentado, no tocar |

### 1.6 Hacer visible lo invisible

- **Anunciar SENIOR.** Les sorprende la muerte y el juego nunca dice que el compañero es viejo. Una
  muerte que ves venir da pena; una que te pilla desprevenido se lee como fallo del juego. Es duelo ya
  ganado que se está perdiendo gratis.
- **Mostrar que cuidar alarga la vida.** Es un +15 % y solo lo saben porque tú se lo contaste.
- **Decir por qué falla la crianza.** Con nueve condiciones y el Ánimo calibrado en 70 cuando una
  ausencia normal de 8 h deja 68, fallan por dos puntos sin enterarse.
- **Dos canales visuales en Amabilidad**, no solo la silueta.

### 1.7 Amabilidad: reconstrucción

Pliego de 8 puntos del bloque 4. Resumen: dificultad determinista por ronda, una sola curva (−40/−48 %),
crédito parcial continuo, 5 rondas en vez de 7, duración 22–27 s, la pausa nunca más larga que el juego,
dos canales visuales, y el eje es **criterio**, no velocidad de toque.

### 1.8 Bayas de atributo (decisión aplazada del bloque 0)

Hoy están dominadas: 75 monedas por +5 de atributo cuando entrenar da +1..5 **y paga**. **Recomendación:
que den energía en vez de atributo.** La energía es el limitador real del entrenamiento, así que la baya
pasa de «atributo caro» a «una sesión más hoy»: una decisión de verdad, usando un cuello de botella que
ya existe.

---

## CAPA 2 · Expansión — mecánicas nuevas

### 2.1 Herencia, colgada del huevo misterioso  ⭐ *el centro de la capa*

**No de la crianza.** La crianza está en el 0,84 % y nadie la ha completado nunca; `startNewBeginning()`
lo recorre el 100 % de los jugadores cada vez que se les muere un compañero, y ya arrastra `coins`,
`inventory`, `trainer`, `pokedex` y `social`.

**Qué se hereda:** una fracción de los atributos, o la personalidad, o una ventaja permanente pequeña —
**escalada por el Vínculo alcanzado** (y/o por la calidad de cuidados con la ventana de 1.2).

**Por qué resuelve el problema central:** convierte el último tercio de vida en **preparación** en vez de
espera. Deja de ser «esperar la muerte agónica» y pasa a ser «cuánto le dejo al siguiente». Y responde a
los que se quejan de perder el progreso.

**Dependencia dura:** sin 1.1 y 1.2 no funciona. Si el Vínculo ya está lleno el día 1 y la calidad está
congelada el día 3, no hay nada que maximizar al final y la herencia se decide sola.

### 2.2 Sumideros de tienda a nivel de entrenador

La moneda es del entrenador y hoy todos sus sumideros son del compañero. Eso es la causa raíz del
excedente.

- **Huevos comprables.** Caros y excepcionales; el shiny mucho más caro, y **debe leerse visualmente que
  lo es** antes de comprarlo.
- **Carcasas comprables**, en un set propio, separado de las de logro.
- **Marco o retrato en Memorias.** Se compra en la tienda; botón desde la ficha de Memorias que la abre
  con el objeto seleccionado. Un solo sitio donde salen monedas.
- **Objetos de crianza:** levantar `oncePerLife`, ampliar compatibilidad, sesgar la especie de la cría,
  subir la probabilidad shiny.

### 2.3 Crianza como bucle social opcional

Palancas por impacto medido: compatibilidad de especie (9,1 % — el filtro dominante, lo abre el objeto
de 2.2), ventana MADURO → JOVEN+MADURO (12,2 % → ~30 %), el Ánimo ≥70 (bajarlo o avisar), y
`oncePerLife`.

**Regla firme:** nada que sea estructural puede depender de la crianza. Es el bucle social opcional.

---

## Descartado, con motivo

| Idea | Por qué no |
|---|---|
| **Vender esperanza de vida** | Si la queja es que el final está vacío, vender más vida vende más vacío. Y si la muerte da pena de verdad, hacerla evitable pagando desactiva lo único que ya funciona |
| Reducir tiempos de espera o carga | Vende alivio de una fricción propia. Si sobra, se quita; si aporta ritmo, no se vende el atajo |
| Avanzar el tiempo | En un tamagotchi el tiempo *es* el juego |
| Carcasas de logro con precio | Doble condición: devalúa el logro y no crea deseo |
| Bajar los ingresos de monedas | No arregla el desajuste y castiga lo que el juego hace bien (la curva nota→monedas) |
| Subir el tope de 6 acciones | No cambia la proporción entre obligación y elección |
| Acumular acciones offline | Premia la ausencia |

## No tocar

- La curva nota→monedas: bandas 32/26/20/14/**8 %** con pago 2/4/7/11/**16**. Premia la maestría de verdad.
- El scorer de Estilo: pondera por distancia recorrida, no por tiempo. Neutraliza el exploit de un juego sin reloj.
- `baseDays 4`. El problema nunca fue la duración.
- La mortalidad. Es el eje emocional y funciona: les da pena de verdad.

## Orden de ejecución propuesto

1. **Capa 1 completa**, empezando por 1.1 y 1.2 (son la base de todo lo demás y son barato: umbrales,
   una fórmula y datos del workbook).
2. **1.7 Amabilidad**, en paralelo: es independiente y ya estaba planificado.
3. **2.1 herencia + 2.2 sumideros**, juntos. Los sumideros absorben el excedente de monedas que la
   capa 1 incluso agrava un poco.
4. **2.3 crianza**, al final y opcional.

**Riesgo transversal a vigilar:** la capa 1 cambia el balance a mitad de partida para los 25 jugadores
actuales. Sus compañeros vivos se comportarán distinto de un día para otro. Ninguno de los cambios
propuestos exige tocar el esquema de save 12.


---
---

# REGISTRO DE DECISIONES · 2026-09-16

Cerradas por el autor. Lo de aquí abajo ya no es propuesta.

| Decisión | Resuelto |
|---|---|
| Vínculo | 5 corazones sobre el **día 3**; `minBond` de 2/3/5 a **40/60/80** |
| Acciones | alimentar y limpiar a **0**; entrenar, jugar, curar y auxiliar siguen a 1 |
| Etapas vitales | **fusionar JOVEN y MADURO** → tres etapas. Reapuntar `BREEDING_CONFIG.lifeStage` |
| Declaraciones muertas | fuera `minMood`, `careMean` y `COIN_REWARDS[0]`; `minDays`/`maxDays` a 3,50 y 4,90 |
| Bayas de atributo | **retirarlas** (patrón `RETIRED_ITEM_IDS`). Un objeto por necesidad |
| Té | **fijo en la tienda**. Es el mejor sumidero y salía el 5 % de los días |
| Score de minijuego | **0–1000 con mejor marca personal**, capa 1, cálculo propio para Intelecto |
| Herencia | ritmo de aprendizaje **hasta +25 %** por generación + marca de linaje + prob. shiny |
| Vía de la herencia | **crianza literal**; se arregla la crianza primero |
| Crianza en solitario | **Ditto de un solo uso**, ~250 monedas, frecuente |
| Huevos en tienda | normal **~600**, shiny **~2.500**; el shiny se ve antes de pagarlo |
| Vender esperanza de vida | **fuera, definitivamente** |

## Descartado al decidir

- **Heredar atributos.** Pierde el sentido del entreno: son los EV, no los IV. Lo que pasa a la
  siguiente generación es potencial, no lo ya ganado.
- **Ventaja acumulativa del entrenador.** El sistema recuerda solo al compañero anterior: no se
  apila y una generación descuidada vuelve a empezar.
- **Azar puro en la herencia.** El Vínculo del anterior fija el techo del sorteo y el azar decide
  dentro: azar de entrada, no de salida.
- **Bayas convertidas en energía.** El té ya da +50 de energía por 50 monedas, y es el objeto mejor
  diseñado de la tienda: 8 monedas por sesión de entrenamiento desbloqueada, rentable solo si juegas
  bien. Duplicarlo era el error que la propia auditoría señala en otros sitios.

## Hallazgo nuevo: Ditto es la cuarta declaración muerta

`contract['Ditto']` en el workmaster describe la regla ("the only special genderless breeder"), el
adapter tiene su rama `p.EggGroup === 'Ditto'`, el README dice que el contrato lo mantiene vivo como
pareja de crianza — y **ninguna especie alcanzable del runtime es un Ditto**. La rama no puede
dispararse. Es exactamente el gancho que faltaba para que criar no necesite a otra persona.

## Orden de ejecución revisado

1. **Capa 1 completa**, empezando por Vínculo (1.1) y calidad de cuidados (1.2).
2. **Amabilidad** (1.7), en paralelo.
3. **Ditto + abrir la puerta de crianza.** Sube al tercer puesto: al elegir crianza literal como vía
   de la herencia, arreglar la crianza pasa de opcional a requisito.
4. **Herencia + sumideros de tienda.**
5. **Pokéathlón y ranking de amigos**, si se quieren. El uso de atributos más allá de la evolución
   es el destino natural del techo. El ranking es la única idea que pide infraestructura y trae un
   riesgo a nombrar: un modo endless bueno desengancha los minijuegos de la mascota.

## Restricción a conservar

El huevo shiny de tienda es un objeto aleatorio comprado con moneda del juego. Eso queda fuera de las
políticas de tienda y de los descriptores de edad **mientras las monedas no puedan comprarse con
dinero real**. Si algún día se añaden compras reales, esa pieza pasa a ser un «paid random item» con
coste de clasificación en Europa (PEGI 16 desde junio de 2026). Verificar en fuente primaria antes de
dar por bueno cualquier dato de este párrafo; ver `~/.claude/skills/game-design/sources.md`.

---
---

# TIENDA: ESTRUCTURA Y AUTOMATIZADORES · 2026-09-16

## El huevo de pago tiene que decir qué compras

Un huevo aleatorio de pago es **estrictamente peor que el gratuito**: pagas por lo mismo que te dan al
morir el compañero. Así que el de 600 vende lo único que el misterioso no puede: saber qué es.

| Producto | Qué sabes | Qué compras |
|---|---|---|
| Huevo misterioso (gratis, al morir) | nada | continuidad |
| Incienso o cebo (~150) | sesga grupo huevo o rareza | control parcial |
| **Huevo de ~600** | especie exacta y su grupo huevo | acceso: Pokédex, o la pareja compatible que te falta |
| **Huevo shiny de ~2.500** | que es shiny; no la especie | rareza |

Cuatro niveles de control a cuatro precios, ninguno dominado. Con la crianza en el centro, el de 600
gana una segunda función: **comprar la especie compatible que te falta para criar**.

## Tres huecos no dan para esto

Probabilidad de ver un objeto **concreto**, con 3 huecos al día:

| Configuración | por día | en una vida de 4,5 d |
|---|---|---|
| Hoy: 16 objetos | 19 % | 65 % |
| Fijando berry/tea/medicine: 13 rotando | 23 % | 73 % |
| **Con los nuevos: ~21 rotando** | **14 %** | **54 %** |

Con 21 objetos en 3 huecos, casi la mitad de los compañeros mueren sin haber visto la piedra que
necesitaban. Eso no es escasez interesante: es un bloqueo aleatorio.

**Estructura propuesta: huecos por categoría, no una bolsa común.**

```
Estantería fija    berry 35 · tea 50 · medicine 70
Hueco Evolución    la piedra que TU línea necesita hoy
Hueco Crianza      Ditto · ampliar compatibilidad · levantar oncePerLife
Hueco Hogar        aspirador · interruptor · decorativos · carcasas · marco
Vitrina            el huevo de hoy (especie nombrada) y el shiny
```

La pieza clave es el hueco de Evolución: `current().rules` ya sabe qué objeto necesita la línea del
compañero activo, así que se puede ofrecer **el que sirve**. Pasa del 11 % de los días al 100 % de los
días en que lo necesitas. Deja de ser lotería y pasa a ser un plan.

## La regla de los automatizadores

> **Un automatizador compra comodidad, no elimina el bucle.** Se garantiza de tres formas: que
> **caduque**, que sea **parcial** (cubre el caso rutinario, nunca el urgente), o que tenga un **coste
> que se note**.

| Objeto | Veredicto |
|---|---|
| **Aspirador con desgaste** | Sí, y es el mejor de los tres: es **repetible**, así que absorbe ingreso de forma continua — lo que le falta a la economía, donde casi todo es compra única. Condición: limpia las **deposiciones**, no la **higiene**. Las cacas son la tarea mecánica; la higiene alimenta la calidad de cuidados y no debe automatizarse nunca |
| **Interruptor de luz programable** | Sí, y no es comodidad: con la luz apagada **no se puede alimentar, limpiar ni jugar**, y la noche es fija de 21 a 9. Quien vuelve a las 22:30 encuentra un compañero dormido con el que no puede hacer nada. Mover esa ventana es dejar que el jugador encaje el juego en su vida. **Límite imprescindible: la noche se puede mover, no alargar** — dormir decae mucho menos (hambre 3,6/h frente a 8), así que sin tope sería un botón para bajar la dificultad |
| **Decorativos** (lámpara de lava, pelota) | Sí, y los más seguros: cero riesgo de balance, extensibles hasta el infinito, alimentan el «mi habitación». Debilidad: compra única, no absorben ingreso recurrente. Aviso: si la pelota **da Ánimo**, deja de ser decorativa y pasa a ser automatizador, con las reglas de arriba |
| **Alimentador automático** | **No.** La comida es el reloj del juego —hambre decae 8/h y marca cuándo tienes que volver— y automatizarla desactiva el bucle entero, no una casilla |

El marco de Memorias tiene una propiedad que no se vio al proponerlo: **se compra por compañero
muerto**, así que escala con el juego. Es un sumidero recurrente disfrazado de cosmético.

---
---

# REGISTRO DE IMPLEMENTACIÓN

## 1.1 Vínculo · hecho

`relationship.js`: `goodCarePerMinute` de `.04` a `.005`. Medido tras el cambio:

```
                40 pts   60 pts   80 pts   100 pts (5 corazones)
cada 30 min      1,25     1,68     2,27     2,88
cada 2 h         1,75     2,33     3,17     4,00
cada 4 h         1,83     2,50     3,50     4,33      (muerte ~4,5)
```

Llega en las tres cadencias, y pasa de ser un trámite del primer día a ser la meta del tramo final.

**Pendiente y no es mío:** los `minBond` viven en el workbook canónico
(`master/pokemonTable_HatchMon_Canonical_v2.xlsx` → `MinBond`), así que los tiene que cambiar la
persona y regenerar con `syncCanonical.py`. Y **no pueden ser 40/60/80 uniformes**: 7 de las 17 reglas
con Vínculo están en `MinAgeDays: 1`, y un 80 ahí las bloquearía hasta el día 2,3–3,5. El reparto que
la curva soporta es **40 para las reglas de día 1, 60 para las de día 2–2,5 y 80 solo para las de
día 3+**. El único caso justo de milímetro es la regla de día 3,5 (línea Dragonite) para quien juega
cada 4 h: cruza 80 exactamente el día 3,50.

## 1.2 Calidad de cuidados · hecho, pero no era el problema que dije

Primero implementé la ventana reciente de 12 h que se había aprobado y **la medición la descartó**: con
ventana, la esperanza de vida pasa a depender solo de las últimas 12 h y tira todo el cuidado anterior.
Es otro fallo, no una mejora.

Lo que hay ahora es **acumulación por minuto**: cada minuto aporta su parte del rango completo
(`rate * minuto/baseLifespan`), en vez de recalcular desde la media de toda la vida. Cada minuto cuenta
una vez, se dé cuando se dé, y los minutos buenos del principio no se pierden.

### Corrección a un hallazgo del bloque 1

El bloque 1 decía que **cuidar solo el último tercio valía lo mismo que no cuidar nunca** (−3,6 h
frente a −3,4 h). Ese escenario **no es alcanzable**: quien descuida dos tercios de una vida tiene un
compañero muerto el primer día. Medido en un escenario real —mantenimiento justo toda la vida más un
empujón intensivo de un tercio— el modelo viejo ya era casi justo:

```
ANTES (media de toda la vida)   empujón temprano +2,3 h   ·   tardío +2,4 h   (tardío = 101 %)
AHORA (acumulación por minuto)  empujón temprano +5,7 h   ·   tardío +6,5 h   (tardío = 115 %)
```

Así que 1.2 **no arregló un problema de justicia: el problema era más pequeño de lo que afirmé.** Lo
que hace es que el mismo esfuerzo valga **2,4 veces más** y que el final pese algo más que el principio.
El tramo final vacío lo arreglan 1.1 y la herencia, no esto.

Cuidado impecable toda la vida pasa de +14,5 h a **+17,0 h**, cerca del techo de +18 h.

## Pruebas

`tests/rebalance.test.cjs` reproducía la fórmula vieja y `tests/energy-balance.test.cjs` fijaba
`baseLifespan` sin fijar `lifespan`, que con acumulación ya no da el mismo resultado. Las dos
actualizadas conservando su intención, más una prueba nueva del goteo del Vínculo. Suite **107/107**,
auditoría i18n sin hallazgos, `dist/` regenerado.

---
---

# PROPUESTA DE MinAgeDays Y MinBond · 2026-09-16

Restricción del autor: **el jugador lee el requisito de evolución de su compañero**, así que los
valores tienen que parecer autorados, no repartidos al azar.

## El principio, que ya estaba en tus datos

Las tres líneas de Kanto (bulbasaur, charmander, squirtle) ya lo hacen: paso 1 temprano, paso 2 tarde.
El resto no. Generalizarlo da una regla de una frase, explicable al jugador:

> **La última evolución de cada línea cae en la segunda mitad de la vida; los pasos intermedios, en la
> primera.** Y dentro de cada mitad, lo exigente llega después que lo blando.

«Exigente» = atributo ≥ 70, dos atributos a la vez, o una condición sostenida de ≥ 8 h. **Pedir un
objeto ya no cuenta como exigente**: con el hueco de Evolución de la tienda ofreciendo la piedra que tu
línea necesita, un objeto se compra.

## Cinco valores

| MinAgeDays | Reglas | Quién |
|---|---|---|
| **1,0** | 12 | paso intermedio, blando |
| **2,0** | 2 | paso intermedio, exigente |
| **2,5** | 20 | última de su línea, blanda |
| **3,0** | 16 | última de su línea, exigente |
| **3,5** | 1 | `dragonair → dragonite`, la línea más dura, se queda donde está |

Ningún racimo grande, y las dos bandas pobladas quedan repartidas. El tope es 3,0 porque el 80 % de una
vida de 4 días es 3,2: por encima, el hito caería en SENIOR.

## Efecto medido

```
Última evolución de cada línea (26 raíces)
  ANTES:    2,0 d → 21    2,5 d → 1    3,0 d → 3    3,5 d → 1
  DESPUÉS:  2,5 d → 14    3,0 d → 11   3,5 d → 1
  líneas que terminan en la segunda mitad:  4 de 26  ->  26 de 26
```

Eso cierra el bloque 2: ya no hay compañeros que pasen media vida sin ningún hito.

## MinBond: no se toca, y corrijo un hallazgo del bloque 6

**`MinBond` está en corazones (0–5), no en puntos**, y el runtime lo convierte con
`minimumHearts * perHeart` (×20). El generador lo valida con `0 <= value <= 5`. Así que los valores que
leí como «2, 3 y 5 puntos sobre 100» eran en realidad **40, 60 y 100 puntos**, y
`dragonair → dragonite` exigía el **Vínculo completo**.

El bloque 6 decía que la condición de Vínculo «no filtra absolutamente nada». **Es falso.** La puerta
estaba bien puesta desde el principio; lo que fallaba era que el Vínculo se llenaba el día 1,15 y la
cruzaba entera muy pronto. Lo arregla 1.1, y con el goteo en `.005` los valores que ya estaban en el
workbook pasan a ser puertas reales:

| MinBond | Puntos | Se cruza (30 min / 2 h / 4 h) |
|---|---|---|
| 2 corazones | 40 | 1,25 · 1,75 · 1,83 |
| 3 corazones | 60 | 1,68 · 2,33 · 2,50 |
| 5 corazones | 100 | 2,88 · 4,00 · 4,33 |

**Conclusión: la columna `MinBond` se queda como estaba.** El único caso tenso es
`dragonair → dragonite`, que pide los 5 corazones con `MinAgeDays 3,5`: un jugador de cadencia 4 h los
alcanza el día 4,33 sobre una vida de ~4,5. Es la línea deliberadamente más dura del juego, así que se
deja, pero queda anotado.

**Interacción a tener en cuenta:** para las 7 evoluciones de bebé cuyo único requisito es el Vínculo,
el disparo efectivo pasa a ser el cruce del Vínculo, no `MinAgeDays`. Una regla en 1,0 con 2 corazones
evoluciona de hecho entre el día 1,25 y el 1,83. Es coherente —son evoluciones por amistad— pero el
número que el jugador lee ya no es cuándo ocurre.

## Aplicado

`master/pokemonTable_HatchMon_Canonical_v2.xlsx`, hoja `EvolutionRules`, columna `MinAgeDays`: 48 de
las 51 reglas del runtime cambian de valor. Las 475 filas archivadas (sin `MinAgeDays`) no se tocan, y
se verificó celda a celda que ninguna otra columna ni hoja se movió. Regenerado con `syncCanonical.py`:
`{"pokemon": 78, "roster": 77, "rules": 51, "withMinBond": 17}`.

Efecto medido sobre los datos regenerados:

```
Última evolución de cada línea (26 raíces)
  ANTES:    2,0 d → 21    2,5 d → 1    3,0 d → 3    3,5 d → 1
  DESPUÉS:  2,5 d → 16    3,0 d → 9     3,5 d → 1
  líneas que terminan el día 2 o antes:  21 de 26  ->  0 de 26
```

La tabla completa está en `minagedays-propuesta.csv`.

---

# CAPA 1 · LO APLICADO EN LA SEGUNDA PASADA · 2026-09-16

**1.4 Acciones.** `costs.alimentar` y `costs.limpiar` a 0. Medido: al volver tras 10 h, la rutina
completa de mantenimiento (1 limpieza + 4 comidas + 2 juegos) deja **4 de 6 acciones** libres en vez
de 0. Solo los dos juegos cuestan.

**1.5 Declaraciones muertas.**
- `minMood` **retirado**. No existe como columna en el workbook —el `DataDictionary` de
  `EvolutionRules` no la lista— así que `optionalMinimum('MinMood')` solo podía devolver null: se
  evaluaba en cada comprobación de evolución sin poder cumplirse nunca. Fuera del normalizador, de
  `conditionsMet`, de `forceEvolution`, de la ficha de Oak y del catálogo i18n.
- `careMean` **se conserva**, corrigiendo la decisión que habíamos tomado: a diferencia de `minMood`,
  el normalizador sí puede producirlo si `estadisticas` trae una barra de cuidados. Es una vía de
  datos real sin usuarios hoy, no una rama imposible. Queda comentado en el código.
- `maxDays` de 5 a **4,9**, que es el techo alcanzable de verdad. `minDays` ya era 3,5, el suelo real.
- `COIN_REWARDS` pasa a indexarse por nota 1..5 (`[2,4,7,11,16]` con `-1`), sin el hueco inalcanzable.

**1.8 Objetos y tienda.** Las cuatro bayas de atributo salen del catálogo y entran en
`RETIRED_ITEM_IDS`. **Con devolución**: `migrateSave` reembolsa 75 monedas por unidad en lugar de
borrarlas, porque estuvieron en venta y quitarle a alguien algo que pagó no es aceptable. Verificado:
un save con 3 bayas y 100 monedas carga con 325 y el inventario limpio. Sus textos i18n se conservan
para el historial. Y `SHOP_STAPLES` fija `berry`, `tea` y `medicine`, con tres objetos rotando: la
tienda pasa de 3 entradas a 6.

**Verificación.** Suite 107/107 con once pruebas actualizadas, auditoría i18n limpia, y los cinco
saves generados por el build anterior cargan, validan y sobreviven a ida y vuelta.

**Pendiente de la capa 1:** solo **1.9**, el score 0–1000 con mejor marca personal. Es la única que
añade estado persistido y necesita decidir una fórmula continua para Intelecto, que cuenta rondas
ganadas en vez de normalizar un rendimiento.

**1.9 Marcador 0–1000 con mejor marca.** Los tres minijuegos que normalizan rendimiento exponen la `s`
que ya calculaban; Intelecto usa **luces acertadas / `MEMORY_LIGHTS`**, que además le da el crédito
parcial que no tenía. La nota y las monedas no cambian. La mejor marca es del entrenador
(`state.records`), sobrevive al compañero y no tiene techo, así que sigue siendo superable cuando el
atributo llega a 100. Sin subir el esquema 12: se normaliza en `migrateSave`.

Dos errores propios que conviene recordar del cambio: el check de `records` se colocó primero dentro de
`validSnapshot` —que por diseño no lleva campos del entrenador—, lo que **invalidaba todas las
Memorias y los huevos guardados**; y `records` no se copiaba en `startNewBeginning`, así que la marca se
perdía al empezar de nuevo, justo lo contrario de la decisión. Los dos los cazó la suite. En este
runtime los validadores del save completo y de los snapshots comparten texto casi idéntico: hay que
mirar en qué función se está editando.

**Capa 1 cerrada.**
