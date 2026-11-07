/**
 * Extract exactly one staged, non-private, not-yet-reviewed request from the
 * SCOTTY — Task Intake (Public Demo Only) table.
 * This is READ-ONLY: no table updates, agent calls or mission creation.
 * Input: rows = Tables/Find Records output
 */
export const code = async (inputs) => {
  const raw=inputs?.rows;
  const rows=typeof raw==='string'?JSON.parse(raw):(Array.isArray(raw)?raw:raw?.records);
  if(!Array.isArray(rows)||rows.length>25)throw Error('INVALID_PUBLIC_TASK_ROWS');
  const read=(r,key)=>{
    const cells=r?.cells;
    if(!cells||typeof cells!=='object')return null;
    const cell=Object.values(cells).find(c=>c?.fieldName===key);
    return typeof cell?.value==='string'?cell.value:null;
  };
  const eligible=[];
  for(const r of rows){
    const state=read(r,'Review Status'),classification=read(r,'Data Class');
    if(state!=='New'||classification!=='Public or synthetic')continue;
    const task=read(r,'Task Description'),taskId=read(r,'Task ID');
    const project=read(r,'Project')||'Synthetic demo';
    if(!r.id||!task||task.trim().length===0||task.length>500||
       !taskId||taskId.length>80||project.length>100)throw Error('INVALID_TASK_METADATA');
    eligible.push({recordId:r.id,taskId,projectLabel:project,task:task.trim()});
  }
  eligible.sort((a,b)=>a.taskId.localeCompare(b.taskId));
  const chosen=eligible[0];
  return {status:chosen?'PREVIEW_INPUT_READY':'NO_ELIGIBLE_PUBLIC_TASKS',
    selectedTask:chosen||null,eligiblePublicTasks:eligible.length,
    liveMissionCreated:false,privateDataRead:false,externalWrites:0,
    note:'Only public-or-synthetic New tasks are eligible; proposals never become real assignments.'};
};
