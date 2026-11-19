(function(){
'use strict';
var AC=window.AC,C=AC.campuses,$=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
function byId(id){for(var i=0;i<C.length;i++)if(C[i].id===id)return C[i];return null}
function inr(n){return '₹'+Math.round(n).toLocaleString('en-IN')}
function qs(k){return new URLSearchParams(location.search).get(k)}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

/* ---------- moving shapes (seeded) ---------- */
(function(){
  var L=$('.shapes');if(!L)return;
  var seed=7;function r(){seed=(seed*9301+49297)%233280;return seed/233280}
  var kinds=['ci','ri','tr','pl','sq','dt','zz'],cols=['#D7263D','#F9B208','#2F6FDE','#1B998B','#7B4BD6','#12264A'],h='';
  var n=window.innerWidth<700?11:20;
  for(var i=0;i<n;i++){
    var s=26+Math.round(r()*58),k=kinds[Math.floor(r()*kinds.length)];
    if(k==='dt'||k==='zz')s+=24;
    h+='<i class="'+k+'" style="--x:'+Math.round(r()*96)+'%;--y:'+Math.round(r()*94)+'%;--s:'+s+'px;--col:'+cols[Math.floor(r()*cols.length)]+';--d:'+(9+Math.round(r()*12))+'s;--dl:-'+Math.round(r()*10)+'s;--tx:'+Math.round(r()*80-40)+'px;--ty:'+Math.round(r()*80-40)+'px;--rt:'+Math.round(r()*180-90)+'deg"></i>';
  }
  L.innerHTML=h;
})();

/* ---------- reveal + counters ---------- */
(function(){
  var els=$$('.rv');
  function show(e){e.classList.add('in')}
  if(!('IntersectionObserver' in window)||RM){els.forEach(show);}
  else{var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){show(x.target);io.unobserve(x.target)}})},{threshold:.12});els.forEach(function(e){io.observe(e)});}
  $$('[data-c]').forEach(function(e){
    var t=+e.dataset.c,s=e.dataset.s||'';
    function run(){if(RM){e.textContent=t.toLocaleString('en-IN')+s;return}var st=null;(function f(ts){st=st||ts;var p=Math.min((ts-st)/1400,1);e.textContent=Math.round(t*(1-Math.pow(1-p,3))).toLocaleString('en-IN')+s;if(p<1)requestAnimationFrame(f)})(performance.now())}
    if('IntersectionObserver' in window){var o=new IntersectionObserver(function(es){if(es[0].isIntersecting){run();o.disconnect()}});o.observe(e)}else run();
  });
})();

/* ---------- burger ---------- */
(function(){
  var b=$('.burger'),n=$('nav.main');if(!b)return;
  b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)});
  $$('a',n).forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open');b.setAttribute('aria-expanded',false)})});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){n.classList.remove('open');b.setAttribute('aria-expanded',false)}});
})();

/* ---------- hero pointer parallax ---------- */
(function(){
  var h=$('.hero');if(!h||RM)return;
  h.addEventListener('pointermove',function(e){var b=h.getBoundingClientRect();h.style.setProperty('--mx',((e.clientX-b.left)/b.width-.5).toFixed(3)*2);h.style.setProperty('--my',((e.clientY-b.top)/b.height-.5).toFixed(3)*2)});
})();
$$('.fw').forEach(function(e){});

/* ---------- card tilt ---------- */
if(!RM)$$('.camp').forEach(function(c){
  c.addEventListener('pointermove',function(e){var b=c.getBoundingClientRect();c.style.setProperty('--ry',(((e.clientX-b.left)/b.width-.5)*8).toFixed(2)+'deg');c.style.setProperty('--rx',((.5-(e.clientY-b.top)/b.height)*8).toFixed(2)+'deg')});
  c.addEventListener('pointerleave',function(){c.style.setProperty('--ry','0deg');c.style.setProperty('--rx','0deg')});
});

