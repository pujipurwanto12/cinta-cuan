const socket=io();
const $=id=>document.getElementById(id);
const state={room:null,me:null,players:[],props:{},turn:0,phase:'roll',started:false,sound:true,token:null,lastPositions:{}};
const els={lobby:$('lobby'),game:$('game'),name:$('name'),avatar:$('avatar'),code:$('code'),msg:$('msg'),room:$('roomBadge'),players:$('players'),board:$('board'),feed:$('feed'),event:$('event'),turnLine:$('turnLine'),phase:$('phasePill'),start:$('startBtn'),roll:$('roll'),buy:$('buy'),skip:$('skipBuy'),copy:$('copy'),restart:$('restart'),restart2:$('restart2'),win:$('win'),winner:$('winner'),modal:$('modal'),modalIcon:$('modalIcon'),modalTitle:$('modalTitle'),modalText:$('modalText'),modalOk:$('modalOk'),modalClose:$('closeModal'),toast:$('toast'),connection:$('connection'),chatFeed:$('chatFeed'),chatForm:$('chatForm'),chatInput:$('chatInput'),sound:$('sound')};

function money(n){return 'Rp'+Number(n||0).toLocaleString('id-ID')}
function setMsg(t='',bad=true){els.msg.textContent=t;els.msg.style.color=bad?'var(--red)':'var(--green)'}
function saveToken(t){state.token=t;localStorage.setItem('cintaCuanToken',t)}
function loadToken(){return localStorage.getItem('cintaCuanToken')}
function beep(freq=440,duration=.08,type='sine'){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=beep.ctx||(beep.ctx=new C()),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=.035;o.connect(g);g.connect(c.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.stop(c.currentTime+duration)}catch(e){}}
function toast(t){els.toast.textContent=t;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),2200)}
function openModal(icon,title,text,eyebrow='CARD DRAW'){els.modalIcon.textContent=icon;els.modalTitle.textContent=title;els.modalText.textContent=text;$('modalEyebrow').textContent=eyebrow;els.modal.classList.remove('hidden');beep(660,.12,'triangle')}
function closeModal(){els.modal.classList.add('hidden')}
function floatReaction(emoji){const d=document.createElement('div');d.className='reaction-float';d.textContent=emoji;d.style.left=(25+Math.random()*50)+'%';d.style.bottom='24%';document.body.appendChild(d);setTimeout(()=>d.remove(),1250)}
function isMe(p){return p&&p.id===socket.id}
function me(){return state.players.find(isMe)}
function renderBoard(){
  els.board.innerHTML='';
  const colors={coffee:'#8d6d57',food:'#c77d5c',flower:'#d46c8e',sunset:'#e8a15c',home:'#8f73bf',photo:'#6ea9d0',gadget:'#72b7a0',villa:'#5c9d8e',date:'#d76d8c',royal:'#d7b55d'};
  const names=state.players.map(p=>p.name);
  const positions={}; state.players.forEach((p,i)=>(positions[p.pos]??=[]).push({p,i}));
  BOARD.forEach((c,i)=>{const el=document.createElement('div');el.className=`cell ${c.type} ${c.type!=='prop'?'special':''}`;el.style.setProperty('--cell',colors[c.color]||'#604d5e');const owner=state.props[i];const ownerName=owner!==undefined?names[owner]:'';el.innerHTML=`<div><span class="ico">${c.icon}</span><div class="cell-name">${c.name}</div><div class="cell-desc">${c.desc||''}</div>${c.price?`<div class="price">${money(c.price)} • sewa ${money(c.rent)}</div>`:''}</div><div class="pawns">${(positions[i]||[]).map(({p, i:pi})=>`<span class="pawn ${pi===1?'p2':''}" title="${p.name}">${p.avatar}</span>`).join('')}</div>${ownerName?`<div class="owner">${state.players[owner].avatar}</div>`:''}`;if(state.players.some(p=>p.pos===i&&p.id===socket.id))el.classList.add('active-cell');els.board.appendChild(el)})
}
function renderPlayers(){els.players.innerHTML=state.players.map((p,i)=>`<div class="player ${i===state.turn&&state.started?'active':''} ${p.connected?'':'disconnected'}"><div class="avatar">${p.avatar}</div><div><div class="player-name">${escapeHtml(p.name)} ${isMe(p)?'<span style="color:var(--pink)">• kamu</span>':''}</div><div class="money">${money(p.money)}</div></div><div class="status-dot ${p.connected?'':'off'}"></div></div>`).join('');$('playerCount').textContent=`${state.players.filter(p=>p.connected).length}/2`}
function renderFeed(){els.feed.innerHTML=state.log.map(x=>`<div class="feed-item ${x.kind||''}">${escapeHtml(x.text)}</div>`).join('')}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function phaseText(){if(!state.started)return 'Menunggu game dimulai';if(state.phase==='buy')return 'Pilih: beli atau lewat';if(state.phase==='finished')return 'Game selesai';const p=state.players[state.turn];return isMe(p)?'Giliranmu — lempar dadu 🎲':`Giliran ${p?.name||'pasangan'} — tunggu dulu`}
function updateControls(){const m=me();els.turnLine.innerHTML=phaseText().replace(/(Giliranmu)/,'<strong>$1</strong>');els.phase.textContent=state.phase==='buy'?'BUY':state.phase==='finished'?'FINISHED':state.started?'ROLL':'WAITING';els.start.classList.toggle('hidden',state.started||state.players.length!==2);els.roll.classList.toggle('hidden',state.phase==='buy'||state.phase==='finished');els.roll.disabled=!state.started||state.phase!=='roll'||!m||state.players[state.turn]?.id!==socket.id;els.buy.classList.toggle('hidden',state.phase!=='buy'||state.pendingBuy!==state.players.findIndex(isMe));els.skipBuy.classList.toggle('hidden',state.phase!=='buy'||state.pendingBuy!==state.players.findIndex(isMe));els.start.disabled=state.players.length!==2||!state.players.every(p=>p.connected);els.restart.classList.toggle('hidden',!state.started&&!state.winner)}
function showEvent(icon,title,text){els.event.innerHTML=`<span class="event-icon">${icon}</span><div><b>${escapeHtml(title)}</b><small>${escapeHtml(text)}</small></div>`}
function animatePath(from,to,total){const dir=to>=from?1:1;let cur=from;const steps=Math.min(total||Math.abs(to-from),10);let n=0;const tick=()=>{n++;cur=(cur+dir)%21;document.querySelectorAll('.cell').forEach(c=>c.classList.remove('moving'));document.querySelectorAll('.cell')[cur]?.classList.add('moving');beep(260+n*30,.045,'square');if(n<steps)setTimeout(tick,105);else setTimeout(()=>document.querySelectorAll('.cell').forEach(c=>c.classList.remove('moving')),220)};tick()}
function handleRoll(r){if(r.playerId===socket.id){animatePath(r.from,r.to,Math.min(10,r.dice+(r.extra||0)));showEvent('🎲',`Dadu: ${r.dice}${r.extra?` + ${r.extra}`:''}`,`Mendarat di ${BOARD[r.to].name}.`)}if(r.event?.card){setTimeout(()=>openModal(r.event.card.title.includes('🔥')?'🔥':r.event.card.title.includes('❤️')?'❤️':'🃏',r.event.card.title,r.event.card.text,'CARD EFFECT'),250);showEvent('🃏',r.event.card.title,r.event.card.text)}else if(r.event?.rent){showEvent('💸','Bayar sewa',`${r.event.owner} menerima ${money(r.event.rent)}.`)}else if(r.event?.buyable&&r.playerId===socket.id){showEvent('🏠','Properti tersedia',`${BOARD[r.to].name} • harga ${money(r.event.finalPrice)} setelah diskon.`)}else if(r.event?.message){showEvent(BOARD[r.to].icon,BOARD[r.to].name,r.event.message)}beep(520,.12,'triangle')}
function applyState(s){state.room=s.code;state.players=s.players;state.props=s.props;state.turn=s.turn;state.phase=s.phase;state.started=s.started;state.pendingBuy=s.pendingBuy;state.winner=s.winner;els.room.textContent=`ROOM ${s.code}`;els.connection.classList.remove('offline');renderPlayers();renderBoard();renderFeed();updateControls();if(s.winner){const w=s.players.find(p=>p.id===s.winner);els.winner.textContent=`${w?.avatar||'🏆'} ${w?.name||'Pemenang'} menang!`;els.win.classList.remove('hidden');beep(880,.18,'triangle');setTimeout(()=>beep(1040,.18,'triangle'),170)}}

