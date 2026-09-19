export function el(tag, attrs={}, ...children) {
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs)) {
    if(value===undefined || value===null)continue;
    if(key.startsWith('on'))node.addEventListener(key.slice(2).toLowerCase(),value);
    else if(key==='class')node.className=value;
    else if(key==='text')node.textContent=value;
    else if(key==='disabled')node.disabled=value;
    else node.setAttribute(key,String(value));
  }
  for(const child of children.flat()) if(child!==undefined && child!==null)node.append(child);
  return node;
}
export const button=(text, action, className='button')=>el('button',{class:className,onClick:action},text);
export function toast(message,retry) {
  const root=document.querySelector('#toast');root.hidden=false;root.querySelector('span').textContent=message;
  const action=root.querySelector('button');action.hidden=!retry; action.onclick=retry || null;
  root.querySelector('.dismiss').onclick=()=>root.hidden=true;
}
let returnFocus,returnFocusId;
export function openDialog(content,className='') {
  const dialog=document.querySelector('#dialog');
  if(!dialog.open){returnFocus=document.activeElement;returnFocusId=returnFocus?.id;}
  dialog.className=className;document.querySelector('#dialog-content').replaceChildren(content);
  if(!dialog.open)dialog.showModal();
}
export function closeDialog(){document.querySelector('#dialog').close();}
document.querySelector('.dialog-close').onclick=closeDialog;
document.querySelector('#dialog').addEventListener('close',()=>{const target=returnFocus?.isConnected?returnFocus:document.getElementById(returnFocusId);target?.focus({preventScroll:true});});
export function poster(movie,className='poster') {
  const img=el('img',{src:movie.poster,alt:'Cartel de '+movie.title,class:className,loading:'lazy',decoding:'async',width:400,height:566});
  img.addEventListener('error',()=>img.replaceWith(el('div',{class:'poster poster-fallback'},el('span',{},movie.title),el('small',{},'Cartel no disponible'))),{once:true});
  return img;
}
