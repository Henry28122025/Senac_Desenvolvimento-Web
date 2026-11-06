// Procedimento local: dados lidos da entrada padrão, senha sem eco nem argumento de shell.
const readline=require('node:readline/promises');
const { Writable }=require('node:stream');
const pool=require('./conexao');
const {credenciais,texto}=require('../services/validacoes');
const {hashSenha}=require('../services/senhas');
async function main() {
 let silencioso=false;
 const out=new Writable({write(chunk,enc,cb){ if(!silencioso) process.stdout.write(chunk); cb(); }});
 const rl=readline.createInterface({input:process.stdin,output:out,terminal:!!process.stdin.isTTY});
 try {
  const nome=texto(await rl.question('Nome: '),'Nome',2,100);
  const email=await rl.question('E-mail: ');
  process.stdout.write('Senha (12–128 caracteres, oculta): '); silencioso=true;
  const senha=await rl.question('');
  process.stdout.write('\nConfirme a senha (oculta): ');
  const confirmar=await rl.question(''); silencioso=false; process.stdout.write('\n');
  if(senha!==confirmar) throw new Error('Informe a senha duas vezes iguais (segunda entrada também oculta).');
  const d=credenciais({email,senha});
  await pool.execute("INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,'administrador')",[nome,d.email,await hashSenha(senha)]);
  console.log('Administrador criado. Nenhuma conta existente foi promovida.');
 } catch(e) { console.error(e.code==='ER_DUP_ENTRY'?'E-mail já cadastrado.': 'Não foi possível criar administrador. Confira entradas e banco.'); process.exitCode=1; }
 finally {rl.close(); await pool.end();}
}
main();