/* ---------- campus picker (persisted) ---------- */
var cur=null;
(function(){
  var s=$('#campus-pick');
  var saved=store('mps_campus'),page=document.body.dataset.campus;
  cur=byId(qs('campus'))||byId(page)||byId(saved)||null;
  if(s){
    s.innerHTML='<option value="">All campuses</option>'+C.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join('');
    s.value=cur?cur.id:'';
    s.addEventListener('change',function(){cur=byId(s.value);store('mps_campus',cur?cur.id:'');apply()});
  }
  function apply(){
    $$('[data-phone]').forEach(function(e){var p=cur?cur.phone:AC.phone;e.textContent=p;if(e.tagName==='A')e.href='tel:'+p.replace(/\s/g,'')});
    $$('a.apply').forEach(function(a){a.href='admissions.html'+(cur?'?campus='+cur.id:'')+'#enquire'});
    if(window.__waUpd)window.__waUpd();
  }
  apply();
})();

/* ---------- whatsapp ---------- */
function wa(camp,msg){
  var num=(camp&&camp.wa)||AC.wa||'';
  var url='https://wa.me/'+num+'?text='+encodeURIComponent(msg);
  try{window.open(url,'_blank','noopener')}catch(e){}
  return url;
}
$$('#wa-float').forEach(function(a){
  var go=function(){var m='Hello Meridian Public School'+(cur?' ('+cur.name+' campus)':'')+', I would like to know about admissions.';a.href='https://wa.me/'+((cur&&cur.wa)||AC.wa||'')+'?text='+encodeURIComponent(m)};
  go();window.__waUpd=go;a.addEventListener('click',go);
});

/* ---------- nearest-campus finder ---------- */
function finder(){
  var inp=$('#loc-in');if(!inp)return;
  var dl=$('#loc-list'),out=$('#loc-out');
  var names=Object.keys(AC.locs).sort();
  dl.innerHTML=names.map(function(n){return'<option value="'+esc(n)+'">'}).join('');
  function find(){
    var v=inp.value.trim().toLowerCase();if(!v){out.hidden=true;return}
    var k=names.filter(function(n){return n.toLowerCase()===v})[0]||names.filter(function(n){return n.toLowerCase().indexOf(v)===0})[0];
    out.hidden=false;
    if(!k){out.innerHTML='<h3>We don’t have that area listed yet</h3><p>Pick a nearby locality from the list, or call <b data-phone>'+AC.phone+'</b> and our team will suggest the closest campus and bus route.</p>';return}
    var l=AC.locs[k],c=byId(l[0]);
    out.style.setProperty('--c',c.color);
    out.innerHTML='<span class="tag" style="background:'+c.color+'">Nearest campus</span><h3>'+esc(c.name)+' · about '+l[1]+' km from '+esc(k)+'</h3><p>'+esc(c.tag)+' '+(l[1]>3?'School bus covers '+esc(k)+'.':'Easy for a short drive or walk.')+'</p><div class="cb"><a class="btn sm" href="branch-'+c.id+'.html">See '+esc(c.name)+'</a><a class="btn sm ghost" href="admissions.html?campus='+c.id+'#enquire">Book a tour</a></div>';
  }
  inp.addEventListener('input',find);inp.addEventListener('change',find);
  $('#loc-go').addEventListener('click',find);
  $('#loc-f').addEventListener('submit',function(e){e.preventDefault();find()});
}
finder();

