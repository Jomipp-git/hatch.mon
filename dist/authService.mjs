import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
export const client=createClient('https://yhjytscrtxhrxvhmwacg.supabase.co','sb_publishable_BP33cfrveAyx8b3N9lK0XA_EAbLV6kb',{
 global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(12000)})},
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}
});
const redirect=()=>location.origin+location.pathname;
export const auth={
 login:(email,password)=>client.auth.signInWithPassword({email,password}),
 signup:(email,password)=>client.auth.signUp({email,password,options:{emailRedirectTo:redirect()}}),
 google:()=>client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect()}}),
 recover:email=>client.auth.resetPasswordForEmail(email,{redirectTo:redirect()+'?recovery=1'}),
 update:password=>client.auth.updateUser({password}),
 logout:()=>client.auth.signOut({scope:'local'})
};
export function humanError(error){
 if(error?.code==='email_not_confirmed')return 'Confirma primero tu correo.';
 if(error?.code==='invalid_credentials')return 'Email o contraseña incorrectos.';
 if(error?.status===429)return 'Espera un momento antes de intentarlo otra vez.';
 if(error?.code==='weak_password')return 'Usa una contraseña más segura.';
 return 'No se ha podido completar. Revisa los datos y la conexión.';
}
