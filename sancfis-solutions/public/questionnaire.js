'use strict';
// Shared by the browser and server. Conditions are data, never executable code.
(function(scope){
  function validate(domains){
    const list=domains.flatMap(d=>d.questions),byId=new Map(list.map(q=>[q.id,q]));
    if(byId.size!==list.length)throw Error('Identifiant de question en doublon.');
    const visiting=new Set(),done=new Set();
    function visit(q){if(visiting.has(q.id))throw Error('Cycle de conditions.');if(done.has(q.id))return;visiting.add(q.id);if(q.condition){const p=byId.get(q.condition.dependsOn);if(!p)throw Error('Parent inconnu.');if(!Array.isArray(q.condition.optionIds)||q.condition.optionIds.some(id=>!p.options.some(o=>o.id===id)))throw Error('Option de condition inconnue.');visit(p);}visiting.delete(q.id);done.add(q.id);}
    list.forEach(visit);return byId;
  }
  function evaluate(domains,answers={}){
    const byId=validate(domains),active=new Set(),reasons={};
    function enabled(q){if(active.has(q.id))return true;if(!q.condition){active.add(q.id);reasons[q.id]='Question de base du domaine.';return true;}const p=byId.get(q.condition.dependsOn),a=answers[p.id];if(enabled(p)&&a?.state==='answered'&&q.condition.optionIds.includes(a.optionId)){active.add(q.id);reasons[q.id]=q.condition.reason;return true;}return false;}
    byId.forEach(enabled);return {activeIds:[...byId.keys()].filter(id=>active.has(id)),reasons};
  }
  function coverage(domains,answers={}){
    const ids=evaluate(domains,answers).activeIds;
    const n=s=>ids.filter(id=>(answers[id]?.state||'unknown')===s).length;
    return {active:ids.length,answered:n('answered'),unknown:n('unknown'),pending:n('pending'),withheld:n('withheld'),notApplicable:n('na'),verified:ids.filter(id=>answers[id]?.assurance==='verified').length};
  }
  const api={validate,evaluate,coverage};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.SancfisQuestionnaire=api;
})(typeof globalThis!=='undefined'?globalThis:this);
