(function(){
'use strict';
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
function h(tag,a,kids){var e=document.createElement(tag);for(var k in(a||{})){var v=a[k];if(v==null||v===false)continue;if(k==='text')e.textContent=v;else if(k==='class')e.className=v;else if(k==='style')e.setAttribute('style',v);else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v)}(kids||[]).forEach(function(c){if(c==null||c===false)return;e.appendChild(typeof c==='string'?document.createTextNode(c):c)});return e}
var inr=function(n){return'₹'+Math.round(n).toLocaleString('en-IN')};
function ls(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function api(p,m,b){return fetch(p,{method:m||'GET',headers:b?{'Content-Type':'application/json'}:{},body:b?JSON.stringify(b):undefined,credentials:'same-origin'}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){j._status=r.status;return j})})}
var tt;function toast(t,bad){var e=$('#toast');e.textContent=t;e.className='toast on'+(bad?' bad':'');clearTimeout(tt);tt=setTimeout(function(){e.className='toast'},2800)}

var MENU=null,IDX={},cart=ls('fc_cart',[]),view=$('#view'),timer=null,filt={q:'',veg:false};
/* ---------- floating emoji background ---------- */
(function(){var box=$('#emo'),list=['🍕','🍔','🍜','🥟','🍛','🥞','🍦','🧃','🌯','🍩','☕','🥤'];for(var i=0;i<12;i++){var s=h('span',{class:'emo',text:list[i%list.length],style:'left:'+(i*8.5+Math.random()*4)+'%;animation-duration:'+(18+Math.random()*22)+'s;animation-delay:-'+Math.random()*30+'s;font-size:'+(1.4+Math.random()*1.6)+'rem'});box.appendChild(s)}})();

/* ---------- cart ---------- */
function itemById(id){return IDX[id]}
function cartCount(){return cart.reduce(function(a,l){return a+l.qty},0)}
function cartTotal(){return cart.reduce(function(a,l){var it=itemById(l.id);return a+(it?it.price*l.qty:0)},0)}
function saveCart(){lsSet('fc_cart',cart);paintBadges();syncSteppers();if($('#sheet').classList.contains('on'))renderSheet()}
function qtyOf(id){var l=cart.filter(function(x){return x.id===id})[0];return l?l.qty:0}
function setQty(id,q){var it=itemById(id);if(!it)return;if(it.left!==null&&q>it.left){q=it.left;toast('Only '+it.left+' left',true)}if(q>20)q=20;cart=cart.filter(function(x){return x.id!==id});if(q>0)cart.push({id:id,qty:q});saveCart()}
function paintBadges(){var n=cartCount();$('#cn').textContent=n;$('#cn2').textContent=n;$('#cn2').style.display=n?'grid':'none';$('#ctot').textContent=inr(cartTotal())}
function stepper(it,shop){
  var box=h('div',{class:'qtyctl','data-id':it.id});fill(box,it,shop);return box}
function fill(box,it,shop){
  box.innerHTML='';var q=qtyOf(it.id),closed=shop&&!shop.open;
  if(!it.available){box.appendChild(h('span',{class:'badge sold',text:'Sold out'}));return}
  if(closed){box.appendChild(h('span',{class:'badge closed',text:'Shop closed'}));return}
  if(!q)box.appendChild(h('button',{class:'add',type:'button','aria-label':'Add '+it.name,text:'ADD',onclick:function(){setQty(it.id,1)}}));
  else box.appendChild(h('div',{class:'step'},[h('button',{type:'button','aria-label':'Remove one '+it.name,text:'−',onclick:function(){setQty(it.id,q-1)}}),h('span',{text:String(q),'aria-live':'polite'}),h('button',{type:'button','aria-label':'Add one more '+it.name,text:'+',onclick:function(){setQty(it.id,q+1)}})]));
  if(it.left)box.appendChild(h('span',{class:'badge low',text:'Only '+it.left+' left'}));
}
function syncSteppers(){$$('.qtyctl').forEach(function(b){var it=itemById(+b.dataset.id);if(it)fill(b,it,SHOP[it.shop])})}
var SHOP={};
function index(m){IDX={};SHOP={};m.shops.forEach(function(s){SHOP[s.id]=s;s.items.forEach(function(i){i.shop=s.id;IDX[i.id]=i})});
  var before=cart.length;cart=cart.filter(function(l){return IDX[l.id]});if(cart.length!==before)lsSet('fc_cart',cart)}
