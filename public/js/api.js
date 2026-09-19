let csrf='';
let pendingInvitation = new URLSearchParams(location.hash.slice(1)).get('invite');
if(pendingInvitation)history.replaceState(null,'',location.pathname);
let collectionAccess=false;
export const hasCollectionAccess=()=>collectionAccess;
export async function request(url,options={}) {
  const response=await fetch(url,{...options,credentials:'same-origin',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{}),...options.headers}});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error || 'No pudimos conectar con el refugio.');
  return data;
}
export async function authenticate() {
  let data=pendingInvitation ? await request('/api/session',{method:'POST',body:JSON.stringify({token:pendingInvitation})}) : await request('/api/session');
  if(!data.csrf)data=await request('/api/visitor-session',{method:'POST',body:'{}'});
  csrf=data.csrf;
  collectionAccess=Boolean(data.authenticated);
  pendingInvitation=null;
}
