/** Run installAutomaticSync once from the editor after configuring Script Properties. */
function installAutomaticSync() {
  // Manual entry points require the actual active administrator, never the effective owner.
  const first=exportSuperstoreNow();
  const properties=PropertiesService.getScriptProperties();
  properties.setProperty('SYNC_TRIGGER_OWNER_EMAIL',Session.getActiveUser().getEmail().toLowerCase());
  const previous=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='scheduledSuperstoreExport_');
  const trigger=ScriptApp.newTrigger('scheduledSuperstoreExport_').timeBased().everyHours(1).create();
  previous.forEach(t=>ScriptApp.deleteTrigger(t));
  console.log(JSON.stringify({status:'installed',frequency:'hourly',first_export:first}));
  return {status:'installed',trigger_id:trigger.getUniqueId(),first_export:first};
}

function exportSuperstoreNow() {
  return publishSuperstoreSnapshot_(false);
}

function disableAutomaticSync() {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    recover_();
    if (authorize_(snapshot_()).role!=='administrator') throw new Error('Administrator required');
    ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='scheduledSuperstoreExport_').forEach(t=>ScriptApp.deleteTrigger(t));
    PropertiesService.getScriptProperties().deleteProperty('SYNC_TRIGGER_OWNER_EMAIL');
    return {status:'disabled'};
  } finally { lock.releaseLock(); }
}

// Private functions ending in _ cannot be invoked by google.script.run.
function scheduledSuperstoreExport_() { return publishSuperstoreSnapshot_(true); }

function githubSyncConfig_() {
  const p=PropertiesService.getScriptProperties();
  const config={owner:p.getProperty('GITHUB_OWNER'),repo:p.getProperty('GITHUB_REPO'),token:p.getProperty('GITHUB_TOKEN')};
  if (!/^[A-Za-z0-9-]+$/.test(config.owner || '') || !/^[A-Za-z0-9_.-]+$/.test(config.repo || '') || !config.token) {
    throw new Error('Set GITHUB_OWNER, GITHUB_REPO and GITHUB_TOKEN in Script Properties');
  }
  config.base='https://api.github.com/repos/'+encodeURIComponent(config.owner)+'/'+encodeURIComponent(config.repo);
  return config;
}

function githubSyncRequest_(config, method, path, payload, allowMissing) {
  const options={method:method,followRedirects:false,muteHttpExceptions:true,headers:{
    Authorization:'Bearer '+config.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'
  }};
  if (payload) { options.contentType='application/json'; options.payload=JSON.stringify(payload); }
  const response=UrlFetchApp.fetch(config.base+path,options),status=response.getResponseCode();
  if (allowMissing && status===404) return null;
  if (status<200 || status>=300) throw new Error('GitHub sync request failed (HTTP '+status+'). Check repository, token permission/expiry and branch rules.');
  return JSON.parse(response.getContentText());
}

function publishSuperstoreSnapshot_(scheduled) {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    recover_();
    const data=snapshot_(), properties=PropertiesService.getScriptProperties();
    if (scheduled) {
      const owner=Session.getEffectiveUser().getEmail().toLowerCase();
      if (!owner || owner!==properties.getProperty('SYNC_TRIGGER_OWNER_EMAIL')) throw new Error('Scheduled export owner mismatch; reinstall the trigger');
      const user=data.users.find(u=>String(u.email).toLowerCase()===owner && u.account_status==='active' && active_(u));
      if (!user || !data.roles.some(r=>r.role_id===user.role_id && r.role_name==='administrator' && active_(r))) throw new Error('Scheduled export owner is no longer an administrator');
    } else if (authorize_(data).role!=='administrator') throw new Error('Administrator required');
    const config=githubSyncConfig_();
    const repository=githubSyncRequest_(config,'get','');
    if (repository.private!==true) throw new Error('Automatic export requires a PRIVATE GitHub repository');
    if (repository.archived || repository.disabled) throw new Error('Repository cannot accept exports');
    const branch=repository.default_branch;
    if (!branch) throw new Error('Initialize the repository with a README and workflow first');
    const tables={};
    Object.keys(MODEL).filter(t=>!['pipeline_runs','quality_errors','etl_watermarks'].includes(t)).forEach(t=>tables[t]=data[t]);
    const serialized=JSON.stringify(tables);
    const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,serialized,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
    const path='/contents/operational/snapshot.json.gz';
    const existing=githubSyncRequest_(config,'get',path+'?ref='+encodeURIComponent(branch),null,true);
    const destination=config.owner+'/'+config.repo+'/'+branch;
    // Refresh the export timestamp even without business changes, as a daily heartbeat.
    const lastTime=Date.parse(properties.getProperty('SYNC_LAST_EXPORTED_AT') || '');
    if (existing && properties.getProperty('SYNC_LAST_DESTINATION')===destination && properties.getProperty('SYNC_LAST_DIGEST')===digest && properties.getProperty('SYNC_LAST_GIT_SHA')===existing.sha && Date.now()-lastTime<12*60*60*1000) {
      return {status:'unchanged',repository:config.owner+'/'+config.repo};
    }
    const exportedAt=now_();
    const envelope={format_version:1,exported_at:exportedAt,source_revision:book_().getSheetByName('_sync').getRange(1,1).getValue(),tables:tables};
    const compressed=Utilities.gzip(Utilities.newBlob(JSON.stringify(envelope),'application/json','snapshot.json'));
    const bytes=compressed.getBytes();
    if (bytes.length>900000) throw new Error('Compressed snapshot exceeds the 900 KB portfolio limit; use object storage for larger datasets');
    const payload={message:'Sync private operational snapshot',branch:branch,content:Utilities.base64Encode(bytes)};
    if (existing) payload.sha=existing.sha;
    const saved=githubSyncRequest_(config,'put',path,payload);
    if (!saved.content || !saved.content.sha) throw new Error('GitHub did not confirm the snapshot write');
    properties.setProperties({SYNC_LAST_DESTINATION:destination,SYNC_LAST_DIGEST:digest,SYNC_LAST_GIT_SHA:saved.content.sha,SYNC_LAST_EXPORTED_AT:exportedAt});
    const result={status:'exported',repository:config.owner+'/'+config.repo,exported_at:exportedAt,tables:Object.keys(tables).length};
    console.log(JSON.stringify(result)); return result;
  } finally { lock.releaseLock(); }
}
