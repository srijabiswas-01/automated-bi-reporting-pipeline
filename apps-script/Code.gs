function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Superstore Operations');
}

// Run from the script editor after setting SPREADSHEET_ID and BOOTSTRAP_ADMIN_EMAIL.
function initializeSuperstore() {
  const email = Session.getActiveUser().getEmail().toLowerCase();
  const allowed = PropertiesService.getScriptProperties().getProperty('BOOTSTRAP_ADMIN_EMAIL');
  if (!email || email !== String(allowed).toLowerCase()) throw new Error('Bootstrap administrator required');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const book = book_();
    recover_();
    Object.keys(MODEL).forEach(name => {
      let sheet = book.getSheetByName(name);
      if (!sheet) sheet = book.insertSheet(name);
      if (!sheet.getLastRow()) sheet.appendRow(MODEL[name].map(c => c.name));
    });
    const data = snapshot_();
    if (!data.users.length) {
      const role = stamp_({role_id: uuid_(), role_name: 'administrator'});
      data.roles.push(role);
      ['sales','inventory','analyst'].forEach(name => data.roles.push(stamp_({role_id:uuid_(),role_name:name})));
      data.users.push(stamp_({user_id:uuid_(),email:email,role_id:role.role_id,account_status:'active'}));
      commit_(data);
    }
    const journal=book.getSheetByName('_journal') || book.insertSheet('_journal'); journal.hideSheet();
    const sync=book.getSheetByName('_sync') || book.insertSheet('_sync');
    if (!sync.getRange(1,1).getValue()) sync.getRange(1,1).setValue(uuid_());
    sync.hideSheet();
  } finally { lock.releaseLock(); }
}

function api(action, payload) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    recover_();
    const data = snapshot_();
    const actor = authorize_(data);
    payload = payload || {};
    if (action === 'bootstrap') return bootstrap_(data, actor);
    if (action === 'dashboard') return dashboard_(data);
    const handlers = {
      saveMaster: saveMaster_, purchase: purchase_, receive: receive_,
      adjust: adjust_, transfer: transfer_, sale: sale_, payment: payment_,
      returnOrder: returnOrder_, refund: refund_, ship: ship_
    };
    if (!handlers[action]) throw new Error('Unknown operation');
    permit_(actor, action, payload.table);
    if (!/^[0-9a-f-]{36}$/i.test(payload.request_id || '')) throw new Error('A unique request ID is required');
    const prior = data.audit_logs.find(r=>r.audit_id===payload.request_id);
    if (prior) {
      if (prior.actor_id!==actor.user_id || prior.entity_table!==action) throw new Error('Request ID already used');
      return {message:'Already saved',result:{id:prior.entity_id,code:displayCodeForId_(data,prior.entity_id)}};
    }
    const before = JSON.stringify(data);
    const result = handlers[action](data, payload, actor);
    assignDisplayCodes_(data,false);
    result.code=displayCodeForId_(data,result.id);
    validateSnapshot_(data);
    audit_(data, actor, action, result, before, payload.request_id);
    commit_(data);
    return {message:'Saved successfully', result:result};
  } finally { lock.releaseLock(); }
}
