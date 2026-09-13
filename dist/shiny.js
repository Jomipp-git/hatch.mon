/* Prepared identity policy. Activation waits for complete, geometry-verified PMD assets. */
'use strict';
globalThis.Shiny=Object.freeze({enabled:true,
 probability(rarity){if(!Number.isInteger(rarity)||rarity<1||rarity>5)throw Error('Rareza canónica inválida');return 1/(10*rarity);},
 roll(speciesId,rng=Math.random){return rng()<this.probability(PokemonData.get(speciesId)?.Rarity);}
});
