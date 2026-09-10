/* Adaptador de la fuente generada v2. No duplica fichas biológicas.
 * Los alias solo enlazan nombres históricos con formas verificadas en la fuente.
 */
'use strict';
globalThis.PokemonData = (() => {
  if(HATCHMON_DATA.schemaVersion!==2)throw Error('Se requiere hatchmonData_v2.js (schemaVersion 2).');
  const records=new Map(HATCHMON_DATA.pokemon.map(p=>[p.PokemonId,p]));
  const aliases={raichualola:'0026L0',toxtricityamp:'0849A0',toxtricitylow:'0849B0'};
  const legacyToCanonical=new Map(),canonicalToLegacy=new Map();
  for(const [id,old] of Object.entries(evolutionTable)){
    const matches=aliases[id]?[records.get(aliases[id])]:HATCHMON_DATA.pokemon.filter(p=>p.DisplayName===old.nombre);
    if(matches.length!==1||!matches[0])throw Error(`No hay correspondencia canónica inequívoca para ${id}.`);
    legacyToCanonical.set(id,matches[0].PokemonId);canonicalToLegacy.set(matches[0].PokemonId,id);
  }
  const canonicalId=id=>records.has(id)?id:legacyToCanonical.get(id)||null;
  const get=id=>records.get(canonicalId(id))||null;
  const legacyId=id=>canonicalToLegacy.get(canonicalId(id))||null;
  function genders(id){
    const p=get(id);if(!p)return [];
    if(p.Genderless===true)return ['genderless'];
    if(p.Genderless!==false||!Number.isFinite(p.MaleRatio)||!Number.isFinite(p.FemaleRatio)||
      p.MaleRatio<0||p.FemaleRatio<0||Math.abs(p.MaleRatio+p.FemaleRatio-1)>1e-6)return [];
    return [...(p.MaleRatio>0?['male']:[]),...(p.FemaleRatio>0?['female']:[])];
  }
  function gender(id,rng=Math.random){
    const allowed=genders(id),p=get(id);
    if(!allowed.length)throw Error(`Faltan proporciones de género válidas para ${id}.`);
    return p.Genderless?'genderless':rng()<p.MaleRatio?'male':'female';
  }
  const validGender=(id,value)=>genders(id).includes(value);
  function compatibility(a,b){
    const fail=reason=>({ok:false,reason});
    if(a.id===b.id)return fail('Un compañero no puede criar consigo mismo.');
    if([a,b].some(e=>e.kind!=='creature'||e.snapshot.phase!=='alive'||e.snapshot.birthScene||e.snapshot.nicknamePending||
      e.snapshot.foundItem!==null||e.snapshot.lightsOff||e.snapshot.pokerus))return fail('Ambos compañeros deben estar vivos, sanos, despiertos y disponibles.');
    const aa=get(a.speciesId),bb=get(b.speciesId);
    if(!aa||!bb)return fail('La especie no está en hatchmonData_v2.js.');
    if(!validGender(aa.PokemonId,a.snapshot.gender)||!validGender(bb.PokemonId,b.snapshot.gender))return fail('El género no es válido según la fuente canónica.');
    // Interpretación literal de contract.dittoRule; EggGroup identifica el caso especial.
    const ditto=p=>p.EggGroup==='Ditto';
    const eligible=p=>p.Breedable===true&&p.EvolutionStage!=='Baby'&&!p.Genderless&&p.Rarity!==5;
    let parent;
    if(ditto(aa)||ditto(bb)){
      if(ditto(aa)&&ditto(bb))return fail('La fuente canónica no permite criar dos Ditto.');
      const wildcard=ditto(aa)?aa:bb;parent=ditto(aa)?bb:aa;
      if(wildcard.Breedable!==true||!eligible(parent))return fail('Ditto requiere una pareja Breedable que no sea Baby, Genderless ni Rarity 5.');
    }else{
      if(!eligible(aa)||!eligible(bb))return fail('Alguna especie no es reproducible, es bebé, carece de género o tiene rareza 5.');
      if(!aa.EggGroup||aa.EggGroup!==bb.EggGroup)return fail('No comparten el EggGroup canónico.');
      if(!['male','female'].includes(a.snapshot.gender)||!['male','female'].includes(b.snapshot.gender)||a.snapshot.gender===b.snapshot.gender)
        return fail('Se requiere una pareja macho y hembra.');
      parent=a.snapshot.gender==='female'?aa:bb;
    }
    if(!parent.BaseOffspringId||!records.has(parent.BaseOffspringId))return fail('La fuente no define un BaseOffspringId válido. No se inventará una raíz.');
    return {ok:true,offspring:parent.BaseOffspringId,reason:'Son compatibles. El huevo se guardará en tu colección.'};
  }
  function convertEntity(entity,toCanonical){
    const e=JSON.parse(JSON.stringify(entity));
    const convert=id=>id===null?null:(toCanonical?canonicalId(id):legacyId(id))||id;
    e.speciesId=convert(e.speciesId);e.offspring=convert(e.offspring);e.snapshot.pokemonId=convert(e.snapshot.pokemonId);
    for(const p of e.parents||[])p.speciesId=convert(p.speciesId);
    for(const m of e.snapshot.milestones||[]){m.from=convert(m.from);m.to=convert(m.to);}
    for(const c of e.snapshot.consumed||[]){if(c.from)c.from=convert(c.from);if(c.to)c.to=convert(c.to);}
    return e;
  }
  return Object.freeze({get,canonicalId,legacyId,gender,validGender,compatibility,convertEntity,
    careKey:key=>({hunger:'hambre',happiness:'felicidad',energy:'energia',hygiene:'higiene'}[key]||key),
    rules:id=>HATCHMON_DATA.evolutionRules.filter(r=>r.FromId===canonicalId(id)),
    roots:()=>[...legacyToCanonical.keys()].filter(id=>get(id).PreEvolutionId===null),
    genderSymbol:value=>({male:'♂',female:'♀',genderless:'⚲'}[value]||''),
    genderLabel:value=>({male:'Macho',female:'Hembra',genderless:'Sin género'}[value]||'Género no disponible')});
})();
