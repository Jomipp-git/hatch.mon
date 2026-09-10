/* Logical animation states and timing, with only local asset URLs. */
'use strict';
const PMD_STATE_FALLBACKS={normal:['Idle'],play:['Walk','Pose','Idle'],sleep:['Sleep','Idle'],wake:['Wake','Pain','Hurt','Idle'],eat:['Eat','Idle'],sick:['Hurt','Pain','Idle'],tired:['Laying','Sleep','Idle'],startled:['Hurt','Cringe','Pain','Idle'],happy:['Pose','Nod','Rotate','Idle'],clean:['Nod','Pose','Idle'],train:['Hop','Idle'],faint:['Faint','HitGround','Hurt','Idle']};
// Multipliers extend frame duration (1.20 = 20% more time per frame).
const PMD_TIMING_CONFIG=Object.freeze({
 durationMultipliers:Object.freeze({Idle:1,Walk:1.03,Sleep:1.2,Eat:1.2,Nod:1.2,Pose:1.25,Rotate:1.25,Pain:1.3,Hurt:1.3,Faint:1.25,HitGround:1.25,Hop:1.2,Shoot:1.2}),
 minFrameMs:90,fewFramesMax:3,fewFramesMinMs:140
});
globalThis.PmdVisuals=(()=>{
 const records=()=>typeof PMD_ASSETS==='undefined'?{}:PMD_ASSETS;
 function candidates(id,state='normal',isShiny=false){const normal=records()[PokemonData.canonicalId(id)],entry=isShiny&&normal?.shiny?normal.shiny:normal;return (PMD_STATE_FALLBACKS[state]||PMD_STATE_FALLBACKS.normal).filter(name=>entry?.sprites[name]).map(name=>({...entry.sprites[name],animationName:name}));}
 const EAT_VISUAL_LIMITS=Object.freeze({sizeTolerance:0.10,maxDrift:2});
 function stableEat(id,def){
  const idle=records()[PokemonData.canonicalId(id)]?.sprites.Idle;
  if(!idle?.frameBounds?.length||!def.frameBounds?.length)return false;
  const reference=idle.frameBounds[0],width=reference[2]-reference[0],height=reference[3]-reference[1];
  const crop=def.crop;
  return !!crop&&def.frameBounds.every(b=>
   Math.abs((b[2]-b[0])/width-1)<=EAT_VISUAL_LIMITS.sizeTolerance&&
   Math.abs((b[3]-b[1])/height-1)<=EAT_VISUAL_LIMITS.sizeTolerance&&
   Math.abs((b[0]+b[2])/2-(crop.x+crop.width/2))<=EAT_VISUAL_LIMITS.maxDrift&&
   Math.abs(crop.y+crop.height-b[3])<=EAT_VISUAL_LIMITS.maxDrift);
 }
 function frameDuration(def,frame){
  const raw=def.durations?.[frame]||1000/(def.fps||4),name=def.animationName;
  const multiplier=PMD_TIMING_CONFIG.durationMultipliers[name]||1;
  if(!name||name==='Idle'||name==='Walk')return raw*multiplier;
  const minimum=def.frames<=PMD_TIMING_CONFIG.fewFramesMax?PMD_TIMING_CONFIG.fewFramesMinMs:PMD_TIMING_CONFIG.minFrameMs;
  return Math.max(minimum,raw*multiplier);
 }
 return Object.freeze({candidates,stableEat,frameDuration,animations:id=>Object.values(records()[PokemonData.canonicalId(id)]?.sprites||{})});
})();
