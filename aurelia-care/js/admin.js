(function(){
'use strict';
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var CFG=null,DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],ST=['pending','confirmed','completed','cancelled','no-show'];
function h(tag,attrs,kids){var e=document.createElement(tag);for(var k in(attrs||{})){if(k==='text')e.textContent=attrs[k];else if(k==='class')e.className=attrs[k];else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),attrs[k]);else e.setAttribute(k,attrs[k])}(kids||[]).forEach(function(c){e.appendChild(typeof c==='string'?document.createTextNode(c):c)});return e}
function api(path,method,body){
  return fetch(path,{method:method||'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin'}).then(function(r){
    return r.json().catch(function(){return{}}).then(function(j){if(r.status===401&&path!=='/api/login'){showLogin();throw new Error('login')}if(!r.ok)throw new Error(j.error||'Something went wrong');return j})});
}
var mt;function say(t,bad){var m=$('#msg');m.textContent=t;m.className='msg '+(bad?'bad':'ok');clearTimeout(mt);mt=setTimeout(function(){m.textContent=''},4000)}
function fail(e){if(e.message!=='login')say(e.message,true)}
function showLogin(){$('#app').hidden=true;$('#login').hidden=false;$('#pw').focus()}
function docName(id){var d=CFG.docs.filter(function(x){return x.id===id})[0];return d?d.name:''}
function deptName(s){var d=CFG.depts.filter(function(x){return x.slug===s})[0];return d?d.name:s}
function pkgName(s){var d=CFG.pkgs.filter(function(x){return x.slug===s})[0];return d?d.name:s}
function when(iso){return new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function dlabel(d){var x=new Date(d+'T00:00:00');return x.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}

$('#lf').addEventListener('submit',function(e){e.preventDefault();$('#lm').textContent='';
  api('/api/login','POST',{password:$('#pw').value}).then(function(j){$('#pw').value='';start(j.defaultPassword)}).catch(function(x){$('#lm').textContent=x.message})});
$('#out').addEventListener('click',function(){api('/api/logout','POST',{}).then(showLogin)});
$$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){
  $$('[data-tab]').forEach(function(x){x.setAttribute('aria-selected',x===b);$('#tab-'+x.dataset.tab).hidden=x!==b});
  ({ap:loadAppts,ms:loadMsgs,dr:loadDocs,pk:loadPkgs})[b.dataset.tab]()})});

function start(dp){
  $('#login').hidden=true;$('#app').hidden=false;$('#dw').hidden=!dp;
  api('/api/admin/config').then(function(c){CFG=c;
    var s=$('#fdr');s.innerHTML='';s.appendChild(h('option',{value:'',text:'All doctors'}));c.docs.forEach(function(d){s.appendChild(h('option',{value:d.id,text:d.name}))});
    loadAppts()}).catch(fail);
}

/* appointments */
function visit(r){if(r.kind==='package')return pkgName(r.pkg);var d=r.doctor?docName(r.doctor):(r.dept?deptName(r.dept)+' (any doctor)':'Any doctor');return d}
function loadAppts(){
  api('/api/admin/stats').then(function(s){var t=$('#tiles');t.innerHTML='';
    [[s.today,'Today’s appointments'],[s.pending,'Waiting for confirmation'],[s.total,'All appointments'],[s.messages,'Unread messages']].forEach(function(x){t.appendChild(h('div',{class:'tile'},[h('b',{text:String(x[0])}),h('span',{text:x[1]})]))});
    $('#mc').textContent=s.messages?'('+s.messages+')':''}).catch(fail);
  api('/api/admin/appointments?status='+encodeURIComponent($('#fst').value)+'&date='+encodeURIComponent($('#fdt').value)+'&doctor='+encodeURIComponent($('#fdr').value)).then(function(rows){
    var tb=$('#ab');tb.innerHTML='';$('#anone').hidden=rows.length>0;
    rows.forEach(function(r){
      var sel=h('select',{'aria-label':'Status for '+r.name,onchange:function(){api('/api/admin/appointments/'+r.id,'PATCH',{status:sel.value}).then(function(){say('Status updated.');loadAppts()}).catch(fail)}},ST.map(function(s){var o=h('option',{text:s});if(s===r.status)o.selected=true;return o}));
      tb.appendChild(h('tr',{},[h('td',{},[h('b',{text:r.ref})]),h('td',{text:dlabel(r.date)+' · '+r.time}),h('td',{text:visit(r)}),h('td',{text:r.name+', '+r.age+' yrs'}),h('td',{},[h('a',{href:'tel:'+r.phone.replace(/[^0-9+]/g,''),text:r.phone})]),h('td',{text:[r.email,r.note].filter(Boolean).join(' · ')||'-'}),h('td',{},[sel]),
        h('td',{},[h('button',{class:'mini del',type:'button','aria-label':'Delete '+r.ref,text:'Delete',onclick:function(){if(confirm('Delete '+r.ref+'? This frees the time slot.'))api('/api/admin/appointments/'+r.id,'DELETE').then(function(){loadAppts()}).catch(fail)}})])]));
    })}).catch(fail);
}
['fdt','fdr','fst'].forEach(function(id){$('#'+id).addEventListener('change',loadAppts)});
$('#fclr').addEventListener('click',function(){$('#fdt').value='';$('#fdr').value='';$('#fst').value='';loadAppts()});

