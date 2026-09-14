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
 resendConfirmation:email=>client.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect()}}),
 logout:()=>client.auth.signOut({scope:'local'})
};
const authText=(key,vars)=>globalThis.HatchI18n?.t(key,vars)??key;
// Supabase reports a stable error_code; anything unmapped keeps the server's own sentence, because
// a single generic line makes a broken sign-in impossible to tell apart from a wrong password.
const AUTH_ERRORS={
 email_not_confirmed:'auth.emailUnconfirmed',
 invalid_credentials:'auth.invalidCredentials',
 weak_password:'auth.weakPassword',
 email_address_invalid:'auth.emailInvalid',
 validation_failed:'auth.emailInvalid',
 user_already_exists:'auth.userExists',
 email_exists:'auth.userExists',
 same_password:'auth.samePassword',
 signup_disabled:'auth.signupDisabled',
 email_provider_disabled:'auth.signupDisabled',
 over_email_send_rate_limit:'auth.emailRateLimited',
 over_request_rate_limit:'auth.rateLimited',
};
export const needsConfirmation=error=>error?.code==='email_not_confirmed';
export function humanError(error){
 const key=AUTH_ERRORS[error?.code];
 if(key)return authText(key);
 if(error?.status===429)return authText('auth.rateLimited');
 const detail=typeof error?.message==='string'?error.message.trim():'';
 return detail?authText('auth.serverError',{detail}):authText('auth.requestFailed');
}
