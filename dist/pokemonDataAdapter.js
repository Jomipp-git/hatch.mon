/* Adaptador de la fuente generada v2. No duplica fichas biológicas.
 * El repertorio generado aporta el canonicalId de cada ID legacy; aquí no se infiere ninguno.
 */
'use strict';
globalThis.PokemonData = (() => {
  const dataText=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
  if(HATCHMON_DATA.schemaVersion!==2)throw Error('Se requiere hatchmonData_v2.js (schemaVersion 2).');
  const records=new Map(HATCHMON_DATA.pokemon.map(p=>[p.PokemonId,p]));
  const legacyToCanonical=new Map(),canonicalToLegacy=new Map();
  for(const [id,entry] of Object.entries(evolutionTable)){
    if(!records.has(entry.canonicalId))throw Error(`No hay correspondencia canónica inequívoca para ${id}.`);
    legacyToCanonical.set(id,entry.canonicalId);canonicalToLegacy.set(entry.canonicalId,id);
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
    if(a.id===b.id)return fail(dataText('breeding.self'));
    if([a,b].some(e=>e.kind!=='creature'||e.snapshot.phase!=='alive'||e.snapshot.birthScene||e.snapshot.nicknamePending||
      e.snapshot.foundItem!==null||e.snapshot.lightsOff||e.snapshot.pokerus))return fail(dataText('breeding.availability'));
    const aa=get(a.speciesId),bb=get(b.speciesId);
    if(!aa||!bb)return fail(dataText('breeding.speciesUnavailable'));
    if(!validGender(aa.PokemonId,a.snapshot.gender)||!validGender(bb.PokemonId,b.snapshot.gender))return fail(dataText('breeding.invalidGender'));
    // Interpretación literal de contract.dittoRule; EggGroup identifica el caso especial.
    const ditto=p=>p.EggGroup==='Ditto';
    const eligible=p=>p.Breedable===true&&p.EvolutionStage!=='Baby'&&!p.Genderless&&p.Rarity!==5;
    let parent;
    if(ditto(aa)||ditto(bb)){
      if(ditto(aa)&&ditto(bb))return fail(dataText('breeding.twoDitto'));
      const wildcard=ditto(aa)?aa:bb;parent=ditto(aa)?bb:aa;
      if(wildcard.Breedable!==true||!eligible(parent))return fail(dataText('breeding.dittoPartner'));
    }else{
      if(!eligible(aa)||!eligible(bb))return fail(dataText('breeding.ineligibleSpecies'));
      if(!aa.EggGroup||aa.EggGroup!==bb.EggGroup)return fail(dataText('breeding.eggGroupMismatch'));
      if(!['male','female'].includes(a.snapshot.gender)||!['male','female'].includes(b.snapshot.gender)||a.snapshot.gender===b.snapshot.gender)
        return fail(dataText('breeding.genderPair'));
      parent=a.snapshot.gender==='female'?aa:bb;
    }
    if(!parent.BaseOffspringId||!records.has(parent.BaseOffspringId))return fail(dataText('breeding.invalidOffspring'));
    return {ok:true,offspring:parent.BaseOffspringId,reason:dataText('breeding.compatibleStored')};
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
    genderLabel:value=>({male:dataText('gender.male'),female:dataText('gender.female'),genderless:dataText('gender.genderless')}[value]||dataText('gender.unavailable'))});
})();