/* ---------- 3D map ---------- */
(function(){
  var pl=$('.plane');if(!pl)return;
  var info=$('#mapinfo'),pins=$$('.pin',pl);
  function pick(id){
    pins.forEach(function(p){p.setAttribute('aria-pressed',p.dataset.id===id)});
    var c=byId(id);if(!c)return;
    info.style.setProperty('--c',c.color);
    info.innerHTML='<span class="tag" style="background:'+c.color+'">Est. '+c.est+' · '+esc(c.board)+'</span><h3>'+esc(c.name)+'</h3><p>'+esc(c.tag)+'</p><div class="meta" style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0"><span class="pill">'+esc(c.grades)+'</span><span class="pill">'+c.students.toLocaleString('en-IN')+' students</span><span class="pill">'+esc(c.area)+'</span></div><div class="cb"><a class="btn sm" href="branch-'+c.id+'.html">Visit '+esc(c.name)+' page</a><a class="btn sm ghost" href="admissions.html?campus='+c.id+'#enquire">Book a tour</a></div>';
    $$('.blist .card').forEach(function(x){x.style.outline=x.dataset.id===id?'4px solid '+c.color:'none'});
  }
  pins.forEach(function(p){p.addEventListener('click',function(){pick(p.dataset.id)})});
  $$('.blist .card').forEach(function(x){x.addEventListener('click',function(e){if(e.target.closest('a'))return;pick(x.dataset.id)})});
  pick(pins[0].dataset.id);
  if(!RM&&window.innerWidth>820){var m=$('.map3d');m.addEventListener('pointermove',function(e){var b=m.getBoundingClientRect();pl.style.setProperty('--rz',(-6+((e.clientX-b.left)/b.width-.5)*10).toFixed(1)+'deg');pl.style.setProperty('--rx',(48+((e.clientY-b.top)/b.height-.5)*-8).toFixed(1)+'deg')});m.addEventListener('pointerleave',function(){pl.style.setProperty('--rz','-6deg');pl.style.setProperty('--rx','48deg')})}
})();

/* ---------- compare highlight ---------- */
(function(){
  var chips=$$('[data-tagf]');if(!chips.length)return;
  function run(){
    var on=chips.filter(function(c){return c.getAttribute('aria-pressed')==='true'}).map(function(c){return c.dataset.tagf});
    var anyM=C.some(function(c){return on.length&&on.every(function(t){return c.tags.indexOf(t)>-1})});
    $$('#cmp [data-camp]').forEach(function(e){
      var c=byId(e.dataset.camp),m=on.length&&on.every(function(t){return c.tags.indexOf(t)>-1});
      e.classList.toggle('hl',!!m);e.classList.toggle('dim',on.length>0&&anyM&&!m);
    });
    var m=C.filter(function(c){return on.length&&on.every(function(t){return c.tags.indexOf(t)>-1})}).map(function(c){return c.name});
    $('#cmp-note').textContent=!on.length?'Tap a focus to highlight matching campuses.':(m.length?'Matching: '+m.join(', ')+'.':'No single campus has all of those — try fewer filters.');
  }
  chips.forEach(function(c){c.addEventListener('click',function(){c.setAttribute('aria-pressed',c.getAttribute('aria-pressed')!=='true');run()})});
})();

/* ---------- academics stage tabs ---------- */
(function(){
  var tabs=$$('[role=tab]');if(!tabs.length)return;
  function sel(t){tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;$('#'+x.getAttribute('aria-controls')).hidden=!on})}
  tabs.forEach(function(t,i){t.addEventListener('click',function(){sel(t)});t.addEventListener('keydown',function(e){var j=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:-1;if(j<0)return;var n=tabs[(j+tabs.length)%tabs.length];n.focus();sel(n)})});
  var h=location.hash.slice(1),t=h&&$('[aria-controls="p-'+h+'"]');if(t)sel(t);
})();

/* ---------- live data fills (fees, phones) ---------- */
$$('[data-fees]').forEach(function(tb){var c=byId(tb.dataset.fees);tb.innerHTML=c.bands.map(function(i){var t=Math.round(AC.bands[i].fee*c.mult/100)*100;return'<tr><td>'+esc(AC.bands[i].n)+'</td><td>'+inr(t)+'</td><td>'+inr(Math.floor(t/3))+'</td></tr>'}).join('')});
$$('[data-adm]').forEach(function(e){e.textContent=inr(byId(e.dataset.adm).adm)});
$$('[data-tuition]').forEach(function(e){var c=byId(e.dataset.tuition);e.textContent=inr(Math.round(AC.bands[0].fee*c.mult/100)*100)});
$$('[data-cp]').forEach(function(e){var c=byId(e.dataset.cp);e.textContent=(e.dataset.pre||'')+c.phone;e.href='tel:'+c.phone.replace(/\s/g,'')});

