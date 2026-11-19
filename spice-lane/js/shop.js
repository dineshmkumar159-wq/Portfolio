(function(){
'use strict';
var $=UI.$,$$=UI.$$,h=UI.h,inr=UI.inr,api=UI.api,toast=UI.toast,fail=UI.fail;
var SHOP=null,tab='orders',poll=null,known={},sound=false,ac=null,first=true,items=[],mfilter='all';

UI.onAuthLost=function(){showLogin()};
function showLogin(){clearInterval(poll);$('#app').hidden=true;$('#login').hidden=false;
  UI.api('/api/shops').then(function(l){var s=$('#shopsel');s.innerHTML='';l.forEach(function(x){s.appendChild(h('option',{value:x.id,text:x.emoji+' '+x.name}))})}).catch(function(){});$('#pin').focus()}
$('#lf').addEventListener('submit',function(e){e.preventDefault();$('#lm').textContent='';
  api('/api/shop/login','POST',{shop:$('#shopsel').value,pin:$('#pin').value}).then(function(j){$('#pin').value='';start(j.shop)}).catch(function(x){$('#lm').textContent=x.message;$('#pin').value=''})});
$('#out').addEventListener('click',function(){api('/api/logout','POST',{}).then(function(){showLogin()})});
function start(s){SHOP=s;$('#login').hidden=true;$('#app').hidden=false;$('#snm').textContent=s.name;$('#semo').textContent=s.emoji;paintOpen(s.open);first=true;known={};go('orders')}
function paintOpen(o){$('#openchk').checked=o;$('#openlbl').textContent=o?'Open':'Closed'}
$('#openchk').addEventListener('change',function(){var o=this.checked;api('/api/shop/open','PUT',{open:o}).then(function(){paintOpen(o);toast(o?'You are open. Customers can order.':'You are closed. Customers cannot order from you.')}).catch(function(e){paintOpen(!o);fail(e)})});
$$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.tab)})});
function go(t){tab=t;$$('[data-tab]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.tab===t))});['orders','menu','today'].forEach(function(x){$('#tab-'+x).hidden=x!==t});clearInterval(poll);
  if(t==='orders'){loadOrders();poll=setInterval(loadOrders,5000)}else if(t==='menu'){loadMenu();poll=setInterval(function(){if(!document.activeElement||document.activeElement.tagName!=='INPUT')loadMenu(true)},20000)}else loadToday()}

/* sound */
$('#snd').addEventListener('click',function(){sound=!sound;this.setAttribute('aria-pressed',String(sound));this.textContent=sound?'🔔 Sound on':'🔔 Sound off';if(sound){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();beep()}catch(e){}}});
function beep(){if(!sound||!ac)return;try{[0,.18].forEach(function(t,i){var o=ac.createOscillator(),g=ac.createGain();o.frequency.value=i?880:660;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.2,ac.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+t+.15);o.start(ac.currentTime+t);o.stop(ac.currentTime+t+.16)})}catch(e){}}

/* orders */
var NEXTBTN={new:['preparing','Start cooking'],preparing:['ready','Mark ready'],ready:['collected','Handed over']};
function loadOrders(){api('/api/shop/orders').then(function(r){
  var t=r.tickets,fresh=[];t.forEach(function(x){if(!known[x.id]&&x.status==='new')fresh.push(x.id);known[x.id]=1});
  var nn=t.filter(function(x){return x.status==='new'}).length;$('#onew').textContent=nn;$('#onew').hidden=!nn;
  if(fresh.length&&!first){beep();if(navigator.vibrate)navigator.vibrate([300,120,300]);toast('🔔 New order!')}first=false;
  if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.cx'))return;
  var box=$('#tab-orders');box.innerHTML='';var cols=h('div',{class:'cols'});
  [['new','New orders'],['preparing','Cooking'],['ready','Ready for pickup']].forEach(function(c){var list=t.filter(function(x){return x.status===c[0]}),col=h('div',{class:'col'},[h('h2',{},[c[1],h('span',{class:'pill '+c[0],text:String(list.length)})])]);
    if(!list.length)col.appendChild(h('div',{class:'empty',text:c[0]==='new'?'No new orders. You will hear a beep when one arrives.':'Nothing here.'}));
    list.forEach(function(x){col.appendChild(ticket(x,fresh.indexOf(x.id)>-1))});cols.appendChild(col)});
  box.appendChild(cols);
  var done=t.filter(function(x){return x.status==='collected'||x.status==='cancelled'});
  if(done.length){var d=h('details',{style:'margin-top:18px'},[h('summary',{style:'cursor:pointer;font-weight:700;color:var(--mut)',text:'Finished in the last 6 hours ('+done.length+')'})]);var g=h('div',{class:'cols',style:'margin-top:10px'});done.forEach(function(x){g.appendChild(ticket(x,false))});d.appendChild(g);box.appendChild(d)}
}).catch(fail)}
function ticket(x,fresh){
  var el=h('div',{class:'tk '+x.status+(fresh?' fresh':'')},[h('h3',{},[h('span',{text:'#'+x.token}),h('span',{class:'pill '+x.status,text:x.status})]),
    h('div',{class:'who',text:x.name+' · '+(x.mode==='take'?'🥡 Takeaway':'🍽️ Table '+x.table)+' · '+UI.ago(x.created)}),
    h('ul',{},x.items.map(function(i){return h('li',{text:i.qty+' × '+i.name})})),x.note&&x.status==='cancelled'?h('div',{class:'who',text:'Reason: '+x.note}):null]);
  var nb=NEXTBTN[x.status];
  if(nb){var acts=h('div',{class:'acts'});acts.appendChild(h('button',{class:'btn'+(x.status==='ready'?' pink':''),type:'button',text:nb[1],onclick:function(){set(x.id,nb[0])}}));
    if(x.status!=='ready'||true)acts.appendChild(h('button',{class:'btn ghost',type:'button',text:'Cancel',onclick:function(){cancelBox(el,x)}}));el.appendChild(acts)}
  return el}
