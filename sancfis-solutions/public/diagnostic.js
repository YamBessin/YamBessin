'use strict';
const questionStates={unknown:'Inconnu',answered:'Réponse renseignée',pending:'À confirmer',withheld:'Non communiqué',na:'Non applicable'};
function questionEditor(mount,domains,answers,{guest=false}={}){
  const opened=new Set([...mount.querySelectorAll('details[open]')].map(n=>n.dataset.domain));clear(mount);
  const result=SancfisQuestionnaire.evaluate(domains,answers),active=new Set(result.activeIds),coverage=SancfisQuestionnaire.coverage(domains,answers);
  mount.append(message(`${coverage.answered} réponses / ${coverage.active} questions actives · ${coverage.unknown} inconnues · ${coverage.pending} à confirmer · ${coverage.notApplicable} non applicables. Aucun score de conformité.`));
  for(const d of domains){const visible=d.questions.filter(q=>active.has(q.id));if(!visible.length)continue;
    const group=el('details',{'data-domain':d.id,open:opened.has(d.id)},el('summary',{},d.name+' · '+visible.length+' questions'));
    for(const q of visible){const a=answers[q.id]||{state:'unknown',optionId:'',assurance:'declared',evidence:'',reviewDate:'',justification:''};
      function set(patch,redraw=false){Object.assign(a,patch);answers[q.id]={...a};change();if(redraw)questionEditor(mount,domains,answers,{guest});}
      const options=[['unknown','Inconnu'],['pending','À confirmer'],['withheld','Non communiqué'],['na','Non applicable'],...q.options.map(o=>[o.id,o.text])];
      const card=el('article',{class:'control'},el('h3',{},q.id+' · '+q.text),el('p',{class:'small'},q.hint||''),el('p',{class:'small'},result.reasons[q.id]),field('Votre réponse',a.state==='answered'?a.optionId:a.state,v=>set(v.startsWith(q.id+'-o')?{state:'answered',optionId:v,assurance:'declared'}:{state:v,optionId:'',assurance:'declared'},true),{options,disabled:guest&&a.locked}));
      if(a.state==='na')card.append(field('Justification de non-applicabilité',a.justification,v=>set({justification:v}),{type:'textarea'}));
      if(!guest)card.append(el('p',{class:'small'},'Collecte suggérée : '+(q.assigneeRole==='technical'?'avant-vente / technique':'commercial / client')),el('div',{class:'grid'},field('Source / preuve — sans secret',a.evidence,v=>set({evidence:v,assurance:'declared'}),{type:'textarea'}),field('Date de la preuve',a.reviewDate,v=>set({reviewDate:v,assurance:'declared'}),{type:'date'}),field('Niveau de preuve',a.assurance,v=>set({assurance:v}),{options:[['declared','Déclaré'],['verified','Vérifié']],disabled:!['admin','presales','technical'].includes(state.user.role)})));
      group.append(card);
    }mount.append(group);
  }
}
function renderDiagnostic(target,c){
  c.diagnostic??={answers:{}};const mount=el('div',{});
  target.append(el('section',{class:'panel'},el('h2',{},'Diagnostic adaptatif — 53 questions, 11 domaines'),el('p',{class:'small'},'Les approfondissements suivent vos réponses. Les branches masquées sont exclues de la synthèse et conservées dans l’historique. Inconnu ne signifie pas absent.'),mount));
  questionEditor(mount,state.catalog.questionnaire.domains,c.diagnostic.answers);
}
function appendDiagnosticSummary(out,c){
  if(!c.diagnostic)return;
  const domains=state.catalog.questionnaire.domains,answers=c.diagnostic.answers,active=new Set(SancfisQuestionnaire.evaluate(domains,answers).activeIds),coverage=SancfisQuestionnaire.coverage(domains,answers);
  out.append(el('h2',{},'Diagnostic adaptatif'),el('p',{},`${coverage.answered} réponses / ${coverage.active} questions actives ; ${coverage.unknown} inconnues ; ${coverage.pending} à confirmer. Aucun score global.`));
  for(const d of domains)for(const q of d.questions){const a=answers[q.id];if(!active.has(q.id)||!a||a.state==='unknown')continue;
    out.append(el('article',{},el('h3',{},q.id+' · '+q.text),el('p',{},a.state==='answered'?(q.options.find(o=>o.id===a.optionId)?.text||'À confirmer'):questionStates[a.state]),el('p',{class:'small'},a.assurance==='verified'?'Vérifié · '+(a.reviewDate||''):'Déclaratif'),a.evidence?el('p',{},a.evidence):null,a.state==='na'?el('p',{},a.justification||'Justification manquante'):null));
  }
}
function renderInvitations(target,c){
  if(!c.id||state.user.role==='technical')return;
  const feedback=el('div',{}),selection=el('div',{}),days=el('select',{'aria-label':'Validité de l’invitation'});
  for(const n of [1,2,3,7])days.append(el('option',{value:String(n)},n+' jours'));days.value='2';
  const selected=new Set();
  for(const d of state.catalog.questionnaire.domains){const input=el('input',{type:'checkbox'});input.addEventListener('change',()=>{for(const q of d.questions)input.checked?selected.add(q.id):selected.delete(q.id);});selection.append(el('label',{class:'choice'},input,d.name));}
  const list=el('div',{});
  async function refresh(){try{const result=await api('/cases/'+c.id+'/invitations');clear(list);for(const i of result.invitations)list.append(el('p',{},`${i.questionIds.length} questions · expire ${i.expiresAt} · ${i.revoked?'révoquée':'créée'}`,i.revoked?null:button('Révoquer',async()=>{try{await api('/cases/'+c.id+'/invitations/'+i.id+'/revoke',{method:'POST',body:{}});await refresh();}catch(e){feedback.append(message(e.message,'error'));}})));}catch(e){feedback.append(message(e.message,'error'));}}
  const create=button('Créer le lien limité',async()=>{clear(feedback);if(state.dirty){feedback.append(message('Sauvegardez le dossier avant de créer le lien.','error'));return;}try{const i=await api('/cases/'+c.id+'/invitations',{method:'POST',body:{questionIds:[...selected],days:Number(days.value)}});const input=el('input',{readonly:true,'aria-label':'Lien client confidentiel'});input.value=location.origin+'/#invitation='+i.token;feedback.append(message('Lien créé, non envoyé. Toute personne disposant du lien peut répondre aux questions sélectionnées jusqu’à expiration ou révocation.'),input);await refresh();}catch(e){feedback.append(message(e.message,'error'));}});
  target.append(el('details',{class:'panel'},el('summary',{},'Faire compléter des questions par le client'),el('p',{class:'small'},'Choisir les domaines à partager. Le client ne voit ni budget, ni preuves internes, ni historique, ni autres dossiers. Le lien est révocable.'),selection,days,create,feedback,list));refresh();
}
async function loadInvitation(){
  const token=location.hash.slice('#invitation='.length);history.replaceState(null,'',location.pathname);
  async function request(body){const r=await fetch('/api/invitation',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'Invitation indisponible.');return data;}
  async function show(){const data=await request();clear(root);state.dirty=false;
    const mount=el('div',{}),feedback=el('div',{}),box=el('main',{class:'content'},el('h1',{},'SANCFIS — Questions pour '+data.company),el('p',{},'Répondez uniquement sur ce que vous connaissez. Vous pouvez indiquer « inconnu » ou « à confirmer ». Ne saisissez aucun mot de passe ou secret.'),el('p',{class:'small'},'Invitation valable jusqu’au '+data.expiresAt),feedback,mount);
    root.append(box);questionEditor(mount,data.questionnaire.domains,data.answers,{guest:true});
    box.append(button('Enregistrer mes réponses',async()=>{clear(feedback);try{const active=new Set(SancfisQuestionnaire.evaluate(data.questionnaire.domains,data.answers).activeIds);data.answers=Object.fromEntries(Object.entries(data.answers).filter(([id])=>active.has(id)));const result=await request({version:data.version,answers:data.answers});data.version=result.version;state.dirty=false;feedback.append(message('Réponses enregistrées. Elles seront examinées par SANCFIS.'));}catch(e){feedback.append(message(e.message,'error'));}}),button('Recharger les questions',()=>{if(!state.dirty||confirm('Recharger sans conserver les réponses non enregistrées ?'))show().catch(e=>feedback.append(message(e.message,'error')));}));
  }
  try{await show();}catch(e){clear(root).append(el('main',{class:'panel'},el('h1',{},'Invitation client'),message(e.message,'error')));}
}
