const evolutionTable = {
  pichu: { 
    nombre: 'Pichu', emoji: '⚡', etapa: 'Baby', 
    evoluciones: [
      { destino: 'pikachu', edadMinima: 1.0, estadisticas: { felicidad: 70 }, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] }
    ] 
  },
  pikachu: { 
    nombre: 'Pikachu', emoji: '🐭⚡', etapa: 'Kid', 
    evoluciones: [
      { destino: 'raichu', edadMinima: 2.0, objeto: 'piedra_trueno' },
      { destino: 'raichualola', edadMinima: 2.0, estadisticas: { style: 80 }, objeto: 'piedra_trueno' }
    ] 
  },
  raichu: { nombre: 'Raichu', emoji: '⚡🐹', etapa: 'Adult', evoluciones: [] },
  raichualola: { nombre: 'Raichu Alola', emoji: '🏄‍♂️⚡', etapa: 'Adult', evoluciones: [] },
  
  eevee: { 
    nombre: 'Eevee', emoji: '🦊', etapa: 'Kid', 
    evoluciones: [
      { destino: 'vaporeon', edadMinima: 1.0, objeto: 'piedra_agua' },
      { destino: 'jolteon', edadMinima: 1.0, objeto: 'piedra_trueno' },
      { destino: 'flareon', edadMinima: 1.0, objeto: 'piedra_fuego' },
      { destino: 'leafeon', edadMinima: 1.0, objeto: 'piedra_hoja' },
      { destino: 'glaceon', edadMinima: 1.0, objeto: 'piedra_hielo' },
      { destino: 'espeon', edadMinima: 1.5, estadisticas: { iq: 70 }, sostenidas: [{ estadistica: 'felicidad', minimo: 80, duracionMs: 8 * 60 * 60 * 1000 }] },
      { destino: 'umbreon', edadMinima: 1.5, estadisticas: { strength: 70 }, sostenidas: [{ estadistica: 'felicidad', minimo: 80, duracionMs: 8 * 60 * 60 * 1000 }] },
      { destino: 'sylveon', edadMinima: 1.5, estadisticas: { kindness: 70 }, sostenidas: [{ estadistica: 'felicidad', minimo: 80, duracionMs: 8 * 60 * 60 * 1000 }] }
    ] 
  },
  vaporeon: { nombre: 'Vaporeon', emoji: '💧🦊', etapa: 'Adult', evoluciones: [] },
  jolteon: { nombre: 'Jolteon', emoji: '⚡🦊', etapa: 'Adult', evoluciones: [] },
  flareon: { nombre: 'Flareon', emoji: '🔥🦊', etapa: 'Adult', evoluciones: [] },
  espeon: { nombre: 'Espeon', emoji: '🔮🦊', etapa: 'Adult', evoluciones: [] },
  umbreon: { nombre: 'Umbreon', emoji: '🌙🦊', etapa: 'Adult', evoluciones: [] },
  leafeon: { nombre: 'Leafeon', emoji: '🍃🦊', etapa: 'Adult', evoluciones: [] },
  glaceon: { nombre: 'Glaceon', emoji: '❄️🦊', etapa: 'Adult', evoluciones: [] },
  sylveon: { nombre: 'Sylveon', emoji: '🎀🦊', etapa: 'Adult', evoluciones: [] },

  tyrogue: { 
    nombre: 'Tyrogue', emoji: '🥊', etapa: 'Baby', 
    evoluciones: [
      { destino: 'hitmonlee', edadMinima: 1.5, estadisticas: { strength: 70, style: 30 } },
      { destino: 'hitmonchan', edadMinima: 1.5, estadisticas: { iq: 70, strength: 30 } },
      { destino: 'hitmontop', edadMinima: 1.5, estadisticas: { style: 50, strength: 50 } }
    ] 
  },
  hitmonlee: { nombre: 'Hitmonlee', emoji: '🦵', etapa: 'Adult', evoluciones: [] },
  hitmonchan: { nombre: 'Hitmonchan', emoji: '👊', etapa: 'Adult', evoluciones: [] },
  hitmontop: { nombre: 'Hitmontop', emoji: '🌀', etapa: 'Adult', evoluciones: [] },

  munchlax: { 
    nombre: 'Munchlax', emoji: '🐻', etapa: 'Baby', 
    evoluciones: [
      { destino: 'snorlax', edadMinima: 1.5, sostenidas: [{ estadistica: 'hambre', minimo: 80, duracionMs: 12 * 60 * 60 * 1000 }] }
    ] 
  },
  snorlax: { nombre: 'Snorlax', emoji: '🐻💤', etapa: 'Adult', evoluciones: [] },

  riolu: { 
    nombre: 'Riolu', emoji: '🐕', etapa: 'Baby', 
    evoluciones: [
      { destino: 'lucario', edadMinima: 1.5, estadisticas: { iq: 70, strength: 70 }, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 8 * 60 * 60 * 1000 }] }
    ] 
  },
  lucario: { nombre: 'Lucario', emoji: '🥷', etapa: 'Adult', evoluciones: [] },

  toxel: { 
    nombre: 'Toxel', emoji: '💜', etapa: 'Baby', 
    evoluciones: [
      { destino: 'toxtricityamp', edadMinima: 1.5, estadisticas: { strength: 70 }, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] },
      { destino: 'toxtricitylow', edadMinima: 1.5, estadisticas: { style: 70 }, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] }
    ] 
  },
  toxtricityamp: { nombre: 'Toxtricity (Aguda)', emoji: '🎸', etapa: 'Adult', evoluciones: [] },
  toxtricitylow: { nombre: 'Toxtricity (Grave)', emoji: '🎸', etapa: 'Adult', evoluciones: [] },

  // Resto de bebés genéricos estructurados con base en la tabla
  cleffa: { nombre: 'Cleffa', emoji: '⭐', etapa: 'Baby', evoluciones: [{ destino: 'clefairy', edadMinima: 1.0, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] }] },
  clefairy: { nombre: 'Clefairy', emoji: '🌟', etapa: 'Kid', evoluciones: [{ destino: 'clefable', edadMinima: 2.0, objeto: 'piedra_lunar' }] },
  clefable: { nombre: 'Clefable', emoji: '🌟🧚', etapa: 'Adult', evoluciones: [] },

  igglybuff: { nombre: 'Igglybuff', emoji: '🎈', etapa: 'Baby', evoluciones: [{ destino: 'jigglypuff', edadMinima: 1.0, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] }] },
  jigglypuff: { nombre: 'Jigglypuff', emoji: '🎤', etapa: 'Kid', evoluciones: [{ destino: 'wigglytuff', edadMinima: 2.0, objeto: 'piedra_lunar' }] },
  wigglytuff: { nombre: 'Wigglytuff', emoji: '🎶', etapa: 'Adult', evoluciones: [] },

  togepi: { nombre: 'Togepi', emoji: '🥚✨', etapa: 'Baby', evoluciones: [{ destino: 'togetic', edadMinima: 1.0, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] }] },
  togetic: { nombre: 'Togetic', emoji: '✨🪽', etapa: 'Kid', evoluciones: [{ destino: 'togekiss', edadMinima: 2.0, objeto: 'piedra_dia' }] },
  togekiss: { nombre: 'Togekiss', emoji: '🕊️', etapa: 'Adult', evoluciones: [] },

  azurill: { nombre: 'Azurill', emoji: '🔵', etapa: 'Baby', evoluciones: [{ destino: 'marill', edadMinima: 1.0, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] }] },
  marill: { nombre: 'Marill', emoji: '🐭💧', etapa: 'Kid', evoluciones: [{ destino: 'azumarill', edadMinima: 2.0, accionRequerida: 'jugar', repeticionesAccion: 10 }] },
  azumarill: { nombre: 'Azumarill', emoji: '🐰💧', etapa: 'Adult', evoluciones: [] },

  mantyke: { nombre: 'Mantyke', emoji: '🌊', etapa: 'Baby', evoluciones: [{ destino: 'mantine', edadMinima: 1.5, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }], accionRequerida: 'limpiar', repeticionesAccion: 10 }] },
  mantine: { nombre: 'Mantine', emoji: '🦈', etapa: 'Adult', evoluciones: [] },

  elekid: { nombre: 'Elekid', emoji: '🔌', etapa: 'Baby', evoluciones: [{ destino: 'electabuzz', edadMinima: 1.0, estadisticas: { strength: 50 }, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] }] },
  electabuzz: { nombre: 'Electabuzz', emoji: '⚡👹', etapa: 'Kid', evoluciones: [{ destino: 'electivire', edadMinima: 2.0, objeto: 'Electrizador' }] },
  electivire: { nombre: 'Electivire', emoji: '⚡🦍', etapa: 'Adult', evoluciones: [] },

  magby: { nombre: 'Magby', emoji: '🔥', etapa: 'Baby', evoluciones: [{ destino: 'magmar', edadMinima: 1.0, estadisticas: { style: 50 }, sostenidas: [{ estadistica: 'felicidad', minimo: 70, duracionMs: 6 * 60 * 60 * 1000 }] }] },
  magmar: { nombre: 'Magmar', emoji: '🔥👹', etapa: 'Kid', evoluciones: [{ destino: 'magmortar', edadMinima: 2.0, objeto: 'Magmatizador' }] },
  magmortar: { nombre: 'Magmortar', emoji: '🔥💥', etapa: 'Adult', evoluciones: [] }
};