/* ---------- fee calculator ---------- */
(function(){
  var f=$('#fee');if(!f)return;
  var band=$('#f-band'),camp=$('#f-camp'),tr=$('#f-tr'),out=$('#f-out');
  band.innerHTML=AC.bands.map(function(b,i){return'<option value="'+i+'">'+esc(b.n)+'</option>'}).join('');
  camp.innerHTML=C.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join('');
  if(cur)camp.value=cur.id;
  function calc(){
    var c=byId(camp.value);
    $$('option',band).forEach(function(o){o.disabled=c.bands.indexOf(+o.value)<0});
    if(c.bands.indexOf(+band.value)<0)band.value=c.bands[0];
    var b=AC.bands[+band.value],tu=Math.round(b.fee*c.mult/100)*100,ad=c.adm,t=+tr.value,tp=AC.transport[t];
    var first=tu+ad+tp,term=Math.round((tu+tp)/3);
    out.style.setProperty('--c',c.color);
    $('#o-total').textContent=inr(first);
    $('#o-term').textContent=inr(term);
    $('#o-tu').textContent=inr(tu);$('#o-ad').textContent=inr(ad);$('#o-tp').textContent=tp?inr(tp):'Not opted';
    $('#o-label').textContent=c.name+' · '+b.n;
    $('#o-note').textContent=c.bands.length<AC.bands.length?c.name+' runs '+c.grades+' only.':'';
    $('#o-book').href='admissions.html?campus='+c.id+'#enquire';
  }
  [band,camp,tr].forEach(function(e){e.addEventListener('change',calc)});calc();
})();

/* ---------- enquiry / visit forms ---------- */
$$('form[data-enq]').forEach(function(f){
  var cs=$('[name=campus]',f);
  if(cs&&cs.tagName==='SELECT'){cs.innerHTML='<option value="">Choose campus</option>'+C.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join('');if(cur)cs.value=cur.id}
  var gs=$('[name=grade]',f);
  if(gs)gs.innerHTML='<option value="">Choose class</option>'+['Pre-KG','LKG','UKG'].concat([1,2,3,4,5,6,7,8,9,10,11,12].map(function(n){return'Class '+n})).map(function(g){return'<option>'+g+'</option>'}).join('');
  var dt=$('[name=date]',f);
  if(dt){var o='<option value="">Any day</option>',d=new Date();for(var i=1;o.split('<option').length<9&&i<30;i++){var x=new Date(d.getTime()+i*864e5);if(x.getDay()===0)continue;o+='<option>'+x.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})+'</option>'}dt.innerHTML=o}
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var v=function(n){var el=$('[name='+n+']',f);return el?el.value.trim():''},bad=false;
    function chk(n,ok,m){var el=$('[name='+n+']',f);if(!el)return;var er=el.parentNode.querySelector('.err');if(!ok){bad=true;if(er)er.textContent=m;el.setAttribute('aria-invalid','true')}else{if(er)er.textContent='';el.removeAttribute('aria-invalid')}}
    chk('parent',v('parent').length>1,'Please enter the parent’s name.');
    chk('phone',/^[0-9 +\-]{10,15}$/.test(v('phone')),'Enter a valid phone number.');
    if(cs)chk('campus',!!v('campus'),'Choose a campus.');
    if(gs)chk('grade',!!v('grade'),'Choose the class.');
    if(bad){var first=$('[aria-invalid]',f);if(first)first.focus();return}
    var c=byId(v('campus')||(f.dataset.camp||''));
    var m='Hello Meridian Public School'+(c?' ('+c.name+')':'')+'!\nI would like to '+(f.dataset.enq==='visit'?'book a campus tour':f.dataset.enq==='contact'?'get in touch':'enquire about admission')+'.\nParent: '+v('parent')+'\nPhone: '+v('phone')+(gs?'\nClass: '+v('grade'):'')+(v('child')?'\nChild: '+v('child'):'')+(dt&&v('date')?'\nPreferred day: '+v('date'):'')+(v('msg')?'\nNote: '+v('msg'):'');
    var url=wa(c,m);
    var payload={kind:f.dataset.enq,campus:c?c.id:'',parent:v('parent'),phone:v('phone'),grade:v('grade'),child:v('child'),date:v('date'),msg:v('msg')};
    try{fetch('/api/enquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.ok}).then(function(ok){var s=$('[data-saved]',f.parentNode);if(ok&&s){s.hidden=false;s.textContent='Your enquiry has also been saved with the school office.'}}).catch(function(){})}catch(x){}
    var d=$('.done',f.parentNode);
    if(d){d.hidden=false;d.querySelector('[data-who]').textContent=v('parent');$('.wl',d).href=url;f.hidden=true;d.focus&&d.setAttribute('tabindex','-1');d.focus()}
  });
});
$$('[data-again]').forEach(function(b){b.addEventListener('click',function(){var d=b.closest('.done');d.hidden=true;var f=$('form',d.parentNode);f.hidden=false;f.reset()})});

