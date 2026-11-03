function book_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Set SPREADSHEET_ID in Script Properties');
  return SpreadsheetApp.openById(id);
}
function uuid_() { return Utilities.getUuid(); }
function now_() { return new Date().toISOString(); }
function stamp_(row, old) {
  return Object.assign({}, row, {created_at:old ? old.created_at : now_(),updated_at:now_(),version:old ? Number(old.version)+1 : 1,is_active:row.is_active !== false});
}
function rows_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(row => row.some(v => v !== '')).map(row => {
    const record = {};
    headers.forEach((h,i) => record[h] = row[i] instanceof Date ? row[i].toISOString() : row[i]);
    return record;
  });
}
function snapshot_() {
  const book = book_(), data = {};
  Object.keys(MODEL).forEach(name => {
    const sheet = book.getSheetByName(name);
    if (!sheet) throw new Error('Initialize sheet: '+name);
    const headers = sheet.getRange(1,1,1,MODEL[name].length).getValues()[0];
    if (headers.join('|') !== MODEL[name].map(c=>c.name).join('|')) throw new Error('Header mismatch: '+name);
    data[name] = rows_(sheet);
  });
  return data;
}
function cell_(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  // Keep user-controlled text literal instead of interpreting spreadsheet formulas.
  return typeof value === 'string' && /^[=+\-@]/.test(value) ? "'"+value : value;
}
function applySnapshot_(data) {
  const book = book_();
  Object.keys(MODEL).forEach(name => {
    const sheet = book.getSheetByName(name), headers = MODEL[name].map(c=>c.name);
    sheet.clearContents();
    const values = [headers].concat(data[name].map(row => headers.map(key=>cell_(row[key]))));
    sheet.getRange(1,1,values.length,headers.length).setValues(values);
    sheet.setFrozenRows(1);
  });
  SpreadsheetApp.flush();
}
// A durable redo journal makes interrupted multi-tab writes recoverable.
// All portal readers take the same script lock and replay PREPARED snapshots first.
function commit_(data) {
  const book = book_();
  const journal = book.getSheetByName('_journal') || book.insertSheet('_journal');
  journal.clearContents(); journal.getRange(1,1).setValue('BUILDING');
  const text = JSON.stringify(data), chunks = [];
  Object.keys(MODEL).forEach(table=>data[table].forEach(row=>Object.values(row).forEach(value=>{
    if (String(value === undefined || value === null ? '' : value).length>45000) throw new Error('Field exceeds Sheets cell limit; reduce transaction size');
  })));
  for (let i=0;i<text.length;i+=35000) chunks.push([cell_(text.slice(i,i+35000))]);
  journal.getRange(2,1,chunks.length,1).setValues(chunks);
  SpreadsheetApp.flush(); journal.getRange(1,1).setValue('PREPARED'); SpreadsheetApp.flush();
  journal.hideSheet();
  applySnapshot_(data);
  const sync = book.getSheetByName('_sync') || book.insertSheet('_sync');
  sync.getRange(1,1).setValue(uuid_()); sync.hideSheet(); SpreadsheetApp.flush();
  journal.clearContents(); SpreadsheetApp.flush();
}
function recover_() {
  const journal = book_().getSheetByName('_journal');
  if (!journal) return;
  if (journal.getRange(1,1).getValue() === 'BUILDING') { journal.clearContents(); SpreadsheetApp.flush(); return; }
  if (journal.getRange(1,1).getValue() !== 'PREPARED') return;
  const text = journal.getRange(2,1,journal.getLastRow()-1,1).getValues().map(r=>r[0]).join('');
  applySnapshot_(JSON.parse(text));
  const sync = book_().getSheetByName('_sync') || book_().insertSheet('_sync');
  sync.getRange(1,1).setValue(uuid_()); sync.hideSheet();
  journal.clearContents(); SpreadsheetApp.flush();
}
function find_(data, table, key, value) {
  const row = data[table].find(r=>String(r[key])===String(value));
  if (!row) throw new Error(table+' record not found: '+value);
  return row;
}
function active_(row) { return row.is_active !== false && row.is_active !== 'false' && (!row.status || row.status === 'active'); }
function number_(value, label, minimum, integer) {
  if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) throw new Error(label+' must be a number');
  const n=Number(value);
  if (n<minimum || (integer && !Number.isSafeInteger(n))) throw new Error('Invalid '+label);
  return n;
}
function money_(value) { return Math.round((value+Number.EPSILON)*100)/100; }
function lines_(p) { if (!Array.isArray(p.items) || !p.items.length) throw new Error('At least one line required'); return p.items; }
function update_(row, fields) { Object.assign(row, stamp_(Object.assign({},row,fields),row)); return row; }
