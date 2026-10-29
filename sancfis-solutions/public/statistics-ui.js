'use strict';
const statStateLabels={answered:'Renseignées',unknown:'Inconnues',pending:'À confirmer',withheld:'Non communiquées',na:'Non applicables'};
const percent=v=>v===null?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(v)+' %';
function svgNode(tag,attributes={},text){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;}
function bars(entries,label){
  const list=el('div',{class:'stat-bars',role:'list','aria-label':label}),max=Math.max(1,...entries.map(x=>x[1]));
  for(const[name,value]of entries){const svg=svgNode('svg',{viewBox:'0 0 100 8','aria-hidden':'true',preserveAspectRatio:'none'});svg.append(svgNode('rect',{width:100,height:8,rx:2,class:'stat-track'}),svgNode('rect',{width:100*value/max,height:8,rx:2,class:'stat-fill'}));list.append(el('div',{role:'listitem'},el('div',{class:'stat-bar-label'},el('span',{},name),el('strong',{},String(value))),svg));}return list;
}
function radar(rows){
  const box=el('div',{class:'stat-radar'});
  if(!rows.some(r=>r.score!==null)){box.append(el('p',{class:'stat-placeholder'},'Complétez les réponses de base d’un domaine pour afficher son indice. Aucune valeur n’est remplacée par zéro.'));return box;}
  const svg=svgNode('svg',{viewBox:'0 0 520 430',role:'img','aria-label':'Profil indicatif des onze domaines du questionnaire'});
  svg.append(svgNode('title',{},'Indices du questionnaire. Domaines incomplets non tracés.'));
  const cx=260,cy=214,radius=140,point=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/rows.length;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];};
  for(const level of [.25,.5,.75,1])svg.append(svgNode('polygon',{points:rows.map((r,i)=>point(i,radius*level).join(',')).join(' '),class:'stat-grid'}));
  const labels=['Infrastructure','Cyber','Physique','Continuité','Données','Collaboration','Digital','Compétences','Identités','Énergie','Internet'];
  rows.forEach((row,i)=>{const p=point(i,radius),label=point(i,radius+37);svg.append(svgNode('line',{x1:cx,y1:cy,x2:p[0],y2:p[1],class:'stat-axis'}),svgNode('text',{x:label[0],y:label[1],'text-anchor':'middle','dominant-baseline':'middle',class:'stat-radar-label'},labels[i]||row.name));});
  if(rows.every(r=>r.score!==null))svg.append(svgNode('polygon',{points:rows.map((r,i)=>point(i,radius*r.score/100).join(',')).join(' '),class:'stat-profile'}));
  rows.forEach((row,i)=>{if(row.score===null)return;const p=point(i,radius*row.score/100),dot=svgNode('circle',{cx:p[0],cy:p[1],r:5,class:'stat-dot'});dot.append(svgNode('title',{},row.name+' : '+percent(row.score)+' ; '+row.evaluable+' diagnostic(s) évaluable(s)'));svg.append(dot);});
  box.append(svg,el('p',{class:'small'},'Un point par domaine évaluable. Le polygone apparaît seulement lorsque les onze domaines sont évaluables.'));return box;
}
function domainCoverageTable(data){
  const table=el('table',{},el('caption',{},'Réponses actives et indices indicatifs par domaine'),el('thead',{},el('tr',{},['Domaine','Renseignées / actives','Vérifiées','Indice / 100','Diagnostics évaluables'].map(t=>el('th',{scope:'col'},t))))),body=el('tbody',{});
  for(const d of data.domains)body.append(el('tr',{},el('th',{scope:'row'},d.name),el('td',{},d.states.answered+' / '+d.active),el('td',{},String(d.verified)),el('td',{},d.score===null?'À compléter':percent(d.score)),el('td',{},d.evaluable+' / '+data.totals.cases)));
  table.append(body);return el('div',{},el('p',{class:'small stat-scroll-hint'},'Sur petit écran, faites défiler le tableau horizontalement pour consulter toutes les colonnes.'),el('div',{class:'scroll-table',tabindex:'0','aria-label':'Détail des onze domaines, défilement horizontal disponible'},table));
}
function drawStatistics(target,data){
  const t=data.totals;
  target.append(el('div',{class:'stat-kpis'},metric(t.cases,'Dossiers dans la sélection'),metric(t.completion===null?'—':percent(t.completion),'Complétude moyenne'),metric(t.verified,'Réponses vérifiées avec preuve'),metric(data.renewal.d15+data.renewal.d30,'Renouvellements à 30 jours')));
  if(!t.cases){target.append(el('section',{class:'panel'},el('h2',{},'Vos statistiques commencent avec vos dossiers'),el('p',{},'Aucun dossier dans cette sélection. Les anciens diagnostics, mails et statistiques ProgiCheck ne sont pas importés. Le portail n’affiche ni benchmark ni courbe fictive.')));return;}
  target.append(el('p',{class:'small'},`${t.namedCompanies} nom(s) de société normalisé(s) · ${t.started} diagnostics commencés · ${t.complete} questionnaires complets · ${t.overdueActions} actions échues à vérifier. Plusieurs affaires peuvent concerner la même société ; ce n’est pas un dédoublonnage CRM certifié.`));
  const domainPanel=el('section',{class:'panel stat-domain-panel'},el('div',{},el('h2',{},'Profil par domaine'),el('p',{class:'small'},'Indices déclaratifs du questionnaire, pas une mesure technique ni une certification. Une base de domaine incomplète reste « à compléter ».')),radar(data.domains),domainCoverageTable(data));
  target.append(domainPanel);
  const axes=el('section',{class:'panel'},el('h2',{},'Disponibilité · Intégrité · Confidentialité'),el('p',{class:'small'},'Rapprochement indicatif selon l’axe de chaque question de base. Une intention de projet ou une exposition métier ne constitue pas une protection déployée.'));
  const axisGrid=el('div',{class:'stat-axes'});for(const axis of data.axes)axisGrid.append(el('article',{},el('h3',{},axis.name),el('strong',{class:'stat-axis-value'},percent(axis.score)),el('p',{class:'small'},axis.evaluable+' diagnostic(s) évaluable(s) / '+t.cases)));axes.append(axisGrid);target.append(axes);
  const stateEntries=Object.entries(statStateLabels).map(([key,label])=>[label,t[key]]);
  const verifyEntries=[['Vérifiées avec preuve',t.verified],['Renseignées, non vérifiées',t.answered-t.verified]];
  target.append(el('div',{class:'stat-grid-columns'},el('section',{class:'panel'},el('h2',{},'Couverture des réponses'),bars(stateEntries,'États des réponses'),el('p',{class:'small'},t.activeQuestions+' questions actives dans la sélection ; branches masquées exclues. Non applicable exige une justification.')),el('section',{class:'panel'},el('h2',{},'Niveau de preuve'),bars(verifyEntries,'Réponses vérifiées et déclaratives'),el('p',{class:'small'},'La vérification exige une réponse, une source et une date. Une réponse déclarée reste distincte d’un contrôle technique.'))));
  target.append(el('div',{class:'stat-grid-columns'},el('section',{class:'panel'},el('h2',{},'Affaires par étape'),bars(Object.entries(data.stages),'Étapes commerciales'),el('p',{class:'small'},'Nombre de dossiers. Une affaire gagnée n’est pas une facture encaissée.')),el('section',{class:'panel'},el('h2',{},'Validation des documents'),bars(Object.entries(data.documents).map(([key,n])=>[{draft:'Brouillon',reviewed:'Relu',validated:'Validé techniquement'}[key]||key,n]),'Statuts documentaires'))));
  const r=data.renewal;
  target.append(el('div',{class:'stat-grid-columns'},el('section',{class:'panel'},el('h2',{},'Renouvellements'),bars([['Échéances passées — à vérifier',r.expired],['Aujourd’hui à J-15',r.d15],['J-16 à J-30',r.d30],['J-31 à J-60',r.d60],['J-61 à J-90',r.d90],['Au-delà de J-90',r.later],['Date ou preuve à confirmer',r.toConfirm]],'Échéances des renouvellements'),el('p',{class:'small'},'Calcul UTC sur dates vérifiées et sourcées. Une échéance passée ne prouve pas une interruption de service.')),el('section',{class:'panel'},el('h2',{},'Activité enregistrée'),bars(data.months.map(m=>[new Intl.DateTimeFormat('fr-FR',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(m.month+'-01T00:00:00Z')),m.count]),'Dossiers créés sur six mois'),el('p',{class:'small'},'Dates réelles de création des dossiers, en UTC ; aucune progression de maturité déduite. '+t.undatedCases+' dossier(s) sans date exploitable.'))));
}
function statisticsCsv(data,scopeLabel){
  const cells=[['Type','Indicateur','Valeur','Dénominateur'],['Méthode','Version',data.methodVersion,''],['Sélection',scopeLabel,data.at,'UTC'],['Population','Dossiers',data.totals.cases,''],['Population','Complétude moyenne (%)',data.totals.completion??'À compléter',data.totals.cases],['Population','Réponses renseignées',data.totals.answered,data.totals.activeQuestions],['Population','Réponses vérifiées',data.totals.verified,data.totals.answered]];
  for(const d of data.domains)cells.push(['Domaine',d.name,d.score===null?'À compléter':d.score.toFixed(2),d.evaluable+' diagnostics / '+data.totals.cases]);
  for(const a of data.axes)cells.push(['Axe DIC',a.name,a.score===null?'À compléter':a.score.toFixed(2),a.evaluable+' diagnostics / '+data.totals.cases]);
  for(const[k,label]of Object.entries(statStateLabels))cells.push(['Couverture',label,data.totals[k],data.totals.activeQuestions]);
  for(const[k,v]of Object.entries(data.stages))cells.push(['Étape',k,v,data.totals.cases]);
  for(const[k,v]of Object.entries(data.documents))cells.push(['Document',({draft:'Brouillon',reviewed:'Relu',validated:'Validé techniquement'})[k]||k,v,data.totals.cases]);
  for(const[k,label]of Object.entries({expired:'Échéances passées à vérifier',d15:'Aujourd’hui à J-15',d30:'J-16 à J-30',d60:'J-31 à J-60',d90:'J-61 à J-90',later:'Au-delà de J-90',toConfirm:'Date ou preuve à confirmer'}))cells.push(['Renouvellement',label,data.renewal[k],'']);
  for(const m of data.months)cells.push(['Création de dossiers',m.month,m.count,'UTC']);
  function quote(v){let s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
  return '\uFEFF'+cells.map(row=>row.map(quote).join(';')).join('\r\n');
}
function renderStatistics(target){
  state.statsFilter??={caseId:'',segment:''};const filters=state.statsFilter;
  const chosen=state.cases.filter(c=>(!filters.caseId||c.id===filters.caseId)&&(!filters.segment||c.segment===filters.segment));
  const data=SancfisStatistics.buildStatistics(state.catalog.questionnaire.domains,chosen,new Date().toISOString(),SancfisQuestionnaire.evaluate);
  const scopeLabel=filters.caseId?(chosen[0]?.company||'Dossier absent'):'Ensemble des dossiers autorisés'+(filters.segment?' · '+filters.segment:'');
  header(target,'Analyse et statistiques','Maturité déclarative, preuves et activité — sur les dossiers auxquels votre compte a accès.',[
    button('Nouveau dossier',()=>openCase(emptyCase()),true),
    button('Actualiser',async()=>{try{state.cases=(await api('/cases')).cases;render();}catch(e){alert(e.message);}}),
    button('Exporter CSV',()=>{const url=URL.createObjectURL(new Blob([statisticsCsv(data,scopeLabel)],{type:'text/csv;charset=utf-8'}));const a=el('a',{href:url,download:'SANCFIS-statistiques-'+data.at.slice(0,10)+'.csv'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}),
    button('Imprimer / PDF',()=>{const report=clear(document.getElementById('print-report'));report.append(el('h1',{},'SANCFIS — Analyse et statistiques'),el('p',{},scopeLabel+' · '+data.at));drawStatistics(report,data);report.append(el('p',{},'Méthode '+data.methodVersion+' : indices du questionnaire, sans certification. Voir la méthode dans le portail.'));window.print();})
  ]);
  const company=el('select',{'aria-label':'Dossier à analyser'});company.append(el('option',{value:''},'Tous les dossiers autorisés'));for(const c of state.cases)company.append(el('option',{value:c.id},c.company+' · '+c.stage));company.value=filters.caseId;
  const segment=el('select',{'aria-label':'Taille de compte pour les statistiques'});for(const value of ['','Petite','Moyenne','Grande'])segment.append(el('option',{value},value||'Toutes les tailles'));segment.value=filters.segment;
  company.addEventListener('change',()=>{filters.caseId=company.value;render();});segment.addEventListener('change',()=>{filters.segment=segment.value;render();});
  target.append(el('div',{class:'stat-scope'},el('strong',{},scopeLabel),el('span',{class:'small'},'Mise à jour : '+new Date(data.at).toLocaleString('fr-FR',{timeZone:'UTC'})+' UTC')),el('div',{class:'filters'},company,segment));
  drawStatistics(target,data);
  const method=el('details',{class:'panel stat-method'},el('summary',{},'Méthode, limites et origine des chiffres'),el('p',{},'Version '+data.methodVersion+'. Source : les dossiers enregistrés du portail, après application des droits de votre compte. Les statistiques historiques de ProgiCheck et les analyses de mails locales ne sont pas importées.'),el('p',{},'Complétude : moyenne, par dossier, de (réponses renseignées + non-applicables justifiées) / questions actives. Les inconnues, refus de communiquer et points à confirmer restent visibles.'),el('p',{},'Indices par domaine et axe DIC : valeurs explicites des options historiques normalisées sur 100, poids égal par question de base éligible. Questions conditionnelles, intentions, incidents connus, dépendance Internet et fréquence des coupures sont exclus des indices. Un indice n’est calculé que si toutes les questions de base applicables du groupe sont renseignées. Un vrai zéro reste zéro ; un groupe incomplet ou entièrement non applicable n’a pas d’indice.'),el('p',{},'En vue portefeuille, chaque indice est la moyenne des seuls diagnostics évaluables, avec leur effectif affiché ; il ne représente pas toute la clientèle. Les questions non applicables sont exclues du calcul d’indice, jamais récompensées par une note maximale. Aucun score global, benchmark régional, risque financier, ROI ou tendance de marché n’est inventé.'));
  target.append(method);
}