function dish(it,shop,showShop){
  return h('div',{class:'dish'+(it.available?'':' out')},[h('div',{class:'e',text:it.emoji,'aria-hidden':'true'}),
    h('div',{},[h('b',{},[h('span',{class:'veg'+(it.veg?'':' nv'),role:'img','aria-label':it.veg?'Vegetarian':'Non-vegetarian'}),it.name]),h('div',{class:'d',text:it.desc}),showShop?h('div',{class:'sh',text:shop.emoji+' '+shop.name}):null,h('span',{class:'price',text:inr(it.price)})]),stepper(it,shop)])}

/* ---------- views ---------- */
function setNav(n){$$('[data-nav]').forEach(function(a){if(a.dataset.nav===n)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}
function home(){
  setNav('home');var m=MENU;view.innerHTML='';
  var words=['DOSA','BIRYANI','BURGER','PIZZA','NOODLES','CHAAT','TIKKA','MOMO','KAAPI','JUICE'],wd=h('div',{class:'words','aria-hidden':'true'});
  words.forEach(function(w,i){wd.appendChild(h('span',{class:'w',text:w,style:'left:'+((i*37)%88)+'%;top:'+(6+(i*23)%78)+'%;--r:'+(i%2?5:-5)+'deg;animation-delay:-'+i*1.3+'s;animation-duration:'+(8+i%4*2)+'s'}))});
  var ring=h('div',{class:'ring'});m.shops.forEach(function(s,i){ring.appendChild(h('a',{class:'sign',href:'#/shop/'+s.id,style:'--i:'+i+';--c:'+s.color,'aria-label':s.name},[h('i',{text:s.emoji}),h('b',{text:s.name})]))});
  view.appendChild(h('section',{class:'hero'},[wd,h('span',{class:'tag',text:'Order · Pay · Collect'}),h('h1',{},[document.createTextNode(m.court.name.replace(' Food Court','').toUpperCase()),h('span',{text:'FOOD COURT'})]),h('p',{text:m.court.tagline+' Order from any kitchen, pay once, and watch each counter prepare your food live.'}),h('div',{class:'stage','aria-hidden':'false'},[ring]),h('a',{class:'btn',href:'#menu',onclick:function(e){e.preventDefault();$('#menu').scrollIntoView()},text:'Browse the menu'}),h('div',{class:'hours',text:'Open daily · '+m.court.hours})]));
  if(m.offers.length){view.appendChild(h('div',{class:'sec'},[h('h2',{text:'Offers today'}),h('a',{href:'#/offers',text:'All offers'})]));view.appendChild(offerList(m.offers))}
  view.appendChild(h('div',{class:'sec',id:'menu'},[h('h2',{text:'All kitchens'}),h('span',{text:m.shops.length+' shops · '+m.shops.filter(function(s){return s.open}).length+' open now'})]));
  var q=h('input',{type:'search',placeholder:'Search dishes, e.g. biryani, momo, coffee',value:filt.q,'aria-label':'Search all menus',autocomplete:'off'}),vg=h('button',{class:'chip',type:'button','aria-pressed':String(filt.veg),text:'🟢 Veg only',onclick:function(){filt.veg=!filt.veg;vg.setAttribute('aria-pressed',String(filt.veg));results()}});
  view.appendChild(h('div',{class:'tools'},[h('div',{class:'search'},[q]),vg]));
  var out=h('div',{id:'res'});view.appendChild(out);
  q.addEventListener('input',function(){filt.q=q.value;results()});
  function results(){out.innerHTML='';var t=filt.q.trim().toLowerCase();
    if(!t&&!filt.veg){var g=h('div',{class:'grid'});m.shops.forEach(function(s){var av=s.items.filter(function(i){return i.available}).length;g.appendChild(h('a',{class:'shop'+(s.open?'':' off'),href:'#/shop/'+s.id,style:'--c:'+s.color},[h('div',{class:'em',text:s.emoji,'aria-hidden':'true'}),h('h3',{text:s.name}),h('div',{class:'cu',text:s.cuisine}),h('p',{text:s.blurb}),h('p',{},[h('span',{class:'badge '+(s.open?'open':'closed'),text:s.open?'Open':'Closed'}),' ',h('span',{class:'cu',text:av+' of '+s.items.length+' dishes available'})])]))});out.appendChild(g);return}
    var found=0;m.shops.forEach(function(s){var its=s.items.filter(function(i){return(!filt.veg||i.veg)&&(!t||(i.name+' '+i.desc+' '+i.cat+' '+s.name+' '+s.cuisine).toLowerCase().indexOf(t)>-1)});its.forEach(function(i){found++;out.appendChild(dish(i,s,true))})});
    if(!found)out.appendChild(h('div',{class:'empty',text:'Nothing matches. Try another word.'}));syncSteppers()}
  results();footer();
}
function offerList(list){var w=h('div',{class:'offers'});list.forEach(function(o){var s=o.shop_id&&SHOP[o.shop_id];w.appendChild(h('div',{class:'offer'},[h('b',{text:o.title}),o.code?h('button',{class:'code',type:'button','aria-label':'Use code '+o.code,onclick:function(){lsSet('fc_coupon',o.code);toast('Code '+o.code+' saved. Apply it in your cart.');openSheet()}},['🏷️ '+o.code]):h('span',{class:'badge open',text:'Applies automatically'}),h('small',{text:(s?'At '+s.name+'. ':'All shops. ')+(o.min?'Orders above '+inr(o.min)+'.':'')})]))});return w}
function shopPage(id){
  var s=SHOP[id];if(!s){location.hash='#/';return}setNav('home');view.innerHTML='';
  view.appendChild(h('div',{style:'margin-top:16px'},[h('a',{class:'back',href:'#/',text:'← All kitchens'})]));
  view.appendChild(h('div',{class:'shophead',style:'--c:'+s.color},[h('div',{class:'em',text:s.emoji}),h('div',{},[h('h1',{text:s.name}),h('div',{style:'color:var(--mut)'},[s.cuisine+' · ',h('span',{class:'badge '+(s.open?'open':'closed'),text:s.open?'Open now':'Closed right now'})]),h('div',{style:'margin-top:4px',text:s.blurb})])]));
  var cats=[];s.items.forEach(function(i){if(cats.indexOf(i.cat)<0)cats.push(i.cat)});
  cats.forEach(function(c){view.appendChild(h('div',{class:'cat',text:c}));s.items.filter(function(i){return i.cat===c}).forEach(function(i){view.appendChild(dish(i,s,false))})});
  var off=MENU.offers.filter(function(o){return o.shop_id===s.id});if(off.length){view.appendChild(h('div',{class:'cat',text:'Offers at '+s.name}));view.appendChild(offerList(off))}
  footer();
}
function offersPage(){setNav('offers');view.innerHTML='';view.appendChild(h('div',{class:'sec'},[h('h2',{text:'Offers and coupons'})]));
  if(!MENU.offers.length)view.appendChild(h('div',{class:'empty',text:'No offers right now. Check back soon.'}));else view.appendChild(offerList(MENU.offers));
  view.appendChild(h('p',{style:'color:var(--mut)',text:'Offers apply to your whole cart. If more than one offer fits, we use whichever saves you the most.'}));footer()}
function footer(){view.appendChild(h('footer',{class:'ft'},[document.createTextNode(MENU.court.name+' · '+MENU.court.hours+' · '),h('a',{href:'shop.html',text:'Shop staff'}),' · ',h('a',{href:'owner.html',text:'Owner'})]))}

/* ---------- orders ---------- */
var STEPS=['new','preparing','ready','collected'],STEPL=['Received','Cooking','Ready','Collected'];
function stepsEl(st){var i=STEPS.indexOf(st);return h('div',{class:'steps',role:'img','aria-label':'Status: '+STEPL[i]},STEPL.map(function(l,k){return h('div',{class:k<i||(k===i&&st==='collected')?'d':k===i?'d c':'',text:l})}))}
var lastOverall={};
function orderPage(code){
  setNav('orders');clearInterval(timer);
  function draw(o){
    view.innerHTML='';view.appendChild(h('div',{style:'margin-top:16px'},[h('a',{class:'back',href:'#/orders',text:'← My orders'})]));
    var msg={new:'Order received. Kitchens will start soon.',preparing:'Your food is being prepared.',ready:'Ready! Collect from the counters below.',collected:'All collected. Enjoy your meal!',cancelled:'This order was cancelled.'}[o.overall];
    view.appendChild(h('div',{class:'ticket'},[h('div',{style:'color:var(--mut);font-weight:600',text:'PICKUP CODE'}),h('div',{class:'code',text:o.code}),h('div',{class:'tk',text:'Token #'+o.token+' · '+(o.mode==='take'?'Takeaway':'Table '+o.table)}),h('div',{class:'big',text:msg})]));
    if(o.refund>0)view.appendChild(h('div',{class:'test',text:'Refund of '+inr(o.refund)+' for cancelled items will go back to your payment method.'}));
    o.shops.forEach(function(s){
      view.appendChild(h('div',{class:'os',style:'--c:'+s.color},[h('h3',{},[h('span',{text:s.emoji+' '+s.name}),h('span',{text:inr(s.total)})]),s.status==='cancelled'?h('div',{class:'cx',text:'Cancelled: '+(s.note||'by the shop')}):stepsEl(s.status),h('ul',{},s.items.map(function(i){return h('li',{text:i.qty+' × '+i.name})}))]))});
    view.appendChild(h('div',{class:'sum'},[h('div',{},[h('span',{text:'Subtotal'}),h('span',{text:inr(o.subtotal)})]),o.discount?h('div',{class:'dc'},[h('span',{text:'Offer: '+o.offer}),h('span',{text:'−'+inr(o.discount)})]):null,h('div',{class:'tot'},[h('span',{text:'Paid ('+(o.method==='upi'?'UPI':'card')+', test mode)'}),h('span',{text:inr(o.total)})])]));
    view.appendChild(h('div',{style:'text-align:center'},[h('a',{class:'btn',href:'#/',text:'Order more'})]));footer();
    if(lastOverall[o.code]&&lastOverall[o.code]!==o.overall&&o.overall==='ready'){toast('🔔 Your order is ready!');if(navigator.vibrate)navigator.vibrate([200,100,200])}
    lastOverall[o.code]=o.overall;
  }
  function poll(){api('/api/order/'+code).then(function(o){if(o._status!==200){view.innerHTML='';view.appendChild(h('div',{class:'empty',text:o.error||'Order not found.'}));clearInterval(timer);return}var y=window.scrollY;draw(o);window.scrollTo(0,y);if(o.overall==='collected'||o.overall==='cancelled')clearInterval(timer)}).catch(function(){})}
  poll();timer=setInterval(poll,4000);
}
function ordersPage(){setNav('orders');view.innerHTML='';view.appendChild(h('div',{class:'sec'},[h('h2',{text:'My orders'}),h('span',{text:'On this phone'})]));
  var codes=ls('fc_orders',[]);if(!codes.length){view.appendChild(h('div',{class:'empty',text:'No orders yet. Pick something tasty!'}));view.appendChild(h('div',{style:'text-align:center'},[h('a',{class:'btn',href:'#/',text:'Browse shops'})]));footer();return}
  var box=h('div',{});view.appendChild(box);
  codes.forEach(function(c){api('/api/order/'+c).then(function(o){if(o._status!==200)return;box.appendChild(h('a',{class:'ordrow',href:'#/order/'+c},[h('div',{},[h('b',{text:'#'+o.token+' · '+o.code}),h('div',{style:'color:var(--mut);font-size:.85rem',text:new Date(o.created).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})+' · '+o.shops.map(function(s){return s.name}).join(', ')})]),h('div',{style:'text-align:right'},[h('div',{class:'price',text:inr(o.total)}),h('span',{class:'badge '+(o.overall==='ready'?'open':o.overall==='cancelled'?'closed':'low'),text:o.overall})])]))})});
  footer()}

