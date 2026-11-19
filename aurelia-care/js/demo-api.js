/* Demo mode: pretends to be the Aurelia Care server inside the visitor's browser.
   Used only on the static portfolio copy. Data lives in this browser's localStorage. */
(function(){
'use strict';
var KEY='ach_demo_v1',AUTH='ach_demo_auth',AC=window.AC,DEMO_PW='demo';
var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],SLOTS=['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'],ST=['pending','confirmed','completed','cancelled','no-show'];
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
var S=load();
S.appts=S.appts||[];S.msgs=S.msgs||[];S.next=S.next||1;S.mnext=S.mnext||1;
if(!S.docs){S.docs={};AC.docs.forEach(function(d){S.docs[d.id]={active:true,days:d.days.slice()}})}
if(!S.pk){S.pk={};AC.pkgs.forEach(function(p){S.pk[p.slug]=p.price})}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
save();
var ALLDOCS=AC.docs.slice(),ALLPKGS=AC.pkgs.map(function(p){return{slug:p.slug,name:p.name}});
/* apply stored values to the public site data (runs before site.js) */
AC.docs=ALLDOCS.filter(function(d){var r=S.docs[d.id];if(!r||!r.active)return false;d.days=r.days.slice();return true});
AC.pkgs.forEach(function(p){if(S.pk[p.slug])p.price=S.pk[p.slug]});

var deptSlugs=AC.depts.map(function(d){return d.slug}),docIds=ALLDOCS.map(function(d){return d.id}),pkgSlugs=ALLPKGS.map(function(p){return p.slug});
function clean(s,n){return String(s==null?'':s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,n)}
function res(code,obj,type){return new Response(typeof obj==='string'?obj:JSON.stringify(obj),{status:code,headers:{'Content-Type':type||'application/json'}})}
function authed(){try{return sessionStorage.getItem(AUTH)==='1'}catch(e){return false}}
function resOf(k,doc,dept,pkg){if(k==='package')return'pkg:'+pkg;if(doc)return doc;if(dept)return'dept:'+dept;return'any'}
function isoDay(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(new Date(s+'T00:00:00Z'))}
function dayOffset(s){var t=new Date(),today=Date.UTC(t.getFullYear(),t.getMonth(),t.getDate());return Math.round((Date.parse(s+'T00:00:00Z')-today)/864e5)}
function ref(a){return'ACH-'+(10000+a.id)}
function csv(){
  var cols=['ref','created','date','time','kind','dept','doctor','pkg','name','age','phone','email','note','status'];
  var q=function(v){var s=String(v==null?'':v);if(/^[=+\-@]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"'};
  return[cols.join(',')].concat(S.appts.slice().reverse().map(function(r){var o=Object.assign({ref:ref(r)},r);return cols.map(function(c){return q(o[c])}).join(',')})).join('\n');
}
function handle(path,method,body){
  var u=new URL(path,'http://x'),p=u.pathname,m;
  if(p==='/api/slots'&&method==='GET'){
    var r=clean(u.searchParams.get('res'),40),d=clean(u.searchParams.get('date'),12);if(!isoDay(d))return res(400,{error:'Bad date'});
    return res(200,{taken:S.appts.filter(function(a){return a.resource===r&&a.date===d&&a.status!=='cancelled'}).map(function(a){return a.time})});
  }
  if(p==='/api/appointment'&&method==='POST'){
    var kind=body.kind==='package'?'package':'consult';
    var doctor=kind==='consult'&&docIds.indexOf(body.doctor)>-1?body.doctor:'';
    var dept=kind==='consult'&&deptSlugs.indexOf(body.dept)>-1?body.dept:'';
    var pkg=kind==='package'?(pkgSlugs.indexOf(body.pkg)>-1?body.pkg:null):'';
    var date=clean(body.date,12),time=clean(body.time,5),name=clean(body.name,80),phone=clean(body.phone,20),email=clean(body.email,100),note=clean(body.note,500),age=parseInt(body.age,10);
    if(pkg===null)return res(400,{error:'Choose a package.'});
    if(!name)return res(400,{error:'Enter the patient’s name.'});
    if(!(age>0&&age<120))return res(400,{error:'Enter an age from 1 to 119.'});
    if(phone.replace(/\D/g,'').length<8||!/^[0-9 +\-()]{8,20}$/.test(phone))return res(400,{error:'Enter a phone number we can call.'});
    if(email&&!/^\S+@\S+\.\S+$/.test(email))return res(400,{error:'Enter a valid email or leave it empty.'});
    if(!isoDay(date)||dayOffset(date)<-1||dayOffset(date)>16)return res(400,{error:'Choose a day in the next two weeks.'});
    if(SLOTS.indexOf(time)<0)return res(400,{error:'Choose a valid time.'});
    var wd=DAYS[new Date(date+'T00:00:00Z').getUTCDay()];
    if(doctor){var dr=S.docs[doctor];if(!dr||!dr.active)return res(400,{error:'That doctor is not taking appointments.'});if(dr.days.indexOf(wd)<0)return res(400,{error:'That doctor does not visit on '+wd+'.'})}
    else if(kind==='consult'&&wd==='Sun'&&dept!=='emergency-critical-care')return res(400,{error:'Sundays are for emergency care only.'});
    var resource=resOf(kind,doctor,dept,pkg);
    if(S.appts.some(function(a){return a.resource===resource&&a.date===date&&a.time===time&&a.status!=='cancelled'}))return res(409,{error:'That time was just booked.'});
    var a={id:S.next++,created:new Date().toISOString(),kind:kind,dept:dept,doctor:doctor,pkg:pkg,resource:resource,date:date,time:time,name:name,age:age,phone:phone,email:email,note:note,status:'pending'};
    S.appts.push(a);save();return res(201,{ok:true,ref:ref(a)});
  }
  if(p==='/api/message'&&method==='POST'){
    var n=clean(body.name,80),ph=clean(body.phone,20),tp=clean(body.topic,60),mg=clean(body.msg,800);
    if(!n||ph.replace(/\D/g,'').length<8||mg.length<5)return res(400,{error:'Name, phone and a short message are required.'});
    S.msgs.push({id:S.mnext++,created:new Date().toISOString(),name:n,phone:ph,topic:tp,msg:mg,handled:0});save();return res(201,{ok:true});
  }
  if(p==='/api/login'&&method==='POST'){
    if((body.password||'')!==DEMO_PW)return res(401,{error:'Wrong password. In this demo it is: demo'});
    try{sessionStorage.setItem(AUTH,'1')}catch(e){}return res(200,{ok:true,defaultPassword:false});
  }
  if(p==='/api/logout'){try{sessionStorage.removeItem(AUTH)}catch(e){}return res(200,{ok:true})}
  if(p.indexOf('/api/admin/')!==0)return res(404,{error:'Not found'});
  if(!authed())return res(401,{error:'Please log in.'});
  if(p==='/api/admin/me')return res(200,{ok:true,defaultPassword:false});
  if(p==='/api/admin/config')return res(200,{depts:AC.depts,docs:ALLDOCS.map(function(d){return{id:d.id,name:d.name,dept:d.dept,spec:d.spec}}),pkgs:ALLPKGS});
  if(p==='/api/admin/stats'){
    var t=new Date(),iso=t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2)+'-'+('0'+t.getDate()).slice(-2);
    return res(200,{total:S.appts.length,pending:S.appts.filter(function(a){return a.status==='pending'}).length,today:S.appts.filter(function(a){return a.date===iso&&a.status!=='cancelled'}).length,messages:S.msgs.filter(function(x){return!x.handled}).length});
  }
  if(p==='/api/admin/appointments'&&method==='GET'){
    var st=u.searchParams.get('status')||'',dt=u.searchParams.get('date')||'',dc=u.searchParams.get('doctor')||'';
    return res(200,S.appts.filter(function(a){return(!st||a.status===st)&&(!dt||a.date===dt)&&(!dc||a.doctor===dc)}).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:a.time<b.time?1:a.time>b.time?-1:b.id-a.id}).map(function(a){return Object.assign({ref:ref(a)},a)}));
  }
  if((m=p.match(/^\/api\/admin\/appointments\/(\d+)$/))){
    var id=+m[1],i=S.appts.findIndex(function(a){return a.id===id});
    if(method==='PATCH'){if(ST.indexOf(body.status)<0)return res(400,{error:'Bad status'});if(i>-1)S.appts[i].status=body.status;save();return res(200,{ok:true})}
    if(method==='DELETE'){if(i>-1)S.appts.splice(i,1);save();return res(200,{ok:true})}
  }
  if(p==='/api/admin/messages'&&method==='GET')return res(200,S.msgs.slice().reverse());
  if((m=p.match(/^\/api\/admin\/messages\/(\d+)$/))){
    var mid=+m[1],j=S.msgs.findIndex(function(x){return x.id===mid});
    if(method==='PATCH'){if(j>-1)S.msgs[j].handled=body.handled?1:0;save();return res(200,{ok:true})}
    if(method==='DELETE'){if(j>-1)S.msgs.splice(j,1);save();return res(200,{ok:true})}
  }
  if(p==='/api/admin/doctors'&&method==='GET')return res(200,ALLDOCS.map(function(d){var r=S.docs[d.id];return{id:d.id,name:d.name,spec:d.spec,active:!!r.active,days:r.days}}));
  if((m=p.match(/^\/api\/admin\/doctors\/(d\d+)$/))&&method==='PUT'){
    if(docIds.indexOf(m[1])<0)return res(404,{error:'No such doctor'});
    var days=(Array.isArray(body.days)?body.days:[]).filter(function(x){return DAYS.indexOf(x)>-1});
    if(body.active&&!days.length)return res(400,{error:'Pick at least one visiting day, or switch the doctor off.'});
    S.docs[m[1]]={active:!!body.active,days:DAYS.filter(function(x){return days.indexOf(x)>-1})};save();return res(200,{ok:true});
  }
  if(p==='/api/admin/packages'&&method==='GET')return res(200,ALLPKGS.map(function(x){return{slug:x.slug,name:x.name,price:S.pk[x.slug]}}));
  if((m=p.match(/^\/api\/admin\/packages\/([a-z-]+)$/))&&method==='PUT'){
    if(pkgSlugs.indexOf(m[1])<0)return res(404,{error:'No such package'});
    var price=parseInt(body.price,10);if(!(price>=100&&price<=500000))return res(400,{error:'Price must be between ₹100 and ₹5,00,000.'});
    S.pk[m[1]]=price;save();return res(200,{ok:true});
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
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href$="appointments.csv"]');if(!a)return;
  e.preventDefault();if(!authed())return;
  var l=document.createElement('a');l.href=URL.createObjectURL(new Blob([csv()],{type:'text/csv'}));l.download='appointments.csv';document.body.appendChild(l);l.click();l.remove();
});
})();
