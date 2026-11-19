/* Somnia - modo servidor: troca o login/cadastro do navegador pelo login real do servidor.
   Carregado DEPOIS do app (usa ACT2, S, C, enter, toast, que são globais do app). */
(function(){
const SM=window.SOMNIA,tt=m=>{try{toast(m)}catch(e){alert(m)}};
const _toast=toast;toast=function(m){if(/^Sem permissão/.test(m)&&SM.lastError){m=SM.lastError;SM.lastError=''}_toast(m)};
SM.after=async user=>{SM.start();await SM.reload();await enter({id:user.id,name:user.name})};
Object.assign(ACT2,{
 login:async()=>{const u=(S.lu||'').trim().toLowerCase(),p=S.lp||'';if(!u||!p){tt('Informe usuário e senha.');return}try{const r=await SM.api('POST','/api/auth/login',{u,p});S.lp='';await SM.after(r.user)}catch(e){tt(e.message)}},
 register:async()=>{try{const r=await SM.api('POST','/api/auth/register',{u:(S.lu||'').trim().toLowerCase(),name:(S.ln||'').trim(),p:S.lp||''});S.lp='';await SM.after(r.user)}catch(e){tt(e.message)}},
 logout:async()=>{try{await SM.api('POST','/api/auth/logout')}catch(e){}location.reload()},
 pwd:async()=>{const o=prompt('Senha atual:');if(!o)return;const n=prompt('Nova senha (mínimo 8 caracteres):');if(!n)return;try{await SM.api('POST','/api/auth/password',{old:o,new:n});tt('Senha alterada. Outras sessões foram encerradas.')}catch(e){tt(e.message)}}
});
(async()=>{try{const m=await SM.api('GET','/api/auth/me');if(!m.user)return;for(let i=0;i<80&&!C.db;i++)await new Promise(r=>setTimeout(r,100));if(S.auth)return;await SM.after(m.user)}catch(e){}})();
})();
