'use strict';
// Local browser QA, fictional data, all external requests blocked.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createApp,passwordHash}=require('../server.cjs');
async function main(){
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sancfis-ui-')),out=path.join(__dirname,'../artifacts/diagnostic-20261029');fs.mkdirSync(out,{recursive:true});
  const app=createApp({users:[{id:'qa',name:'Démo fictive',email:'qa@example.test',role:'admin',...passwordHash('fictional-test-password')}],dataDir:dir,secure:false,aiEnabled:false});
  let browser;const errors=[],blocked=[];
  try{
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1365,height:950}});
    await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():(blocked.push(new URL(r.request().url()).origin),r.abort()));
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin);await page.getByLabel('Adresse professionnelle').fill('qa@example.test');await page.getByLabel('Mot de passe').fill('fictional-test-password');await page.getByRole('button',{name:'Se connecter',exact:true}).click();
    await page.getByRole('button',{name:'Nouveau dossier',exact:true}).click();await page.getByLabel('Société',{exact:true}).fill('PME FICTIVE — TEST');
    await page.getByText('Infrastructure IT · 4 questions',{exact:true}).click();
    const parent=page.locator('article').filter({has:page.getByRole('heading',{name:/^INF-2 ·/})});
    await parent.getByLabel('Votre réponse',{exact:true}).selectOption('INF-2-o0');
    const child=page.getByRole('heading',{name:/^INF-2.1 ·/});await child.waitFor();
    await page.locator('article').filter({has:child}).getByLabel('Votre réponse',{exact:true}).selectOption('INF-2.1-o1');
    await parent.getByLabel('Votre réponse',{exact:true}).selectOption('INF-2-o3');assert.equal(await child.count(),0);
    await page.getByRole('button',{name:'Sauvegarder',exact:true}).click();await page.getByText('Dossier sauvegardé.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Prévisualiser la synthèse',exact:true}).click();assert.equal(await page.locator('dialog').getByRole('heading',{name:/^INF-2.1 ·/}).count(),0);await page.locator('dialog').getByRole('button',{name:'Fermer',exact:true}).click();
    await page.getByText('Faire compléter des questions par le client',{exact:true}).click();await page.getByLabel('Infrastructure IT',{exact:true}).check();await page.getByRole('button',{name:'Créer le lien limité',exact:true}).click();
    const link=await page.getByLabel('Lien client confidentiel').inputValue();assert.ok(link.includes('#invitation='));
    await page.screenshot({path:path.join(out,'interne.png'),fullPage:false});
    const guest=await context.newPage();guest.on('pageerror',e=>errors.push(e.message));await guest.goto(link);await guest.getByRole('heading',{name:/Questions pour/}).waitFor();
    assert.equal(await guest.getByLabel('Budget déclaré ou fourchette').count(),0);assert.equal(await guest.getByLabel('Source / preuve — sans secret').count(),0);
    await guest.locator('summary').filter({hasText:'Infrastructure IT'}).click();
    await guest.locator('article').filter({has:guest.getByRole('heading',{name:/^INF-2 ·/})}).getByLabel('Votre réponse',{exact:true}).selectOption('INF-2-o0');await guest.getByRole('heading',{name:/^INF-2.1 ·/}).waitFor();
    await guest.getByRole('button',{name:'Enregistrer mes réponses',exact:true}).click();await guest.getByText('Réponses enregistrées. Elles seront examinées par SANCFIS.',{exact:true}).waitFor();
    assert.equal(app.store().cases[0].diagnostic.answers['INF-2'].optionId,'INF-2-o0');
    await guest.screenshot({path:path.join(out,'client.png'),fullPage:false});await guest.setViewportSize({width:390,height:844});assert.equal(await guest.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await guest.screenshot({path:path.join(out,'client-mobile.png'),fullPage:false});
    assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
    fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({at:new Date().toISOString(),fictional:true,activeBranchRemoval:true,clientInvitationSave:true,privateFieldsAbsent:true,mobileOverflow:false,pageErrors:errors,externalRequests:blocked},null,2));
    console.log('UI vérifiée : branches, sauvegarde, synthèse, invitation client et mobile ; aucun appel externe.');
  }finally{if(browser)await browser.close();if(app.server.listening)await new Promise(r=>app.server.close(r));if(path.dirname(path.resolve(dir))!==path.resolve(os.tmpdir())||!path.basename(dir).startsWith('sancfis-ui-'))throw Error('Nettoyage hors cible refusé.');fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
