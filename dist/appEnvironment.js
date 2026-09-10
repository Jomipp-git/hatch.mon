'use strict';
Object.defineProperty(globalThis,'HatchEnvironment',{
 value:(()=>{
  const development=['localhost','127.0.0.1','[::1]'].includes(globalThis.location?.hostname||'');
  return Object.freeze({isDevelopmentEnvironment:()=>development});
 })(),
 writable:false,configurable:false,enumerable:true
});
