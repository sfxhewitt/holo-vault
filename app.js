'use strict';
const API='https://api.tcgdex.net/v2/en',FXAPI='https://api.frankfurter.dev/v1/latest?base=EUR&symbols=GBP,USD';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='holovault:v1';
let S=load();function load(){try{return Object.assign(base(),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return base()}}
function base(){return{items:[],wish:[],snaps:[],fx:null,packs:{opened:0,best:null,pulls:0},lastRefresh:0}}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
const gbp=v=>v==null||isNaN(v)?'—':'£'+(v>=1000?v.toLocaleString('en-GB',{maximumFractionDigits:0}):v.toFixed(2));
const img=(u,q='low')=>u?u+'/'+q+'.webp':'';
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(t._);t._=setTimeout(()=>t.classList.remove('on'),2200)};
const POCKET=/^(?:[AB]\d+[a-z]?|P-A)(?:-|$)/;const mem={};let act=0;const q=[];const slot=()=>new Promise(r=>{if(act<6){act++;r()}else q.push(r)}),rel=()=>{const n=q.shift();n?n():act--};
async function j(path){if(mem[path])return mem[path];for(let t=0;;t++){await slot();try{const r=await fetch(path.startsWith('http')?path:API+path);if(!r.ok)throw new Error(r.status);const d=await r.json();mem[path]=d;return d}catch(e){if(t>=2)throw e}finally{rel()}await new Promise(r=>setTimeout(r,500*(t+1)))}}
async function fx(){try{const d=await j(FXAPI);S.fx={eur:d.rates.GBP,usd:d.rates.GBP/d.rates.USD,date:d.date};save()}catch(e){}$('#fx').textContent=S.fx?`€1 = £${S.fx.eur.toFixed(3)}`:'FX OFFLINE'}
const FXE=()=>S.fx?.eur??null,FXU=()=>S.fx?.usd??null;
/* ---- pricing (real API data only) ---- */
function variants(c){const p=c.pricing||{},o=[];const v=c.variants||{};if(v.normal)o.push('normal');if(v.holo)o.push('holo');if(v.reverse)o.push('reverse');if(v.firstEdition)o.push('1st edition');if(!o.length)o.push('normal');return o}
function priceOf(c,variant){const p=c.pricing||{},cm=p.cardmarket,tp=p.tcgplayer;const hol=variant&&variant!=='normal';
 if(cm){const pick=k=>(hol&&cm[k+'-holo']!=null?cm[k+'-holo']:cm[k]);const t=pick('trend')??pick('avg');if(t!=null&&FXE())return{src:'Cardmarket',ccy:'EUR',raw:t,gbp:t*FXE(),avg30:pick('avg30')*FXE(),avg7:pick('avg7')*FXE(),avg1:pick('avg1')*FXE(),low:pick('low')*FXE(),updated:cm.updated}}
 if(tp&&FXU()){const k=variant==='reverse'?'reverse-holofoil':variant==='holo'?'holofoil':variant==='1st edition'?'1stEditionHolofoil':'normal';const e=tp[k]||Object.values(tp).find(x=>x&&typeof x==='object');if(e&&e.marketPrice!=null)return{src:'TCGplayer',ccy:'USD',raw:e.marketPrice,gbp:e.marketPrice*FXU(),low:e.lowPrice*FXU(),updated:tp.updated}}
 return null}
const RANK=r=>{r=(r||'').toLowerCase();if(/hyper|special illustration|secret|gold|ultra|crown/.test(r))return 5;if(/illustration|double|vmax|vstar|ex|gx|amazing|radiant|shiny|ace/.test(r))return 4;if(/holo|rare/.test(r))return 3;if(/uncommon/.test(r))return 2;return 1};
const vtxt=i=>i.p?gbp(itemVal(i)):'n/a';const itemVal=i=>(i.p?.gbp||0)*(i.qty||1);
const total=()=>S.items.reduce((a,i)=>a+itemVal(i),0);
function snapshot(){const d=new Date().toISOString().slice(0,10),v=+total().toFixed(2);const l=S.snaps[S.snaps.length-1];if(l&&l.d===d)l.v=v;else S.snaps.push({d,v});S.snaps=S.snaps.slice(-365);save()}
async function refresh(force){if(!S.items.length&&!S.wish.length)return;if(!force&&Date.now()-S.lastRefresh<6*36e5)return;
 const ids=[...new Set([...S.items,...S.wish].map(i=>i.id))];let n=0;
 await Promise.all(ids.map(async id=>{try{const c=await j('/cards/'+id);for(const i of S.items.filter(x=>x.id===id))i.p=priceOf(c,i.variant);for(const w of S.wish.filter(x=>x.id===id))w.p=priceOf(c,'normal');n++}catch(e){}}));
 S.lastRefresh=Date.now();snapshot();save();if(force)toast(`⚡ ${n} prices refreshed`);if(cur==='dash'||cur==='vault')go(cur)}
