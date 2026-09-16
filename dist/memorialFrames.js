/* Marcos de Memorias. Cosmético puro: no toca balance ni estado del compañero.
 *
 * Los cuadros de texto de los Pokémon de GBA son un 9-slice de 8 px: cuatro esquinas fijas y
 * cuatro lados que se repiten. Aquí se dibuja el mismo contrato en SVG y se sirve como
 * `border-image`, así que el marco se estira a cualquier tarjeta sin deformar las esquinas.
 *
 * Cada marco se construye una vez y se cachea: la tarjeta de Memorias se repinta en cada render y
 * volver a serializar el SVG en cada pasada era trabajo regalado.
 */
'use strict';
const MEMORIAL_FRAME_CONFIG={price:200,cell:8,slice:24};
globalThis.MemorialFrames=(()=>{
 const CELL=MEMORIAL_FRAME_CONFIG.cell,SIZE=MEMORIAL_FRAME_CONFIG.slice;
 // `edge` es la línea de fuera, `base` el relleno del marco, `light` el bisel de dentro y
 // `accent` el adorno. El mismo reparto que usan las carcasas, para no inventar un segundo
 // vocabulario de color en el proyecto.
 const FRAMES=Object.freeze({
  classic:{name:'Clásico',nameEn:'Classic',edge:'#2b3a52',base:'#dce6f2',light:'#ffffff',accent:'#4a6f9e'},
  notch:{name:'Escuadra',nameEn:'Bracket',edge:'#3d2f23',base:'#f0e3cb',light:'#fffaf0',accent:'#a5764a'},
  scallop:{name:'Festón',nameEn:'Scallop',edge:'#5a2f46',base:'#f5dce8',light:'#fff5fa',accent:'#b2648c'},
  leaf:{name:'Hojas',nameEn:'Leaves',edge:'#274a2f',base:'#dcecd6',light:'#f4fbf1',accent:'#4f8b58'},
  brick:{name:'Piedra',nameEn:'Stone',edge:'#3a3a3a',base:'#d8d6d0',light:'#f2f1ed',accent:'#8a8781'},
  star:{name:'Estrellas',nameEn:'Stars',edge:'#33265c',base:'#e4dcf5',light:'#f8f4ff',accent:'#8c72d6'},
 });
 // Adorno de esquina, dibujado en la celda de 8 px de la esquina superior izquierda. Las otras tres
 // salen por espejo, que es como los hacían los propios juegos: una esquina dibujada, cuatro usadas.
 // Todo el adorno va en bloques alineados al pixel: el SVG se sirve con `crispEdges`, que es lo
 // que da el borde duro de GBA, y bajo esa regla una curva se aliasa en escalones sueltos. Los
 // primeros arcos se leian como una fila de puntos, no como un feston.
 const CORNERS={
  classic:'<path d="M2 2h1v1H2z" fill="%A"/>',
  notch:'<path d="M1 1h4v1H2v3H1z" fill="%A"/>',
  scallop:'<path d="M2 3h1v1H2zM3 2h1v1H3zM4 1h2v1H4z" fill="%A"/>',
  leaf:'<path d="M1 5h2v1H1zM2 3h2v1H2zM3 3h1v2H3zM4 1h2v1H4zM5 2h1v2H5z" fill="%A"/>',
  brick:'<path d="M1 1h3v2H1zM4 3h3v2H4zM1 5h3v2H1z" fill="%A"/>',
  star:'<path d="M3 1h2v6H3zM1 3h6v2H1z" fill="%A"/>',
 };
 // Adorno del lado superior. Se repite, así que tiene que encajar consigo mismo en 8 px o el
 // marco se lee como una fila de sellos sueltos en vez de como una moldura.
 const EDGES={
  classic:'',
  notch:'<path d="M0 6h8v1H0z" fill="%A"/>',
  // Escalera simetrica: subida, meseta y bajada dentro de los 8 px, asi que al repetirse dibuja
  // una onda continua en vez de bultos sueltos.
  scallop:'<path d="M0 5h1v1H0zM1 4h1v1H1zM2 3h4v1H2zM6 4h1v1H6zM7 5h1v1H7z" fill="%A"/>',
  leaf:'<path d="M3 3h2v1H3zM4 4h2v1H4zM2 4h1v1H2z" fill="%A"/>',
  brick:'<path d="M0 2h4v3H0zM5 2h3v3H5z" fill="%A"/>',
  star:'<path d="M3 3h2v2H3z" fill="%A" opacity=".8"/>',
 };
 const paint=(shape,accent)=>shape.split('%A').join(accent);
 function svg(id){
  const frame=FRAMES[id];if(!frame)return null;
  const corner=paint(CORNERS[id]||'',frame.accent),edge=paint(EDGES[id]||'',frame.accent);
  // Las bandas son rectángulos de ancho completo, así que las celdas de los lados se repiten sin
  // costura. El centro queda hueco: lo tapa el contenido de la tarjeta.
  const bands=`<path d="M0 0h${SIZE}v${SIZE}H0z" fill="${frame.base}"/>`
   +`<path d="M.5.5h${SIZE-1}v${SIZE-1}H.5z" fill="none" stroke="${frame.edge}" stroke-width="1"/>`
   +`<path d="M${CELL-1.5} ${CELL-1.5}h${SIZE-CELL*2+3}v${SIZE-CELL*2+3}h-${SIZE-CELL*2+3}z" fill="none" stroke="${frame.light}" stroke-width="1"/>`
   +`<path d="M${CELL-.5} ${CELL-.5}h${SIZE-CELL*2+1}v${SIZE-CELL*2+1}h-${SIZE-CELL*2+1}z" fill="none" stroke="${frame.edge}" stroke-width="1"/>`;
  const at=(x,y,flipX,flipY,shape)=>shape?`<g transform="translate(${x} ${y}) scale(${flipX} ${flipY})">${shape}</g>`:'';
  const corners=at(0,0,1,1,corner)+at(SIZE,0,-1,1,corner)+at(0,SIZE,1,-1,corner)+at(SIZE,SIZE,-1,-1,corner);
  const edges=at(CELL,0,1,1,edge)+at(CELL,SIZE,1,-1,edge)
   // Los lados verticales son el mismo dibujo girado un cuarto de vuelta.
   +(edge?`<g transform="translate(0 ${SIZE}) rotate(-90) translate(${CELL} 0)">${edge}</g>`
        +`<g transform="translate(${SIZE} ${SIZE}) rotate(-90) scale(1 -1) translate(${CELL} 0)">${edge}</g>`:'');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">`
   +bands+corners+edges+'</svg>';
 }
 const cache=new Map();
 function image(id){
  if(cache.has(id))return cache.get(id);
  const markup=svg(id);
  const url=markup?`url("data:image/svg+xml,${encodeURIComponent(markup)}")`:'none';
  cache.set(id,url);return url;
 }
 // Se aplica sobre el elemento: border-image con slice de una celda y `round`, que es lo que hace
 // que el lado se repita en piezas enteras en vez de estirarse.
 function apply(node,id){
  const frame=FRAMES[id];
  if(!frame){node.style.borderImage='';node.style.borderWidth='';node.dataset.frame='';return false;}
  node.style.borderStyle='solid';
  node.style.borderWidth=`${CELL}px`;
  node.style.borderImage=`${image(id)} ${CELL} round`;
  node.dataset.frame=id;
  return true;
 }
 const list=()=>Object.keys(FRAMES);
 const has=id=>Object.hasOwn(FRAMES,id);
 const name=(id,english=false)=>{const frame=FRAMES[id];return frame?(english&&frame.nameEn)||frame.name:id;};
 return Object.freeze({list,has,name,image,apply,theme:id=>FRAMES[id]||null,price:MEMORIAL_FRAME_CONFIG.price});
})();
