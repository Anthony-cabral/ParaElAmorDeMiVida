// Uses the bundled Playwright when NODE_PATH points to its installation.
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const {createApp,ROOT}=await import('../server.js');
 fs.mkdirSync(path.join(ROOT,'test-output'),{recursive:true});
 const dir=fs.mkdtempSync(path.join(ROOT,'test-output','browser-'));
 let notices=0;
 const {server}=createApp({privateDir:dir,origin:'http://localhost:3010',notify:async()=>{notices++;return 'disabled';}});
 await new Promise(resolve=>server.listen(3010,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[];
 try{
  const token=fs.readFileSync(path.join(dir,'invitation-token.txt'),'utf8');
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3010/#invite='+token);await page.locator('#silent-entry').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#silent-entry').disabled);
  assert.equal(new URL(page.url()).hash,'');assert.equal(notices,0);
  await page.screenshot({path:'test-output/desktop-entry.png',fullPage:true,animations:'disabled'});
  await page.locator('#silent-entry').click();assert.equal(notices,0);
  await page.getByRole('button',{name:'Descubrir mensaje 2'}).click();await page.getByText('No tienes que hablar si hoy no te apetece.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Caminar un poquito más'}).click();assert.equal(await page.locator('.water-touch').evaluate(node=>{node.click();return node.querySelectorAll('.ripple').length;}),1);
  await page.getByRole('button',{name:'Vamos a un lugar calentito'}).click();await page.locator('.envelope').click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.className),'envelope');
  await page.getByRole('button',{name:'¿Qué historias?'}).click();await page.getByRole('button',{name:'Explorar nuestro catálogo'}).click();await page.locator('.movie-card').first().waitFor();assert.equal(await page.locator('.movie-card').count(),25);
  await page.locator('#search').fill('Totoro');assert.equal(await page.locator('.movie-card').count(),1);
  await page.locator('#watch-totoro').click();await page.getByText('Ya compartimos 1 de 25 historias.',{exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Seguir con nuestras películas'}).click();await page.getByText('Ya compartimos 1 de 25 historias.',{exact:true}).waitFor();
  const second=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const mobile=await second.newPage();mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto('http://localhost:3010/#invite='+token);await mobile.waitForFunction(()=>!document.querySelector('#start-adventure').disabled);
  await mobile.screenshot({path:'test-output/mobile-entry.png',fullPage:true});
  await mobile.locator('#start-adventure').click();await mobile.waitForTimeout(200);assert.equal(notices,1);
  for(const [name,action] of [['path',async()=>{}],['lake',async()=>mobile.getByRole('button',{name:'Caminar un poquito más'}).click()],['cottage',async()=>mobile.getByRole('button',{name:'Vamos a un lugar calentito'}).click()],['cinema',async()=>mobile.getByRole('button',{name:'¿Qué historias?'}).click()]]){
   await action();assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' horizontal overflow');await mobile.screenshot({path:`test-output/mobile-${name}.png`,fullPage:true});
  }
  await mobile.locator('#nav-catalog').click();await mobile.getByText('Ya compartimos 1 de 25 historias.',{exact:true}).waitFor();
  await mobile.locator('#watch-totoro').click();await mobile.getByText('Ya compartimos 0 de 25 historias.',{exact:true}).waitFor();
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.getByText('Ya compartimos 0 de 25 historias.',{exact:true}).waitFor();
  await page.locator('#search').fill('Spirited');assert.equal(await page.locator('.movie-card').count(),1);await page.locator('#search').fill('zzzz');await page.locator('.empty-state').waitFor();await page.locator('#search').fill('');
  await page.getByRole('button',{name:'Ya las vimos',exact:true}).click();assert.equal(await page.locator('.movie-card').count(),0);await page.getByRole('button',{name:'Todas',exact:true}).click();
  await page.locator('#sort').selectOption('title');await page.locator('#sort').selectOption('year');
  await page.route('**/api/progress/totoro',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Prueba de fallo de guardado'})}));
  await page.locator('#watch-totoro').click();await page.getByRole('button',{name:'Reintentar',exact:true}).waitFor();assert.equal(await page.locator('#watch-totoro').getAttribute('aria-pressed'),'false');
  await page.unroute('**/api/progress/totoro');await page.getByRole('button',{name:'Reintentar',exact:true}).click();await page.getByText('Ya compartimos 1 de 25 historias.',{exact:true}).waitFor();
  await page.locator('#details-totoro').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'details-totoro');
  for(let i=0;i<6;i++){await page.locator('#random-movie').click();assert.notEqual(await page.locator('#dialog-title').textContent(),'Mi vecino Totoro');await page.keyboard.press('Escape');}
  assert.equal(await page.locator('.progress-copy').textContent(),'Ya compartimos 1 de 25 historias.');
  await page.locator('#toast .dismiss').click();
  for(const p of [page,mobile]){for(const img of await p.locator('.poster').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}await p.evaluate(()=>window.scrollTo(0,0));}
  await page.screenshot({path:'test-output/desktop-catalog.png',fullPage:true,animations:'disabled'});
  await page.screenshot({path:'test-output/desktop-catalog-top.png',animations:'disabled'});
  await mobile.screenshot({path:'test-output/mobile-catalog.png',fullPage:true,animations:'disabled'});
  await mobile.locator('#nav-garden').click();await mobile.screenshot({path:'test-output/mobile-garden.png',fullPage:true});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#nav-garden').click();await page.screenshot({path:'test-output/desktop-garden.png',fullPage:true,animations:'disabled'});
  await mobile.locator('#nav-story').click();await mobile.locator('#home').click();await mobile.getByRole('button',{name:'Volver a recorrer el cuento'}).click();assert.equal(notices,1);
  const missing=await page.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);
  // All-watched suggestion state from a controlled fixture response, without 25 production mutations.
  const payload=await(await ctx.request.get('http://localhost:3010/api/movies')).json();
  await page.route('**/api/movies',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...payload,progress:payload.movies.map(m=>({movie_id:m.id,watched:1}))})}));
  await page.locator('#nav-catalog').click();await page.getByText('Ya compartimos 25 de 25 historias.',{exact:true}).waitFor();await page.locator('#random-movie').click();await page.getByText('Ya recorrimos todos estos mundos. Podemos volver a nuestro favorito.',{exact:true}).waitFor();
  console.log('PASS: desktop/mobile journey, consent, no duplicate notices, 25 images, filters/search, dialogs/focus, shared progress, reload, failure/retry, random pending, all-seen, no overflow or JS errors.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
