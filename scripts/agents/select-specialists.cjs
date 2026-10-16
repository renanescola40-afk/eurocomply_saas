'use strict';

// Deterministic routing only: does not call models, send messages, or mutate providers.
const ROLES=Object.freeze(["master-cto","developer","security","devops","database","billing","qa-automation","compliance","release-manager"]);
const DEFAULTS=Object.freeze({"type:ci":"devops","type:security":"security","type:bug":"developer","type:feature":"developer"});
const REVIEWERS=Object.freeze({"master-cto":["qa-automation"],"developer":["qa-automation"],"security":["qa-automation","release-manager"],"devops":["security","release-manager"],"database":["security","qa-automation"],"billing":["security","qa-automation"],"qa-automation":["security"],"compliance":["security","release-manager"],"release-manager":["master-cto","security"]});

function selectSpecialists(issue){
  if(!issue||typeof issue!=="object")throw new Error("Issue must be an object");
  const labels=(Array.isArray(issue.labels)?issue.labels:[]).map(v=>(typeof v==="string"?v:v?.name)||"").filter(Boolean).map(s=>s.toLowerCase());
  const body=typeof issue.body==="string"?issue.body:"";
  const fromLabels=labels.filter(s=>s.startsWith("agent:role:")).map(s=>s.slice("agent:role:".length));
  const fromBody=[...body.matchAll(/^\s*Agent(?: Profile)?:\s*([a-z-]+)\s*$/gim)].map(x=>x[1].toLowerCase());
  const declared=[...new Set([...fromLabels,...fromBody])];
  if(declared.some(s=>!ROLES.includes(s)))throw new Error(`Unknown specialist role: ${declared.find(s=>!ROLES.includes(s))}`);
  if(declared.length>1)throw new Error("Conflicting specialist role declarations; owner must select one");
  let lead=declared[0]??null;
  let source=lead?"explicit":"default";
  if(!lead){
    for(const [label,role] of Object.entries(DEFAULTS)){if(labels.includes(label)){lead=role;source=label;break}}
    lead??="master-cto";
  }
  const high=labels.some(s=>["risk:high","priority:p0"].includes(s));
  const reviewers=[...new Set([...(REVIEWERS[lead]??[]),...(high?["security","release-manager"]:[])])].filter(role=>role!==lead);
  return {lead,profile:`.github/agents/${lead}.agent.md`,reviewers,source,highRisk:high,dispatchesModel:false};
}

module.exports={ROLES,selectSpecialists};