socket.on('connect',()=>{els.connection.classList.remove('offline');const t=loadToken();if(t)socket.emit('resume',{token:t});else if(state.room)socket.emit('errorMsg','Koneksi kembali. Silakan masuk room lagi.')});
socket.on('disconnect',()=>{els.connection.classList.add('offline');els.connection.innerHTML='<span></span> offline';toast('Koneksi terputus. Mencoba kembali…')});
socket.on('resumeFailed',()=>{localStorage.removeItem('cintaCuanToken');toast('Sesi lama sudah tidak tersedia.')});
socket.on('roomCreated',d=>{saveToken(d.token);state.room=d.code;setMsg(`Room ${d.code} berhasil dibuat. Kirim kode ini ke pasangan.`,false);els.code.value=d.code;els.lobby.classList.add('hidden');els.game.classList.remove('hidden');toast('Room dibuat!');beep(660,.12)});
socket.on('joinedRoom',d=>{saveToken(d.token);state.room=d.code;els.lobby.classList.add('hidden');els.game.classList.remove('hidden');toast('Berhasil masuk room ❤️');beep(620,.12)});
socket.on('resumed',d=>{state.room=d.code;els.lobby.classList.add('hidden');els.game.classList.remove('hidden');toast('Koneksi kembali ❤️')});
socket.on('state',applyState);
socket.on('rollResult',handleRoll);
socket.on('purchase',p=>{if(p.playerId===socket.id)showEvent('🏠','Properti dibeli!',`Kamu membeli ${BOARD[p.pos].name} seharga ${money(p.price)}.`);beep(760,.1,'sine')});
socket.on('turnEffect',e=>{if(e.playerId===socket.id)showEvent('🧊','Giliran terlewati','Efek sebelumnya membuatmu kehilangan satu giliran.');beep(180,.16,'sawtooth')});
socket.on('reaction',r=>{floatReaction(r.emoji);beep(700,.05)});
socket.on('chat',c=>{const d=document.createElement('div');d.className='chat-bubble';d.innerHTML=`<b>${escapeHtml(c.name)}:</b> ${escapeHtml(c.text)}`;els.chatFeed.appendChild(d);els.chatFeed.scrollLeft=els.chatFeed.scrollWidth});
socket.on('errorMsg',m=>{setMsg(m,true);toast(m);beep(150,.12,'sawtooth')});

