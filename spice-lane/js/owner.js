(function(){
'use strict';
var $=UI.$,$$=UI.$$,h=UI.h,inr=UI.inr,api=UI.api,toast=UI.toast,fail=UI.fail;
var TABS=[['sales','📊','Sales'],['stock','📦','Stock'],['offers','🏷️','Offers'],['shops','🏪','Shops'],['orders','🧾','Orders']],tab='sales',period='week',poll=null,SHOPS=[];
UI.onAuthLost=function(){showLogin()};
function showLogin(){clearInterval(poll);$('#app').hidden=true;$('#login').hidden=false;$('#pw').focus()}
$('#lf').addEventListener('submit',function(e){e.preventDefault();$('#lm').textContent='';api('/api/owner/login','POST',{password:$('#pw').value}).then(function(){$('#pw').value='';start()}).catch(function(x){$('#lm').textContent=x.message})});
$('#out').addEventListener('click',function(){api('/api/logout','POST',{}).then(showLogin)});
$('#setb').addEventListener('click',function(){go('settings')});
function start(){$('#login').hidden=true;$('#app').hidden=false;
  [$('.tabs'),$('nav.bot')].forEach(function(box,k){box.innerHTML='';TABS.forEach(function(t){box.appendChild(k?h('button',{type:'button','data-tab':t[0],'aria-selected':'false',onclick:function(){go(t[0])}},[h('i',{text:t[1]}),t[2]]):h('button',{class:'tab',role:'tab','data-tab':t[0],'aria-selected':'false',text:t[1]+' '+t[2],onclick:function(){go(t[0])}}))})});
  api('/api/owner/shops').then(function(s){SHOPS=s}).catch(fail);go('sales')}
function go(t){tab=t;clearInterval(poll);$$('[data-tab]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.tab===t))});({sales:sales,stock:stock,offers:offers,shops:shops,orders:orders,settings:settings})[t]()}
function box(){var m=$('#main');m.innerHTML='';return m}
function tile(v,l,extra){return h('div',{class:'tile'},[h('b',{text:v}),h('span',{text:l}),extra||null])}
function change(cur,prev,label){if(!prev)return null;var p=Math.round((cur-prev)/prev*100);return h('em',{class:p>=0?'up':'down',text:' '+(p>=0?'▲ ':'▼ ')+Math.abs(p)+'% '+label})}

/* ---------- sales ---------- */
var PL={day:['Today','vs yesterday'],week:['7 days','vs previous 7 days'],month:['30 days','vs previous 30 days'],year:['12 months','']};
function sales(){
  var m=box();m.appendChild(h('div',{class:'bar'},[h('div',{class:'seg',role:'group','aria-label':'Period'},Object.keys(PL).map(function(k){return h('button',{type:'button','aria-pressed':String(period===k),text:PL[k][0],onclick:function(){period=k;sales()}})}))]));
  api('/api/owner/stats?period='+period).then(function(s){
    var body=h('div',{});m.appendChild(body);var cmp=PL[period][1];
    body.appendChild(h('div',{class:'tiles'},[tile(inr(s.revenue),'Revenue',cmp?change(s.revenue,s.prev.revenue,cmp):null),tile(String(s.orders),'Orders',cmp?change(s.orders,s.prev.orders,''):null),tile(inr(s.avg),'Average order'),tile(String(s.items),'Dishes sold'),tile(String(s.cancelled.count),'Cancelled',h('em',{class:'down',text:s.cancelled.amount?' '+inr(s.cancelled.amount)+' refunded':''}))]));
    body.appendChild(h('div',{class:'card',style:'margin-bottom:14px'},[h('h2',{text:'Revenue · '+PL[period][0].toLowerCase()}),chart(s.series,period)]));
    var g=h('div',{class:'grid2'});
    var tot=s.byShop.reduce(function(a,x){return a+x.revenue},0),mx=s.byShop.length?s.byShop[0].revenue:1;
    g.appendChild(h('div',{class:'card'},[h('h2',{text:'Sales by shop'})].concat(s.byShop.length?s.byShop.map(function(x){return h('div',{class:'hb'},[h('span',{class:'nm',text:x.emoji+' '+x.name}),h('span',{class:'tr'},[h('span',{class:'fl',style:'display:block;width:'+Math.max(2,x.revenue/mx*100)+'%;background:'+x.color})]),h('span',{class:'v',text:inr(x.revenue)}),h('span',{style:'color:var(--mut);font-size:.8rem;min-width:38px;text-align:right',text:Math.round(x.revenue/tot*100)+'%'})])}):[h('div',{class:'empty',text:'No sales in this period yet.'})])));
    var tm=s.topItems.length?s.topItems[0].qty:1;
    g.appendChild(h('div',{class:'card'},[h('h2',{text:'Best sellers'})].concat(s.topItems.length?s.topItems.map(function(x,i){return h('div',{class:'hb'},[h('span',{class:'nm',style:'flex-basis:46%',title:x.shop,text:(i+1)+'. '+x.name}),h('span',{class:'tr'},[h('span',{class:'fl',style:'display:block;width:'+Math.max(3,x.qty/tm*100)+'%;background:var(--amber)'})]),h('span',{class:'v',text:x.qty+' sold'})])}):[h('div',{class:'empty',text:'Nothing sold yet.'})])));
    body.appendChild(g);
    var g2=h('div',{class:'grid2'}),pt=s.byPayment.reduce(function(a,x){return a+x.revenue},0)||1;
    g2.appendChild(h('div',{class:'card'},[h('h2',{text:'How customers paid'})].concat(s.byPayment.map(function(x){return h('div',{class:'hb'},[h('span',{class:'nm',text:x.method==='upi'?'UPI':'Card'}),h('span',{class:'tr'},[h('span',{class:'fl',style:'display:block;width:'+x.revenue/pt*100+'%;background:'+(x.method==='upi'?'var(--cyan)':'var(--pink)')})]),h('span',{class:'v',text:Math.round(x.revenue/pt*100)+'%'})])}))));
    g2.appendChild(h('div',{class:'card'},[h('h2',{text:'Busiest hours'}),hours(s.byHour)]));body.appendChild(g2);
    body.appendChild(h('p',{style:'color:var(--mut);font-size:.85rem',text:'Revenue counts orders that were not cancelled. Times are India Standard Time.'}));
  }).catch(fail)}
function chart(series,per){
  var W=720,H=220,pl=44,pb=26,pt=8,n=series.length,mx=Math.max.apply(null,series.map(function(x){return x.revenue}))||1,step=niceStep(mx),top=Math.ceil(mx/step)*step||step,bw=(W-pl)/n,ns='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('role','img');svg.setAttribute('aria-label','Revenue chart');svg.style.width='100%';svg.style.height='auto';
  function el(t,a,txt){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;svg.appendChild(e);return e}
  for(var v=0;v<=top;v+=step){var y=pt+(H-pb-pt)*(1-v/top);el('line',{x1:pl,x2:W,y1:y,y2:y,stroke:'rgba(255,255,255,.1)'});el('text',{x:pl-6,y:y+4,'text-anchor':'end'},v>=1000?(v/1000)+'k':v)}
  var every=n>14?Math.ceil(n/8):1;
  series.forEach(function(s,i){var bh=(H-pb-pt)*s.revenue/top,x=pl+i*bw+bw*.15,r=el('rect',{x:x,y:H-pb-bh,width:bw*.7,height:Math.max(bh,0),rx:3,fill:'#ffb703'});var t=el('title',{},null);t.textContent=s.label+': '+inr(s.revenue)+' · '+s.orders+' orders';r.appendChild(t);
    if(i%every===0)el('text',{x:pl+i*bw+bw/2,y:H-8,'text-anchor':'middle'},s.label)});
  return svg}
function niceStep(mx){var raw=mx/4,p=Math.pow(10,Math.floor(Math.log10(raw||1))),f=raw/p;return(f<=1?1:f<=2?2:f<=5?5:10)*p}
function hours(a){var rows=a.slice(10,24),mx=Math.max.apply(null,rows.map(function(x){return x.revenue}))||1,w=h('div',{style:'display:flex;align-items:flex-end;gap:4px;height:120px'});
  rows.forEach(function(x){w.appendChild(h('div',{style:'flex:1;text-align:center;font-size:.64rem;color:var(--mut)',title:inr(x.revenue)},[h('div',{style:'height:'+Math.max(2,x.revenue/mx*92)+'px;background:'+(x.revenue===mx?'var(--pink)':'var(--cyan)')+';border-radius:3px 3px 0 0;margin-bottom:3px'}),(x.h%12||12)+(x.h<12?'a':'p')]))});return w}

/* ---------- stock ---------- */
var sf={f:'all',shop:'',q:''};
function stock(){var m=box();api('/api/owner/stock').then(function(all){
  var out=all.filter(function(i){return i.status==='out'}),low=all.filter(function(i){return i.status==='low'});
  m.appendChild(h('div',{class:'tiles'},[tile(String(all.length),'Dishes on all menus'),tile(String(out.length),'Sold out now'),tile(String(low.length),'Running low (5 or fewer)'),tile(String(all.reduce(function(a,i){return a+i.sold7},0)),'Dishes sold in 7 days')]));
  var sel=h('select',{'aria-label':'Shop'},[h('option',{value:'',text:'All shops'})].concat(SHOPS.map(function(s){return h('option',{value:s.id,text:s.name})})));sel.value=sf.shop;sel.addEventListener('change',function(){sf.shop=sel.value;draw()});
  var q=h('input',{type:'search',placeholder:'Search dish',value:sf.q,'aria-label':'Search dish'});q.addEventListener('input',function(){sf.q=q.value;draw(true)});
  m.appendChild(h('div',{class:'bar'},[h('div',{class:'seg',role:'group','aria-label':'Filter'},[['all','All'],['out','Sold out'],['low','Low']].map(function(f){return h('button',{type:'button','aria-pressed':String(sf.f===f[0]),text:f[1],onclick:function(){sf.f=f[0];stock()}})})),h('div',{},[sel]),h('div',{},[q])]));
  var holder=h('div',{});m.appendChild(holder);
  function draw(keep){var rows=all.filter(function(i){return(sf.f==='all'||i.status===sf.f)&&(!sf.shop||i.shop_id===+sf.shop)&&(!sf.q||(i.name+i.shop).toLowerCase().indexOf(sf.q.toLowerCase())>-1)});holder.innerHTML='';
    if(!rows.length){holder.appendChild(h('div',{class:'empty',text:'Nothing matches.'}));return}
    var tb=h('tbody');rows.slice(0,150).forEach(function(i){tb.appendChild(srow(i))});holder.appendChild(h('div',{class:'tw'},[h('table',{},[h('thead',{},[h('tr',{},['Dish','Shop','Price ₹','Stock','Sold (7d)','Status','Available'].map(function(x){return h('th',{text:x})}))]),tb])]));
    if(rows.length>150)holder.appendChild(h('p',{style:'color:var(--mut)',text:'Showing 150 of '+rows.length+'. Use the filters to narrow down.'}))}
  draw()}).catch(fail)}
function srow(i){
  function save(p,msg){api('/api/owner/items/'+i.id,'PATCH',p).then(function(){toast(msg||'Saved. Live for customers.');stock()}).catch(fail)}
  var price=h('input',{type:'number',min:'1',max:'5000',value:String(i.price),'aria-label':'Price of '+i.name});price.addEventListener('change',function(){save({price:price.value})});
  var stk=h('input',{type:'number',min:'0',max:'9999',value:i.stock===null?'':String(i.stock),placeholder:'∞','aria-label':'Stock of '+i.name});stk.addEventListener('change',function(){save({stock:stk.value===''?null:stk.value})});
  var on=h('input',{type:'checkbox','aria-label':i.name+' available'});on.checked=i.status!=='out';on.addEventListener('change',function(){if(on.checked)save(i.stock===0?{available:true,stock:10}:{available:true});else save({available:false},i.name+' marked sold out.')});
  return h('tr',{},[h('td',{},[h('b',{text:i.emoji+' '+i.name})]),h('td',{text:i.shop}),h('td',{},[price]),h('td',{},[stk]),h('td',{text:String(i.sold7)}),h('td',{},[h('span',{class:'pill '+i.status,text:{out:'Sold out',low:'Low',ok:'In stock',open:'Open'}[i.status]})]),h('td',{},[h('label',{class:'sw',style:'margin:0'},[on,h('span')])])])}

/* ---------- offers ---------- */
function offers(){var m=box();api('/api/owner/offers').then(function(list){
  m.appendChild(h('div',{class:'bar'},[h('button',{class:'btn pink',type:'button',text:'+ New offer',onclick:function(){var f=$('#of');f.hidden=!f.hidden}})]));
  m.appendChild(offerForm());
  if(!list.length)m.appendChild(h('div',{class:'empty',text:'No offers yet. Create one and customers see it straight away.'}));
  list.forEach(function(o){var sh=SHOPS.filter(function(s){return s.id===o.shop_id})[0];
    var on=h('input',{type:'checkbox','aria-label':'Offer active'});on.checked=!!o.active;on.addEventListener('change',function(){api('/api/owner/offers/'+o.id,'PATCH',{active:on.checked}).then(function(){toast(on.checked?'Offer is live.':'Offer paused.');offers()}).catch(fail)});
    m.appendChild(h('div',{class:'offer'+(o.active?'':' off')},[h('div',{},[h('b',{text:o.title}),h('div',{style:'color:var(--mut);font-size:.88rem',text:(o.kind==='percent'?o.value+'% off':inr(o.value)+' off')+(o.min_order?' · min '+inr(o.min_order):'')+(o.max_discount?' · up to '+inr(o.max_discount):'')+' · '+(sh?sh.name:'all shops')+(o.ends?' · ends '+o.ends:'')}),o.auto?h('span',{class:'pill open',text:'Automatic'}):h('span',{class:'code',text:o.code})]),
      h('div',{style:'display:flex;gap:10px;align-items:center'},[h('label',{class:'sw',style:'margin:0'},[on,h('span')]),h('button',{class:'btn ghost sm',type:'button',text:'Delete','aria-label':'Delete '+o.title,onclick:function(){if(confirm('Delete this offer?'))api('/api/owner/offers/'+o.id,'DELETE').then(function(){toast('Offer deleted.');offers()}).catch(fail)}})])]))})}).catch(fail)}
function offerForm(){
  var f=h('form',{id:'of',class:'card form',hidden:true,style:'margin-bottom:14px',novalidate:true},[
    h('div',{class:'full'},[h('label',{for:'o_t',text:'Offer title customers will see'}),h('input',{id:'o_t',maxlength:'90',placeholder:'e.g. 15% off all biryani this weekend'})]),
    h('div',{},[h('label',{for:'o_k',text:'Type'}),h('select',{id:'o_k'},[h('option',{value:'percent',text:'Percent off'}),h('option',{value:'flat',text:'Flat ₹ off'})])]),h('div',{},[h('label',{for:'o_v',text:'Value (% or ₹)'}),h('input',{id:'o_v',type:'number',min:'1'})]),
    h('div',{},[h('label',{for:'o_m',text:'Minimum order ₹'}),h('input',{id:'o_m',type:'number',min:'0',value:'0'})]),h('div',{},[h('label',{for:'o_x',text:'Maximum discount ₹ (0 = none)'}),h('input',{id:'o_x',type:'number',min:'0',value:'0'})]),
    h('div',{},[h('label',{for:'o_s',text:'Applies to'}),h('select',{id:'o_s'},[h('option',{value:'',text:'All shops'})].concat(SHOPS.map(function(s){return h('option',{value:s.id,text:s.name})})))]),h('div',{},[h('label',{for:'o_e',text:'Ends on (optional)'}),h('input',{id:'o_e',type:'date'})]),
    h('div',{},[h('label',{for:'o_a',text:'How it works'}),h('select',{id:'o_a'},[h('option',{value:'0',text:'Customer types a coupon code'}),h('option',{value:'1',text:'Applies automatically'})])]),h('div',{},[h('label',{for:'o_c',text:'Coupon code'}),h('input',{id:'o_c',maxlength:'16',placeholder:'e.g. FEAST15',style:'text-transform:uppercase'})]),
    h('div',{class:'full'},[h('div',{class:'msg',id:'om',role:'alert'}),h('button',{class:'btn',type:'submit',text:'Publish offer'})])]);
  f.addEventListener('submit',function(e){e.preventDefault();$('#om').textContent='';api('/api/owner/offers','POST',{title:$('#o_t').value,kind:$('#o_k').value,value:$('#o_v').value,min_order:$('#o_m').value,max_discount:$('#o_x').value,shop_id:$('#o_s').value,ends:$('#o_e').value,auto:$('#o_a').value==='1',code:$('#o_c').value}).then(function(){toast('Offer published. Customers see it now.');offers()}).catch(function(x){$('#om').textContent=x.message})});
  return f}

/* ---------- shops ---------- */
function shops(){var m=box();api('/api/owner/shops').then(function(list){SHOPS=list;
  m.appendChild(h('div',{class:'bar'},[h('button',{class:'btn pink',type:'button',text:'+ Add a shop',onclick:function(){var f=$('#sf');f.hidden=!f.hidden}})]));
  var f=h('form',{id:'sf',class:'card form',hidden:true,style:'margin-bottom:14px',novalidate:true},[h('div',{},[h('label',{for:'s_n',text:'Shop name'}),h('input',{id:'s_n',maxlength:'40'})]),h('div',{},[h('label',{for:'s_c',text:'Cuisine'}),h('input',{id:'s_c',maxlength:'30'})]),h('div',{},[h('label',{for:'s_e',text:'Emoji'}),h('input',{id:'s_e',maxlength:'4',value:'🍽️'})]),h('div',{},[h('label',{for:'s_p',text:'Staff PIN (4 digits)'}),h('input',{id:'s_p',inputmode:'numeric',maxlength:'4'})]),h('div',{class:'full'},[h('div',{class:'msg',id:'sm',role:'alert'}),h('button',{class:'btn',type:'submit',text:'Add shop'})])]);
  f.addEventListener('submit',function(e){e.preventDefault();$('#sm').textContent='';api('/api/owner/shops','POST',{name:$('#s_n').value,cuisine:$('#s_c').value,emoji:$('#s_e').value,pin:$('#s_p').value}).then(function(){toast('Shop added. Add its dishes from the Stock tab or let the shop do it.');shops()}).catch(function(x){$('#sm').textContent=x.message})});m.appendChild(f);
  var tb=h('tbody');list.forEach(function(s){
    var on=h('input',{type:'checkbox','aria-label':s.name+' open'});on.checked=s.open;on.addEventListener('change',function(){api('/api/owner/shops/'+s.id,'PATCH',{open:on.checked}).then(function(){toast(s.name+(on.checked?' is open.':' is closed.'))}).catch(fail)});
    tb.appendChild(h('tr',{},[h('td',{},[h('b',{text:s.emoji+' '+s.name}),h('div',{style:'color:var(--mut);font-size:.8rem',text:s.cuisine})]),h('td',{text:String(s.items)}),h('td',{text:inr(s.today)}),h('td',{},[h('label',{class:'sw',style:'margin:0'},[on,h('span')])]),
      h('td',{},[h('div',{style:'display:flex;gap:6px;flex-wrap:wrap'},[h('button',{class:'btn ghost sm',type:'button',text:'New PIN',onclick:function(){var p=prompt('New 4-digit PIN for '+s.name+':');if(p)api('/api/owner/shops/'+s.id,'PATCH',{pin:p}).then(function(){toast('PIN changed.')}).catch(fail)}}),h('button',{class:'btn ghost sm',type:'button',text:'Remove',onclick:function(){if(confirm('Remove '+s.name+' from the food court? Its past sales stay in your reports.'))api('/api/owner/shops/'+s.id,'DELETE').then(function(){toast('Shop removed.');shops()}).catch(fail)}})])])]))});
  m.appendChild(h('div',{class:'tw'},[h('table',{},[h('thead',{},[h('tr',{},['Shop','Dishes','Sales today','Open','Manage'].map(function(x){return h('th',{text:x})}))]),tb])]))}).catch(fail)}

/* ---------- orders ---------- */
function orders(){
  function load(){api('/api/owner/orders').then(function(list){var m=$('#main');if(tab!=='orders')return;var y=window.scrollY;m.innerHTML='';
    m.appendChild(h('div',{class:'bar'},[h('a',{class:'btn ghost',href:'/api/owner/orders.csv',text:'⬇ Download all orders (CSV)'}),h('span',{style:'color:var(--mut)',text:'Latest 60 orders · refreshes every 8 seconds'})]));
    list.forEach(function(o){var act=o.shops.some(function(s){return['new','preparing','ready'].indexOf(s.status)>-1});
      m.appendChild(h('div',{class:'offer'},[h('div',{},[h('b',{text:'#'+o.token+' · '+o.code+' · '+o.name+' · '+inr(o.total)}),h('div',{style:'color:var(--mut);font-size:.85rem',text:UI.when(o.created)+' · '+(o.mode==='take'?'Takeaway':'Table '+o.table)+' · '+o.method.toUpperCase()+(o.offer?' · '+o.offer:'')}),
        h('div',{style:'margin-top:6px;display:flex;gap:6px;flex-wrap:wrap'},o.shops.map(function(s){return h('span',{class:'pill '+s.status,text:s.name+': '+s.status})}))]),
        act?h('button',{class:'btn ghost sm',type:'button',text:'Cancel order',onclick:function(){var r=prompt('Reason for cancelling (the customer will see it):','Cancelled by the owner');if(r)api('/api/owner/orders/'+o.id+'/cancel','POST',{note:r}).then(function(){toast('Cancelled. Stock returned.');load()}).catch(fail)}}):null]))});
    window.scrollTo(0,y)}).catch(fail)}
  box();load();poll=setInterval(load,8000)}

/* ---------- settings ---------- */
function settings(){var m=box();$$('[data-tab]').forEach(function(b){b.setAttribute('aria-selected','false')});
  var f=h('form',{class:'card form',novalidate:true,style:'max-width:520px'},[h('h2',{class:'full',text:'Change owner password'}),h('div',{class:'full'},[h('label',{for:'p_c',text:'Current password'}),h('input',{id:'p_c',type:'password',autocomplete:'current-password'})]),h('div',{class:'full'},[h('label',{for:'p_n',text:'New password (6 or more characters)'}),h('input',{id:'p_n',type:'password',autocomplete:'new-password'})]),h('div',{class:'full'},[h('div',{class:'msg',id:'pm',role:'alert'}),h('button',{class:'btn',type:'submit',text:'Save password'})])]);
  f.addEventListener('submit',function(e){e.preventDefault();$('#pm').textContent='';api('/api/owner/password','PUT',{current:$('#p_c').value,next:$('#p_n').value}).then(function(){$('#p_c').value='';$('#p_n').value='';toast('Password changed.')}).catch(function(x){$('#pm').textContent=x.message})});
  m.appendChild(f)}

UI.pwa();
api('/api/health').then(function(j){if(j.defaultOwnerPassword){var w=$('#warn');w.hidden=false;w.textContent='You are using the default owner password. Change it in Settings, or set ADMIN_PASSWORD on your server, before going live.'}}).catch(function(){});
api('/api/owner/shops').then(function(){start()}).catch(function(){showLogin()});
})();
