function audit_(data, actor, action, result, before, requestId) {
  // Only changed entity rows are stored, avoiding customer data from unrelated tables.
  const previous=JSON.parse(before), changes=[];
  Object.keys(MODEL).filter(t=>t!=='audit_logs').forEach(table=> {
    data[table].forEach((row,i)=> { if (JSON.stringify(row)!==JSON.stringify(previous[table][i])) changes.push({table:table,before:previous[table][i] || null,after:row}); });
  });
  data.audit_logs.push(stamp_({audit_id:requestId,actor_id:actor.user_id,entity_table:action,entity_id:result.id || '',action:action==='saveMaster'?'update':'post',before_data:JSON.stringify(changes.map(c=>({table:c.table,row:c.before}))),after_data:JSON.stringify(changes.map(c=>({table:c.table,row:c.after})))}));
}
