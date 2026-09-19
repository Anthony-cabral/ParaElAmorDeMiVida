let csrf='';
let collectionAccess=false;

export const hasCollectionAccess=()=>collectionAccess;

export async function request(url,options={}) {
  const response=await fetch(url,{
    ...options,
    credentials:'same-origin',
    signal:AbortSignal.timeout(12000),
    headers:{
      'Content-Type':'application/json',
      ...(csrf?{'X-CSRF-Token':csrf}:{}),
      ...options.headers
    }
  });
  const data=await response.json();
  if(!response.ok)throw new Error(data.error || 'No pudimos conectar con el refugio.');
  return data;
}

export async function authenticate() {
  // Clean up any old #invite links from earlier versions. They are no longer required.
  if(location.hash.startsWith('#invite='))history.replaceState(null,'',location.pathname);

  let data=await request('/api/session');
  if(!data.csrf)data=await request('/api/visitor-session',{method:'POST',body:'{}'});

  csrf=data.csrf;
  collectionAccess=true;
}
