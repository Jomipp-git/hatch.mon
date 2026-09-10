/* Renderer visual independiente. IDs canónicos explícitos; geometría y tiempos
 * leídos de AnimData.xml. Alias verificados: Raichu Alola -> raichu_alola;
 * Toxtricity Amped -> toxtricity_amped; Low Key -> toxtricity_low_key.
 * Sin inferencia anatómica ni matching de nombres en runtime. */
'use strict';
const POKEMON_VISUALS={
  "0172A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_pichu/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      533.333,
      66.667,
      100.0,
      100.0
    ],
    "scale": 3,
    "crop": {
      "x": 3,
      "y": 3,
      "width": 24,
      "height": 26
    }
  },
  "0025A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_pikachu/Idle-Anim.png",
    "width": 40,
    "height": 56,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      666.667,
      33.333,
      50.0,
      50.0,
      50.0,
      33.333
    ],
    "scale": 3,
    "crop": {
      "x": 11,
      "y": 3,
      "width": 20,
      "height": 30
    }
  },
  "0026A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_raichu/Idle-Anim.png",
    "width": 40,
    "height": 56,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      666.667,
      33.333,
      66.667,
      66.667,
      66.667,
      33.333
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 4,
      "width": 29,
      "height": 30
    }
  },
  "0026L0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_raichu_alola/Idle-Anim.png",
    "width": 40,
    "height": 72,
    "columns": 7,
    "row": 0,
    "frames": 7,
    "durations": [
      200.0,
      166.667,
      150.0,
      150.0,
      200.0,
      166.667,
      150.0
    ],
    "scale": 3,
    "crop": {
      "x": 3,
      "y": 5,
      "width": 32,
      "height": 34
    }
  },
  "0133A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_eevee/Idle-Anim.png",
    "width": 24,
    "height": 32,
    "columns": 2,
    "row": 0,
    "frames": 2,
    "durations": [
      266.667,
      266.667
    ],
    "scale": 3,
    "crop": {
      "x": 3,
      "y": 4,
      "width": 19,
      "height": 18
    }
  },
  "0134A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_vaporeon/Idle-Anim.png",
    "width": 40,
    "height": 56,
    "columns": 2,
    "row": 0,
    "frames": 2,
    "durations": [
      1000.0,
      266.667
    ],
    "scale": 3,
    "crop": {
      "x": 8,
      "y": 7,
      "width": 23,
      "height": 29
    }
  },
  "0135A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_jolteon/Idle-Anim.png",
    "width": 32,
    "height": 40,
    "columns": 2,
    "row": 0,
    "frames": 2,
    "durations": [
      1000.0,
      266.667
    ],
    "scale": 3,
    "crop": {
      "x": 5,
      "y": 1,
      "width": 21,
      "height": 27
    }
  },
  "0136A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_flareon/Idle-Anim.png",
    "width": 32,
    "height": 40,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      200.0,
      266.667,
      200.0,
      266.667
    ],
    "scale": 3,
    "crop": {
      "x": 5,
      "y": 3,
      "width": 21,
      "height": 24
    }
  },
  "0196A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_espeon/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      133.333,
      133.333,
      133.333,
      133.333
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 5,
      "width": 25,
      "height": 26
    }
  },
  "0197A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_umbreon/Idle-Anim.png",
    "width": 24,
    "height": 48,
    "columns": 14,
    "row": 0,
    "frames": 14,
    "durations": [
      1000.0,
      166.667,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      166.667
    ],
    "scale": 3,
    "crop": {
      "x": 3,
      "y": 2,
      "width": 18,
      "height": 30
    }
  },
  "0470A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_leafeon/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      1000.0,
      166.667,
      300.0,
      166.667,
      66.667,
      166.667
    ],
    "scale": 3,
    "crop": {
      "x": 6,
      "y": 3,
      "width": 21,
      "height": 28
    }
  },
  "0471A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_glaceon/Idle-Anim.png",
    "width": 32,
    "height": 40,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      1000.0,
      166.667,
      300.0,
      166.667,
      66.667,
      166.667
    ],
    "scale": 3,
    "crop": {
      "x": 5,
      "y": 3,
      "width": 23,
      "height": 24
    }
  },
  "0700A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_sylveon/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 8,
    "row": 0,
    "frames": 8,
    "durations": [
      116.667,
      116.667,
      116.667,
      116.667,
      116.667,
      116.667,
      116.667,
      116.667
    ],
    "scale": 3,
    "crop": {
      "x": 5,
      "y": 0,
      "width": 23,
      "height": 32
    }
  },
  "0236A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_tyrogue/Idle-Anim.png",
    "width": 24,
    "height": 48,
    "columns": 7,
    "row": 0,
    "frames": 7,
    "durations": [
      500.0,
      16.667,
      33.333,
      66.667,
      66.667,
      33.333,
      16.667
    ],
    "scale": 3,
    "crop": {
      "x": 3,
      "y": 1,
      "width": 18,
      "height": 28
    }
  },
  "0106A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_hitmonlee/Idle-Anim.png",
    "width": 40,
    "height": 48,
    "columns": 2,
    "row": 0,
    "frames": 2,
    "durations": [
      666.667,
      333.333
    ],
    "scale": 3,
    "crop": {
      "x": 5,
      "y": 6,
      "width": 29,
      "height": 25
    }
  },
  "0107A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_hitmonchan/Idle-Anim.png",
    "width": 48,
    "height": 56,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      500.0,
      100.0,
      133.333,
      100.0
    ],
    "scale": 3,
    "crop": {
      "x": 12,
      "y": 8,
      "width": 22,
      "height": 33
    }
  },
  "0237A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_hitmontop/Idle-Anim.png",
    "width": 24,
    "height": 56,
    "columns": 8,
    "row": 0,
    "frames": 8,
    "durations": [
      500.0,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333
    ],
    "scale": 3,
    "crop": {
      "x": 0,
      "y": 3,
      "width": 23,
      "height": 31
    }
  },
  "0446A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_munchlax/Idle-Anim.png",
    "width": 24,
    "height": 40,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      500.0,
      266.667,
      166.667,
      266.667
    ],
    "scale": 3,
    "crop": {
      "x": 3,
      "y": 2,
      "width": 19,
      "height": 25
    }
  },
  "0143A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_snorlax/Idle-Anim.png",
    "width": 32,
    "height": 64,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      666.667,
      16.667,
      50.0,
      66.667,
      50.0,
      16.667
    ],
    "scale": 3,
    "crop": {
      "x": 1,
      "y": 7,
      "width": 30,
      "height": 31
    }
  },
  "0447A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_riolu/Idle-Anim.png",
    "width": 32,
    "height": 40,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      666.667,
      266.667,
      200.0,
      266.667
    ],
    "scale": 3,
    "crop": {
      "x": 7,
      "y": 4,
      "width": 18,
      "height": 21
    }
  },
  "0448A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_lucario/Idle-Anim.png",
    "width": 32,
    "height": 56,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      666.667,
      33.333,
      33.333,
      66.667,
      33.333,
      33.333
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 5,
      "width": 25,
      "height": 29
    }
  },
  "0848A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_toxel/Idle-Anim.png",
    "width": 32,
    "height": 32,
    "columns": 2,
    "row": 0,
    "frames": 2,
    "durations": [
      200.0,
      200.0
    ],
    "scale": 3,
    "crop": {
      "x": 7,
      "y": 0,
      "width": 18,
      "height": 22
    }
  },
  "0849A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_toxtricity_amped/Idle-Anim.png",
    "width": 32,
    "height": 72,
    "columns": 10,
    "row": 0,
    "frames": 10,
    "durations": [
      666.667,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      200.0
    ],
    "scale": 3,
    "crop": {
      "x": 2,
      "y": 5,
      "width": 28,
      "height": 37
    }
  },
  "0849B0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_toxtricity_low_key/Idle-Anim.png",
    "width": 32,
    "height": 64,
    "columns": 10,
    "row": 0,
    "frames": 10,
    "durations": [
      666.667,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      33.333,
      200.0
    ],
    "scale": 3,
    "crop": {
      "x": 2,
      "y": 3,
      "width": 28,
      "height": 35
    }
  },
  "0173A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_cleffa/Idle-Anim.png",
    "width": 24,
    "height": 32,
    "columns": 2,
    "row": 0,
    "frames": 2,
    "durations": [
      600.0,
      300.0
    ],
    "scale": 3,
    "crop": {
      "x": 2,
      "y": 2,
      "width": 19,
      "height": 20
    }
  },
  "0035A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_clefairy/Idle-Anim.png",
    "width": 32,
    "height": 40,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      500.0,
      50.0,
      66.667,
      83.333,
      66.667,
      50.0
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 3,
      "width": 25,
      "height": 23
    }
  },
  "0036A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_clefable/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      500.0,
      100.0,
      100.0,
      100.0,
      100.0,
      100.0
    ],
    "scale": 3,
    "crop": {
      "x": 1,
      "y": 4,
      "width": 30,
      "height": 26
    }
  },
  "0174A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_igglybuff/Idle-Anim.png",
    "width": 24,
    "height": 24,
    "columns": 2,
    "row": 0,
    "frames": 2,
    "durations": [
      266.667,
      266.667
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 1,
      "width": 15,
      "height": 17
    }
  },
  "0039A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_jigglypuff/Idle-Anim.png",
    "width": 24,
    "height": 32,
    "columns": 5,
    "row": 0,
    "frames": 5,
    "durations": [
      416.667,
      133.333,
      250.0,
      133.333,
      250.0
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 1,
      "width": 17,
      "height": 21
    }
  },
  "0040A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_wigglytuff/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      666.667,
      66.667,
      100.0,
      66.667
    ],
    "scale": 3,
    "crop": {
      "x": 3,
      "y": 5,
      "width": 26,
      "height": 25
    }
  },
  "0175A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_togepi/Idle-Anim.png",
    "width": 24,
    "height": 32,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      500.0,
      133.333,
      166.667,
      133.333
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 3,
      "width": 16,
      "height": 19
    }
  },
  "0176A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_togetic/Idle-Anim.png",
    "width": 24,
    "height": 48,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      500.0,
      66.667,
      50.0,
      50.0,
      50.0,
      66.667
    ],
    "scale": 3,
    "crop": {
      "x": 5,
      "y": 3,
      "width": 13,
      "height": 27
    }
  },
  "0468A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_togekiss/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 8,
    "row": 0,
    "frames": 8,
    "durations": [
      133.333,
      66.667,
      100.0,
      133.333,
      133.333,
      133.333,
      133.333,
      200.0
    ],
    "scale": 3,
    "crop": {
      "x": 0,
      "y": 2,
      "width": 31,
      "height": 27
    }
  },
  "0298A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_azurill/Idle-Anim.png",
    "width": 24,
    "height": 32,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      266.667,
      166.667,
      266.667,
      166.667
    ],
    "scale": 3,
    "crop": {
      "x": 2,
      "y": 0,
      "width": 19,
      "height": 22
    }
  },
  "0183A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_marill/Idle-Anim.png",
    "width": 32,
    "height": 40,
    "columns": 2,
    "row": 0,
    "frames": 2,
    "durations": [
      433.333,
      266.667
    ],
    "scale": 3,
    "crop": {
      "x": 7,
      "y": 3,
      "width": 18,
      "height": 23
    }
  },
  "0184A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_azumarill/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      500.0,
      100.0,
      100.0,
      100.0
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 0,
      "width": 27,
      "height": 30
    }
  },
  "0458A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_mantyke/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 7,
    "row": 0,
    "frames": 7,
    "durations": [
      300.0,
      133.333,
      100.0,
      200.0,
      200.0,
      133.333,
      100.0
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 6,
      "width": 25,
      "height": 21
    }
  },
  "0226A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_mantine/Idle-Anim.png",
    "width": 64,
    "height": 72,
    "columns": 8,
    "row": 0,
    "frames": 8,
    "durations": [
      200.0,
      200.0,
      200.0,
      200.0,
      200.0,
      200.0,
      200.0,
      200.0
    ],
    "scale": 3,
    "crop": {
      "x": 4,
      "y": 1,
      "width": 56,
      "height": 43
    }
  },
  "0239A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_elekid/Idle-Anim.png",
    "width": 32,
    "height": 56,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      500.0,
      66.667,
      100.0,
      66.667
    ],
    "scale": 3,
    "crop": {
      "x": 0,
      "y": 3,
      "width": 32,
      "height": 30
    }
  },
  "0125A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_electabuzz/Idle-Anim.png",
    "width": 40,
    "height": 56,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      466.667,
      300.0,
      466.667,
      300.0
    ],
    "scale": 3,
    "crop": {
      "x": 6,
      "y": 6,
      "width": 27,
      "height": 29
    }
  },
  "0466A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_electivire/Idle-Anim.png",
    "width": 48,
    "height": 56,
    "columns": 7,
    "row": 0,
    "frames": 7,
    "durations": [
      666.667,
      200.0,
      33.333,
      50.0,
      100.0,
      33.333,
      66.667
    ],
    "scale": 3,
    "crop": {
      "x": 5,
      "y": 1,
      "width": 38,
      "height": 34
    }
  },
  "0240A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_magby/Idle-Anim.png",
    "width": 24,
    "height": 48,
    "columns": 6,
    "row": 0,
    "frames": 6,
    "durations": [
      500.0,
      33.333,
      50.0,
      66.667,
      50.0,
      33.333
    ],
    "scale": 3,
    "crop": {
      "x": 2,
      "y": 2,
      "width": 21,
      "height": 28
    }
  },
  "0126A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_magmar/Idle-Anim.png",
    "width": 32,
    "height": 48,
    "columns": 4,
    "row": 0,
    "frames": 4,
    "durations": [
      666.667,
      100.0,
      200.0,
      100.0
    ],
    "scale": 3,
    "crop": {
      "x": 3,
      "y": 4,
      "width": 26,
      "height": 27
    }
  },
  "0467A0": {
    "type": "sheet",
    "src": "assets/sprites/sprite_magmortar/Idle-Anim.png",
    "width": 40,
    "height": 48,
    "columns": 3,
    "row": 0,
    "frames": 3,
    "durations": [
      1000.0,
      433.333,
      433.333
    ],
    "scale": 3,
    "crop": {
      "x": 2,
      "y": 1,
      "width": 35,
      "height": 30
    }
  }
};
const POKEMON_RENDER_CONFIG={maxWidth:112,maxHeight:120,placeholderScale:4,
  palette:[null,'#344e3b','#71915b','#bed09a'],
  placeholder:{type:'matrix',pixels:[
    '0000000000000000',
    '0000011111100000',
    '0001122222211000',
    '0012223333222100',
    '0122333333332210',
    '0123313333132210',
    '0123313333132210',
    '0122333333332210',
    '0122331113332210',
    '0012233333322100',
    '0001122222211000',
    '0000011111100000',
    '0000000000000000'
  ]},
  memorial:{type:'matrix',pixels:['00111100','01222210','12311321','12311321','12111121','12311321','12333321','12333321','12222221','11111111']}
};
globalThis.PokemonRenderer=(()=>{
  const cache=new Map();
  function definition(speciesId){const def=POKEMON_VISUALS[PokemonData.canonicalId(speciesId)];return !def||def.type==='placeholder'?POKEMON_RENDER_CONFIG.placeholder:def;}
  function load(src){
    if(!cache.has(src))cache.set(src,new Promise(resolve=>{
      const img=new Image(),timeout=setTimeout(()=>resolve(null),5000);img.onload=()=>{clearTimeout(timeout);resolve(img);};img.onerror=()=>{clearTimeout(timeout);resolve(null);};img.src=src;
    }));return cache.get(src);
  }
  function frameBounds(def){
    const c=def.crop||{x:0,y:0,width:def.width||16,height:def.height||16};
    return def.frameBounds||[[c.x,c.y,c.x+c.width,c.y+c.height]];
  }
  const geometryCache=new Map();
  function geometry(speciesId,list=false){
    const id=PokemonData.canonicalId(speciesId),key=id+':'+list;
    if(geometryCache.has(key))return geometryCache.get(key);
    const base=definition(id),idle=(typeof PmdVisuals==='undefined'?null:PmdVisuals.candidates(id,'normal')[0])||base;
    const c=idle.crop||{width:16,height:16};
    const animations=list?[idle]:['normal','sleep','eat','happy','sick','train','faint'].flatMap(state=>typeof PmdVisuals==='undefined'?[base]:PmdVisuals.candidates(id,state));
    const sizes=animations.flatMap(d=>frameBounds(d).map(b=>[b[2]-b[0],b[3]-b[1]]));
    const target=84,limit=98;
    const metric=list&&typeof PMD_LIST_METRICS!=='undefined'?PMD_LIST_METRICS[id]:null;
    const scale=metric?Math.min(Math.sqrt(2700/metric.opaqueArea),limit/metric.width,limit/metric.height):Math.min(target/c.height,limit/c.width,limit/Math.max(...sizes.map(b=>b[0])),limit/Math.max(...sizes.map(b=>b[1])));
    const result=Object.freeze({scale,width:104,height:104,baseline:101});geometryCache.set(key,result);return result;
  }
  function create(host,{list=false}={}){
    let key=null,serial=0,timer=null,canvas=null,paused=false,currentDraw=null;
    const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
    const stop=()=>{serial++;cancel();key=null;currentDraw=null;host.replaceChildren();};
    function matrix(def){
      const pixels=def.pixels,width=pixels[0].length,height=pixels.length;
      const scale=Math.max(1,Math.min(POKEMON_RENDER_CONFIG.placeholderScale,Math.floor(POKEMON_RENDER_CONFIG.maxWidth/width),Math.floor(POKEMON_RENDER_CONFIG.maxHeight/height)));
      const offsetX=Math.floor((canvas.width-width*scale)/2),offsetY=canvas.height-height*scale;
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);
      const palette=def.palette||POKEMON_RENDER_CONFIG.palette;
      pixels.forEach((row,y)=>Array.from(row).forEach((value,x)=>{if(palette[Number(value)]){ctx.fillStyle=palette[Number(value)];ctx.fillRect(offsetX+x*scale,offsetY+y*scale,scale,scale);}}));
    }
    function renderPokemon(speciesId,{dead=false,resting=false,visualState='normal',animate=true,isShiny=false}={}){
      const nextKey=`${speciesId}:${dead}:${resting}:${visualState}:${animate}:${isShiny}`;
      if(key===nextKey)return;stop();key=nextKey;const token=serial;
      canvas=document.createElement('canvas');canvas.className='pokemon-pixels';canvas.setAttribute('aria-hidden','true');host.append(canvas);
      const metrics=geometry(speciesId,list);canvas.width=metrics.width;canvas.height=metrics.height;canvas.style.width=`${metrics.width*1.3}px`;canvas.style.height=`${metrics.height*1.3}px`;
      const base=definition(speciesId),available=typeof PmdVisuals==='undefined'?[]:PmdVisuals.candidates(speciesId,visualState,isShiny);
      const definitions=dead?[POKEMON_RENDER_CONFIG.memorial]:[...available,base,POKEMON_RENDER_CONFIG.placeholder];
      const seen=new Set();const candidates=definitions.filter(d=>{const key=d.src||d;if(seen.has(key))return false;seen.add(key);return true;});
      host.dataset.speciesId=PokemonData.canonicalId(speciesId)||'';host.classList.toggle('resting',resting&&!dead);
      function attempt(){
        if(serial!==token)return;
        const def=candidates.shift()||POKEMON_RENDER_CONFIG.placeholder;
        if(visualState==='eat'&&def.animationName==='Eat'&&!PmdVisuals.stableEat(speciesId,def)){attempt();return;}
        if(def.type==='matrix'||def.type==='bitmap'){host.dataset.visual=dead?'memorial':'placeholder';matrix(def);return;}
        host.dataset.visual='loading';
        load(def.src).then(img=>{
        if(serial!==token)return;
        if(!img){attempt();return;}
        const w=def.width||img.naturalWidth,h=def.height||img.naturalHeight;
        const columns=def.type==='sheet'?def.columns:1,frames=def.type==='sheet'?def.frames:1,row=def.row||0;
        if(!Number.isInteger(w)||!Number.isInteger(h)||w<=0||h<=0||w*columns>img.naturalWidth||(row+1)*h>img.naturalHeight||frames>columns){attempt();return;}
        const first=list?def.frameBounds?.[0]:null;
        const crop=first?{x:first[0],y:first[1],width:first[2]-first[0],height:first[3]-first[1]}:def.crop||{x:0,y:0,width:w,height:h};
        if(crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>w||crop.y+crop.height>h){attempt();return;}
        if((list?[frameBounds(def)[0]]:frameBounds(def)).some(b=>(b[2]-b[0])*metrics.scale>98||(b[3]-b[1])*metrics.scale>98)){attempt();return;}
        host.dataset.visual='asset';host.dataset.asset=def.src;host.dataset.visualState=visualState;
        canvas.classList.toggle('feeding-idle',visualState==='eat'&&def.animationName!=='Eat'&&animate);
        const scale=metrics.scale;let frame=0;
        currentDraw=()=>{
          cancel();if(serial!==token||paused)return;
          const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.save();if(def.flip){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
          const b=frameBounds(def)[frame]||frameBounds(def)[0];
          const fw=b[2]-b[0],fh=b[3]-b[1];
          const x=Math.max(3,Math.min(canvas.width-3-fw*scale,(canvas.width-crop.width*scale)/2+(b[0]-crop.x)*scale));
          const y=Math.max(3,Math.min(metrics.baseline-fh*scale,metrics.baseline-(crop.y+crop.height-b[1])*scale));
          ctx.drawImage(img,frame*w+b[0],row*h+b[1],fw,fh,x,y,fw*scale,fh*scale);ctx.restore();
          if(animate&&frames>1&&!(visualState==='faint'&&frame===frames-1)&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
            const delay=typeof PmdVisuals==='undefined'?def.durations?.[frame]||1000/(def.fps||4):PmdVisuals.frameDuration(def,frame);frame=(frame+1)%frames;timer=setTimeout(currentDraw,delay);
          }
        };currentDraw();
      });
      }attempt();
    }
    return {renderPokemon,stop,pause(){paused=true;cancel();},resume(){paused=false;currentDraw?.();}};
  }
  function createEgg(sprite,{config,motion:eggMotion,createFallback}){
const eggAssets=new Map();
function loadEggAsset(assetConfig){
  return new Promise(resolve=>{
    const image=new Image();let settled=false;
    const finish=value=>{if(settled)return;settled=true;clearTimeout(deadline);image.onload=null;image.onerror=null;resolve(value);};
    const deadline=setTimeout(()=>finish(null),5000);
    image.onload=()=>{
      const w=image.naturalWidth,h=image.naturalHeight;
      finish(w>0&&h>0&&w%config.columns===0&&h%config.rows===0
        ?{image,width:w/config.columns,height:h/config.rows}:null);
    };
    image.onerror=()=>finish(null);image.src=assetConfig.url;
  });
}
const eggAssetsReady=Promise.all(Object.entries(config.phases).map(async([phase,config])=>[Number(phase),await loadEggAsset(config)]))
  .then(entries=>{
    // Mantener idéntica geometría entre fases; las hojas incompatibles no se usan.
    const reference=entries.find(([,asset])=>asset)?.[1];
    for(const[phase,asset]of entries)eggAssets.set(phase,asset&&asset.width===reference.width&&asset.height===reference.height?asset:null);
  });
function createEggController(sprite){
  let phase=null,index=0,timeout=null,due=0,remaining=0,token=0,ready=false,complete=null,done=false,holding=false;
  let paused=document.hidden,asset=null;
  const clear=()=>{if(timeout!==null)clearTimeout(timeout);timeout=null;};
  function paint(frame){
    sprite.dataset.eggPhase=String(phase);sprite.dataset.eggFrame=String(frame);
    if(asset){
      if(!sprite.classList.contains('sheet'))sprite.classList.add('sheet');
      sprite.textContent='';
      // La geometría del archivo solo define la proporción, nunca el tamaño en pantalla.
      const longest=Math.max(asset.width,asset.height);
      sprite.style.setProperty('--frame-ratio-width',String(asset.width/longest));sprite.style.setProperty('--frame-ratio-height',String(asset.height/longest));
      sprite.style.backgroundImage=`url("${config.phases[phase].url}")`;
      // Con fondo 400%×400%, cada tercio del recorrido corresponde a una celda.
      sprite.style.backgroundPosition=`${frame%4*100/(config.columns-1)}% ${Math.floor(frame/4)*100/(config.rows-1)}%`;
    }else{sprite.classList.remove('sheet');sprite.style.backgroundImage='';sprite.replaceChildren(createFallback());}
  }
  function schedule(delay){
    clear();remaining=delay;
    if(paused||!ready||done||phase===null)return;
    due=performance.now()+delay;timeout=setTimeout(step,delay);
  }
  function finish(){
    clear();done=true;const callback=complete;complete=null;if(callback)callback();
  }
  function step(){
    timeout=null;
    if(paused||!ready||done||phase===null)return;
    const phaseConfig=config.phases[phase];
    if(eggMotion.matches){finish();return;} // Solo fase 5 agenda este caso.
    if(index+1<phaseConfig.sequence.length){index++;paint(phaseConfig.sequence[index]);schedule(1000/phaseConfig.fps);return;}
    if(phase===5){
      if(!holding){holding=true;schedule(phaseConfig.revealPauseMs||0);return;}
      finish();return;
    }
    index=0;paint(phaseConfig.sequence[0]);
    schedule(phaseConfig.pause[0]+Math.random()*(phaseConfig.pause[1]-phaseConfig.pause[0]));
  }
  function startPlayback(){
    asset=eggAssets.get(phase)||null;ready=true;index=0;
    const phaseConfig=config.phases[phase];
    paint(eggMotion.matches&&phase===5?phaseConfig.frames-1:phaseConfig.sequence[0]);
    if(eggMotion.matches){if(phase===5)schedule(350);return;}
    schedule(phase===5?1000/phaseConfig.fps:phaseConfig.pause[0]+Math.random()*(phaseConfig.pause[1]-phaseConfig.pause[0]));
  }
  function setPhase(next,onComplete=null){
    if(phase===next)return; // render() periódico no reinicia frames ni temporizadores.
    clear();phase=next;ready=false;done=false;holding=false;index=0;complete=onComplete;
    const request=++token;
    // Retener el frame anterior mientras termina la precarga, evitando parpadeos.
    eggAssetsReady.then(()=>{if(request===token&&phase===next)startPlayback();});
  }
  function stop(){clear();token++;phase=null;ready=false;complete=null;done=false;asset=null;}
  function pause(){if(paused)return;paused=true;if(timeout!==null)remaining=Math.max(0,due-performance.now());clear();}
  function resume(){if(!paused)return;paused=false;if(ready&&!done&&phase!==null&&(!eggMotion.matches||phase===5))schedule(remaining);}
  function motionChanged(){
    if(!ready||phase===null||done)return;clear();
    if(eggMotion.matches){paint(phase===5?15:0);if(phase===5)schedule(350);}
    else{paint(config.phases[phase].sequence[index]);schedule(1000/config.phases[phase].fps);}
  }
  eggMotion.addEventListener('change',motionChanged);
  return {setPhase,stop,pause,resume};
}
    return createEggController(sprite);
  }
  return Object.freeze({create,createEgg,definition,geometry});
})();
