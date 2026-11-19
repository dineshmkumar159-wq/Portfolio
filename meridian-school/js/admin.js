(function(){
'use strict';
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],CFG=null;
function h(tag,attrs,kids){var e=document.createElement(tag);for(var k in(attrs||{})){if(k==='text')e.textContent=attrs[k];else if(k==='class')e.className=attrs[k];else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),attrs[k]);else e.setAttribute(k,attrs[k])}(kids||[]).forEach(function(c){e.appendChild(typeof c==='string'?document.createTextNode(c):c)});return e}
function api(path,method,body){
  return fetch(path,{method:method||'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin'}).then(function(r){
    return r.json().catch(function(){return{}}).then(function(j){if(r.status===401&&path!=='/api/login'){showLogin();throw new Error('login')}if(!r.ok)throw new Error(j.error||'Something went wrong');return j})});
}
var mt;function say(t,bad){var m=$('#msg');m.textContent=t;m.className='msg '+(bad?'bad':'ok');clearTimeout(mt);mt=setTimeout(function(){m.textContent=''},4000)}
function fail(e){if(e.message!=='login')say(e.message,true)}
function showLogin(){$('#app').hidden=true;$('#login').hidden=false;$('#pw').focus()}
function campName(id){if(id==='all'||!id)return'All campuses';var c=CFG.campuses.filter(function(x){return x.id===id})[0];return c?c.name:id}

/* login */
$('#lf').addEventListener('submit',function(e){e.preventDefault();$('#lm').textContent='';
  api('/api/login','POST',{password:$('#pw').value}).then(function(j){$('#pw').value='';start(j.defaultPassword)}).catch(function(x){$('#lm').textContent=x.message})});
$('#out').addEventListener('click',function(){api('/api/logout','POST',{}).then(showLogin)});

/* tabs */
$$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){
  $$('[data-tab]').forEach(function(x){x.setAttribute('aria-selected',x===b);$('#tab-'+x.dataset.tab).hidden=x!==b});
  if(b.dataset.tab==='ev')loadEvents();if(b.dataset.tab==='fees')loadFees();if(b.dataset.tab==='enq')loadEnq()})});

function start(dp){
  $('#login').hidden=true;$('#app').hidden=false;$('#dw').hidden=!dp;
  api('/api/admin/config').then(function(c){CFG=c;
    var fc=$('#fc');fc.innerHTML='';fc.appendChild(h('option',{value:'',text:'All'}));c.campuses.forEach(function(x){fc.appendChild(h('option',{value:x.id,text:x.name}))});
    var nm=$('#nm');nm.innerHTML='';MONTHS.forEach(function(m){nm.appendChild(h('option',{text:m}))});
    var nc=$('#nc');nc.innerHTML='';nc.appendChild(h('option',{value:'all',text:'All campuses'}));c.campuses.forEach(function(x){nc.appendChild(h('option',{value:x.id,text:x.name}))});
    loadEnq()}).catch(fail);
}

/* enquiries */
var STAT=['new','contacted','visited','admitted','closed'];
function loadEnq(){
  api('/api/admin/stats').then(function(s){var t=$('#tiles');t.innerHTML='';
    [[s.total.n||0,'Total enquiries'],[s.total.fresh||0,'New, not yet contacted'],[s.total.adm||0,'Admitted']].forEach(function(x){t.appendChild(h('div',{class:'tile'},[h('b',{text:String(x[0])}),h('span',{text:x[1]})]))});
    s.by.forEach(function(b){if(b.campus)t.appendChild(h('div',{class:'tile'},[h('b',{text:String(b.n)}),h('span',{text:campName(b.campus)+' ('+(b.fresh||0)+' new)'})]))})}).catch(fail);
  api('/api/admin/enquiries?campus='+encodeURIComponent($('#fc').value)+'&status='+encodeURIComponent($('#fs').value)).then(function(rows){
    var tb=$('#eb');tb.innerHTML='';$('#enone').hidden=rows.length>0;
    rows.forEach(function(r){
      var det=[r.child&&('Child: '+r.child),r.pref_day&&('Day: '+r.pref_day),r.msg&&('Note: '+r.msg)].filter(Boolean).join(' · ');
      var sel=h('select',{'aria-label':'Status for '+r.parent,onchange:function(){api('/api/admin/enquiries/'+r.id,'PATCH',{status:sel.value}).then(function(){say('Status updated.');loadEnq()}).catch(fail)}},STAT.map(function(s){var o=h('option',{text:s});if(s===r.status)o.selected=true;return o}));
      tb.appendChild(h('tr',{},[h('td',{text:new Date(r.created).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}),h('td',{text:campName(r.campus)}),h('td',{text:r.kind}),h('td',{text:r.parent}),h('td',{},[h('a',{href:'tel:'+r.phone.replace(/[^0-9+]/g,''),text:r.phone})]),h('td',{text:r.grade||'-'}),h('td',{text:det||'-'}),h('td',{},[sel]),
        h('td',{},[h('button',{class:'mini del',type:'button','aria-label':'Delete enquiry from '+r.parent,onclick:function(){if(confirm('Delete this enquiry?'))api('/api/admin/enquiries/'+r.id,'DELETE').then(function(){loadEnq()}).catch(fail)},text:'Delete'})])]));
    })}).catch(fail);
}
$('#fc').addEventListener('change',loadEnq);$('#fs').addEventListener('change',loadEnq);