/* ---------- cart sheet + checkout ---------- */
var pay='upi',mode='dine',qtimer=null,lastQ=null,paying=false,form=ls('fc_form',{name:'',phone:'',table:''});
function openSheet(){$('#sheet').classList.add('on');$('#sheet').setAttribute('aria-hidden','false');$('#scrim').classList.add('on');renderSheet()}
function closeSheet(){$('#sheet').classList.remove('on');$('#sheet').setAttribute('aria-hidden','true');$('#scrim').classList.remove('on')}
$('#cartbtn').addEventListener('click',openSheet);$('#cartbtn2').addEventListener('click',openSheet);$('#scrim').addEventListener('click',closeSheet);
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeSheet()});
function renderSheet(){
  var sh=$('#sheet'),keep={};['cpn','nm','ph','tb','upi','cn','ex','cv'].forEach(function(k){var e=$('#f_'+k);if(e)keep[k]=e.value});sh.innerHTML='';
  sh.appendChild(h('h2',{},[h('span',{text:'Your cart'}),h('button',{class:'x',type:'button','aria-label':'Close cart',text:'✕',onclick:closeSheet})]));
  if(!cart.length){sh.appendChild(h('div',{class:'empty',text:'Your cart is empty. Add something tasty!'}));sh.appendChild(h('div',{style:'text-align:center'},[h('button',{class:'btn',type:'button',text:'Browse shops',onclick:function(){closeSheet();location.hash='#/'}})]));return}
  var by={};cart.forEach(function(l){var it=itemById(l.id);if(it){(by[it.shop]=by[it.shop]||[]).push({it:it,q:l.qty})}});
  var bad={};(lastQ&&lastQ.problems||[]).forEach(function(p){bad[p.id]=p.msg});
  Object.keys(by).forEach(function(sid){var s=SHOP[sid];by[sid].forEach(function(x,i){
    sh.appendChild(h('div',{class:'cl'+(bad[x.it.id]?' bad':'')},[i===0?h('div',{class:'sn',text:s.emoji+' '+s.name}):null,h('div',{class:'nm'},[x.it.name+' · '+inr(x.it.price),bad[x.it.id]?h('div',{style:'font-size:.82rem',text:bad[x.it.id]}):null]),h('div',{class:'step'},[h('button',{type:'button','aria-label':'Remove one '+x.it.name,text:'−',onclick:function(){setQty(x.it.id,x.q-1)}}),h('span',{text:String(x.q)}),h('button',{type:'button','aria-label':'Add one '+x.it.name,text:'+',onclick:function(){setQty(x.it.id,x.q+1)}})])]))})});
  var cp=h('div',{class:'fld'},[h('label',{for:'f_cpn',text:'Coupon code'}),h('div',{class:'cpn'},[h('input',{id:'f_cpn',placeholder:'e.g. WELCOME50',autocomplete:'off',style:'text-transform:uppercase',value:keep.cpn!=null?keep.cpn:ls('fc_coupon','')}),h('button',{class:'btn ghost',type:'button',text:'Apply',onclick:function(){lsSet('fc_coupon',$('#f_cpn').value.trim());requote()}})])]);sh.appendChild(cp);
  sh.appendChild(h('div',{class:'sum',id:'sum'},[h('div',{},[h('span',{text:'Subtotal'}),h('span',{text:inr(cartTotal())})])]));
  if(lastQ&&lastQ.problems&&lastQ.problems.length)sh.appendChild(h('button',{class:'btn ghost',type:'button',style:'width:100%;margin-bottom:10px',text:'Remove unavailable items',onclick:function(){lastQ.problems.forEach(function(p){if(p.left)setQty(p.id,p.left);else cart=cart.filter(function(l){return l.id!==p.id})});lastQ=null;saveCart();requote()}}));
  sh.appendChild(h('div',{class:'seg',role:'group','aria-label':'How will you eat?'},[h('button',{type:'button','aria-pressed':String(mode==='dine'),text:'🍽️ Dine in',onclick:function(){mode='dine';renderSheet()}}),h('button',{type:'button','aria-pressed':String(mode==='take'),text:'🥡 Takeaway',onclick:function(){mode='take';renderSheet()}})]));
  if(mode==='dine')sh.appendChild(fld('tb','Table number','text',keep.tb!=null?keep.tb:form.table,'e.g. 12','off'));
  sh.appendChild(h('div',{class:'row2'},[fld('nm','Your name','text',keep.nm!=null?keep.nm:form.name,'Name','name'),fld('ph','Mobile number','tel',keep.ph!=null?keep.ph:form.phone,'10 digits','tel')]));
  sh.appendChild(h('div',{class:'test',text:'TEST MODE: no real money moves. This is a demo payment screen.'}));
  sh.appendChild(h('div',{class:'seg',role:'group','aria-label':'Payment method'},[h('button',{type:'button','aria-pressed':String(pay==='upi'),text:'UPI',onclick:function(){pay='upi';renderSheet()}}),h('button',{type:'button','aria-pressed':String(pay==='card'),text:'Card',onclick:function(){pay='card';renderSheet()}})]));
  if(pay==='upi'){sh.appendChild(fld('upi','UPI ID','text',keep.upi||'','name@okbank','off'));sh.appendChild(h('div',{style:'color:var(--mut);font-size:.84rem',text:'Test tip: any ID like name@okbank works. Use name@fail to see a declined payment.'}))}
  else{sh.appendChild(fld('cn','Card number','text',keep.cn||'','4242 4242 4242 4242','cc-number'));sh.appendChild(h('div',{class:'row2'},[fld('ex','Expiry (MM/YY)','text',keep.ex||'','12/30','cc-exp'),fld('cv','CVV','password',keep.cv||'','123','cc-csc')]));sh.appendChild(h('div',{style:'color:var(--mut);font-size:.84rem',text:'Test card: 4242 4242 4242 4242 with any future date and CVV. 4000 0000 0000 0002 is declined.'}))}
  sh.appendChild(h('div',{class:'msg bad',id:'pmsg',role:'alert'}));
  sh.appendChild(h('button',{class:'btn pink',type:'button',id:'paybtn',style:'width:100%;font-size:1.05rem',text:'Pay '+inr(cartTotal()),onclick:placeOrder}));
  var cpEl=$('#f_cpn');cpEl.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();lsSet('fc_coupon',cpEl.value.trim());requote()}});
  paintSum();if(!lastQ)requote();
}
function fld(id,label,type,val,ph,ac){return h('div',{class:'fld'},[h('label',{for:'f_'+id,text:label}),h('input',{id:'f_'+id,type:type,value:val||'',placeholder:ph,autocomplete:ac})])}
function items(){return cart.map(function(l){return{id:l.id,qty:l.qty}})}
function requote(){clearTimeout(qtimer);qtimer=setTimeout(function(){if(!cart.length)return;api('/api/quote','POST',{items:items(),coupon:ls('fc_coupon','')}).then(function(q){var prev=lastQ&&lastQ.problems&&lastQ.problems.length;lastQ=q;if(q.problems&&q.problems.length||prev)renderSheet();else paintSum()})},120)}
function paintSum(){var s=$('#sum');if(!s)return;s.innerHTML='';var q=lastQ;
  if(!q||!q.ok){s.appendChild(h('div',{},[h('span',{text:'Subtotal'}),h('span',{text:inr(cartTotal())})]));return}
  s.appendChild(h('div',{},[h('span',{text:'Subtotal'}),h('span',{text:inr(q.subtotal)})]));
  if(q.discount)s.appendChild(h('div',{class:'dc'},[h('span',{text:'🏷️ '+q.offer.title}),h('span',{text:'−'+inr(q.discount)})]));
  if(q.couponMsg)s.appendChild(h('div',{style:'color:var(--amber);font-size:.86rem',text:q.couponMsg}));
  if(q.byShop.length>1)s.appendChild(h('div',{style:'color:var(--mut);font-size:.82rem',text:'You will collect from '+q.byShop.length+' counters: '+q.byShop.map(function(b){return b.name}).join(', ')}));
  s.appendChild(h('div',{class:'tot'},[h('span',{text:'Total'}),h('span',{text:inr(q.total)})]));
  var b=$('#paybtn');if(b)b.textContent='Pay '+inr(q.total)}