/* messages */
function loadMsgs(){api('/api/admin/messages').then(function(rows){var tb=$('#mb');tb.innerHTML='';$('#mnone').hidden=rows.length>0;
  rows.forEach(function(r){var cb=h('input',{type:'checkbox','aria-label':'Handled: message from '+r.name,onchange:function(){api('/api/admin/messages/'+r.id,'PATCH',{handled:cb.checked}).then(function(){loadAppts()}).catch(fail)}});cb.checked=!!r.handled;
    tb.appendChild(h('tr',{},[h('td',{text:when(r.created)}),h('td',{text:r.name}),h('td',{},[h('a',{href:'tel:'+r.phone.replace(/[^0-9+]/g,''),text:r.phone})]),h('td',{text:r.topic||'-'}),h('td',{text:r.msg}),h('td',{},[cb]),
      h('td',{},[h('button',{class:'mini del',type:'button',text:'Delete','aria-label':'Delete message from '+r.name,onclick:function(){if(confirm('Delete this message?'))api('/api/admin/messages/'+r.id,'DELETE').then(loadMsgs).catch(fail)}})])]))})}).catch(fail)}

/* doctors */
function loadDocs(){api('/api/admin/doctors').then(function(rows){var tb=$('#db');tb.innerHTML='';
  rows.forEach(function(d){
    var act=h('input',{type:'checkbox','aria-label':d.name+' active'});act.checked=d.active;
    var boxes=DAYS.map(function(x){var c=h('input',{type:'checkbox',value:x});c.checked=d.days.indexOf(x)>-1;return c});
    tb.appendChild(h('tr',{},[h('td',{},[h('b',{text:d.name}),h('br'),h('span',{class:'muted',text:d.spec})]),h('td',{},[act]),
      h('td',{class:'days'},boxes.map(function(c){return h('label',{},[c,c.value])})),
      h('td',{},[h('button',{class:'mini',type:'button',text:'Save',onclick:function(){api('/api/admin/doctors/'+d.id,'PUT',{active:act.checked,days:boxes.filter(function(c){return c.checked}).map(function(c){return c.value})}).then(function(){say(d.name+' saved. Live on the website.')}).catch(fail)}})])]))})}).catch(fail)}

/* packages */
function loadPkgs(){api('/api/admin/packages').then(function(rows){var tb=$('#pb');tb.innerHTML='';
  rows.forEach(function(p){var inp=h('input',{type:'number',min:'100',max:'500000',step:'50',value:String(p.price),'aria-label':p.name+' price',style:'width:130px'});
    tb.appendChild(h('tr',{},[h('td',{},[h('b',{text:p.name})]),h('td',{},[inp]),h('td',{},[h('button',{class:'mini',type:'button',text:'Save',onclick:function(){api('/api/admin/packages/'+p.slug,'PUT',{price:inp.value}).then(function(){say(p.name+' price saved. Live on the website.')}).catch(fail)}})])]))})}).catch(fail)}

api('/api/admin/me').then(function(j){start(j.defaultPassword)}).catch(function(){showLogin()});
})();
