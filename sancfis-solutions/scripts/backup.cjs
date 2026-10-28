'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX_BYTES=32*1024*1024;
function validatePayload(value){
  if(value?.format!=='sancfis-backup-v1'||value.store?.schemaVersion!==1||!Array.isArray(value.store.cases)||!Array.isArray(value.store.audit)||!value.store.aiUsage||typeof value.store.aiUsage!=='object')throw Error('Sauvegarde non reconnue.');
  require('../server.cjs').validateUsers(value.users);
  return value;
}
function derive(passphrase,salt){if(typeof passphrase!=='string'||passphrase.length<20||passphrase.length>1024)throw Error('BACKUP_PASSPHRASE doit contenir entre 20 et 1024 caractères.');return crypto.scryptSync(passphrase,salt,32);}
function readBounded(file){if(fs.statSync(file).size>MAX_BYTES)throw Error('Fichier supérieur à la limite pilote de 32 Mo.');return fs.readFileSync(file);}
function createBackup({dataDir,usersFile,output,passphrase}){
  const store=JSON.parse(readBounded(path.join(dataDir,'store.json')));
  const users=JSON.parse(readBounded(usersFile));
  const payload=validatePayload({format:'sancfis-backup-v1',createdAt:new Date().toISOString(),store,users});
  const plaintext=Buffer.from(JSON.stringify(payload));if(plaintext.length>MAX_BYTES)throw Error('Sauvegarde trop volumineuse pour ce pilote.');
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=derive(passphrase,salt);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const data=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  const envelope={format:'sancfis-encrypted-v1',algorithm:'aes-256-gcm',kdf:'scrypt',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
  // Jamais d'écrasement d'une sauvegarde existante.
  const serialized=JSON.stringify(envelope);if(Buffer.byteLength(serialized)>MAX_BYTES)throw Error('Archive chiffrée supérieure à 32 Mo.');
  fs.writeFileSync(output,serialized,{flag:'wx',mode:0o600});key.fill(0);plaintext.fill(0);
  return {cases:store.cases.length,createdAt:payload.createdAt};
}
function readBackup({input,passphrase}){
  const envelope=JSON.parse(readBounded(input));
  if(envelope.format!=='sancfis-encrypted-v1'||envelope.algorithm!=='aes-256-gcm'||envelope.kdf!=='scrypt')throw Error('Format chiffré non reconnu.');
  for(const name of ['salt','iv','tag','data'])if(typeof envelope[name]!=='string')throw Error('Enveloppe invalide.');
  const salt=Buffer.from(envelope.salt,'base64'),iv=Buffer.from(envelope.iv,'base64'),tag=Buffer.from(envelope.tag,'base64');
  if(salt.length!==16||iv.length!==12||tag.length!==16)throw Error('Enveloppe invalide.');
  const key=derive(passphrase,salt),decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);
  let plaintext;
  try{plaintext=Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]);}catch{throw Error('Phrase secrète incorrecte ou sauvegarde altérée.');}finally{key.fill(0);}
  try{return validatePayload(JSON.parse(plaintext.toString('utf8')));}finally{plaintext.fill(0);}
}
function restoreBackup({input,passphrase,destination}){
  const payload=readBackup({input,passphrase});
  const target=path.resolve(destination);
  if(fs.existsSync(target))throw Error('La destination doit être nouvelle. Aucune donnée existante ne sera écrasée.');
  if(!fs.statSync(path.dirname(target)).isDirectory())throw Error('Le parent de destination doit exister.');
  fs.mkdirSync(target,{mode:0o700});fs.mkdirSync(path.join(target,'data'),{mode:0o700});fs.mkdirSync(path.join(target,'config'),{mode:0o700});
  fs.writeFileSync(path.join(target,'data/store.json'),JSON.stringify(payload.store,null,2),{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(target,'config/users.json'),JSON.stringify(payload.users,null,2),{flag:'wx',mode:0o600});
  return {cases:payload.store.cases.length,createdAt:payload.createdAt,destination:target};
}
if(require.main===module){
  try{
    const [command,file,destination]=process.argv.slice(2),passphrase=process.env.BACKUP_PASSPHRASE;
    if(!file||!['create','verify','restore'].includes(command))throw Error('Usage : node scripts/backup.cjs create fichier | verify fichier | restore fichier destination-nouvelle');
    if(command==='create'){
      if(process.env.BACKUP_SERVER_STOPPED!=='yes')throw Error('Arrêter le serveur puis définir BACKUP_SERVER_STOPPED=yes. Le script ne peut pas vérifier l’arrêt lui-même.');
      console.log(JSON.stringify(createBackup({dataDir:path.resolve(process.env.DATA_DIR||path.join(__dirname,'../data')),usersFile:path.resolve(process.env.USERS_FILE||path.join(__dirname,'../config/users.json')),output:path.resolve(file),passphrase})));
    }else if(command==='verify'){
      const payload=readBackup({input:path.resolve(file),passphrase});console.log(JSON.stringify({valid:true,cases:payload.store.cases.length,createdAt:payload.createdAt}));
    }else{
      if(!destination)throw Error('Destination nouvelle requise.');console.log(JSON.stringify(restoreBackup({input:path.resolve(file),passphrase,destination})));
    }
  }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={createBackup,readBackup,restoreBackup};
