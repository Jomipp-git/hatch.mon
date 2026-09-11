'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
for (const file of ['evolutionTable.js', 'hatchmonData_v2.js', 'pokemonDataAdapter.js', 'assets/pmd/manifest.js', 'assets/skins/themes.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}
const {ids, roots, assets, themes} = vm.runInContext(`({
  ids: Object.keys(evolutionTable).map(id => PokemonData.canonicalId(id)),
  roots: PokemonData.roots(), assets: PMD_ASSETS, themes: SHELL_THEMES
})`, context);
// Coverage requires Idle and all declared local files; image/render QA stays in the PMD tests.
const covered = variant => Boolean(variant?.sprites?.Idle?.src) &&
  [...Object.values(variant.sprites).map(sprite => sprite.src), ...Object.values(variant.portraits || {})]
    .every(src => typeof src === 'string' && fs.existsSync(path.join(root, src)));

console.log(`Runtime forms: ${ids.length}`);
console.log(`Egg roots: ${roots.length}`);
console.log(`Evolution-only: ${ids.length - roots.length}`);
console.log(`PMD normal: ${ids.filter(id => covered(assets[id])).length}/${ids.length}`);
console.log(`PMD shiny: ${ids.filter(id => covered(assets[id]?.shiny)).length}/${ids.length}`);
console.log(`Shell themes: ${ids.filter(id => Object.hasOwn(themes, id)).length}/${ids.length}`);
