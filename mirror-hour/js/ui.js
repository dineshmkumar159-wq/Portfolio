/* Small helpers shared by the staff and owner apps. */
window.UI=(function(){
  var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
  function h(tag,a,kids){var e=document.createElement(tag);for(var k in(a||{})){var v=a[k];if(v==null||v===false)continue;if(k==='text')e.textContent=v;else if(k==='class')e.className=v;else if(k==='style')e.setAttribute('style',v);else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v)}(kids||[]).forEach(function(c){if(c==null||c===false)return;e.appendChild(typeof c==='string'?document.createTextNode(c):c)});return e}
  var inr=function(n){return'₹'+Math.round(n).toLocaleString('en-IN')};
  var UI={$:$,$$:$$,h:h,inr:inr,onAuthLost:function(){}};
  UI.api=function(p,m,b){return fetch(p,{method:m||'GET',headers:b?{'Content-Type':'application/json'}:{},body:b?JSON.stringify(b):undefined,credentials:'same-origin'}).then(function(r){
    return r.json().catch(function(){return{}}).then(function(j){if(r.status===401&&!/login/.test(p)){UI.onAuthLost();throw new Error('login')}if(!r.ok){var e=new Error(j.error||'Something went wrong');e.data=j;e.status=r.status;throw e}return j})})};
  var tt;UI.toast=function(t,bad){var e=$('#toast');if(!e)return;e.textContent=t;e.className='toast on'+(bad?' bad':'');clearTimeout(tt);tt=setTimeout(function(){e.className='toast'},2600)};
  UI.fail=function(e){if(e&&e.message!=='login')UI.toast(e.message,true)};
  UI.ago=function(iso){var s=Math.max(0,Math.round((Date.now()-Date.parse(iso))/1000));if(s<60)return'just now';var m=Math.round(s/60);if(m<60)return m+' min ago';return Math.round(m/60)+' h ago'};
  UI.when=function(iso){return new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})};
  UI.pwa=function(){if('serviceWorker' in navigator&&location.protocol!=='file:')window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
    var dp=null,b=$('#inst');window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;if(b)b.style.display='inline-block'});if(b)b.addEventListener('click',function(){if(dp){dp.prompt();dp=null;b.style.display='none'}})};
  return UI})();