function placeOrder(){
  if(paying)return;var g=function(k){var e=$('#f_'+k);return e?e.value.trim():''},pm=$('#pmsg');pm.textContent='';
  form={name:g('nm'),phone:g('ph'),table:g('tb')};lsSet('fc_form',form);
  var body={name:form.name,phone:form.phone,mode:mode,table:form.table,items:items(),coupon:ls('fc_coupon',''),pay:pay==='upi'?{type:'upi',upi:g('upi')}:{type:'card',number:g('cn'),exp:g('ex'),cvv:g('cv')}};
  var btn=$('#paybtn');paying=true;btn.disabled=true;btn.textContent='Processing payment…';
  setTimeout(function(){api('/api/order','POST',body).then(function(r){paying=false;
    if(r._status===201){cart=[];lsSet('fc_cart',cart);var codes=ls('fc_orders',[]);codes.unshift(r.code);lsSet('fc_orders',codes.slice(0,20));lastQ=null;paintBadges();closeSheet();location.hash='#/order/'+r.code;toast('✅ Payment successful. Order placed!');return}
    if(r._status===409){lastQ={ok:false,problems:r.problems||[]};renderSheet();$('#pmsg').textContent=r.error;loadMenu(true);return}
    renderSheet();$('#pmsg').textContent=r.error||'Something went wrong. Please try again.'}).catch(function(){paying=false;renderSheet();$('#pmsg').textContent='No connection. Please try again.'})},900);
}

