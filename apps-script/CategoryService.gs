function categoryPath_(data, id) {
  const names=[], visited={};
  while (id) { if (visited[id]) throw new Error('Category cycle'); visited[id]=true; const row=find_(data,'categories','category_id',id); names.unshift(row.category_name); id=row.parent_category_id; }
  return names.join(' / ');
}
