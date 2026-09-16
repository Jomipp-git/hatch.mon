/* Prepared identity policy. Activation waits for complete, geometry-verified PMD assets. */
'use strict';
globalThis.Shiny=Object.freeze({enabled:true,
 probability(rarity){if(!Number.isInteger(rarity)||rarity<1||rarity>5)throw Error('Rareza canónica inválida');return 1/(10*rarity);},
 // El multiplicador lo aporta la herencia del huevo criado. Multiplica en vez de sumar para no
 // aplanar la curva de rareza: lo raro sigue siendo raro, solo que el doble de accesible.
 roll(speciesId,rng=Math.random,multiplier=1){
  const factor=Number.isFinite(multiplier)&&multiplier>=1?multiplier:1;
  return rng()<Math.min(1,this.probability(PokemonData.get(speciesId)?.Rarity)*factor);}
});