els.create.onclick=()=>{setMsg('');socket.emit('createRoom',{name:els.name.value,avatar:els.avatar.value})};
els.join.onclick=()=>{const c=els.code.value.trim().toUpperCase();if(c.length!==5)return setMsg('Kode room harus 5 karakter.');setMsg('');socket.emit('joinRoom',{code:c,name:els.name.value,avatar:els.avatar.value})};
els.code.oninput=()=>els.code.value=els.code.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
els.start.onclick=()=>{closeModal();socket.emit('startGame')};
els.roll.onclick=()=>{els.roll.disabled=true;els.roll.classList.add('dice-anim');setTimeout(()=>els.roll.classList.remove('dice-anim'),650);socket.emit('roll')};
els.buy.onclick=()=>socket.emit('buy');els.skipBuy.onclick=()=>socket.emit('skipBuy');
els.copy.onclick=async()=>{const text=state.room||'';try{await navigator.clipboard.writeText(text);toast('Kode room disalin: '+text)}catch(e){toast('Kode room: '+text)}};
els.restart.onclick=()=>{if(confirm('Reset ronde dan mulai dari awal?'))socket.emit('restart')};els.restart2.onclick=()=>{els.win.classList.add('hidden');socket.emit('restart')};els.sound.onclick=()=>{state.sound=!state.sound;els.sound.textContent=state.sound?'🔊':'🔇';toast(state.sound?'Sound aktif':'Sound mati')};els.modalOk.onclick=closeModal;els.modalClose.onclick=closeModal;els.modal.onclick=e=>{if(e.target===els.modal)closeModal()};
document.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>socket.emit('reaction',b.dataset.react));
els.chatForm.onsubmit=e=>{e.preventDefault();const t=els.chatInput.value.trim();if(t){socket.emit('chat',t);els.chatInput.value=''}};
window.addEventListener('storage',()=>{});
