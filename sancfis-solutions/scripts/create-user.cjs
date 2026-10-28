'use strict';
const readline=require('node:readline/promises');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {passwordHash,validateUsers}=require('../server.cjs');
async function main(){
  if(!process.stdin.isTTY)throw Error('Utiliser un terminal interactif pour masquer le mot de passe.');
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  const name=(await rl.question('Nom professionnel : ')).trim();
  const email=(await rl.question('Adresse professionnelle : ')).trim().toLowerCase();
  const role=(await rl.question('Rôle (commercial, presales, direction, admin) : ')).trim();
  rl.close();
  process.stdout.write('Mot de passe (16 caractères minimum, saisie masquée) : ');
  const password=await new Promise((resolve,reject)=>{
    let value='';process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
    function cleanup(){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');}
    function onData(chunk){for(const char of chunk){if(char==='\u0003'){cleanup();reject(Error('Annulé.'));return;}if(char==='\r'||char==='\n'){cleanup();resolve(value);return;}if(char==='\u007f'||char==='\b'){value=value.slice(0,-1);}else if(char.charCodeAt(0)>=32)value+=char;}}
    process.stdin.on('data',onData);
  });
  if(password.length<16||password.length>256)throw Error('Mot de passe requis entre 16 et 256 caractères.');
  if(!name||!/^\S+@\S+\.\S+$/.test(email))throw Error('Nom et adresse valides requis.');
  const file=path.resolve(process.env.USERS_FILE||path.join(__dirname,'../config/users.json'));
  const users=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
  if(users.some(u=>u.email.toLowerCase()===email))throw Error('Ce compte existe déjà. Aucune modification effectuée.');
  users.push({id:crypto.randomUUID(),name,email,role,...passwordHash(password)});validateUsers(users);
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(users,null,2),{mode:0o600});console.log('Compte créé. Fichier privé exclu de Git.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
