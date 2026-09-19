import {config,personalize} from './config.js';
import {el,button,toast,openDialog} from './ui.js';
import {authenticate,request,hasCollectionAccess} from './api.js';
import {showCatalog,syncCatalog} from './catalog.js';
const main=document.querySelector('#main');
let current='entry',started=false;
let sessionReady;
const bgMusic=new Audio('/assets/audio/golden-hour-piano.mp3');
bgMusic.loop=true;
bgMusic.volume=0.28;
bgMusic.preload='auto';
let musicStarted=false;
function startMusic(){
  if(musicStarted&&!bgMusic.paused)return;
  musicStarted=true;
  void bgMusic.play().catch(()=>{musicStarted=false;});
}
const remembered=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const remember=(key,val)=>{try{localStorage.setItem(key,val);}catch{}};
const sceneNames=['El sendero','El lago','La casita','Nuestro cine','Las flores'];
const sceneIds=['path','lake','cottage','cinema','garden'];
const backgrounds={entry:'forest',path:'forest',lake:'lake',cottage:'cottage',cinema:'cinema'};
function setNav(scene){document.querySelectorAll('.nav-button').forEach(n=>n.classList.remove('active'));document.querySelector(scene==='catalog'?'#nav-catalog':scene==='garden'?'#nav-garden':'#nav-story').classList.add('active');}
function focusHeading(){main.querySelector('h1')?.focus({preventScroll:true});}
function sceneFooter(scene){
 const index=sceneIds.indexOf(scene);
 return el('footer',{class:'story-footer'},el('span',{class:'footer-dedication'},'Hecho con todo mi cariño'),el('nav',{'aria-label':'Capítulos',class:'chapters'},sceneIds.map((id,i)=>button(el('span',{},el('span',{class:'chapter-number'},String(i+1).padStart(2,'0')),el('span',{class:'chapter-name'},sceneNames[i])),()=>go(id),'chapter '+(i===index?'selected':'')))),el('span',{class:'footer-note'},'A tu ritmo. Siempre.'));
}
function fireflies(){const box=el('div',{class:'fireflies','aria-hidden':'true'});for(let i=0;i<9;i++)box.append(el('i'));return box;}
function openLetter(){
 const letter=el('article',{class:'letter'},el('p',{class:'eyebrow'},'UNAS PALABRAS, SIN PRISA'),el('h2',{id:'dialog-title'},config.cottage.envelope));
 config.letter.forEach((text,i)=>letter.append(el('p',{class:i===config.letter.length-1?'signature':''},personalize(text))));
 openDialog(letter,'letter-dialog');
}
export function go(scene){
 current=scene;setNav(scene);document.body.dataset.scene=scene;main.replaceChildren();document.querySelector('#toast').hidden=true;window.scrollTo({top:0,behavior:'instant'});
 if(scene==='catalog'){
   remember('refugio-visited','yes');
   main.append(el('section',{class:'empty-state'},el('h1',{tabindex:'-1'},'Abriendo nuestro cine…')));
   sessionReady.then(ready=>{
     if(current!=='catalog')return;
     main.replaceChildren();
     if(ready)showCatalog(main,go);
     else main.append(el('section',{class:'empty-state'},el('h1',{tabindex:'-1'},'Nuestro cine te espera.'),el('p',{},'No pudimos abrir la colección. Vuelve a intentarlo cuando tengas conexión.'),button('Volver al cuento',()=>go('path'),'button gold')));
     focusHeading();
   });return;
 }
 if(scene==='garden'){renderGarden();remember('refugio-visited','yes');focusHeading();return;}
 const copy=config[scene],section=el('section',{class:'story-scene '+scene});
 const art=el('img',{class:'scene-art',src:`/assets/images/${backgrounds[scene]}.webp`,alt:scene==='entry'||scene==='path'?'Un gato crema con pañuelo verde y una flor amarilla espera en el sendero de un bosque iluminado por luciérnagas.':scene==='lake'?'Nuestro gato descansa junto a un lago bajo la luna.':scene==='cottage'?'Una casita cálida con manta, té y rosas amarillas.':'Una habitación con proyector, cojines y ventana al cielo nocturno.',width:1536,height:1024});
 section.append(art,el('div',{class:'scene-shade'}),fireflies());
 const content=el('div',{class:'scene-copy'},el('p',{class:'eyebrow'},el('span',{class:'little-star','aria-hidden':'true'},'✧'),copy.eyebrow),el('h1',{tabindex:'-1'},copy.title),el('p',{class:'intro'},copy.text));
 if(copy.secondary)content.append(el('p',{class:'secondary'},copy.secondary));
 const actions=el('div',{class:'scene-actions'});
 if(scene==='entry'){
   if(remembered('refugio-visited'))actions.append(button('Seguir con nuestras películas',()=>{startMusic();go('catalog');},'button primary'),button('Volver a recorrer el cuento',()=>{startMusic();go('path');},'text-button'));
   else{
     const start=button(copy.button,startAdventure,'button primary');start.id='start-adventure';
     actions.append(start);
   }
 }else if(scene==='path'){
   const whisper=el('p',{class:'whisper',role:'status'},copy.hint);
   const lights=el('div',{class:'whisper-lights'},copy.fireflies.map((message,i)=>el('button',{class:'firefly-button','aria-label':`Descubrir mensaje ${i+1}`,'aria-pressed':'false',onClick:event=>{whisper.textContent=message;event.currentTarget.setAttribute('aria-pressed','true');}},el('span',{'aria-hidden':'true'},'✦'))));
   actions.append(lights,whisper,button(copy.button+'  →',()=>go('lake'),'button primary'));
 }else if(scene==='lake'){
   section.append(button(copy.hint,event=>ripple(event),'water-touch'));
   actions.append(button(copy.button+'  →',()=>go('cottage'),'button primary'));
 }else if(scene==='cottage'){
   actions.append(button(el('span',{},el('span',{class:'envelope-symbol','aria-hidden':'true'},'◇'),el('span',{},copy.envelope,el('small',{},copy.open+'  ↗'))),openLetter,'envelope'),button(copy.button+'  →',()=>go('cinema'),'button primary'));
 }else if(scene==='cinema')actions.append(button(copy.button+'  →',()=>go('catalog'),'button primary'),button(copy.surprise,()=>go('garden'),'text-button'));
 content.append(actions);section.append(content);main.append(section,sceneFooter(scene));focusHeading();
}
function ripple(event){
 const node=event.currentTarget,r=node.getBoundingClientRect();const ring=el('span',{class:'ripple'});
 // These positions are visual-only, never user content.
 ring.style.left=(event.detail?event.clientX-r.left:r.width/2)+'px';ring.style.top=(event.detail?event.clientY-r.top:r.height/2)+'px';
 node.append(ring);setTimeout(()=>ring.remove(),1800);
}
function startAdventure(){
 startMusic();
 go('path');
 if(started)return;
 started=true;
 void sessionReady.then(ready=>ready ? request('/api/adventure-start',{method:'POST',body:JSON.stringify({action:'start'})}) : undefined).catch(()=>{});
}
function renderGarden(){
 const c=config.garden;
 main.append(el('section',{class:'garden-scene'},el('div',{class:'garden-art'},el('img',{src:'/assets/images/bouquet.webp',alt:'Ramo completo de tres girasoles, rosas amarillas, tres lirios y flores silvestres, con follaje, papel crema y lazo dorado. A su lado, nuestro gato crema.',width:1122,height:1402}),fireflies(),el('span',{class:'petal','aria-hidden':'true'}),el('span',{class:'petal petal-two','aria-hidden':'true'})),el('div',{class:'garden-copy'},el('p',{class:'eyebrow'},c.eyebrow),el('p',{class:'garden-intro'},c.title),el('p',{},c.text),el('p',{},c.secondary),el('h1',{tabindex:'-1'},config.closingTitle),el('p',{class:'closing-date'},config.closingDate),el('p',{class:'last-line'},c.lastLine),el('div',{class:'garden-actions'},button('Volver a nuestro cine',()=>go('catalog'),'button primary'),button('Volver a pasear',()=>go('path'),'text-button')))),sceneFooter('garden'));
}
document.querySelector('#home').onclick=()=>{startMusic();go('entry');};document.querySelector('#nav-story').onclick=()=>{startMusic();go('path');};document.querySelector('#nav-catalog').onclick=()=>{startMusic();go('catalog');};document.querySelector('#nav-garden').onclick=()=>{startMusic();go('garden');};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&current==='catalog')syncCatalog();});
window.addEventListener('focus',()=>{if(current==='catalog')syncCatalog();});
document.title=config.title;
sessionReady=authenticate().then(()=>true).catch(()=>false);
go('entry');
