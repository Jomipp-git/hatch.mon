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
const authText=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
export function humanError(error){
 if(error?.code==='email_not_confirmed')return authText('auth.emailUnconfirmed');
 if(error?.code==='invalid_credentials')return authText('auth.invalidCredentials');
 if(error?.status===429)return authText('auth.rateLimited');
 if(error?.code==='weak_password')return authText('auth.weakPassword');
 return authText('auth.requestFailed');
}
