/* Launchers are presentation only. Every session commits existing training once. */
'use strict';
globalThis.TrainingActivities=(()=>{
 const modes={iq:'memoria/patrones',strength:'timing/reflejos',kindness:'decisión/interacción',style:'ritmo/secuencia'};
 const launchers=Object.fromEntries(Object.keys(modes).map(k=>[k,({complete})=>complete()]));
 function register(attribute,launcher){if(!Object.hasOwn(modes,attribute)||typeof launcher!=='function')throw Error('Actividad no válida');launchers[attribute]=launcher;}
 function launch(attribute,{commit}){if(!Object.hasOwn(modes,attribute))return false;let completed=false;
  const complete=()=>{if(completed)return false;completed=true;return commit(attribute);};
  const cancel=()=>{completed=true;return false;};return launchers[attribute]({complete,cancel,attribute});
 }
 return Object.freeze({modes,launch,register});
})();
