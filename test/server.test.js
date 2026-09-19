import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createApp,ROOT} from '../server.js';
mkdirSync(path.join(ROOT,'test-output'),{recursive:true});
async function fixture(notify=async()=> 'disabled'){
 const dir=mkdtempSync(path.join(ROOT,'test-output','api-'));
 let app=createApp({privateDir:dir,origin:'http://localhost:3000',notify});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 let url='http://127.0.0.1:'+app.server.address().port;
 const call=async(route,method='GET',body,session,headers={})=>fetch(url+route,{method,headers:{Origin:'http://localhost:3000','Content-Type':'application/json',...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const login=async()=>{const response=await call('/api/session','POST',{token:readFileSync(path.join(dir,'invitation-token.txt'),'utf8')});assert.equal(response.status,200);return {cookie:response.headers.get('set-cookie').split(';')[0],...(await response.json())};};
 return {call,login,dir,get app(){return app;},close:()=>new Promise(resolve=>app.server.close(resolve)),restart:async()=>{await new Promise(resolve=>app.server.close(resolve));app=createApp({privateDir:dir,origin:'http://localhost:3000',notify});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+app.server.address().port;}};
}
test('private reads/writes, traversal, CSRF and input validation',async()=>{
 const f=await fixture();try{
  assert.equal((await f.call('/api/movies')).status,401);
  assert.equal((await f.call('/api/progress/totoro','PUT',{watched:true})).status,401);
  assert.equal((await f.call('/api/session','POST',{token:'wrong'})).status,401);
  const s=await f.login();
  assert.equal((await f.call('/api/progress/totoro','PUT',{watched:true},s,{Origin:'https://evil.test'})).status,403);
  assert.equal((await f.call('/api/progress/totoro','PUT',{watched:true},s,{'X-CSRF-Token':'bad'})).status,403);
  for(const input of [{watched:'true'},{watched:1},{},null,[]])assert.equal((await f.call('/api/progress/totoro','PUT',input,s)).status,400);
  assert.equal((await f.call('/api/progress/does-not-exist','PUT',{watched:true},s)).status,400);
  for(const route of ['/private/refugio.sqlite','/.env','/server.js','/data/movies.json','/..%2fprivate%2faccess.json','/%2e%2e%5cprivate%5caccess.json'])assert.equal((await f.call(route)).status,404,route);
  const response=await f.call('/');assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
 }finally{await f.close();}
});
test('25 verified movies, local images and persistent explicit shared updates',async()=>{
 const f=await fixture();try{
  const a=await f.login(),b=await f.login();
  const data=await(await f.call('/api/movies','GET',undefined,a)).json();assert.equal(data.movies.length,25);
  for(const m of data.movies){assert.ok(existsSync(path.join(ROOT,'public',m.poster)));assert.ok(m.duration>0);}
  const first=await(await f.call('/api/progress/totoro','PUT',{watched:true},a)).json();assert.equal(first.watched,1);assert.ok(first.watched_at);
  const repeat=await(await f.call('/api/progress/totoro','PUT',{watched:true},a)).json();assert.equal(first.watched_at,repeat.watched_at);
  assert.equal((await(await f.call('/api/movies','GET',undefined,b)).json()).progress[0].watched,1);
  await f.restart();assert.equal((await(await f.call('/api/movies','GET',undefined,b)).json()).progress[0].watched,1);
  const undone=await(await f.call('/api/progress/totoro','PUT',{watched:false},b)).json();assert.equal(undone.watched,0);assert.equal(undone.watched_at,null);
 }finally{await f.close();}
});
test('start validation, simultaneous duplicates, other-session cooldown and durable dedupe',async()=>{
 let calls=0;const f=await fixture(async()=>{calls++;return 'sent';});try{
  const a=await f.login(),b=await f.login();await f.call('/');await f.call('/api/movies','GET',undefined,a);assert.equal(calls,0);
  for(const data of [{},{action:'navigate'},{action:'start',device:'unwanted'},null])assert.equal((await f.call('/api/adventure-start','POST',data,a)).status,400);assert.equal(calls,0);
  assert.equal((await f.call('/api/adventure-start','POST',{action:'start'},a,{'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await f.call('/api/adventure-start','POST',{action:'start'},a,{Origin:'https://evil.test'})).status,403);
  assert.equal((await f.call('/api/adventure-start','POST',{action:'start'})).status,401);
  await Promise.all(Array.from({length:5},()=>f.call('/api/adventure-start','POST',{action:'start'},a)));assert.equal(calls,1);
  const other=await(await f.call('/api/adventure-start','POST',{action:'start'},b)).json();assert.deepEqual(other,{accepted:true});assert.equal(calls,1);
  await f.restart();assert.deepEqual(await(await f.call('/api/adventure-start','POST',{action:'start'},a)).json(),{accepted:true});assert.equal(calls,1);
  for(let i=0;i<10;i++)await f.call('/api/adventure-start','POST',{action:'start'},a);
  assert.equal((await f.call('/api/adventure-start','POST',{action:'start'},a)).status,429);
 }finally{await f.close();}
});
test('disabled or failed email is stored server-side, never exposed in UI responses',async()=>{
 for(const notify of [async()=> 'disabled',async()=>{throw new Error('offline');}]){
  const f=await fixture(notify);try{const s=await f.login();const r=await(await f.call('/api/adventure-start','POST',{action:'start'},s)).json();assert.deepEqual(r,{accepted:true});assert.ok(['disabled','failed'].includes(f.app.db.prepare('SELECT status FROM notices').get().status));assert.equal((await f.call('/api/movies','GET',undefined,s)).status,200);}finally{await f.close();}
 }
});
test('server refuses insecure production configuration',()=>{const dir=mkdtempSync(path.join(ROOT,'test-output','production-'));assert.throws(()=>createApp({privateDir:dir,production:true,origin:'http://localhost:3000'}),/HTTPS/);});
test('new browser can enter story; visitor cannot read or modify private collection',async()=>{
 let notices=0;const f=await fixture(async()=>{notices++;return 'sent';});try{
  assert.deepEqual(await(await f.call('/api/session')).json(),{authenticated:false,csrf:null});
  const response=await f.call('/api/visitor-session','POST',{});
  const visitor={cookie:response.headers.get('set-cookie').split(';')[0],...await response.json()};
  assert.equal(visitor.authenticated,false);assert.equal(notices,0);
  for(const route of ['/api/movies','/api/invitation'])assert.equal((await f.call(route,'GET',undefined,visitor)).status,403);
  assert.equal((await f.call('/api/progress/totoro','PUT',{watched:true},visitor)).status,403);
  assert.equal((await f.call('/api/adventure-start','POST',{action:'start'},visitor)).status,200);assert.equal(notices,1);
  const upgraded=await f.call('/api/session','POST',{token:readFileSync(path.join(f.dir,'invitation-token.txt'),'utf8')},visitor);
  assert.equal((await upgraded.json()).authenticated,true);
  assert.equal((await f.call('/api/movies','GET',undefined,visitor)).status,200);
  const link=await(await f.call('/api/invitation','GET',undefined,visitor)).json();assert.ok(link.url.startsWith('http://localhost:3000/#invite='));
  await f.call('/api/adventure-start','POST',{action:'start'},visitor);assert.equal(notices,1);
  assert.equal((await f.call('/healthz')).status,200);
 }finally{await f.close();}
});