function cancelBox(el,x){if($('.cx',el))return;var inp=h('input',{placeholder:'Reason, e.g. Ran out of batter','aria-label':'Reason for cancelling',maxlength:'140'}),box=h('div',{class:'cx',style:'margin-top:10px'},[inp,h('div',{class:'acts',style:'margin-top:8px'},[h('button',{class:'btn red',type:'button',text:'Confirm cancel',onclick:function(){set(x.id,'cancelled',inp.value)}}),h('button',{class:'btn ghost',type:'button',text:'Keep order',onclick:function(){box.remove()}})])]);el.appendChild(box);inp.focus()}
function set(id,status,note){api('/api/shop/orders/'+id,'PATCH',{status:status,note:note}).then(function(){toast(status==='cancelled'?'Order cancelled. Stock returned.':'Updated. The customer sees it now.');loadOrders()}).catch(fail)}

/* menu + stock */
function loadMenu(quiet){api('/api/shop/menu').then(function(r){items=r;drawMenu()}).catch(function(e){if(!quiet)fail(e)})}
function drawMenu(){
  var box=$('#tab-menu');box.innerHTML='';
  var out=items.filter(function(i){return i.status==='out'}).length,low=items.filter(function(i){return i.status==='low'}).length;
  box.appendChild(h('p',{style:'color:var(--mut);margin:0 0 10px',text:'Changes go live for customers the moment you make them. Leave stock empty if you do not count a dish.'}));
  box.appendChild(h('div',{class:'bar'},[h('div',{},[h('div',{class:'seg',role:'group','aria-label':'Filter dishes'},[['all','All ('+items.length+')'],['out','Sold out ('+out+')'],['low','Low ('+low+')']].map(function(f){return h('button',{type:'button','aria-pressed':String(mfilter===f[0]),text:f[1],onclick:function(){mfilter=f[0];drawMenu()}})}))]),h('button',{class:'btn pink',type:'button',text:'+ Add a dish',onclick:function(){var f=$('#addf');f.hidden=!f.hidden;if(!f.hidden)$('#a_name').focus()}})]));
  box.appendChild(addForm());
  var rows=items.filter(function(i){return mfilter==='all'||i.status===mfilter});
  if(!rows.length){box.appendChild(h('div',{class:'empty',text:mfilter==='all'?'No dishes yet. Add your first one.':'Nothing in this list.'}));return}
  var tb=h('tbody');rows.forEach(function(i){tb.appendChild(row(i))});
  box.appendChild(h('div',{class:'tw'},[h('table',{},[h('thead',{},[h('tr',{},['Dish','Price ₹','Stock','Status','Available',''].map(function(x){return h('th',{text:x})}))]),tb])]))}