/* ---- charts (SVG) ---- */
function line(pts,labels,h=130){if(pts.length<2)return'';const W=320,H=h,mn=Math.min(...pts),mx=Math.max(...pts),r=mx-mn||1;const X=i=>30+i*(W-60)/(pts.length-1),Y=v=>H-22-(v-mn)/r*(H-40);
 const d=pts.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
 return`<svg viewBox="0 0 ${W} ${H}" width="100%"><defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#00f0ff"/><stop offset="1" stop-color="#ff2bd6"/></linearGradient><linearGradient id="fa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00f0ff55"/><stop offset="1" stop-color="#00f0ff00"/></linearGradient></defs>
 ${[0,1,2,3].map(k=>`<line x1="30" x2="${W-30}" y1="${18+k*(H-40)/3}" y2="${18+k*(H-40)/3}" stroke="#2a266080" stroke-dasharray="2 4"/>`).join('')}
 <path d="${d} L${X(pts.length-1)} ${H-22} L30 ${H-22}Z" fill="url(#fa)"/><path d="${d}" fill="none" stroke="url(#lg)" stroke-width="3" stroke-linecap="round" style="filter:drop-shadow(0 0 6px #00f0ff)"/>
 ${pts.map((v,i)=>`<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="#05040f" stroke="#00f0ff" stroke-width="2"/>`).join('')}
 ${labels.map((l,i)=>`<text x="${X(i)}" y="${H-4}" fill="#8a86b8" font-size="10" text-anchor="middle">${esc(l)}</text>`).join('')}</svg>`}