/* ---------- clubs filter ---------- */
(function(){
  var g=$('#clubs');if(!g)return;
  var cat='all',cp=$('#club-camp');
  cp.innerHTML='<option value="all">All campuses</option>'+C.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join('');
  if(cur)cp.value=cur.id;
  function draw(){
    var l=AC.clubs.filter(function(c){return(cat==='all'||c.cat===cat)&&(cp.value==='all'||c.at.indexOf(cp.value)>-1)});
    g.innerHTML=l.length?l.map(function(c){return'<div class="card" style="--c:'+AC.catcol[c.cat]+'"><span class="tag">'+esc(c.cat)+'</span><h3>'+esc(c.n)+'</h3><p>'+esc(c.d)+'</p><div class="sub-list">'+c.at.map(function(i){return'<span class="pill">'+esc(byId(i).name)+'</span>'}).join('')+'</div></div>'}).join(''):'<p>No club matches that combination yet — try another campus.</p>';
    $('#club-n').textContent=l.length+' club'+(l.length===1?'':'s');
  }
  $$('[data-cat]').forEach(function(b){b.addEventListener('click',function(){cat=b.dataset.cat;$$('[data-cat]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});draw()})});
  cp.addEventListener('change',draw);draw();
})();

/* ---------- events ---------- */
(function(){
  var g=$('#events');if(!g)return;
  var fix=g.dataset.camp||'all',cp=$('#ev-camp');
  function draw(){
    var v=fix!=='all'?fix:(cp?cp.value:'all');
    var l=AC.events.filter(function(e){return v==='all'||e.c==='all'||e.c===v});if(g.dataset.max)l=l.slice(0,+g.dataset.max);
    g.innerHTML=l.map(function(e){var c=e.c==='all'?null:byId(e.c),col=c?c.color:'#12264A';return'<div class="ev" style="--c:'+col+'"><div class="dt">'+e.d+'<small>'+e.m+'</small></div><div><h4>'+esc(e.t)+'</h4><span class="mut">'+(c?esc(c.name)+' campus':'All campuses')+' · '+esc(e.k)+'</span></div></div>'}).join('');
  }
  if(cp){cp.innerHTML='<option value="all">All campuses</option>'+C.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>'}).join('');if(cur)cp.value=cur.id;cp.addEventListener('change',draw)}
  draw();
})();
})();
