'use strict';
(function(scope){
  const STATES=['answered','unknown','pending','withheld','na'];
  function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value;}
  function responseState(q,a){if(!a)return 'unknown';if(a.state==='answered')return q.options.some(o=>o.id===a.optionId)?'answered':'unknown';if(a.state==='na')return a.justification?.trim()?'na':'unknown';return STATES.includes(a.state)?a.state:'unknown';}
  function verified(a){return a?.assurance==='verified'&&Boolean(a.evidence?.trim())&&validDate(a.reviewDate);}
  function indexFor(questions,answers){
    const eligible=questions.filter(q=>!q.condition&&q.scorePolicy==='declarative_only');
    const applicable=eligible.filter(q=>responseState(q,answers[q.id])!=='na');
    const answered=applicable.filter(q=>responseState(q,answers[q.id])==='answered');
    // Publish an index only for a completely answered, applicable base group.
    // A missing answer never becomes zero, nor does it improve the average.
    let score=null;
    if(applicable.length&&answered.length===applicable.length){
      const values=answered.map(q=>{const max=Math.max(...q.options.map(o=>o.score)),value=q.options.find(o=>o.id===answers[q.id].optionId).score;return Number.isFinite(value)&&max>0?100*value/max:null;});
      if(values.every(v=>v!==null))score=values.reduce((s,v)=>s+v,0)/values.length;
    }
    return {score,eligible:eligible.length,applicable:applicable.length,answered:answered.length};
  }
  function buildStatistics(domains,cases,now,evaluate){
    const date=new Date(now);if(!Number.isFinite(date.getTime()))throw Error('Date statistique invalide.');
    const today=date.toISOString().slice(0,10),domainRows=domains.map(d=>({id:d.id,name:d.name,states:Object.fromEntries(STATES.map(k=>[k,0])),verified:0,active:0,evaluable:0,score:null,scores:[]}));
    const axes=['Disponibilité','Intégrité','Confidentialité'].map(name=>({name,evaluable:0,score:null,scores:[]}));
    const months=Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-5+i,1));return {month:d.toISOString().slice(0,7),count:0};});
    const totals={cases:cases.length,namedCompanies:0,started:0,complete:0,activeQuestions:0,answered:0,verified:0,unknown:0,pending:0,withheld:0,na:0,completion:null,overdueActions:0,undatedCases:0};
    const renewal={verifiedDates:0,toConfirm:0,expired:0,d15:0,d30:0,d60:0,d90:0,later:0};
    const stages={},documents={},segments={},companies=new Set();let completion=0;
    for(const c of cases){
      if(typeof c.company==='string'&&c.company.trim())companies.add(c.company.trim().normalize('NFC').toLocaleLowerCase('fr'));
      stages[c.stage||'Non renseigné']=(stages[c.stage||'Non renseigné']||0)+1;documents[c.documentStatus||'draft']=(documents[c.documentStatus||'draft']||0)+1;segments[c.segment||'Non renseigné']=(segments[c.segment||'Non renseigné']||0)+1;
      if(c.nextAction?.trim()&&validDate(c.dueDate)&&c.dueDate<today&&!['Gagné','Perdu'].includes(c.stage))totals.overdueActions++;
      const creation=new Date(c.createdAt);if(c.createdAt&&Number.isFinite(creation.getTime())){const month=months.find(m=>m.month===creation.toISOString().slice(0,7));if(month)month.count++;}else totals.undatedCases++;
      const answers=c.diagnostic?.answers||{},active=new Set(evaluate(domains,answers).activeIds),counts=Object.fromEntries(STATES.map(k=>[k,0]));
      for(const row of domainRows){const d=domains.find(d=>d.id===row.id),visible=d.questions.filter(q=>active.has(q.id));row.active+=visible.length;
        for(const q of visible){const a=answers[q.id],s=responseState(q,a);row.states[s]++;counts[s]++;if(s==='answered'&&verified(a)){row.verified++;totals.verified++;}}
        const index=indexFor(visible,answers);if(index.score!==null)row.scores.push(index.score);
      }
      for(const axis of axes){const questions=domains.flatMap(d=>d.questions).filter(q=>active.has(q.id)&&q.dic===axis.name);const index=indexFor(questions,answers);if(index.score!==null)axis.scores.push(index.score);}
      const answered=counts.answered+counts.na;
      if(active.size)completion+=100*answered/active.size;
      if(STATES.some(k=>k!=='unknown'&&counts[k]>0))totals.started++;
      if(active.size&&answered===active.size)totals.complete++;
      totals.activeQuestions+=active.size;for(const k of STATES)totals[k]+=counts[k];
      for(const r of c.renewals||[]){
        if(r.dateStatus!=='verified'||!validDate(r.endDate)||!r.source?.trim()){renewal.toConfirm++;continue;}
        renewal.verifiedDates++;const days=Math.round((Date.parse(r.endDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
        if(days<0)renewal.expired++;else if(days<=15)renewal.d15++;else if(days<=30)renewal.d30++;else if(days<=60)renewal.d60++;else if(days<=90)renewal.d90++;else renewal.later++;
      }
    }
    totals.namedCompanies=companies.size;totals.completion=cases.length?completion/cases.length:null;
    for(const row of [...domainRows,...axes]){row.evaluable=row.scores.length;row.score=row.evaluable?row.scores.reduce((a,b)=>a+b,0)/row.evaluable:null;delete row.scores;}
    return {methodVersion:'2026-10-29.2',at:date.toISOString(),totals,domains:domainRows,axes,stages,documents,segments,months,renewal};
  }
  const api={buildStatistics,indexFor,validDate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.SancfisStatistics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
