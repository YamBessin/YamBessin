'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {passwordHash,createApp}=require('../server.cjs');
const {createBackup,readBackup,restoreBackup}=require('../scripts/backup.cjs');
const {setDisabled}=require('../scripts/manage-user.cjs');
function temporary(t){const parent=path.resolve(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'sancfis-ops-'));t.after(()=>{const resolved=path.resolve(dir);if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith('sancfis-ops-'))throw Error('Nettoyage hors cible refusé.');fs.rmSync(resolved,{recursive:true,force:true});});return dir;}
const user=(id='admin',role='admin')=>({id,name:id,email:id+'@example.test',role,...passwordHash('Operations-test-password-2026')});
test('Sauvegarde et restauration fidèles sans données lisibles dans l’archive',t=>{
  const dir=temporary(t),dataDir=path.join(dir,'data'),usersFile=path.join(dir,'users.json'),output=path.join(dir,'safe.sancfis-backup');fs.mkdirSync(dataDir);
  const store={schemaVersion:1,cases:[{id:'fixture',company:'CONFIDENTIEL-TEST'}],audit:[{action:'fixture'}],aiUsage:{'2026-10-28':2}},users=[user()];
  fs.writeFileSync(path.join(dataDir,'store.json'),JSON.stringify(store));fs.writeFileSync(usersFile,JSON.stringify(users));
  const passphrase='A unique backup passphrase for tests 2026';createBackup({dataDir,usersFile,output,passphrase});
  const raw=fs.readFileSync(output,'utf8');assert.ok(!raw.includes('CONFIDENTIEL-TEST'));assert.ok(!raw.includes(users[0].hash));
  const decoded=readBackup({input:output,passphrase});assert.deepEqual(decoded.store,store);assert.deepEqual(decoded.users,users);
  const destination=path.join(dir,'restored');restoreBackup({input:output,passphrase,destination});assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination,'data/store.json'))),store);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination,'config/users.json'))),users);
  assert.throws(()=>restoreBackup({input:output,passphrase,destination}),/nouvelle/);assert.throws(()=>createBackup({dataDir,usersFile,output,passphrase}),/EEXIST/);
});
test('Phrase incorrecte et contenu altéré refusés avant restauration',t=>{
  const dir=temporary(t),dataDir=path.join(dir,'data'),usersFile=path.join(dir,'users.json'),output=path.join(dir,'safe.sancfis-backup');fs.mkdirSync(dataDir);fs.writeFileSync(path.join(dataDir,'store.json'),JSON.stringify({schemaVersion:1,cases:[],audit:[],aiUsage:{}}));fs.writeFileSync(usersFile,JSON.stringify([user()]));
  const passphrase='A sufficiently long passphrase test';createBackup({dataDir,usersFile,output,passphrase});
  assert.throws(()=>readBackup({input:output,passphrase:'An incorrect long passphrase for backup'}),/incorrecte|altérée/);
  const envelope=JSON.parse(fs.readFileSync(output));const bytes=Buffer.from(envelope.data,'base64');bytes[0]^=1;envelope.data=bytes.toString('base64');fs.writeFileSync(output,JSON.stringify(envelope));
  const destination=path.join(dir,'not-created');assert.throws(()=>restoreBackup({input:output,passphrase,destination}),/incorrecte|altérée/);assert.equal(fs.existsSync(destination),false);
});
test('Désactivation : conservation du dernier administrateur et liste copiée',()=>{
  const users=[user(),user('commercial','commercial')];const next=setDisabled(users,'commercial@example.test',true);assert.equal(next[1].disabled,true);assert.equal(users[1].disabled,undefined);assert.throws(()=>setDisabled(users,'admin@example.test',true),/administrateur/);assert.throws(()=>setDisabled(users,'absent@example.test',true),/introuvable/);
});
test('Origine de production : chemin, paramètres et identifiants interdits',t=>{
  const dir=temporary(t),users=[user()];for(const publicOrigin of ['https://example.test/path','https://example.test?x=1','https://user:password@example.test','https://example.test/'])assert.throws(()=>createApp({users,dataDir:dir,secure:true,publicOrigin}),/HTTPS exact/);
  assert.ok(createApp({users,dataDir:dir,secure:true,publicOrigin:'https://example.test'}));
});
test('Compte désactivé refusé et santé publique sans métadonnées métier',async t=>{
  const dir=temporary(t),app=createApp({dataDir:dir,secure:false,users:[{...user(),disabled:true}]});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.server.close(r)));const origin='http://127.0.0.1:'+app.server.address().port;
  const health=await fetch(origin+'/healthz');assert.equal(health.status,200);assert.deepEqual(await health.json(),{status:'ok'});
  const login=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'admin@example.test',password:'Operations-test-password-2026'})});assert.equal(login.status,401);
});
