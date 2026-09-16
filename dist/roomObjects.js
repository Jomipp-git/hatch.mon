/* Objetos de la habitación. Solo dibujo y colocación: la mecánica de cada uno vive donde vive su
 * balance —el desgaste del aspirador, en `HOME_CONFIG` de `vitalSimulation.js`—.
 *
 * Se dibujan como rejilla de píxeles en `box-shadow`, que es el mismo idioma que los iconos de los
 * botones: **un solo color, y ese color es `currentColor`**. Eso es lo que hace que al apagar la luz
 * sigan la misma lógica que el resto de la pantalla —la capa cambia de tinta, no de opacidad— y lo
 * que los mantiene sin protagonismo: son mobiliario, no personajes. El SVG multicolor se queda para
 * las carcasas y los marcos, que sí tienen que destacar.
 *
 * Cada mapa es una rejilla de texto: `#` pinta, cualquier otro carácter deja hueco. A este tamaño el
 * hueco es la única herramienta de volumen que hay, así que los dibujos se leen por silueta.
 */
'use strict';
const ROOM_CONFIG={pixel:3};
globalThis.RoomObjects=(()=>{
 // Roomba: cilindro chato, no un óvalo. Con una sola tinta el volumen solo se puede dar con el
 // hueco, así que la cara de arriba va hueca —el hueco ES la tapa— y el cuerpo va macizo debajo. La
 // línea entre las dos es el canto del disco, que es lo que separa un cilindro de una mancha.
 // El primer intento llevaba cúpula y dos huecos abajo y se leía como un coche con ruedas.
 // Solo queda la alfombra. La aspiradora y el comedero se retiraron el 16-09-2026: medido, la franja
 // que es habitacion son 322 px menos las dos columnas de botones, o sea 234, y la alfombra ocupa
 // 144. Los 45 px por lado no dan para un mueble que se apoye, y abajo no hay suelo sino el nombre y
 // las barras, donde se leian como un boton. Las ranuras de pared siguen definidas: un objeto colgado
 // no necesita suelo y es el camino si se retoma.
 const PARTS=Object.freeze({
  // Alfombra redonda vista en escorzo. El relleno va con TRAMA al 50% —el damero clásico de 1 bit—,
  // que es como se pinta un medio tono cuando solo hay una tinta: ni maciza, que se leía como una vía
  // de tren, ni hueca, que se leía como un charco. El borde sí va macizo, que es lo que la cierra.
  // Ancha a propósito: el sprite PMD no está centrado en su propio marco —Pikachu cae 6 px a la
  // izquierda— y cada especie cae distinto, así que la anchura absorbe el desvío.
  rug:{slot:'rug',map:[
   '...............##################...............',
   '.........#####.#.#.#.#.#.#.#.#.#.######.........',
   '.....####.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#####.....',
   '...###.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.####...',
   '.####.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.###.',
   '####.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.###',
   '###.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.####',
   '####.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.###',
   '.####.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.###.',
   '...###.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.####...',
   '.....####.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#####.....',
   '.........#####.#.#.#.#.#.#.#.#.#.######.........',
   '...............##################...............',
  ]},
 });
 const SLOTS=Object.freeze(['wall-left','wall-right','floor-left','floor-right','rug']);
 // Escalón de profundidad por ranura. `back` se dibuja más pequeño porque está más lejos; es lo que
 // convierte cuatro objetos sueltos en un cuarto con fondo y suelo.
 const DEPTH=Object.freeze({'wall-left':'back','wall-right':'back','floor-left':'front','floor-right':'mid','rug':'floor'});
 const PX=ROOM_CONFIG.pixel;
 const cache=new Map();
 // Una sombra por píxel encendido. Se calcula una vez por objeto: la habitación se repinta en cada
 // render y rehacer la cadena en cada pasada era trabajo regalado.
 function pixels(id){
  if(cache.has(id))return cache.get(id);
  const part=PARTS[id];
  const shadows=[];
  if(part)for(let y=0;y<part.map.length;y++)for(let x=0;x<part.map[y].length;x++)
   if(part.map[y][x]==='#')shadows.push(`${x*PX}px ${y*PX}px currentColor`);
  const value=shadows.join(',')||'none';
  cache.set(id,value);return value;
 }
 const size=id=>{const part=PARTS[id];if(!part)return null;
  return {width:Math.max(...part.map.map(row=>row.length))*PX,height:part.map.length*PX};};
 const has=id=>Object.hasOwn(PARTS,id);
 const slot=id=>PARTS[id]?.slot||null;
 const depth=id=>DEPTH[PARTS[id]?.slot]||'front';
 return Object.freeze({pixels,size,has,slot,depth,list:()=>Object.keys(PARTS),slots:SLOTS,pixel:PX});
})();