/* events */
function evRow(e){
  var m=h('select',{'aria-label':'Month'},MONTHS.map(function(x){var o=h('option',{text:x});if(x===e.m)o.selected=true;return o}));
  var d=h('input',{type:'number',min:'1',max:'31',value:String(e.d),style:'width:70px','aria-label':'Day'});
  var t=h('input',{value:e.t,style:'width:100%;min-width:220px','aria-label':'Title'});
  var c=h('select',{'aria-label':'Campus'},[h('option',{value:'all',text:'All campuses'})].concat(CFG.campuses.map(function(x){var o=h('option',{value:x.id,text:x.name});if(x.id===e.c)o.selected=true;return o})));if(e.c==='all')c.value='all';
  var k=h('input',{value:e.k,style:'width:110px','aria-label':'Type'});
  return h('tr',{},[h('td',{},[m]),h('td',{},[d]),h('td',{},[t]),h('td',{},[c]),h('td',{},[k]),h('td',{style:'white-space:nowrap'},[
    h('button',{class:'mini',type:'button',text:'Save',onclick:function(){api('/api/admin/events/'+e.id,'PUT',{m:m.value,d:d.value,t:t.value,c:c.value,k:k.value}).then(function(){say('Event saved.')}).catch(fail)}}),' ',
    h('button',{class:'mini del',type:'button',text:'Delete',onclick:function(){if(confirm('Delete this event?'))api('/api/admin/events/'+e.id,'DELETE').then(function(){say('Event deleted.');loadEvents()}).catch(fail)}})])]);
}
function loadEvents(){api('/api/admin/events').then(function(rows){var b=$('#evb');b.innerHTML='';rows.forEach(function(e){b.appendChild(evRow(e))})}).catch(fail)}
$('#evf').addEventListener('submit',function(e){e.preventDefault();
  api('/api/admin/events','POST',{m:$('#nm').value,d:$('#nd').value,t:$('#nt').value,c:$('#nc').value,k:$('#nk').value}).then(function(){say('Event added. It is now live on the website.');$('#nt').value='';$('#nd').value='';$('#nk').value='';loadEvents()}).catch(fail)});

/* fees + campuses */
var BN=['Foundation (Pre-KG to UKG)','Primary (I to V)','Middle (VI to VIII)','Secondary (IX to X)','Senior (XI to XII)'];
function loadFees(){api('/api/admin/config').then(function(c){CFG=c;
  var bi=$('#bi');bi.innerHTML='';c.bands.forEach(function(b,i){var id='bf'+i;bi.appendChild(h('div',{},[h('label',{for:id,text:b.n}),h('input',{id:id,type:'number',min:'1000',max:'1000000',step:'100',value:String(b.fee)})]))});
  var cb=$('#cb');cb.innerHTML='';c.campuses.forEach(function(x){
    var ph=h('input',{value:x.phone,'aria-label':x.name+' phone'}),wa=h('input',{value:x.wa||'',placeholder:'919876543210','aria-label':x.name+' WhatsApp'}),mu=h('input',{type:'number',step:'0.01',min:'0.5',max:'3',value:String(x.mult),style:'width:90px','aria-label':x.name+' fee multiplier'}),ad=h('input',{type:'number',min:'0',step:'1000',value:String(x.adm),style:'width:110px','aria-label':x.name+' admission fee'});
    cb.appendChild(h('tr',{},[h('td',{},[h('b',{text:x.name})]),h('td',{},[ph]),h('td',{},[wa]),h('td',{},[mu]),h('td',{},[ad]),h('td',{},[h('button',{class:'mini',type:'button',text:'Save',onclick:function(){api('/api/admin/campus/'+x.id,'PUT',{phone:ph.value,wa:wa.value,mult:mu.value,adm:ad.value}).then(function(){say(x.name+' saved. Live on the website.')}).catch(fail)}})])]))})}).catch(fail)}
$('#bf').addEventListener('submit',function(e){e.preventDefault();
  api('/api/admin/bands','PUT',{fees:$$('#bi input').map(function(i){return i.value})}).then(function(){say('Fees saved. The fee calculator and campus pages now use them.')}).catch(fail)});

/* boot */
api('/api/admin/me').then(function(j){start(j.defaultPassword)}).catch(function(){showLogin()});
})();
