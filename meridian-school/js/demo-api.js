/* Demo mode: pretends to be the Meridian server inside the visitor's browser.
   Used only on the static portfolio copy. Data lives in this browser's localStorage. */
(function(){
'use strict';
var KEY='mps_demo_v1',AUTH='mps_demo_auth',AC=window.AC,DEMO_PW='demo';
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
var S=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
S.enq=S.enq||[];S.nextId=S.nextId||1;
if(!S.events)S.events=AC.events.map(function(e,i){return{id:i+1,sort:i,m:e.m,d:e.d,t:e.t,c:e.c,k:e.k}});
S.evNext=S.evNext||(S.events.reduce(function(a,e){return Math.max(a,e.id)},0)+1);
if(!S.fees)S.fees=AC.bands.map(function(b){return b.fee});
if(!S.camp){S.camp={};AC.campuses.forEach(function(c){S.camp[c.id]={phone:c.phone,wa:c.wa||'',mult:c.mult,adm:c.adm}})}
save();
/* apply stored values to the public site data (runs before site.js) */
AC.bands.forEach(function(b,i){b.fee=S.fees[i]});
AC.campuses.forEach(function(c){var o=S.camp[c.id];if(o){c.phone=o.phone;c.wa=o.wa;c.mult=o.mult;c.adm=o.adm}});
AC.events=S.events.slice().sort(function(a,b){return a.sort-b.sort||a.id-b.id}).map(function(e){return{m:e.m,d:e.d,t:e.t,c:e.c,k:e.k}});

var ids=AC.campuses.map(function(c){return c.id});
function clean(s,n){return String(s==null?'':s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,n)}
function res(code,obj,type){return new Response(typeof obj==='string'?obj:JSON.stringify(obj),{status:code,headers:{'Content-Type':type||'application/json'}})}
function authed(){try{return sessionStorage.getItem(AUTH)==='1'}catch(e){return false}}
function csv(){
  var cols=['id','created','kind','campus','parent','phone','grade','child','pref_day','msg','status'];
  var q=function(v){var s=String(v==null?'':v);if(/^[=+\-@]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"'};
  return[cols.join(',')].concat(S.enq.slice().reverse().map(function(r){return cols.map(function(c){return q(r[c])}).join(',')})).join('\n');
}
function handle(path,method,body){
  var u=new URL(path,'http://x'),p=u.pathname;
  if(p==='/api/enquiry'&&method==='POST'){
    var r={kind:['enquire','visit','contact'].indexOf(body.kind)>-1?body.kind:'enquire',campus:ids.indexOf(body.campus)>-1?body.campus:'',parent:clean(body.parent,80),phone:clean(body.phone,20),grade:clean(body.grade,20),child:clean(body.child,80),pref_day:clean(body.date,30),msg:clean(body.msg,600)};
    if(r.parent.length<2||!/^[0-9 +\-]{10,15}$/.test(r.phone))return res(400,{error:'Name and a valid phone number are required.'});
    r.id=S.nextId++;r.created=new Date().toISOString();r.status='new';S.enq.push(r);save();return res(201,{ok:true,id:r.id});
  }
  if(p==='/api/login'&&method==='POST'){
    if((body.password||'')!==DEMO_PW)return res(401,{error:'Wrong password. In this demo it is: demo'});
    try{sessionStorage.setItem(AUTH,'1')}catch(e){}return res(200,{ok:true,defaultPassword:false});
  }
  if(p==='/api/logout'){try{sessionStorage.removeItem(AUTH)}catch(e){}return res(200,{ok:true})}
  if(p.indexOf('/api/admin/')!==0)return res(404,{error:'Not found'});
  if(!authed())return res(401,{error:'Please log in.'});
  var m;
  if(p==='/api/admin/me')return res(200,{ok:true,defaultPassword:false});
  if(p==='/api/admin/stats'){
    var by={};S.enq.forEach(function(r){var k=r.campus;by[k]=by[k]||{campus:k,n:0,fresh:0};by[k].n++;if(r.status==='new')by[k].fresh++});
    return res(200,{total:{n:S.enq.length,fresh:S.enq.filter(function(r){return r.status==='new'}).length,adm:S.enq.filter(function(r){return r.status==='admitted'}).length},by:Object.keys(by).map(function(k){return by[k]})});
  }
  if(p==='/api/admin/enquiries'&&method==='GET'){
    var c=u.searchParams.get('campus')||'',st=u.searchParams.get('status')||'';
    return res(200,S.enq.filter(function(r){return(!c||r.campus===c)&&(!st||r.status===st)}).slice().reverse());
  }
  if((m=p.match(/^\/api\/admin\/enquiries\/(\d+)$/))){
    var id=+m[1],i=S.enq.findIndex(function(r){return r.id===id});
    if(method==='PATCH'){if(['new','contacted','visited','admitted','closed'].indexOf(body.status)<0)return res(400,{error:'Bad status'});if(i>-1)S.enq[i].status=body.status;save();return res(200,{ok:true})}
    if(method==='DELETE'){if(i>-1)S.enq.splice(i,1);save();return res(200,{ok:true})}
  }
  if(p==='/api/admin/events'&&method==='GET')return res(200,S.events.slice().sort(function(a,b){return a.sort-b.sort||a.id-b.id}));
  function ev(b){var e={m:clean(b.m,3),d:parseInt(b.d,10),t:clean(b.t,100),c:(b.c==='all'||ids.indexOf(b.c)>-1)?b.c:'all',k:clean(b.k,30)||'Event'};if(!/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.test(e.m)||!(e.d>=1&&e.d<=31)||e.t.length<3)return null;return e}
  if(p==='/api/admin/events'&&method==='POST'){var e=ev(body);if(!e)return res(400,{error:'Check month, day and title.'});e.id=S.evNext++;e.sort=S.events.reduce(function(a,x){return Math.max(a,x.sort)},0)+1;S.events.push(e);save();return res(201,{ok:true,id:e.id})}
  if((m=p.match(/^\/api\/admin\/events\/(\d+)$/))){
    var eid=+m[1],j=S.events.findIndex(function(x){return x.id===eid});
    if(method==='PUT'){var e2=ev(body);if(!e2)return res(400,{error:'Check month, day and title.'});if(j>-1){e2.id=eid;e2.sort=S.events[j].sort;S.events[j]=e2}save();return res(200,{ok:true})}
    if(method==='DELETE'){if(j>-1)S.events.splice(j,1);save();return res(200,{ok:true})}
  }
  if(p==='/api/admin/config'&&method==='GET'){
    return res(200,{bands:AC.bands.map(function(b,i){return{n:b.n,fee:S.fees[i]}}),campuses:AC.campuses.map(function(c){var o=S.camp[c.id];return{id:c.id,name:c.name,phone:o.phone,wa:o.wa,mult:o.mult,adm:o.adm}})});
  }
  if(p==='/api/admin/bands'&&method==='PUT'){
    if(!Array.isArray(body.fees)||body.fees.length!==S.fees.length)return res(400,{error:'Bad fees'});
    var f=body.fees.map(function(x){return parseInt(x,10)});if(f.some(function(x){return!(x>=1000&&x<=1000000)}))return res(400,{error:'Each fee must be between 1,000 and 10,00,000.'});
    S.fees=f;save();return res(200,{ok:true});
  }
  if((m=p.match(/^\/api\/admin\/campus\/([a-z-]+)$/))&&method==='PUT'){
    if(ids.indexOf(m[1])<0)return res(404,{error:'No such campus'});
    var mult=parseFloat(body.mult),adm=parseInt(body.adm,10),phone=clean(body.phone,25),wa=clean(body.wa,15);
    if(!(mult>=0.5&&mult<=3)||!(adm>=0&&adm<=500000)||!/^[0-9 +\-]{6,25}$/.test(phone)||(wa&&!/^[0-9]{10,15}$/.test(wa)))return res(400,{error:'Check phone, WhatsApp (digits only, with country code), multiplier and admission fee.'});
    S.camp[m[1]]={phone:phone,wa:wa,mult:mult,adm:adm};save();return res(200,{ok:true});
  }
  return res(404,{error:'Not found'});
}
var realFetch=window.fetch;
window.fetch=function(input,init){
  var url=typeof input==='string'?input:(input&&input.url)||'';
  var path=url.replace(/^https?:\/\/[^\/]+/,'');
  if(path.indexOf('/api/')!==0)return realFetch.apply(window,arguments);
  var method=((init&&init.method)||'GET').toUpperCase(),body={};
  try{body=init&&init.body?JSON.parse(init.body):{}}catch(e){}
  return Promise.resolve(handle(path,method,body));
};
/* CSV link: the real link would hit the server, so build the file in the browser */
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href$="enquiries.csv"]');if(!a)return;
  e.preventDefault();if(!authed())return;
  var l=document.createElement('a');l.href=URL.createObjectURL(new Blob([csv()],{type:'text/csv'}));l.download='enquiries.csv';document.body.appendChild(l);l.click();l.remove();
});
})();