function donut(parts){const t=parts.reduce((a,p)=>a+p.v,0)||1,R=52,C=2*Math.PI*R;let o=0;const cols=['#00f0ff','#b14dff','#ff2bd6','#ffe14d','#3dffa0','#ff8a3d'];
 return`<div class="row" style="align-items:center"><svg viewBox="0 0 140 140" style="max-width:130px;flex:none">${parts.map((p,i)=>{const l=p.v/t*C,s=`<circle cx="70" cy="70" r="${R}" fill="none" stroke="${cols[i%6]}" stroke-width="18" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-o}" transform="rotate(-90 70 70)" style="filter:drop-shadow(0 0 4px ${cols[i%6]})"/>`;o+=l;return s}).join('')}<text x="70" y="68" text-anchor="middle" fill="#e8e6ff" font-size="20" font-weight="800">${parts.reduce((a,p)=>a+p.v,0)}</text><text x="70" y="86" text-anchor="middle" fill="#8a86b8" font-size="9">CARDS</text></svg>
 <div style="font-size:12px">${parts.map((p,i)=>`<div class="row" style="gap:6px;margin:3px 0"><i style="flex:none;width:10px;height:10px;border-radius:3px;background:${cols[i%6]}"></i><span style="flex:3">${esc(p.k)}</span><b class="mono" style="flex:1;text-align:right">${p.v}</b></div>`).join('')}</div></div>`}
/* ---- views ---- */
let cur='dash';const V={};
function go(v){cur=v;$$('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));V[v]($('#view'));scrollTo(0,0)}
$$('nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
function tile(c,extra=''){const im=c.image?`<img loading="lazy" src="${img(c.image)}" alt="${esc(c.name)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',textContent:'${esc(c.name).replace(/'/g,'')}'}))">`:`<div class="ph">${esc(c.name)}<br>no image</div>`;return`<div class="ci" data-id="${esc(c.id)}">${im}${extra}</div>`}
function bindTiles(r){$$('.ci[data-id]',r).forEach(e=>e.onclick=()=>openCard(e.dataset.id,e.dataset.uid))}
V.dash=r=>{const t=total(),n=S.items.reduce((a,i)=>a+(+i.qty||1),0);
 if(!S.items.length){r.innerHTML=`<div class="panel" style="text-align:center;padding:26px 16px"><div class="lbl" style="justify-content:center">Vault status</div><div class="big">£0.00</div><p class="sub">Your vault is empty, trainer. Scan the database, rip some packs, and start building the portfolio.</p><button class="btn" onclick="go('search')">⌕ Find your first card</button></div>${chase()}`;loadChase();return}
 const cm=S.items.filter(i=>i.p?.avg30);const a30=cm.reduce((a,i)=>a+i.p.avg30*(i.qty||1),0),a7=cm.reduce((a,i)=>a+i.p.avg7*(i.qty||1),0),a1=cm.reduce((a,i)=>a+i.p.avg1*(i.qty||1),0),now=cm.reduce((a,i)=>a+itemVal(i),0);
 const ch=a30?(now-a30)/a30*100:null,paid=S.items.reduce((a,i)=>a+(+i.paid||0)*(i.qty||1),0);
 const rar={};S.items.forEach(i=>{const k=i.rarity||'Unknown';rar[k]=(rar[k]||0)+(+i.qty||1)});
 const top=[...S.items].sort((a,b)=>itemVal(b)-itemVal(a)).slice(0,5);
 const mov=S.items.filter(i=>i.p?.avg30>0).map(i=>({i,c:(i.p.gbp-i.p.avg30)/i.p.avg30*100})).sort((a,b)=>Math.abs(b.c)-Math.abs(a.c)).slice(0,4);
 const sn=S.snaps.slice(-14);
 r.innerHTML=`<div class="ticker"><div>${S.items.map(i=>`<b>${esc(i.name)}</b>${gbp(i.p?.gbp)}  ·  `).join('')}</div></div>
 <div class="panel"><div class="lbl"><span>Portfolio value · GBP</span><span>${S.fx?'FX '+S.fx.date:''}</span></div><div class="big" id="tv">${gbp(t)}</div>
 <div class="sub">${ch!=null?`<span class="${ch>=0?'up':'dn'}">${ch>=0?'▲':'▼'} ${Math.abs(ch).toFixed(1)}%</span> vs 30-day market avg · `:''}${n} cards${paid?` · P/L <span class="${t-paid>=0?'up':'dn'}">${gbp(t-paid)}</span>`:''}</div>
 ${a30?line([a30,a7,a1,now],['30D AVG','7D AVG','1D AVG','TREND']):''}</div>
 ${sn.length>1?`<div class="panel"><div class="lbl">Vault history · your daily snapshots</div>${line(sn.map(s=>s.v),sn.map(s=>s.d.slice(5)),110)}</div>`:''}
 <div class="grid2"><div class="panel"><div class="lbl">Unique</div><div class="k">${S.items.length}</div><div class="sub">entries</div></div><div class="panel"><div class="lbl">Graded</div><div class="k">${S.items.filter(i=>i.grader&&i.grader!=='Raw').length}</div><div class="sub">slabs</div></div>
 <div class="panel"><div class="lbl">Sets</div><div class="k">${new Set(S.items.map(i=>i.set?.id)).size}</div><div class="sub">in progress</div></div><div class="panel"><div class="lbl">Wishlist</div><div class="k">${S.wish.length}</div><div class="sub">${gbp(S.wish.reduce((a,w)=>a+(w.p?.gbp||0),0))} to buy</div></div></div>
 <div class="panel"><div class="lbl">Top hits</div><div class="list">${top.map(i=>`<div class="it ci2" data-uid="${i.uid}" data-id="${esc(i.id)}"><img src="${img(i.image)}"><div class="n"><b>${esc(i.name)}</b><span class="sub">${esc(i.set?.name)} · ${esc(i.variant)} ${i.grader&&i.grader!=='Raw'?`<span class="grade">${esc(i.grader)} ${esc(i.grade)}</span>`:''}</span></div><b class="mono">${vtxt(i)}</b></div>`).join('')}</div></div>
 ${mov.length?`<div class="panel"><div class="lbl">Movers · trend vs 30D</div><div class="list">${mov.map(({i,c})=>`<div class="it"><img src="${img(i.image)}"><div class="n"><b>${esc(i.name)}</b><span class="sub">${gbp(i.p.avg30)} → ${gbp(i.p.gbp)}</span></div><b class="mono ${c>=0?'up':'dn'}">${c>=0?'+':''}${c.toFixed(1)}%</b></div>`).join('')}</div></div>`:''}
 <div class="panel"><div class="lbl">Rarity mix</div>${donut(Object.entries(rar).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>({k,v})))}</div>`;
 $$('.ci2',r).forEach(e=>e.onclick=()=>openCard(e.dataset.id,e.dataset.uid));countUp($('#tv'),t)};
function countUp(el,to){if(!el)return;const s=performance.now();const f=n=>{const p=Math.min(1,(n-s)/900);el.textContent=gbp(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
const CHASE=['Charizard','Umbreon','Pikachu','Mew','Rayquaza','Gengar','Lugia','Eevee','Mewtwo','Greninja'];
const chase=()=>`<h2>Quick scan</h2><div class="seg">${CHASE.map(c=>`<button onclick="go('search');setTimeout(()=>doSearch('${c}'),0)">${c}</button>`).join('')}</div><h2>Latest set</h2><div id="latest"><div class="spin"></div></div>`;
async function loadChase(){try{const sets=await j('/sets');const s=sets.filter(x=>x.logo&&!POCKET.test(x.id)&&x.cardCount?.official>50).pop();const d=await j('/sets/'+s.id);const el=$('#latest');if(!el)return;el.innerHTML=`<div class="panel"><img src="${s.logo}.webp" style="max-height:60px;max-width:70%" onerror="this.remove()"><div class="sub">${esc(d.name)} · ${d.cardCount.total} cards · ${esc(d.releaseDate||'')}</div></div><div class="cards">${d.cards.filter(c=>c.image).slice(-12).reverse().map(c=>tile(c)).join('')}</div>`;bindTiles(el)}catch(e){const el=$('#latest');if(el)el.innerHTML='<div class="empty">Offline — connect to load the latest set.</div>'}}
let lastQ='';
V.search=r=>{r.innerHTML=`<div class="panel"><div class="lbl">Card database · TCGdex</div><form id="sf" class="row"><input id="q" placeholder="Search e.g. Charizard, Umbreon VMAX" value="${esc(lastQ)}" autocomplete="off" enterkeyhint="search"><button class="btn" style="flex:none">GO</button></form></div><div class="seg">${CHASE.map(c=>`<button data-c="${c}">${c}</button>`).join('')}</div><div id="res" style="margin-top:12px"></div>`;
 $('#sf').onsubmit=e=>{e.preventDefault();doSearch($('#q').value)};$$('.seg button',r).forEach(b=>b.onclick=()=>doSearch(b.dataset.c));if(lastQ)doSearch(lastQ)};
async function doSearch(q){q=q.trim();if(!q)return;lastQ=q;const q2=$('#q');if(q2)q2.value=q;const res=$('#res');res.innerHTML='<div class="spin"></div>';
 try{const d=await j('/cards?name='+encodeURIComponent(q));const c=d.filter(x=>x.image&&!POCKET.test(x.id)).reverse();res.innerHTML=c.length?`<div class="lbl"><span>${c.length} results</span><span>newest first</span></div><div class="cards">${c.slice(0,120).map(x=>tile(x,owned(x.id))).join('')}</div>`:'<div class="empty"><div class="e">∅</div>No cards found.</div>';bindTiles(res)}catch(e){res.innerHTML='<div class="empty"><div class="e">⚠</div>Search failed — are you offline?</div>'}}
const owned=id=>{const n=S.items.filter(i=>i.id===id).reduce((a,i)=>a+(+i.qty||1),0);return n?`<span class="q">×${n}</span>`:''};
let vseg='cards',vsort='value';
V.vault=r=>{r.innerHTML=`<div class="seg" style="margin-bottom:10px">${[['cards','▣ Cards'],['sets','◔ Sets'],['wish','♥ Wishlist']].map(([k,l])=>`<button data-s="${k}" class="${vseg===k?'on':''}">${l}</button>`).join('')}</div><div id="vb"></div>`;$$('[data-s]',r).forEach(b=>b.onclick=()=>{vseg=b.dataset.s;V.vault(r)});
 const vb=$('#vb');
 if(vseg==='cards'){if(!S.items.length){vb.innerHTML=`<div class="empty"><div class="e">▣</div>No cards yet.<br><br><button class="btn" onclick="go('search')">Add cards</button></div>`;return}
  const so={value:(a,b)=>itemVal(b)-itemVal(a),new:(a,b)=>b.added-a.added,name:(a,b)=>a.name.localeCompare(b.name),set:(a,b)=>(a.set?.name||'').localeCompare(b.set?.name||'')};
  vb.innerHTML=`<div class="row" style="margin-bottom:10px"><input id="vf" placeholder="Filter vault…"><select id="vs" style="flex:none;width:120px">${Object.keys(so).map(k=>`<option ${k===vsort?'selected':''}>${k}</option>`).join('')}</select></div><div class="lbl"><span>${S.items.length} entries</span><span>${gbp(total())}</span></div><div class="cards" id="vc"></div>`;
  const draw=()=>{const f=$('#vf').value.toLowerCase();$('#vc').innerHTML=[...S.items].sort(so[vsort]).filter(i=>!f||(i.name+' '+i.set?.name).toLowerCase().includes(f)).map(i=>tile(i,`${i.qty>1?`<span class="q">×${i.qty}</span>`:''}<div class="tag"><span>${i.grader&&i.grader!=='Raw'?esc(i.grader+' '+i.grade):esc(i.condition)}</span><span>${vtxt(i)}</span></div>`).replace('class="ci"',`class="ci" data-uid="${i.uid}"`)).join('');bindTiles($('#vc'))};
  $('#vf').oninput=draw;$('#vs').onchange=e=>{vsort=e.target.value;draw()};draw()}
 if(vseg==='sets'){const ids=[...new Set(S.items.map(i=>i.set?.id).filter(Boolean))];if(!ids.length){vb.innerHTML='<div class="empty"><div class="e">◔</div>Add cards to track set completion.</div>';return}
  vb.innerHTML=ids.map(id=>`<div class="panel" id="set-${esc(id)}"><div class="spin"></div></div>`).join('');
  ids.forEach(async id=>{const el=document.getElementById('set-'+id);try{const s=await j('/sets/'+id);const have=new Set(S.items.filter(i=>i.set?.id===id).map(i=>i.id));const tot=s.cardCount.official||s.cardCount.total,ho=Math.min(tot,s.cards.filter(c=>have.has(c.id)).length),pct=Math.min(100,ho/tot*100);
   el.innerHTML=`<div class="row"><div style="flex:3"><div class="lbl">${esc(s.serie?.name||'')}</div><b>${esc(s.name)}</b></div>${s.logo?`<img src="${s.logo}.webp" style="max-width:90px;max-height:40px;object-fit:contain">`:''}</div><div class="row" style="margin:8px 0 6px"><div class="bar"><i style="width:0" data-w="${pct}"></i></div><b class="mono" style="flex:none">${ho}/${tot}</b></div><div class="sub">${pct.toFixed(1)}% complete · ${gbp(S.items.filter(i=>i.set?.id===id).reduce((a,i)=>a+itemVal(i),0))} held · tap to view missing</div>`;
   requestAnimationFrame(()=>setTimeout(()=>el.querySelector('.bar i').style.width=pct+'%',50));el.onclick=()=>setView(s,have)}catch(e){el.innerHTML='<div class="sub">Set '+esc(id)+' unavailable offline</div>'}})}
 if(vseg==='wish'){if(!S.wish.length){vb.innerHTML='<div class="empty"><div class="e">♥</div>Wishlist is empty. Tap ♥ on any card.</div>';return}
  vb.innerHTML=`<div class="panel"><div class="lbl">Wishlist cost · market</div><div class="big" style="font-size:30px">${gbp(S.wish.reduce((a,w)=>a+(w.p?.gbp||0),0))}</div></div><div class="cards">${S.wish.map(w=>tile(w,`<div class="tag"><span>♥</span><span>${w.p?gbp(w.p.gbp):'n/a'}</span></div>`)).join('')}</div>`;bindTiles(vb)}};
function setView(s,have){modal(`<h2>${esc(s.name)}</h2><div class="sub" style="margin-bottom:10px">Owned cards glow; greyed are missing.</div><div class="cards">${s.cards.map(c=>tile(c,have.has(c.id)?'<span class="q">✓</span>':'').replace('class="ci"',`class="ci" style="${have.has(c.id)?'box-shadow:0 0 12px #00f0ff;border-color:#00f0ff':'opacity:.35;filter:grayscale(1)'}"`)).join('')}</div>`);bindTiles($('#modal'))}
/* ---- modal + card detail ---- */
function modal(h){const m=$('#modal');m.innerHTML='<button class="x" onclick="closeM()">✕</button>'+h;m.hidden=false;m.scrollTop=0;document.body.style.overflow='hidden'}
function closeM(){const m=$('#modal');m.hidden=true;m.innerHTML='';document.body.style.overflow='';if(cur!=='packs')go(cur)}
/* ---- Pokédex entry (PokeAPI, keyless) ---- */
async function dex(c){const n=c.dexId?.[0];if(!n)return;try{const d=await j('https://pokeapi.co/api/v2/pokemon-species/'+n),el=$('#dex');if(!el)return;
 const f=(d.flavor_text_entries||[]).filter(x=>x.language.name==='en').pop(),g=(d.genera||[]).find(x=>x.language.name==='en');
 el.innerHTML=`<div class="lbl"><span>Pokédex · #${String(n).padStart(4,'0')}</span><span>${esc(g?.genus||'')}</span></div>${f?`<div class="sub" style="font-size:13px;line-height:1.5">${esc(f.flavor_text.replace(/[\f\n\u00ad]+/g,' '))}</div>`:''}<div class="kv" style="margin-top:8px"><div><span class="sub">Gen</span><b>${esc((d.generation?.name||'').replace('generation-','').toUpperCase())}</b></div><div><span class="sub">Habitat</span><b>${esc(d.habitat?.name||'—')}</b></div>${d.is_legendary?'<div><span class="sub">Class</span><b>Legendary</b></div>':d.is_mythical?'<div><span class="sub">Class</span><b>Mythical</b></div>':''}</div>`;el.style.display=''}catch(e){}}