function addForm(){
  var f=h('form',{id:'addf',class:'card form',hidden:true,style:'margin-bottom:14px',novalidate:true},[
    h('div',{},[h('label',{for:'a_name',text:'Dish name'}),h('input',{id:'a_name',maxlength:'50'})]),h('div',{},[h('label',{for:'a_price',text:'Price ₹'}),h('input',{id:'a_price',type:'number',min:'1',max:'5000'})]),
    h('div',{},[h('label',{for:'a_cat',text:'Category'}),h('input',{id:'a_cat',placeholder:'e.g. Snacks',maxlength:'24'})]),h('div',{},[h('label',{for:'a_stock',text:'Stock (empty = not counted)'}),h('input',{id:'a_stock',type:'number',min:'0'})]),
    h('div',{},[h('label',{for:'a_emoji',text:'Emoji'}),h('input',{id:'a_emoji',maxlength:'4',value:'🍽️'})]),h('div',{},[h('label',{for:'a_veg',text:'Type'}),h('select',{id:'a_veg'},[h('option',{value:'1',text:'Vegetarian'}),h('option',{value:'0',text:'Non-vegetarian'})])]),
    h('div',{class:'full'},[h('label',{for:'a_desc',text:'Short description'}),h('input',{id:'a_desc',maxlength:'90'})]),
    h('div',{class:'full'},[h('button',{class:'btn',type:'submit',text:'Add to menu'})])]);
  f.addEventListener('submit',function(e){e.preventDefault();var st=$('#a_stock').value;
    api('/api/shop/items','POST',{name:$('#a_name').value,price:$('#a_price').value,cat:$('#a_cat').value,emoji:$('#a_emoji').value,veg:$('#a_veg').value==='1',desc:$('#a_desc').value,stock:st===''?null:st}).then(function(){toast('Dish added. It is live now.');loadMenu()}).catch(fail)});
  return f}
function row(i){
  var tr=h('tr',{});
  function save(patch,msg){api('/api/shop/items/'+i.id,'PATCH',patch).then(function(r){Object.assign(i,r.item);toast(msg||'Saved. Live for customers.');drawMenu()}).catch(function(e){fail(e);loadMenu()})}
  var price=h('input',{type:'number',min:'1',max:'5000',value:String(i.price),'aria-label':'Price of '+i.name});price.addEventListener('change',function(){save({price:price.value})});
  var stk=h('input',{type:'number',min:'0',max:'9999',value:i.stock===null?'':String(i.stock),placeholder:'∞','aria-label':'Stock of '+i.name});stk.addEventListener('change',function(){save({stock:stk.value===''?null:stk.value})});
  var minus=h('button',{type:'button','aria-label':'Decrease stock of '+i.name,text:'−',onclick:function(){if(i.stock!==null&&i.stock>0)save({stock:i.stock-1})}}),plus=h('button',{type:'button','aria-label':'Increase stock of '+i.name,text:'+',onclick:function(){save({stock:(i.stock||0)+1})}});
  var on=h('input',{type:'checkbox','aria-label':i.name+' available'});on.checked=i.status!=='out';
  on.addEventListener('change',function(){if(on.checked){if(i.stock===0)save({available:true,stock:10},'Back in stock. Stock set to 10, change it if needed.');else save({available:true},i.name+' is back on the menu.')}else save({available:false},i.name+' marked sold out.')});
  tr.appendChild(h('td',{},[h('span',{text:i.emoji+' '}),h('b',{text:i.name}),h('div',{style:'color:var(--mut);font-size:.8rem',text:i.cat})]));
  tr.appendChild(h('td',{},[price]));tr.appendChild(h('td',{},[h('div',{class:'stk'},[minus,stk,plus])]));
  tr.appendChild(h('td',{},[h('span',{class:'pill '+i.status,text:{out:'Sold out',low:'Low',ok:'In stock',open:'Open'}[i.status]})]));
  tr.appendChild(h('td',{},[h('label',{class:'sw',style:'margin:0'},[on,h('span')])]));
  tr.appendChild(h('td',{},[h('button',{class:'btn ghost sm',type:'button','aria-label':'Delete '+i.name,text:'Delete',onclick:function(){if(confirm('Remove '+i.name+' from the menu?'))api('/api/shop/items/'+i.id,'DELETE').then(function(){toast('Removed.');loadMenu()}).catch(fail)}})]));
  return tr}

/* today */
function loadToday(){api('/api/shop/stats').then(function(s){var b=$('#tab-today');b.innerHTML='';b.appendChild(h('div',{class:'tiles'},[h('div',{class:'tile'},[h('b',{text:inr(s.revenue)}),h('span',{text:'Sales today'})]),h('div',{class:'tile'},[h('b',{text:String(s.orders)}),h('span',{text:'Orders today'})]),h('div',{class:'tile'},[h('b',{text:s.orders?inr(s.revenue/s.orders):'₹0'}),h('span',{text:'Average order'})])]));
  b.appendChild(h('p',{style:'color:var(--mut)',text:'Cancelled orders are not counted. For weekly and monthly numbers, ask the owner.'}))}).catch(fail)}

UI.pwa();
api('/api/shop/me').then(function(s){start(s)}).catch(function(){showLogin()});
})();
