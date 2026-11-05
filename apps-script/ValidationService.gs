function validateSnapshot_(data) {
  Object.keys(MODEL).forEach(table => {
    const seen={};
    data[table].forEach(row => {
      if (COMPOSITE_KEYS[table]) {
        const composite='key:'+JSON.stringify(COMPOSITE_KEYS[table].map(k=>row[k]));
        if (seen[composite]) throw new Error('Duplicate '+table+' key');
        seen[composite]=true;
      }
      MODEL[table].forEach(field => {
        const v=row[field.name], rule=field.rules, blank=v==='' || v===null || v===undefined;
        if (blank && (/NOT NULL|PRIMARY KEY/.test(rule))) throw new Error(table+'.'+field.name+' is required');
        if (blank) return;
        if (field.type==='integer' && !Number.isInteger(Number(v))) throw new Error('Integer required: '+field.name);
        if (/numeric/.test(field.type) && !Number.isFinite(Number(v))) throw new Error('Number required: '+field.name);
        if (field.type==='boolean' && typeof v !== 'boolean') throw new Error('Boolean required: '+field.name);
        const choices=rule.match(/IN \(([^)]+)\)/);
        if (choices && !choices[1].split(',').map(x=>x.trim().replace(/'/g,'')).includes(String(v))) throw new Error('Invalid '+field.name);
        const ref=rule.match(/REFERENCES (\w+)\((\w+)\)/);
        if (ref && !data[ref[1]].some(r=>String(r[ref[2]])===String(v))) throw new Error('Unknown reference: '+field.name);
        if (/PRIMARY KEY|UNIQUE/.test(rule)) {
          const key=field.name+':'+String(v).toLowerCase();
          if (seen[key]) throw new Error('Duplicate '+field.name); seen[key]=true;
        }
        if (/CHECK \(\w+ >= 0\)/.test(rule) && Number(v)<0) throw new Error(field.name+' cannot be negative');
        if (/CHECK \(\w+ > 0\)/.test(rule) && Number(v)<=0) throw new Error(field.name+' must be positive');
      });
    });
  });
  data.inventory_balances.forEach(r=> { if (Number(r.quantity_on_hand)<Number(r.quantity_reserved)) throw new Error('Reserved stock exceeds on-hand'); });
}
function normalizeMaster_(table, input) {
  const row={};
  MODEL[table].forEach(f=> {
    if (DISPLAY_CODES[table] && f.name===DISPLAY_CODES[table][0]) return;
    if (!Object.prototype.hasOwnProperty.call(input,f.name)) return;
    let value=input[f.name];
    if (typeof value==='string') value=value.trim();
    if (value!=='' && /integer|numeric/.test(f.type)) {
      value=number_(value,f.name,0,f.type==='integer');
      if (/numeric/.test(f.type) && (value>=1000000000000 || Math.abs(value*100-Math.round(value*100))>0.0001)) throw new Error(f.name+' requires at most two decimal places');
    }
    row[f.name]=value;
  });
  if (row.sku) row.sku=row.sku.toUpperCase();
  if (row.email) {
    row.email=row.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) throw new Error('Invalid email');
  }
  return row;
}
