function saveMaster_(data, p) {
  const permitted=['products','categories','customers','suppliers','brands','segments','stores','roles','users','customer_addresses','product_suppliers'];
  if (!permitted.includes(p.table)) throw new Error('Not an editable master table');
  const table=p.table, input=normalizeMaster_(table,p.record || {});
  const key=MODEL[table].find(f=>/PRIMARY KEY/.test(f.rules));
  const keys=COMPOSITE_KEYS[table] || [key.name];
  const old=key ? (input[key.name] ? data[table].find(r=>r[key.name]===input[key.name]) : null) :
    (p.original_key ? data[table].find(r=>keys.every(k=>r[k]===p.original_key[k])) : null);
  if ((key && input[key.name] || p.original_key) && !old) throw new Error('Record no longer exists');
  if (old && Number(p.version)!==Number(old.version)) throw new Error('Record changed. Refresh before saving');
  if (key && !old) input[key.name]=uuid_();
  if (!key && old && !keys.every(k=>old[k]===input[k])) throw new Error('Catalogue key cannot change; deactivate and create a new mapping');
  const row=stamp_(Object.assign({},old || {},input),old);
  if (table==='categories' && row.parent_category_id) {
    let parent=row.parent_category_id; const visited=[row.category_id];
    while (parent) { if (visited.includes(parent)) throw new Error('Category cycle'); visited.push(parent); parent=find_(data,'categories','category_id',parent).parent_category_id; }
  }
  if (old) data[table][data[table].indexOf(old)]=row; else data[table].push(row);
  if (table==='products' && (!old || old.cost_price!==row.cost_price || old.selling_price!==row.selling_price)) recordPrice_(data,row);
  return {id:keys.map(k=>row[k]).join(':')};
}
