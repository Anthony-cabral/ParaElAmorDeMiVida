import {config} from './config.js';
import {request} from './api.js';
import {el,button,poster,toast,openDialog,closeDialog} from './ui.js';
let movies=[],progress=new Map(),root,grid,summary,bar,count,filter='all',query='',sort='year',loading=false;
const pending=new Set();let dialogMovie=null,suggestion=false,epoch=0;
const watched=id=>Boolean(progress.get(id)?.watched);
const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function eligibleMovies(items,states){return items.filter(movie=>!states.get(movie.id)?.watched);}
export function showCatalog(target,go){
 root=target;dialogMovie=null;filter='all';query='';sort='year';
 const hero=el('section',{class:'catalog-hero'},el('div',{},el('p',{class:'eyebrow'},'UNA MANTITA. ALGO RICO. TÚ Y YO.'),el('h1',{tabindex:'-1'},config.catalog.title),el('p',{},config.catalog.subtitle)),el('img',{src:'/assets/images/cinema.webp',alt:'Nuestro pequeño cine con cojines y luz cálida',width:1536,height:1024}));
 summary=el('p',{class:'progress-copy',role:'status'},'Preparando nuestra colección…');bar=el('progress',{max:1,value:0,'aria-label':'Historias compartidas'});
 const progressBox=el('div',{class:'progress-box'},summary,bar,el('span',{},'Sin prisa por llegar al final.'));
 const random=button('Elegir nuestra próxima película ✨',()=>suggest(),'button gold');random.id='random-movie';
 const share=button('Copiar enlace de nuestro cine',async()=>{
   try{
     const {url}=await request('/api/invitation');
     try{await navigator.clipboard.writeText(url);toast('Enlace copiado. Ábrelo en el otro navegador.');}
     catch{openDialog(el('section',{},el('h2',{id:'dialog-title'},'Nuestro enlace para compartir'),el('p',{},'Copia el enlace completo, incluida la invitación.'),el('input',{value:url,readonly:'','aria-label':'Enlace privado',onFocus:event=>event.target.select()})));}
   }catch{toast('No pudimos copiar el enlace. Inténtalo otra vez.');}
 },'details-link');share.id='share-invitation';
 const top=el('div',{class:'catalog-top'},progressBox,el('div',{},random,share));
 const search=el('input',{id:'search',type:'search',placeholder:'Buscar una historia…','aria-label':'Buscar por título',onInput:event=>{query=event.target.value;renderCards();}});
 const order=el('select',{id:'sort','aria-label':'Ordenar películas',onChange:event=>{sort=event.target.value;renderCards();}},el('option',{value:'year'},'Año · de la primera a la última'),el('option',{value:'title'},'Título · de la A a la Z'));
 const filters=el('div',{class:'filters',role:'group','aria-label':'Filtrar por estado'},[['all','Todas'],['pending','Por descubrir'],['watched','Ya las vimos']].map(([value,title])=>el('button',{class:'filter '+(value==='all'?'selected':''),'aria-pressed':value==='all',onClick:event=>{filter=value;filters.querySelectorAll('button').forEach(b=>{b.classList.toggle('selected',b===event.currentTarget);b.setAttribute('aria-pressed',b===event.currentTarget);});renderCards();}},title)));
 count=el('p',{class:'result-count','aria-live':'polite'});grid=el('div',{class:'movie-grid','aria-label':'Películas'});
 const tools=el('div',{class:'catalog-tools'},filters,el('div',{class:'search-tools'},search,order));
 const credits=el('details',{class:'credits'},el('summary',{},'Sobre esta colección y sus imágenes'),el('p',{},'24 largometrajes de Studio Ghibli y Nausicaä, realizada por Topcraft antes de la fundación del estudio. Incluye las películas de estreno televisivo y la coproducción La tortuga roja. No incluye cortometrajes. Las duraciones son aproximadas, según la ficha japonesa.'),el('p',{},'Carteles japoneses de las fichas oficiales. Todos los derechos pertenecen a sus titulares, indicados en los detalles de cada película. Esta es una colección personal, sin afiliación con Studio Ghibli.'),el('a',{href:'https://www.ghibli.jp/works/',target:'_blank',rel:'noreferrer noopener'},'Filmografía y fichas oficiales ↗'),el('span',{},' · '),el('a',{href:'https://www.ghibli.jp/info/013344/',target:'_blank',rel:'noreferrer noopener'},'Nota de uso de imágenes del estudio ↗'));
 const bottom=el('footer',{class:'catalog-footer'},el('div',{},el('span',{'aria-hidden':'true'},'✧'),el('p',{},'Todavía queda un poquito de amarillo para ti.')),button('Ver la sorpresa de las flores',()=>go('garden'),'button outline'),credits);
 root.append(hero,el('section',{class:'catalog-content'},top,tools,count,grid,bottom));
 root.querySelector('h1').focus({preventScroll:true});syncCatalog();
}
export async function syncCatalog(){
 if(loading || !grid?.isConnected)return;loading=true;const version=epoch;
 try{
   const data=await request('/api/movies');
   if(version!==epoch)return;
   movies=data.movies;progress=new Map(data.progress.map(p=>[p.movie_id,p]));renderCards();updateDialog();
 }catch(error){toast('No pudimos actualizar la colección. '+error.message,()=>syncCatalog());if(!movies.length)grid.replaceChildren(el('div',{class:'empty-state'},el('h2',{},'Las historias siguen aquí.'),el('p',{},'Necesitamos recuperar la conexión para abrir la colección.'),button('Volver a intentar',syncCatalog,'button outline')));}
 finally{loading=false;}
}
function renderCards(){
 if(!grid?.isConnected)return;
 const total=movies.length,seen=movies.filter(m=>watched(m.id)).length;
 summary.textContent=`Ya compartimos ${seen} de ${total} historias.`;bar.max=total||1;bar.value=seen;
 const visible=movies.filter(m=>(filter==='all'||(filter==='watched'?watched(m.id):!watched(m.id)))&&normalize(m.title+' '+m.international).includes(normalize(query))).sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'es'):a.year-b.year);
 count.textContent=`${visible.length} ${visible.length===1?'historia':'historias'} para ${filter==='watched'?'recordar':'explorar'}`;
 // Restore focus by stable control ID when a successful save redraws the collection.
 const focusId=grid.contains(document.activeElement)?document.activeElement.id:null;
 grid.replaceChildren(...visible.map(movie=>{
   const seen=watched(movie.id),details=button(poster(movie),()=>showDetails(movie),'poster-button');details.id='details-'+movie.id;details.setAttribute('aria-label','Ver detalles de '+movie.title);
   if(seen)details.append(el('span',{class:'seen-stamp','aria-label':'Vista'},'✦'));
   const toggle=watchButton(movie);toggle.id='watch-'+movie.id;
   const detailLink=button('Ver detalles',()=>showDetails(movie),'details-link');detailLink.id='info-'+movie.id;
   return el('article',{class:'movie-card'+(seen?' seen':''),'data-movie':movie.id},details,el('div',{class:'movie-info'},el('p',{class:'movie-meta'},`${movie.year} · ${movie.duration} min`),el('h2',{},movie.title),el('p',{class:'movie-state'},seen?'Ya la vimos':'Por descubrir'),toggle,detailLink));
 }));
 if(!visible.length)grid.append(el('div',{class:'empty-state'},el('span',{'aria-hidden':'true'},'☾'),el('h2',{},'Un pequeño descanso entre historias.'),el('p',{},'No hay películas con esta búsqueda. Prueba otro título o cambia el filtro.')));
 if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
}
function watchButton(movie){
 const seen=watched(movie.id),b=button(pending.has(movie.id)?'Guardando…':seen?'✓ Ya la vimos':'Marcar como vista',()=>save(movie.id,!watched(movie.id)),'watch-button'+(seen?' is-watched':''));
 b.setAttribute('aria-disabled',pending.has(movie.id));b.setAttribute('aria-pressed',seen);b.setAttribute('aria-label',`${seen?'Desmarcar como vista':'Marcar como vista'}: ${movie.title}`);return b;
}
async function save(id,desired){
 if(pending.has(id))return;pending.add(id);epoch++;renderCards();updateDialog();
 try{
   const result=await request('/api/progress/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({watched:desired})});
   progress.set(id,result);epoch++;toast(desired?'Una historia más para recordar juntos.':'La dejamos por descubrir otra vez.');
 }catch(error){toast('No se confirmó el cambio. Puedes seguir explorando y volver a intentarlo.',()=>save(id,desired));}
 finally{pending.delete(id);renderCards();updateDialog();}
}
function showDetails(movie,isSuggestion=false){
 dialogMovie=movie;suggestion=isSuggestion;
 const content=el('article',{class:'movie-detail'},poster(movie,'detail-poster'),el('div',{class:'detail-copy'},el('p',{class:'eyebrow'},isSuggestion?'¿QUÉ TAL ESTA HISTORIA?':'UN MUNDO POR DESCUBRIR'),el('h2',{id:'dialog-title'},movie.title),el('p',{class:'international'},movie.international),el('p',{class:'detail-meta'},`${movie.year} · ${movie.duration} min · ${movie.director}`),el('span',{class:'category'},movie.category),el('p',{class:'synopsis'},movie.synopsis),el('div',{id:'detail-state'},el('p',{},watched(movie.id)?'Ya la vimos':'Por descubrir'),watchButton(movie)),el('p',{class:'poster-credit'},movie.credit),el('a',{class:'source-link',href:movie.dataSource,target:'_blank',rel:'noreferrer noopener'},'Ficha oficial y fuente del cartel ↗'),isSuggestion?el('div',{class:'suggestion-actions'},button('Elegir otra',()=>suggest(movie.id),'button gold'),button('Volver al catálogo',closeDialog,'text-button dark')):null));
 openDialog(content,'movie-dialog');
}
function updateDialog(){
 const state=document.querySelector('#detail-state');
 if(document.querySelector('#dialog').open&&state&&dialogMovie){
   const hadFocus=state.contains(document.activeElement);
   state.replaceChildren(el('p',{},watched(dialogMovie.id)?'Ya la vimos':'Por descubrir'),watchButton(dialogMovie));
   if(hadFocus)state.querySelector('button').focus({preventScroll:true});
 }
}
function suggest(previous){
 if(!movies.length){toast('Primero necesitamos cargar nuestra colección.',syncCatalog);return;}
 let choices=eligibleMovies(movies,progress);
 if(!choices.length){dialogMovie=null;openDialog(el('div',{class:'empty-state'},el('h2',{id:'dialog-title'},config.catalog.allSeen),button('Volver al catálogo',closeDialog,'button gold')));return;}
 if(choices.length>1)choices=choices.filter(m=>m.id!==previous);
 const index=Math.floor(Math.random()*choices.length);showDetails(choices[index],true);
}
