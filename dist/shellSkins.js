'use strict';
globalThis.ShellSkins=(()=>{
 const key='hatch.mon.shells',defaults={shellBase:'#bbb3cf',shellDark:'#5c546b',shellLight:'#e8e4ee',accent:'#bbb3cf',bezel:'#4e4a56',button:'#f3f0f7'};
 // Biblioteca de motivos. Cada uno se dibuja UNA vez, en una caja de 24 y otra de 12, y el
 // teselador lo coloca cuatro veces con medio paso de desfase (half-drop). Ese desfase es lo que
 // separa un estampado textil de una rejilla de puntos: los motivos anteriores se alineaban en
 // filas y columnas y por eso se leian pobres por mucho que se afinara el dibujo.
 //
 // `glyph` va en el color primario del motivo y `accent` en el secundario. Las especies con
 // silueta propia no dibujan al Pokemon entero: dibujan su elemento reconocible, que es como
 // funciona un estampado de verdad y lo unico legible a 24 px.
 const MOTIF_TILE=64,GLYPH_BOX=24,ACCENT_BOX=12,SPECK_BOX=6;
 // Manda la carcasa. El fondo de pagina es el lienzo que deja respirar al estampado, no el
 // protagonista: si los dos gritan igual, la consola deja de recortarse contra el.
 const PAGE_OPACITY=.15,SHELL_OPACITY=.26,PAGE_SCALE=120,SHELL_SCALE=58;
 // El tercer color entra como mota, no como tercera figura: a 64 px una figura mas satura la
 // baldosa y el estampado se vuelve ruido.
 const SPECK='<circle cx="3" cy="3" r="2.6" fill="%C"/>';
 const MOTIFS=Object.freeze({
  // --- familias por tipo ---
  waves:{glyph:'<path d="M0 15q6-9 12 0t12 0" fill="none" stroke="%C" stroke-width="3" stroke-linecap="round"/>',
         accent:'<path d="M0 8q3-5 6 0t6 0" fill="none" stroke="%C" stroke-width="2" stroke-linecap="round"/>'},
  bolts:{glyph:'<path d="M15 0 4 14h6l-3 10L20 9h-7z" fill="%C"/>',
         accent:'<path d="M8 0 2 7h3l-2 5 7-8H7z" fill="%C"/>'},
  sparks:{glyph:'<path d="M12 0c3 6 8 8 8 13a8 8 0 0 1-16 0c0-3 2-5 3-7 1 3 2 3 3 1 0-3-1-4 2-7z" fill="%C"/>',
          accent:'<path d="M6 0l5 11H1z" fill="%C"/>'},
  sprouts:{glyph:'<path d="M12 24C5 20 1 12 4 3c9-1 16 5 16 13 0 4-4 8-8 8z" fill="%C"/>',
           accent:'<path d="M6 12C3 10 1 6 2 1c5 0 9 3 9 7 0 2-2 4-5 4z" fill="%C"/>'},
  orbits:{glyph:'<circle cx="12" cy="12" r="10" fill="none" stroke="%C" stroke-width="3"/>',
          accent:'<circle cx="6" cy="6" r="4" fill="%C"/>'},
  diamonds:{glyph:'<path d="M12 0l9 12-9 12-9-12z" fill="%C"/>',
            accent:'<path d="M6 0l5 6-5 6-5-6z" fill="%C"/>'},
  dots:{glyph:'<circle cx="12" cy="12" r="9" fill="%C"/>',accent:'<circle cx="6" cy="6" r="4" fill="%C"/>'},
  bands:{glyph:'<path d="M0 18L18 0M6 24L24 6" stroke="%C" stroke-width="4" fill="none" stroke-linecap="round"/>',
         accent:'<path d="M0 9L9 0" stroke="%C" stroke-width="3" fill="none" stroke-linecap="round"/>'},
  crystals:{glyph:'<path d="M12 0l10 6v12l-10 6-10-6V6z" fill="none" stroke="%C" stroke-width="3"/>',
            accent:'<path d="M6 0l5 3v6l-5 3-5-3V3z" fill="%C"/>'},
  scales:{glyph:'<path d="M0 22a12 12 0 0 1 24 0" fill="none" stroke="%C" stroke-width="3"/>',
          accent:'<path d="M0 11a6 6 0 0 1 12 0" fill="none" stroke="%C" stroke-width="2"/>'},
  blocks:{glyph:'<path d="M0 2h14v10H0zM10 14h14v9H10z" fill="%C"/>',accent:'<path d="M0 2h9v7H0z" fill="%C"/>'},
  eclipse:{glyph:'<path d="M12 0a12 12 0 1 0 0 24A9 9 0 0 1 12 0z" fill="%C"/>',
           accent:'<path d="M6 0a6 6 0 1 0 0 12A4 4 0 0 1 6 0z" fill="%C"/>'},
  // --- siluetas por especie: el elemento reconocible, no el cuerpo entero ---
  bulbasaur:{glyph:'<path d="M12 5c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z" fill="%C"/><path d="M12 5c0-3-2-5-5-5 0 4 2 5 5 5z" fill="%C"/>',accent:'<path d="M11 1c0 5-3 8-8 8 0-5 3-8 8-8z" fill="%C"/>'},
  ivysaur:{glyph:'<path d="M12 9c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z" fill="%C"/><path d="M12 9c-2-4 0-7 3-9 0 4-1 7-3 9zM12 9c2-4 0-7-3-9 0 4 1 7 3 9z" fill="%C"/>',accent:'<path d="M6 0c3 3 3 7 0 10-3-3-3-7 0-10z" fill="%C"/>'},
  venusaur:{glyph:'<circle cx="12" cy="12" r="6" fill="%C"/><path d="M12 0c3 3 3 5 0 6-3-1-3-3 0-6zM24 12c-3 3-5 3-6 0 1-3 3-3 6 0zM12 24c-3-3-3-5 0-6 3 1 3 3 0 6zM0 12c3-3 5-3 6 0-1 3-3 3-6 0z" fill="%C"/>',accent:'<circle cx="6" cy="6" r="3" fill="%C"/><path d="M6 0c2 2 2 3 0 3-2 0-2-1 0-3zM12 6c-2 2-3 2-3 0 0-2 1-2 3 0z" fill="%C"/>'},
  charmander:{glyph:'<path d="M13 2c2 5 6 7 6 12a7 7 0 0 1-14 0c0-3 2-4 3-7 1 3 2 3 3 1 0-2-1-3 2-6z" fill="%C"/>',accent:'<path d="M0 11c5 0 9-4 10-10" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>'},
  charmeleon:{glyph:'<path d="M12 1c2 5 6 7 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 1 2 2 2 2 0 0-2 0-3 1-5z" fill="%C"/><path d="M4 23l8-5 8 5" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<path d="M2 12L9 0l2 5z" fill="%C"/>'},
  squirtle:{glyph:'<circle cx="12" cy="12" r="10" fill="none" stroke="%C" stroke-width="3"/><path d="M12 2v20M2 12h20" stroke="%C" stroke-width="2"/>',accent:'<path d="M6 0c3 5 5 6 5 8a5 5 0 0 1-10 0c0-2 2-3 5-8z" fill="%C"/>'},
  wartortle:{glyph:'<path d="M3 21C3 10 9 4 19 2c-3 6 0 8 2 6-1 9-9 14-16 14-1 0-2 0-2-1z" fill="%C"/>',accent:'<path d="M6 0c3 5 5 6 5 8a5 5 0 0 1-10 0c0-2 2-3 5-8z" fill="%C"/>'},
  blastoise:{glyph:'<circle cx="7" cy="12" r="5" fill="none" stroke="%C" stroke-width="3"/><circle cx="18" cy="12" r="5" fill="none" stroke="%C" stroke-width="3"/>',accent:'<path d="M0 6h4M8 6h4M6 0v4M6 8v4" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>'},
  pikachu:{glyph:'<path d="M3 23l7-10H5l6-12h5l-4 8h5z" fill="%C"/>',accent:'<circle cx="6" cy="6" r="4.5" fill="%C"/>'},
  raichu:{glyph:'<path d="M2 22c7-2 10-8 10-15" fill="none" stroke="%C" stroke-width="3" stroke-linecap="round"/><path d="M15 0l-5 9h4l-3 7 8-10h-4z" fill="%C"/>',accent:'<path d="M7 0L2 6h3l-2 6 7-8H7z" fill="%C"/>'},
  clefairy:{glyph:'<path d="M12 1l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="%C"/>',accent:'<path d="M8 0a5 5 0 1 0 3 10A6 6 0 0 1 8 0z" fill="%C"/>'},
  clefable:{glyph:'<path d="M15 1a10 10 0 1 0 6 18A12 12 0 0 1 15 1z" fill="%C"/>',accent:'<path d="M6 0l1.7 3.7L11.5 4.3 8.8 7l.9 4.2L6 9.2 2.3 11.2 3.2 7 .5 4.3l3.8-.6z" fill="%C"/>'},
  jigglypuff:{glyph:'<path d="M12 2a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zM6 11a6 6 0 0 0 12 0M12 17v5" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<circle cx="4" cy="10" r="2.5" fill="%C"/><path d="M6 10V1l5-1v3" fill="none" stroke="%C" stroke-width="2"/>'},
  wigglytuff:{glyph:'<circle cx="12" cy="14" r="9" fill="%C"/><path d="M12 5c0-4 4-5 5-2" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<circle cx="4" cy="10" r="2.5" fill="%C"/><path d="M6 10V1l5-1v3" fill="none" stroke="%C" stroke-width="2"/>'},
  growlithe:{glyph:'<path d="M3 4h18M6 12h15M3 20h18" stroke="%C" stroke-width="3.5" stroke-linecap="round" fill="none"/>',accent:'<path d="M6 0c2 3 4 4 4 6a4 4 0 0 1-8 0c0-2 2-3 4-6z" fill="%C"/>'},
  arcanine:{glyph:'<path d="M2 19c0-9 7-16 16-17-3 6-1 9 3 8-2 7-9 12-16 12-2 0-3-1-3-3z" fill="%C"/>',accent:'<path d="M0 3h11M2 9h10" stroke="%C" stroke-width="2.5" stroke-linecap="round" fill="none"/>'},
  abra:{glyph:'<path d="M12 23a11 11 0 1 1 11-11c0 4-3 7-7 7s-6-3-6-6 2-5 5-5" fill="none" stroke="%C" stroke-width="3" stroke-linecap="round"/>',accent:'<circle cx="6" cy="6" r="3.5" fill="%C"/>'},
  kadabra:{glyph:'<ellipse cx="12" cy="6" rx="4.5" ry="5.5" fill="%C"/><path d="M12 12v11" stroke="%C" stroke-width="3" stroke-linecap="round"/>',accent:'<path d="M6 0l1.5 4H12l-3.5 2.6L10 11 6 8.4 2 11l1.5-4.4L0 4h4.5z" fill="%C"/>'},
  alakazam:{glyph:'<path d="M5 23L19 4M19 23L5 4" stroke="%C" stroke-width="2.5" stroke-linecap="round" fill="none"/><ellipse cx="19" cy="3" rx="3" ry="3.5" fill="%C"/><ellipse cx="5" cy="3" rx="3" ry="3.5" fill="%C"/>',accent:'<path d="M0 4c2-3 4-3 6 0 2-3 4-3 6 0-2 3-4 3-6 1-2 2-4 2-6-1z" fill="%C"/>'},
  hitmonlee:{glyph:'<path d="M9 1h6v13l7 5v5H9z" fill="%C"/>',accent:'<path d="M0 6h4M8 6h4M2 1l3 3M10 1L7 4" stroke="%C" stroke-width="2" stroke-linecap="round" fill="none"/>'},
  hitmonchan:{glyph:'<path d="M6 9a6 6 0 0 1 12 0v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM6 13H3a2.5 2.5 0 0 1 0-5h3" fill="%C"/>',accent:'<path d="M6 0l2 4 4-2-2 4 2 4-4-2-2 4-2-4-4 2 2-4-2-4 4 2z" fill="%C"/>'},
  hitmontop:{glyph:'<path d="M12 1l9 9-9 13-9-13z" fill="%C"/>',accent:'<path d="M0 6c2-3 4-3 6 0M6 6c2 3 4 3 6 0" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>'},
  tyrogue:{glyph:'<path d="M5 8h14v9a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" fill="%C"/><path d="M5 12h14M5 16h14" stroke="%C" stroke-width="1.5"/>',accent:'<path d="M6 0l2 4 4-2-2 4 2 4-4-2-2 4-2-4-4 2 2-4-2-4 4 2z" fill="%C"/>'},
  chansey:{glyph:'<ellipse cx="12" cy="13" rx="9" ry="11" fill="%C"/>',accent:'<ellipse cx="6" cy="7" rx="4.5" ry="5" fill="%C"/>'},
  happiny:{glyph:'<ellipse cx="12" cy="15" rx="7" ry="8" fill="%C"/><path d="M12 7V1" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<circle cx="6" cy="6" r="3.5" fill="%C"/>'},
  blissey:{glyph:'<ellipse cx="12" cy="14" rx="9" ry="10" fill="%C"/><path d="M3 12c4 3 14 3 18 0" fill="none" stroke="%C" stroke-width="2"/>',accent:'<ellipse cx="6" cy="7" rx="4.5" ry="5" fill="%C"/>'},
  mrmime:{glyph:'<path d="M4 4h16v16H4z" fill="none" stroke="%C" stroke-width="3"/>',accent:'<circle cx="6" cy="6" r="4" fill="%C"/>'},
  mimejr:{glyph:'<path d="M6 6h12v12H6z" fill="none" stroke="%C" stroke-width="3"/>',accent:'<circle cx="6" cy="6" r="3" fill="%C"/>'},
  magmar:{glyph:'<path d="M12 0c2 6 8 9 8 14a8 8 0 0 1-16 0c0-4 3-6 4-10 1 4 3 4 3 1 0-2 0-3 1-5z" fill="%C"/>',accent:'<path d="M0 6c0-3 5-5 11-4-1 3-5 6-11 4z" fill="%C"/>'},
  magby:{glyph:'<path d="M12 3c2 5 6 7 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 1 2 2 2 2 0 0-2 0-3 1-5z" fill="%C"/>',accent:'<circle cx="6" cy="6" r="3" fill="%C"/>'},
  magmortar:{glyph:'<path d="M3 8h13v9H3z" fill="%C"/><path d="M16 10h5v5h-5z" fill="%C"/>',accent:'<path d="M6 0c2 4 5 5 5 8a5 5 0 0 1-10 0c0-2 3-3 5-8z" fill="%C"/>'},
  eevee:{glyph:'<path d="M21 2c2 7-1 15-7 19-4 3-10 3-12 0 6 0 9-5 10-10 1-6 5-9 9-9z" fill="%C"/>',accent:'<path d="M0 8c2-5 4-7 6-7s4 2 6 7c-4 3-8 3-12 0z" fill="%C"/>'},
  vaporeon:{glyph:'<path d="M2 21c2-11 9-18 20-20-4 7-4 12 0 15-7 6-14 8-20 5z" fill="%C"/>',accent:'<path d="M6 0c3 5 5 6 5 8a5 5 0 0 1-10 0c0-2 2-3 5-8z" fill="%C"/>'},
  jolteon:{glyph:'<path d="M2 23L8 6l3 10 4-13 3 12 4-8-2 16z" fill="%C"/>',accent:'<path d="M7 0L2 6h3l-2 6 7-8H7z" fill="%C"/>'},
  flareon:{glyph:'<path d="M12 0c3 7 9 10 9 15a9 9 0 0 1-18 0c0-4 3-6 4-10 1 4 3 4 3 1 0-2 0-4 2-6z" fill="%C"/>',accent:'<path d="M0 8c2-5 4-7 6-7s4 2 6 7c-4 3-8 3-12 0z" fill="%C"/>'},
  espeon:{glyph:'<path d="M3 23c9-3 13-10 14-19l3 5 3-5c-1 13-9 19-20 19z" fill="%C"/>',accent:'<path d="M6 0l5 6-5 6-5-6z" fill="%C"/>'},
  umbreon:{glyph:'<circle cx="12" cy="12" r="9" fill="none" stroke="%C" stroke-width="3.5"/><circle cx="12" cy="12" r="3" fill="%C"/>',accent:'<circle cx="6" cy="6" r="4.5" fill="none" stroke="%C" stroke-width="2.5"/>'},
  leafeon:{glyph:'<path d="M21 2c2 9-4 18-13 20-3 0-5-2-5-4 6 0 9-6 10-11 1-4 4-5 8-5z" fill="%C"/>',accent:'<path d="M11 1c0 5-4 9-9 9 0-5 4-9 9-9z" fill="%C"/>'},
  glaceon:{glyph:'<path d="M12 1l8 6-3 10-5 7-5-7-3-10z" fill="%C"/>',accent:'<path d="M6 0v12M0 3l12 6M12 3L0 9" stroke="%C" stroke-width="2" stroke-linecap="round" fill="none"/>'},
  sylveon:{glyph:'<path d="M12 12L2 4v16zM12 12l10-8v16z" fill="%C"/><circle cx="12" cy="12" r="3.5" fill="%C"/>',accent:'<path d="M6 0c3 3 3 5 0 6-3 3-3 5 0 6" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>'},
  dratini:{glyph:'<path d="M21 2c-9 0-15 5-15 11 0 4 3 8 8 8s7-3 7-6-2-5-5-5" fill="none" stroke="%C" stroke-width="3" stroke-linecap="round"/>',accent:'<circle cx="6" cy="6" r="4" fill="%C"/>'},
  dragonair:{glyph:'<circle cx="12" cy="5" r="4.5" fill="%C"/><path d="M12 10c-7 2-10 7-10 13" fill="none" stroke="%C" stroke-width="3" stroke-linecap="round"/>',accent:'<circle cx="6" cy="6" r="4" fill="none" stroke="%C" stroke-width="2.5"/>'},
  dragonite:{glyph:'<path d="M1 15C1 6 8 1 17 1c-2 6 1 8 6 7-3 8-12 12-19 12-2 0-3-1-3-5z" fill="%C"/>',accent:'<path d="M3 12V4a3 3 0 0 1 6 0v8" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>'},
  pichu:{glyph:'<path d="M6 23l5-9H7l5-13h4l-3 8h4z" fill="%C"/>',accent:'<circle cx="6" cy="6" r="3.5" fill="%C"/>'},
  cleffa:{glyph:'<path d="M12 3l2.5 6.5 7 .5-5.5 4.5 1.5 7L12 18l-5.5 3.5 1.5-7L2.5 10l7-.5z" fill="%C"/>',accent:'<circle cx="6" cy="6" r="3" fill="%C"/>'},
  igglybuff:{glyph:'<circle cx="12" cy="14" r="8" fill="%C"/><path d="M12 6c0-3 3-4 4-2" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<circle cx="4" cy="10" r="2.5" fill="%C"/><path d="M6 10V1l5-1v3" fill="none" stroke="%C" stroke-width="2"/>'},
  togepi:{glyph:'<path d="M12 1c6 6 9 10 9 14a9 9 0 0 1-18 0c0-4 3-8 9-14z" fill="none" stroke="%C" stroke-width="2.5"/><path d="M5 14l3.5-3.5L12 14l3.5-3.5L19 14" fill="none" stroke="%C" stroke-width="2"/>',accent:'<path d="M6 0l5 10H1z" fill="%C"/>'},
  togetic:{glyph:'<path d="M2 16C2 8 8 3 15 3c-1 5 2 6 6 5-2 7-8 10-13 10-3 0-6-1-6-2z" fill="%C"/>',accent:'<path d="M6 0l5 10H1z" fill="%C"/>'},
  marill:{glyph:'<path d="M4 21c0-9 6-14 13-15" fill="none" stroke="%C" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="5" r="4.5" fill="%C"/>',accent:'<path d="M6 0c3 5 5 6 5 8a5 5 0 0 1-10 0c0-2 2-3 5-8z" fill="%C"/>'},
  azumarill:{glyph:'<circle cx="9" cy="15" r="7" fill="none" stroke="%C" stroke-width="3"/><circle cx="19" cy="5" r="4" fill="%C"/>',accent:'<circle cx="6" cy="6" r="4" fill="none" stroke="%C" stroke-width="2"/>'},
  azurill:{glyph:'<path d="M5 21c0-8 5-12 10-13" fill="none" stroke="%C" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="6" r="4.5" fill="%C"/>',accent:'<circle cx="6" cy="6" r="3.5" fill="%C"/>'},
  mantine:{glyph:'<path d="M1 17c4-10 12-15 22-15-4 7-4 12 0 16-8 2-16 1-22-1z" fill="%C"/>',accent:'<circle cx="6" cy="6" r="3.5" fill="none" stroke="%C" stroke-width="2.5"/>'},
  mantyke:{glyph:'<path d="M3 15c4-8 10-12 18-12-3 5-3 9 0 12-6 2-12 2-18 0z" fill="%C"/>',accent:'<circle cx="6" cy="6" r="3" fill="%C"/>'},
  sudowoodo:{glyph:'<path d="M12 23V7M12 13L5 6M12 11l7-6" fill="none" stroke="%C" stroke-width="3.5" stroke-linecap="round"/>',accent:'<circle cx="6" cy="6" r="4" fill="%C"/>'},
  bonsly:{glyph:'<path d="M12 1c4 7 7 10 7 14a7 7 0 0 1-14 0c0-4 3-7 7-14z" fill="%C"/>',accent:'<path d="M6 0c2 4 4 5 4 7a4 4 0 0 1-8 0c0-2 2-3 4-7z" fill="%C"/>'},
  wobbuffet:{glyph:'<path d="M12 1c5 0 8 4 8 10 0 7-4 12-8 12s-8-5-8-12c0-6 3-10 8-10z" fill="%C"/>',accent:'<path d="M0 3l6 6 6-6" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>'},
  wynaut:{glyph:'<path d="M3 2l9 13L21 2M12 15v8" fill="none" stroke="%C" stroke-width="3.5" stroke-linecap="round"/>',accent:'<circle cx="6" cy="6" r="3.5" fill="%C"/>'},
  roselia:{glyph:'<path d="M12 3a5.5 5.5 0 0 1 0 11 5.5 5.5 0 0 1 0-11zM12 14v9" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<path d="M11 1c0 5-4 9-9 9 0-5 4-9 9-9z" fill="%C"/>'},
  roserade:{glyph:'<circle cx="6" cy="8" r="5" fill="none" stroke="%C" stroke-width="2.5"/><circle cx="18" cy="8" r="5" fill="none" stroke="%C" stroke-width="2.5"/><path d="M6 13v10M18 13v10" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<path d="M6 0c3 3 3 9 0 12-3-3-3-9 0-12z" fill="%C"/>'},
  budew:{glyph:'<path d="M12 9a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM12 9V1" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<path d="M11 1c0 5-4 9-9 9 0-5 4-9 9-9z" fill="%C"/>'},
  chimecho:{glyph:'<path d="M12 2a7 7 0 0 1 7 7v4H5V9a7 7 0 0 1 7-7zM12 13v5M8 23l4-5 4 5" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<path d="M6 1a4 4 0 0 1 4 4v3H2V5a4 4 0 0 1 4-4z" fill="%C"/>'},
  chingling:{glyph:'<path d="M12 3a6.5 6.5 0 0 1 6.5 6.5V14h-13V9.5A6.5 6.5 0 0 1 12 3zM9 14v2.5a3 3 0 0 0 6 0V14" fill="none" stroke="%C" stroke-width="2.5"/>',accent:'<circle cx="6" cy="6" r="3.5" fill="%C"/>'},
  munchlax:{glyph:'<path d="M4 13c0-7 6-11 17-11 0 11-6 17-13 17-3 0-4-2-4-6z" fill="%C"/>',accent:'<circle cx="3" cy="9" r="2.5" fill="%C"/><circle cx="9" cy="4" r="3" fill="%C"/>'},
  riolu:{glyph:'<circle cx="12" cy="16" r="6" fill="%C"/><circle cx="4" cy="8" r="3" fill="%C"/><circle cx="12" cy="4" r="3" fill="%C"/><circle cx="20" cy="8" r="3" fill="%C"/>',accent:'<circle cx="6" cy="7" r="4" fill="%C"/><circle cx="6" cy="2" r="2" fill="%C"/>'},
  lucario:{glyph:'<circle cx="12" cy="12" r="7" fill="none" stroke="%C" stroke-width="3"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>',accent:'<path d="M6 0l4 12H2z" fill="%C"/>'},
  elekid:{glyph:'<path d="M6 1v7M18 1v7M4 8h16v6a8 8 0 0 1-16 0z" fill="none" stroke="%C" stroke-width="3" stroke-linejoin="round"/>',accent:'<path d="M7 0L2 6h3l-2 6 7-8H7z" fill="%C"/>'},
  electivire:{glyph:'<path d="M7 23V9a5 5 0 0 1 10 0v14M3 9V1M21 9V1" fill="none" stroke="%C" stroke-width="3.5" stroke-linecap="round"/>',accent:'<path d="M7 0L2 6h3l-2 6 7-8H7z" fill="%C"/>'},
  smoochum:{glyph:'<path d="M1 11c3-7 7-7 11 0 4-7 8-7 11 0-4 9-18 9-22 0z" fill="%C"/>',accent:'<path d="M9 0c0 5-2 8-6 11-1-5 1-9 6-11z" fill="%C"/>'},
  toxel:{glyph:'<path d="M5 7c4-3 10-3 14 0 0 6-5 12-7 15-2-3-7-9-7-15z" fill="%C"/>',accent:'<path d="M0 6h2M5 1v10M9 3v6" stroke="%C" stroke-width="2" fill="none" stroke-linecap="round"/>'},
  charizard:{glyph:'<path d="M12 0c3 6 9 9 9 14a9 9 0 0 1-18 0c0-4 3-6 4-9 1 4 3 4 3 1 0-3-1-4 2-6z" fill="%C"/>',
             accent:'<path d="M0 3c5-1 10 1 12 6-3-2-6-2-8 0 1-3 0-5-4-6z" fill="%C"/>'},
  jynx:{glyph:'<path d="M12 0c5 0 8 4 8 9 0 7-3 11-8 15-5-4-8-8-8-15 0-5 3-9 8-9z" fill="%C"/>',
        accent:'<path d="M0 6c2-4 4-4 6 0 2-4 4-4 6 0-2 5-10 5-12 0z" fill="%C"/>'},
  electabuzz:{glyph:'<path d="M16 0 3 13h7l-3 11L21 10h-7z" fill="%C"/>',
              accent:'<path d="M0 3l3 3 3-3 3 3 3-3" fill="none" stroke="%C" stroke-width="2.5" stroke-linecap="round"/>'},
  snorlax:{glyph:'<path d="M4 2h16L6 21h15" fill="none" stroke="%C" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
           accent:'<path d="M8 0a6 6 0 1 0 4 11A7 7 0 0 1 8 0z" fill="%C"/>'},
  togekiss:{glyph:'<path d="M1 16C1 7 8 1 16 1c-1 5 2 6 7 5-2 7-9 11-15 11-3 0-6-1-7-1z" fill="%C"/>',
            accent:'<path d="M6 0l5 10H1z" fill="%C"/>'},
  toxtricity:{glyph:'<path d="M3 4c6-4 12-4 18 0 0 8-6 16-9 20-3-4-9-12-9-20z" fill="%C"/>',
              accent:'<path d="M0 6h2M5 1v10M9 3v6" stroke="%C" stroke-width="2" fill="none" stroke-linecap="round"/>'}
 });
 // El orden es el de la barra de acciones en index.html.
 const ACTIONS=Object.freeze(['alimentar','jugar','luz','limpiar']),SHINY_SUFFIX=':shiny';
 const paint=(shape,color)=>shape.split('%C').join(color);
 // Un tema que pida un motivo inexistente se queda liso, no rompe la carcasa.
 function motifTile(theme,opacity){
  const draw=MOTIFS[theme.motif],colors=theme.motifColors||[];
  if(!draw||!colors.length)return 'none';
  const main=colors[0],second=colors[1]||colors[0],third=colors[2];
  const half=MOTIF_TILE/2,glyphAt=(half-GLYPH_BOX)/2,accentAt=(half-ACCENT_BOX)/2;
  const at=(x,y,shape)=>`<g transform="translate(${x} ${y})">${shape}</g>`;
  const glyph=paint(draw.glyph,main),accent=paint(draw.accent,second);
  let body=at(glyphAt,glyphAt,glyph)+at(half+glyphAt,half+glyphAt,glyph)
   +at(half+accentAt,accentAt,accent)+at(accentAt,half+accentAt,accent);
  if(third){const speck=paint(SPECK,third),edge=half-SPECK_BOX/2;
   body+=at(edge,SPECK_BOX/2,speck)+at(SPECK_BOX/2,edge,speck)+at(half+edge,half+SPECK_BOX/2,speck)+at(half+SPECK_BOX/2,half+edge,speck);}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${MOTIF_TILE}" height="${MOTIF_TILE}" viewBox="0 0 ${MOTIF_TILE} ${MOTIF_TILE}"><g opacity="${opacity}">`
   +body+'</g></svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
 }
 let saved={unlocked:[],selected:'default'};
 try{const raw=JSON.parse((globalThis.HatchStorage||globalThis.localStorage)?.getItem(key)||'null');if(raw&&Array.isArray(raw.unlocked)){saved.unlocked=[...new Set(raw.unlocked.filter(id=>Object.hasOwn(SHELL_THEMES,id)))];if(raw.selected==='default'||saved.unlocked.includes(raw.selected))saved.selected=raw.selected;}}catch{}
 const persist=()=>{try{(globalThis.HatchStorage||globalThis.localStorage)?.setItem(key,JSON.stringify(saved));globalThis.HatchCloud?.queue({immediate:true});}catch{}};
 function hydrate(value,host){if(!value||!Array.isArray(value.unlocked))return false;saved.unlocked=[...new Set(value.unlocked.filter(id=>Object.hasOwn(SHELL_THEMES,id)))];saved.selected=value.selected==='default'||saved.unlocked.includes(value.selected)?value.selected:'default';if(host)apply(host);return true;}
 // A shell belongs to a species you have had, not to one you kept alive long enough: it unlocks on
 // hatching and again on every evolution. The Pokédex pass backfills anything owned before that
 // rule changed, since 'owned' is only ever recorded when the companion becomes that form.
 function observe(state){
  let changed=false;
  const unlock=value=>{const id=PokemonData.canonicalId(value);
   if(!id||!SHELL_THEMES[id]||saved.unlocked.includes(id))return;saved.unlocked.push(id);changed=true;};
  // La edicion shiny no se regala con la normal: se gana por separado, al haber tenido esa
  // forma en shiny. Por eso la Pokedex se lee en dos pasadas distintas.
  const unlockShiny=value=>{const id=PokemonData.canonicalId(value);
   if(!id||!SHELL_THEMES[id+SHINY_SUFFIX]||saved.unlocked.includes(id+SHINY_SUFFIX))return;
   saved.unlocked.push(id+SHINY_SUFFIX);changed=true;};
  if(['alive','critical'].includes(state.phase)){unlock(state.pokemonId);if(state.social?.active?.isShiny===true)unlockShiny(state.pokemonId);}
  for(const [id,entry] of Object.entries(state.pokedex||{})){
   if(entry?.ownedIds?.length||entry?.shiny?.ownedIds?.length)unlock(id);
   if(entry?.shiny?.ownedIds?.length)unlockShiny(id);}
  if(changed)persist();
  return changed;
 }
 const SHADES=['shellBase','shellDark','shellLight','accent','bezel','button','pageBase'];
 // El mismo dibujo sirve a las dos superficies y cambia de papel segun donde cae: grande y con
 // cuerpo en el fondo de pagina, que es donde hay tela para que se lea; pequeno y tenue en la
 // carcasa, que son 16 px de marco alrededor de la pantalla y no admite mas.
 function apply(host){const theme=SHELL_THEMES[saved.selected]||defaults;
  for(const shade of SHADES)host.style.setProperty('--'+shade,String(theme[shade]??defaults[shade]));
  host.style.setProperty('--motifImage',motifTile(theme,SHELL_OPACITY));
  host.style.setProperty('--motifSize',`${SHELL_SCALE}px ${SHELL_SCALE}px`);
  host.style.setProperty('--motifImagePage',motifTile(theme,PAGE_OPACITY));
  host.style.setProperty('--motifSizePage',`${PAGE_SCALE}px ${PAGE_SCALE}px`);
  // Cada accion lleva su color en el canto, no en el fondo: el fondo sigue siendo comun para no
  // tocar ni el contraste del texto ni como se lee un boton deshabilitado.
  const edges=theme.buttonEdges||[];
  ACTIONS.forEach((action,index)=>host.style.setProperty(`--edge-${action}`,String(edges[index%edges.length]||theme.shellDark||defaults.shellDark)));
  host.dataset.shell=saved.selected;host.dataset.motif=theme.motif||'plain';}
 function select(id,host){if(id!=='default'&&!saved.unlocked.includes(id))return false;saved.selected=id;persist();apply(host);return true;}
 return Object.freeze({observe,apply,select,hydrate,motifs:Object.keys(MOTIFS),actions:ACTIONS,motifImage:theme=>motifTile(theme,SHELL_OPACITY),list:()=>saved.unlocked.slice(),selected:()=>saved.selected,theme:id=>SHELL_THEMES[id]||defaults});
})();
