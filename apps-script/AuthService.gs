function authorize_(data) {
  const email = Session.getActiveUser().getEmail().toLowerCase();
  if (!email) throw new Error('Authenticated Workspace identity unavailable. Ask your administrator to check deployment access.');
  const user = data.users.find(u=>String(u.email).toLowerCase()===email && u.account_status==='active' && active_(u));
  if (!user) throw new Error('Account is not authorized');
  const role=find_(data,'roles','role_id',user.role_id);
  if (!active_(role)) throw new Error('Role is inactive');
  return {user_id:user.user_id,email:email,role:role.role_name};
}
function permit_(actor, action, table) {
  if (actor.role==='administrator') return;
  const allowed = {
    sales:['sale','payment','returnOrder','refund','ship'],
    inventory:['purchase','receive','adjust','transfer'], analyst:[]
  };
  if (action==='saveMaster' && ((actor.role==='sales' && table==='customers') || (actor.role==='inventory' && ['products','categories','suppliers'].includes(table)))) return;
  if (!(allowed[actor.role] || []).includes(action)) throw new Error('Your role cannot perform this operation');
}