async function openCard(id,uid){modal('<div class="spin" style="margin-top:40vh"></div>');let c;try{c=await j('/cards/'+id)}catch(e){modal('<div class="empty"><div class="e">⚠</div>Card data unavailable offline.</div>');return}
 const ex=uid?S.items.find(i=>i.uid===uid):null,vs=variants(c),pv=priceOf(c,ex?.variant||vs[0]),inW=S.wish.some(w=>w.id===id);
 const cm=c.pricing?.cardmarket,tp=c.pricing?.tcgplayer;
 modal(`<div class="stage"><div class="holo auto" id="holo"><img src="${img(c.image,'high')}" alt="${esc(c.name)}" crossorigin="anonymous" onerror="this.src='${img(c.image)}'"><div class="sh"></div><div class="gl"></div></div></div>
 <div class="sub mono" style="text-align:center;margin:-6px 0 12px">DRAG TO TILT · <a href="#" id="gyro" style="color:var(--c)">ENABLE GYRO</a></div>
 <div class="panel"><div class="lbl"><span>${esc(c.set?.name)} · #${esc(c.localId)}/${esc(c.set?.cardCount?.official)}</span><span>${esc(c.rarity||'')}</span></div><div class="row"><b style="font-size:22px;flex:3">${esc(c.name)}</b><button class="btn ${inW?'m':'g'}" id="wb" style="flex:none">${inW?'♥':'♡'}</button></div>
 <div class="big" style="font-size:34px;margin-top:6px" id="pv">${pv?gbp(pv.gbp):'No price'}</div><div class="sub" id="ps">${pv?`${pv.src} ${pv.ccy==='EUR'?'€':'$'}${pv.raw.toFixed(2)} · updated ${new Date(pv.updated).toLocaleDateString('en-GB')}`:'No market data returned for this card'}</div>
 ${pv?.avg30?line([pv.avg30,pv.avg7,pv.avg1,pv.gbp],['30D','7D','1D','TREND'],110):''}
 <div class="kv" style="margin-top:8px">${cm?`<div><span class="sub">CM low</span><b>${gbp(cm.low*FXE())}</b></div><div><span class="sub">CM avg</span><b>${gbp(cm.avg*FXE())}</b></div>`:''}${tp?Object.entries(tp).filter(([k,v])=>v&&v.marketPrice!=null).slice(0,4).map(([k,v])=>`<div><span class="sub">TCGP ${esc(k)}</span><b>${gbp(v.marketPrice*FXU())}</b></div>`).join(''):''}${c.hp?`<div><span class="sub">HP</span><b>${esc(c.hp)}</b></div>`:''}${c.illustrator?`<div><span class="sub">Artist</span><b style="font-size:12px">${esc(c.illustrator)}</b></div>`:''}</div></div>
 <div class="panel"><div class="lbl">${ex?'Edit vault entry':'Add to vault'}</div>
 <div class="grid2" style="gap:8px"><label class="f"><span>Variant</span><select id="fv">${vs.map(v=>`<option ${ex?.variant===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="f"><span>Qty</span><input id="fq" type="number" min="1" value="${ex?.qty||1}" inputmode="numeric"></label>
 <label class="f"><span>Condition</span><select id="fc">${['Mint','Near Mint','Lightly Played','Moderately Played','Heavily Played','Damaged'].map(v=>`<option ${(ex?.condition||'Near Mint')===v?'selected':''}>${v}</option>`).join('')}</select></label>
 <label class="f"><span>Grader</span><select id="fg">${['Raw','PSA','ACE','CGC','BGS','TAG'].map(v=>`<option ${ex?.grader===v?'selected':''}>${v}</option>`).join('')}</select></label>
 <label class="f"><span>Grade</span><select id="fgr">${['—','10','9.5','9','8.5','8','7','6','5','4','3','2','1'].map(v=>`<option ${ex?.grade===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="f"><span>Paid £ (each)</span><input id="fp" type="number" step="0.01" inputmode="decimal" value="${ex?.paid??''}" placeholder="optional"></label></div>
 <div class="sub" style="margin-bottom:10px">Value uses the real raw-card market price for the chosen variant. Graded premiums aren't in the API, so track what you paid.</div>
 <div class="row"><button class="btn" id="add">${ex?'Save':'+ Add to vault'}</button>${ex?'<button class="btn g" id="del" style="flex:none">Remove</button>':''}</div></div>
 <div class="row" style="margin-bottom:12px"><a class="btn g" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://www.totalcards.net/search?q=${encodeURIComponent(c.name)}">Total Cards ↗</a><a class="btn g" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://acegrading.com/">ACE Grading ↗</a><a class="btn g" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" href="https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(c.name+' '+(c.localId||'')+' '+(c.set?.name||''))}&LH_Sold=1&LH_Complete=1">eBay sold ↗</a></div>
 ${c.attacks?.length?`<div class="panel"><div class="lbl">Attacks</div>${c.attacks.map(a=>`<div style="margin:6px 0"><b>${esc(a.name)}</b> <span class="mono" style="color:var(--y)">${esc(a.damage||'')}</span><div class="sub">${esc(a.effect||'')}</div></div>`).join('')}</div>`:''}${c.dexId?.length?'<div class="panel" id="dex" style="display:none"></div>':''}`);
 tilt($('#holo'));dex(c);
 $('#fv').onchange=e=>{const p=priceOf(c,e.target.value);$('#pv').textContent=p?gbp(p.gbp):'No price'};
 $('#gyro').onclick=async e=>{e.preventDefault();try{if(window.DeviceOrientationEvent?.requestPermission)await DeviceOrientationEvent.requestPermission();addEventListener('deviceorientation',gy);toast('Gyro on — tilt your phone')}catch(_){toast('Gyro unavailable')}};
 $('#wb').onclick=()=>{const i=S.wish.findIndex(w=>w.id===id);if(i>=0){S.wish.splice(i,1);toast('Removed from wishlist')}else{S.wish.push({id,name:c.name,image:c.image,set:{id:c.set.id,name:c.set.name},p:priceOf(c,'normal')});toast('♥ Added to wishlist')}save();const w=$('#wb');const on=i<0;w.textContent=on?'♥':'♡';w.className='btn '+(on?'m':'g')};
 $('#add').onclick=e=>{const v=$('#fv').value,o={id,name:c.name,image:c.image,rarity:c.rarity,set:{id:c.set.id,name:c.set.name},variant:v,qty:Math.max(1,+$('#fq').value||1),condition:$('#fc').value,grader:$('#fg').value,grade:$('#fgr').value,paid:$('#fp').value===''?null:+$('#fp').value,p:priceOf(c,v)};
  if(ex)Object.assign(ex,o);else{S.items.push({uid:Date.now().toString(36)+Math.random().toString(36).slice(2,6),added:Date.now(),...o});const wi=S.wish.findIndex(w=>w.id===id);if(wi>=0)S.wish.splice(wi,1)}snapshot();burst(e.clientX||innerWidth/2,e.clientY||innerHeight/2);toast(ex?'✓ Saved':'✦ Vaulted '+c.name);ex?closeM():setTimeout(closeM,600)};
 if(ex)$('#del').onclick=()=>{if(!confirm('Remove from vault?'))return;S.items=S.items.filter(i=>i.uid!==uid);snapshot();toast('Removed');closeM()}}
let gyEl=null;function gy(e){if(!gyEl||!document.body.contains(gyEl))return;const x=Math.max(-25,Math.min(25,e.gamma||0)),y=Math.max(-25,Math.min(25,(e.beta||0)-45));setT(gyEl,x/25,y/25)}
function setT(el,nx,ny){el.classList.remove('auto');el.style.setProperty('--ry',nx*18+'deg');el.style.setProperty('--rx',-ny*18+'deg');el.style.setProperty('--mx',50+nx*50+'%');el.style.setProperty('--my',50+ny*50+'%')}
function tilt(el){gyEl=el;const mv=e=>{const r=el.getBoundingClientRect(),p=e.touches?e.touches[0]:e;setT(el,((p.clientX-r.left)/r.width-.5)*2,((p.clientY-r.top)/r.height-.5)*2)};
 const st=el.parentElement;st.addEventListener('pointermove',mv);st.addEventListener('touchmove',e=>{e.preventDefault();mv(e)},{passive:false});st.addEventListener('pointerleave',()=>{el.style.cssText='';el.classList.add('auto')})}
function burst(x,y,n=24,cols=['#00f0ff','#ff2bd6','#ffe14d','#b14dff']){for(let i=0;i<n;i++){const s=document.createElement('i');s.className='sp';const a=Math.random()*6.28,d=60+Math.random()*120;s.style.cssText=`left:${x}px;top:${y}px;background:${cols[i%cols.length]};box-shadow:0 0 8px ${cols[i%cols.length]};--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d}px`;document.body.appendChild(s);setTimeout(()=>s.remove(),1000)}}
/* ---- pack simulator ---- */
let packSet=null,lastPack=null;
V.packs=async r=>{r.innerHTML='<div class="spin"></div>';let sets;try{sets=(await j('/sets')).filter(s=>s.logo&&!POCKET.test(s.id)&&s.cardCount?.official>=60).slice(-40).reverse()}catch(e){r.innerHTML='<div class="empty"><div class="e">✦</div>Pack simulator needs a connection.</div>';return}
 packSet=packSet||sets[0].id;const s=sets.find(x=>x.id===packSet)||sets[0];
 r.innerHTML=`<div class="panel"><div class="lbl"><span>Pack simulator</span><span>${S.packs.opened} opened</span></div><select id="ps">${sets.map(x=>`<option value="${x.id}" ${x.id===s.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>
 <div class="grid2" style="margin-top:10px"><div><span class="sub">Best pull</span><b class="mono" style="display:block">${S.packs.best?esc(S.packs.best.name)+' '+gbp(S.packs.best.v):'—'}</b></div><div><span class="sub">Cards pulled</span><b class="mono" style="display:block">${S.packs.pulls}</b></div></div></div>
 <div id="pa"><div class="pack" id="pk"><img src="${s.logo}.webp" onerror="this.remove()"><div class="pn">TAP TO RIP</div></div><p class="sub" style="text-align:center">Real cards from the set's checklist, valued at today's real market prices. Simulated pulls only — the rare slot is drawn from the set's highest-rarity cards.</p></div>`;
 $('#ps').onchange=e=>{packSet=e.target.value;V.packs(r)};$('#pk').onclick=()=>rip(s)};
async function rip(s){const pk=$('#pk');pk.classList.add('shake');pk.querySelector('.pn').textContent='RIPPING…';let set;
 try{set=await j('/sets/'+s.id);const pool=set.cards.filter(c=>c.image).sort(()=>Math.random()-.5).slice(0,36);const det=(await Promise.all(pool.map(c=>j('/cards/'+c.id).catch(()=>null)))).filter(Boolean);
  const by=k=>det.filter(c=>RANK(c.rarity)===k);const low=det.filter(c=>RANK(c.rarity)<=2),mid=det.filter(c=>RANK(c.rarity)>=3);
  const hi=Math.random()<.3?det.filter(c=>RANK(c.rarity)>=4):[];const rare=(hi.length?hi:mid.length?mid:det).sort(()=>Math.random()-.5)[0];
  let pack=[...(low.length>=9?low:det).filter(c=>c!==rare).slice(0,9),rare];if(pack.length<10)pack=[...pack,...det.filter(c=>!pack.includes(c))].slice(0,10);lastPack=pack;
  pk.classList.remove('shake');pk.classList.add('burst');burst(innerWidth/2,innerHeight/2,40);
  setTimeout(()=>{const v=pack.reduce((a,c)=>a+(priceOf(c,'normal')?.gbp||0),0);S.packs.opened++;S.packs.pulls+=pack.length;const top=pack.map(c=>({name:c.name,v:priceOf(c,RANK(c.rarity)>=3?'holo':'normal')?.gbp||0})).sort((a,b)=>b.v-a.v)[0];if(top&&(!S.packs.best||top.v>S.packs.best.v))S.packs.best=top;save();
   $('#pa').innerHTML=`<div class="lbl" style="margin-top:6px"><span>Tap each card to flip</span><span id="pval">pack value —</span></div><div class="reveal">${pack.map((c,i)=>`<div class="flip ${RANK(c.rarity)>=3?'rare':''}" data-i="${i}"><div class="in"><div class="b">✦</div><div class="f"><img src="${img(c.image)}"></div></div></div>`).join('')}</div>
   <div class="row" style="margin-top:12px"><button class="btn g" id="fa">Flip all</button><button class="btn" id="again">Rip another</button></div><div class="list panel" id="pl" style="margin-top:12px;display:none"></div>`;
   let open=0;const done=()=>{$('#pval').textContent='pack value '+gbp(v);const pl=$('#pl');pl.style.display='';pl.innerHTML='<div class="lbl">Pull report · tap to inspect / vault</div>'+pack.map(c=>`<div class="it ci2" data-id="${c.id}"><img src="${img(c.image)}"><div class="n"><b>${esc(c.name)}</b><span class="sub">${esc(c.rarity||'')}</span></div><b class="mono">${gbp(priceOf(c,'normal')?.gbp)}</b></div>`).join('');$$('.ci2',pl).forEach(e=>e.onclick=()=>openCard(e.dataset.id))};
   $$('.flip').forEach(f=>f.onclick=()=>{if(f.classList.contains('open'))return openCard(pack[f.dataset.i].id);f.classList.add('open');const b=f.getBoundingClientRect();if(f.classList.contains('rare'))burst(b.left+b.width/2,b.top+b.height/2,30,['#ffe14d','#fff','#ff2bd6']);if(++open===pack.length)done()});
   $('#fa').onclick=()=>$$('.flip:not(.open)').forEach((f,i)=>setTimeout(()=>f.click(),i*120));$('#again').onclick=()=>V.packs($('#view'))},500)}
 catch(e){pk.classList.remove('shake');pk.querySelector('.pn').textContent='OFFLINE — RETRY';toast('Could not reach card DB')}}
/* ---- more ---- */
V.more=r=>{const kb=(new Blob([localStorage.getItem(KEY)||'']).size/1024).toFixed(1);
 r.innerHTML=`<div class="panel"><div class="lbl">Market data</div><div class="sub">Prices: Cardmarket (EUR) via TCGdex, falling back to TCGplayer (USD). FX: ECB rates via Frankfurter${S.fx?` · ${S.fx.date}`:''}. Last refresh: ${S.lastRefresh?new Date(S.lastRefresh).toLocaleString('en-GB'):'never'}.</div><button class="btn" style="margin-top:10px;width:100%" id="rf">⚡ Refresh all prices</button></div>
 <div class="panel"><div class="lbl">Backup</div><div class="sub" style="margin-bottom:10px">Everything lives on this device (${kb} KB). Export a JSON backup or restore one.</div><div class="row"><button class="btn g" id="exp">⇩ Export JSON</button><label class="btn g" style="text-align:center">⇧ Import<input type="file" id="imp" accept="application/json,.json" hidden></label></div></div>
 <div class="panel"><div class="lbl">Install</div><div class="sub">On iPhone: Share → Add to Home Screen. Works offline once loaded — cached cards & images stay available.</div></div>
 <div class="panel"><div class="lbl">Danger zone</div><button class="btn g" style="width:100%;color:#ff5c7a" id="wipe">Wipe vault</button></div>
 <p class="sub mono" style="text-align:center">HOLO//VAULT · built for Rust 🔴 YNWA<br>Card data © TCGdex · Pokémon © Nintendo/Creatures/GAME FREAK. Not affiliated.</p>`;
 $('#rf').onclick=()=>refresh(true).then(()=>V.more(r));
 $('#exp').onclick=()=>{const b=new Blob([JSON.stringify({app:'holovault',v:1,exported:new Date().toISOString(),...S},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='holovault-'+new Date().toISOString().slice(0,10)+'.json';a.click();toast('Backup exported')};
 $('#imp').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());if(!Array.isArray(d.items))throw 0;if(!confirm(`Import ${d.items.length} cards? This replaces your current vault.`))return;S=Object.assign(base(),d);delete S.app;delete S.v;delete S.exported;save();toast('Vault restored');refresh(true);go('dash')}catch(_){toast('Invalid backup file')}};
 $('#wipe').onclick=()=>{if(confirm('Wipe everything? Export first!')){S=base();save();fx();go('dash')}}};
/* ---- boot ---- */
window.go=go;window.doSearch=doSearch;window.closeM=closeM;
(async()=>{go('dash');await fx();refresh(false).then(()=>go(cur));setTimeout(()=>$('#boot').classList.add('gone'),700);
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})})();