/* ---------- routing + data ---------- */
function route(){clearInterval(timer);if(!MENU)return;var p=(location.hash||'#/').replace(/^#\/?/,'').split('/');
  if(p[0]==='shop')shopPage(+p[1]);else if(p[0]==='offers')offersPage();else if(p[0]==='orders')ordersPage();else if(p[0]==='order'&&p[1])orderPage(p[1]);else home();
  if(!(p[0]==='order'))window.scrollTo(0,0);document.title=MENU.court.name+' · Order from 12 kitchens'}
function loadMenu(quiet){return api('/api/menu').then(function(m){if(!m.shops){if(!quiet)view.appendChild(h('div',{class:'empty',text:'Could not load the menu.'}));return}MENU=m;index(m);paintBadges();if(!quiet)route();else{syncSteppers()}}).catch(function(){if(!MENU)view.innerHTML='<div class="empty">No connection. Check your internet and refresh.</div>'})}
window.addEventListener('hashchange',route);
setInterval(function(){if(document.hidden)return;var act=document.activeElement;if(act&&act.tagName==='INPUT')return;var wasHome=/^#?\/?(shop\/\d+)?$/.test(location.hash||'');api('/api/menu').then(function(m){if(!m.shops)return;MENU=m;index(m);if(wasHome&&!$('#sheet').classList.contains('on')){var y=window.scrollY;route();window.scrollTo(0,y)}else syncSteppers()})},15000);
paintBadges();loadMenu();

/* ---------- PWA ---------- */
var dp=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;$('#inst').style.display='inline-block'});
$('#inst').addEventListener('click',function(){if(dp){dp.prompt();dp=null;$('#inst').style.display='none'}});
if('serviceWorker' in navigator&&location.protocol!=='file:')window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
})();
