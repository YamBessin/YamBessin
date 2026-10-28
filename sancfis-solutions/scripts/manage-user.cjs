'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {validateUsers}=require('../server.cjs');
function setDisabled(users,email,disabled){
  const result=structuredClone(users);validateUsers(result);
  const user=result.find(u=>u.email.toLowerCase()===email.toLowerCase());if(!user)throw Error('Compte introuvable.');
  user.disabled=disabled;
  if(!result.some(u=>u.role==='admin'&&!u.disabled))throw Error('Conserver au moins un administrateur actif.');
  return result;
}
if(require.main===module){try{
  const [command,email]=process.argv.slice(2),file=path.resolve(process.env.USERS_FILE||path.join(__dirname,'../config/users.json'));
  const users=JSON.parse(fs.readFileSync(file,'utf8'));validateUsers(users);
  if(command==='list')console.log(JSON.stringify(users.map(({name,email,role,disabled})=>({name,email,role,disabled:!!disabled})),null,2));
  else if(['disable','enable'].includes(command)&&email){const next=setDisabled(users,email,command==='disable');const temp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(next,null,2),{flag:'wx',mode:0o600});fs.renameSync(temp,file);console.log('Configuration mise à jour. Redémarrer le serveur pour appliquer et invalider toutes les sessions.');}
  else throw Error('Usage : node scripts/manage-user.cjs list | disable adresse | enable adresse');
}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={setDisabled};
