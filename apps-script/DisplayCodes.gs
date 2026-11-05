/** Backfills missing labels under the existing script lock; UUIDs never change. */
function assignDisplayCodes_(data,existingRecords) {
  const properties=PropertiesService.getScriptProperties(), changed={};
  Object.keys(DISPLAY_CODES).forEach(table=>{
    const spec=DISPLAY_CODES[table], field=spec[0],prefix=spec[1],width=spec[2];
    const pattern=new RegExp('^'+prefix+'-([0-9]{'+width+',})$');
    const counterKey='DISPLAY_COUNTER_'+table;
    let highest=Number(properties.getProperty(counterKey)) || 0;
    const used={};
    data[table].forEach(row=>{
      if (!row[field]) return;
      const match=String(row[field]).match(pattern);
      if (!match || used[row[field]]) throw new Error('Invalid or duplicate '+field+'; existing codes will not be rewritten');
      used[row[field]]=true; highest=Math.max(highest,Number(match[1]));
    });
    const key=MODEL[table].find(f=>/PRIMARY KEY/.test(f.rules)).name;
    const missing=data[table].filter(row=>!row[field]).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)) || String(a[key]).localeCompare(String(b[key])));
    if (missing.length) {
      if (!Number.isSafeInteger(highest+missing.length)) throw new Error('Display code sequence exhausted');
      // Reserve before commit: a failed operation may leave gaps, never reused codes.
      properties.setProperty(counterKey,String(highest+missing.length));
      missing.forEach(row=>{
        highest++;
        const code=prefix+'-'+String(highest).padStart(width,'0');
        if (existingRecords) update_(row,{[field]:code}); else row[field]=code;
      });
      changed[table]=missing.length;
    } else if (highest>(Number(properties.getProperty(counterKey)) || 0)) {
      properties.setProperty(counterKey,String(highest));
    }
  });
  return changed;
}

function displayCodeForId_(data,id) {
  for (const table of Object.keys(DISPLAY_CODES)) {
    const key=MODEL[table].find(f=>/PRIMARY KEY/.test(f.rules)).name;
    const row=data[table].find(r=>r[key]===id);
    if (row) return row[DISPLAY_CODES[table][0]] || '';
  }
  return '';
}

// Optional editor entry point. Normal portal/trigger requests also backfill once.
function upgradeDisplayCodes() {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    recover_();
    const data=snapshot_();
    if (authorize_(data).role!=='administrator') throw new Error('Administrator required');
    const counts={};
    Object.keys(DISPLAY_CODES).forEach(t=>counts[t]=data[t].filter(r=>!!r[DISPLAY_CODES[t][0]]).length);
    console.log(JSON.stringify({status:'ready',coded_records:counts,internal_ids:'unchanged'}));
    return {status:'ready',coded_records:counts};
  } finally { lock.releaseLock(); }
}
