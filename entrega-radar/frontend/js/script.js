'use strict';
const $ = id => document.getElementById(id);
let token = null; // Somente memória: recarregar a página exige novo login.
let ocupado = false;
function mensagem(texto) { $('mensagem').textContent=texto; }
function tela(id) {
 for(const nome of ['login','cadastro','conta']) $(nome).hidden=nome!==id;
}
async function api(url,body) {
 const response = await fetch('/api'+url,{ method:body?'POST':'GET',
  headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
  ...(body?{body:JSON.stringify(body)}:{}) });
 const dados = await response.json();
 if(!response.ok) {
  if(response.status===401 && token) {token=null;tela('login');}
  throw new Error(dados.mensagem || 'Não foi possível concluir.');
 }
 return dados;
}
for(const id of ['login','cadastro']) $('abrir-'+id).onclick=()=> {if(!ocupado){tela(id);mensagem('');}};
for(const id of ['login','cadastro']) $(id).onsubmit=async event=> {
 event.preventDefault(); if(ocupado)return;
 const body=Object.fromEntries(new FormData(event.currentTarget));
 if(id==='cadastro' && body.senha!==body.confirmar){mensagem('As senhas precisam ser iguais.');$('confirmar').focus();return;}
 delete body.confirmar;
 ocupado=true;
 document.querySelectorAll('button').forEach(b=>b.disabled=true);
 mensagem('Aguarde…');
 try {
  const dados=await api('/auth/'+id,body);
  if(id==='cadastro') { $('cadastro').reset();tela('login');$('login-email').value=body.email;mensagem(dados.mensagem);$('login-senha').focus(); }
  else {
   token=dados.token;
   const {usuario}=await api('/usuarios/me');
   $('dados').textContent=usuario.nome+' | '+usuario.email+' | '+usuario.perfil;
   $('admin').hidden=usuario.perfil!=='administrador';
   $('login').reset();tela('conta');mensagem('Você está conectado.');
  }
 } catch(e) {mensagem(e instanceof TypeError?'Não foi possível conectar à API. Confira o servidor.':e.message);}
 finally {ocupado=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
};
$('sair').onclick=()=>{token=null;$('dados').textContent='';tela('login');mensagem('Você saiu da conta.');};
$('admin').onclick=async()=>{try{mensagem((await api('/admin/painel')).mensagem);}catch(e){mensagem(e.message);}};
