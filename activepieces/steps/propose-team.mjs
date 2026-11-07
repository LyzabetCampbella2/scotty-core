/**
 * Activepieces CODE action. Add two inputs in the Activepieces editor:
 *   directory = Body from your previous "HTTP Get Agent Directory" step
 *   task = A fictional/non-sensitive task, such as "frontend engineering QA"
 * This code runs ONLY on the data Activepieces passes in.
 */
export const code = async (inputs) => {
  const raw = inputs?.directory;
  const directory = typeof raw === 'string'
    ? JSON.parse(raw)
    : (raw?.body || raw);
  const task = String(inputs?.task ?? '').trim();
  if (!directory || directory.mode !== 'STATIC_READ_ONLY' ||
      directory.live_roster_verified !== false ||
      directory.owner_approval_required_for_execution !== true ||
      !Array.isArray(directory.agents) ||
      directory.counts?.total !== 185 ||
      directory.counts?.chiefs !== 25 ||
      directory.counts?.specialists !== 160 ||
      directory.agents.length !== 185) {
    throw new Error('INVALID_PUBLIC_DEVELOPMENT_DIRECTORY');
  }
  if (!task || task.length > 500) {
    throw new Error('TASK_MUST_BE_1_TO_500_CHARACTERS');
  }
  const tokenize = (value) => new Set(
    String(value || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []
  );
  const stop = new Set(['the','for','and','with','from','this','that','into',
    'please','help','make','create','work','task','plan','fictional','simple',
    'project','steps','checklist','review']);
  const terms = [...tokenize(task)].filter(x => !stop.has(x));
  const chiefs = new Map(directory.agents.filter(a => a.isChief)
    .map(a => [a.id,a]));
  const ranked = directory.agents.filter(a =>
    a.isChief === false && chiefs.has(a.chiefId)
  ).map(a => {
    const specialty = tokenize(a.specialty);
    const department = tokenize(a.department);
    const skills = tokenize((a.skills || []).join(' '));
    const matched = terms.filter(t =>
      specialty.has(t) || department.has(t) || skills.has(t)
    );
    const score = matched.reduce((sum,t) =>
      sum + (specialty.has(t) ? 3 : 0) +
      (department.has(t) ? 2 : 0) + (skills.has(t) ? 1 : 0),0);
    return {agent:a,matched,score};
  }).filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score || a.agent.id.localeCompare(b.agent.id));
  const chosen = [], usedChiefs = new Set();
  for (const match of ranked) {
    if (usedChiefs.has(match.agent.chiefId)) continue;
    const chief = chiefs.get(match.agent.chiefId);
    chosen.push({agentId:match.agent.id,name:match.agent.name,
      specialty:match.agent.specialty,chiefId:chief.id,chiefName:chief.name,
      department:match.agent.department,matchTerms:match.matched,score:match.score,
      status:'suggested-only'});
    usedChiefs.add(chief.id);
    if (chosen.length === 2) break;
  }
  return {
    status:chosen.length ? 'PENDING_OWNER_APPROVAL' : 'NEEDS_CLARIFICATION',
    mode:'ROUTING_PREVIEW_ONLY',
    task,proposedTeams:chosen,
    overseer:'SCOTTY',ownerApprovalRequired:true,
    started:false,aiCalls:0,memoryWrites:0,missionsCreated:0,
    externalActions:0,liveRosterVerified:false,
    warning:'Static authored development profiles only. Nothing was assigned or executed.'
  };
};
