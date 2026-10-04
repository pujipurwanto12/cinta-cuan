const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const ROOM_TTL = 1000 * 60 * 60 * 6;

const BOARD = [
  { icon:'🏁', name:'START', type:'start', desc:'Lewati START • +Rp100' },
  { icon:'☕', name:'Kedai Kopi', type:'prop', price:100, rent:25, color:'coffee', desc:'Ngopi santai' },
  { icon:'💌', name:'Kartu Cinta', type:'card', deck:'love', desc:'Buka kartu cinta' },
  { icon:'🍜', name:'Warung Mie', type:'prop', price:140, rent:35, color:'food', desc:'Mie favorit' },
  { icon:'💸', name:'Pajak Jadian', type:'tax', amount:40, desc:'Cinta kena pajak' },
  { icon:'🌷', name:'Toko Bunga', type:'prop', price:180, rent:45, color:'flower', desc:'Bunga buat pasangan' },
  { icon:'🎁', name:'Rezeki Dadakan', type:'bonus', amount:100, desc:'+Rp100' },
  { icon:'🌇', name:'Kafe Senja', type:'prop', price:220, rent:55, color:'sunset', desc:'Sunset date' },
  { icon:'🔥', name:'Kartu Chaos', type:'card', deck:'chaos', desc:'Saatnya bikin rusuh' },
  { icon:'🏠', name:'Apartemen Couple', type:'prop', price:260, rent:65, color:'home', desc:'Rumah berdua' },
  { icon:'🙈', name:'Drama Corner', type:'jail', desc:'Skip 1 giliran' },
  { icon:'📸', name:'Studio Foto', type:'prop', price:300, rent:75, color:'photo', desc:'Abadikan momen' },
  { icon:'💌', name:'Kartu Cinta', type:'card', deck:'love', desc:'Buka kartu cinta' },
  { icon:'📱', name:'Toko Gadget', type:'prop', price:340, rent:85, color:'gadget', desc:'Upgrade gadget' },
  { icon:'💰', name:'Gaji Bulanan', type:'bonus', amount:150, desc:'+Rp150' },
  { icon:'🌴', name:'Villa Healing', type:'prop', price:400, rent:100, color:'villa', desc:'Healing berdua' },
  { icon:'❤️‍🔥', name:'Pajak Bucin', type:'tax', amount:60, desc:'Pajak kebucinan' },
  { icon:'🍽️', name:'Date Night', type:'prop', price:450, rent:115, color:'date', desc:'Dinner romantis' },
  { icon:'🔥', name:'Kartu Chaos', type:'card', deck:'chaos', desc:'Saatnya bikin rusuh' },
  { icon:'👑', name:'Kerajaan Cuan', type:'prop', price:520, rent:135, color:'royal', desc:'Properti elite' },
  { icon:'💎', name:'Jackpot', type:'bonus', amount:200, desc:'+Rp200' }
];

const LOVE_CARDS = [
  {title:'Cuan Dadakan 💰', text:'Bank kasih kamu Rp120.', effect:'money', value:120},
  {title:'Bucin Banget ❤️', text:'Kamu transfer Rp50 ke pasangan.', effect:'give', value:50},
  {title:'Mantan Datang 😈', text:'Ambil sampai Rp90 dari pasangan.', effect:'take', value:90},
  {title:'Investasi Berhasil 📈', text:'Investasimu cuan Rp150.', effect:'money', value:150},
  {title:'Traktir Date Night 🍽️', text:'Kamu mentraktir pasangan Rp70.', effect:'give', value:70},
  {title:'Balik Keadaan 🔄', text:'Tukar seluruh uang dengan pasangan.', effect:'swapMoney'},
  {title:'Teleport ✨', text:'Maju 4 petak lalu selesaikan efek petaknya.', effect:'move', value:4},
  {title:'Kesialan Kecil 🥲', text:'Bayar denda Rp60.', effect:'pay', value:60},
  {title:'Jackpot Cinta 💎', text:'Dapat hadiah Rp200.', effect:'money', value:200},
  {title:'Double Trouble 🎲', text:'Langkah berikutnya mendapat +1.', effect:'boost', value:1},
  {title:'Surat Cinta 💌', text:'Bonus Rp80 dan pasangan kehilangan Rp30.', effect:'romance', value:80, other:30},
  {title:'Kencan Spontan 🌹', text:'Maju 2 petak dan dapat Rp50.', effect:'moveMoney', value:2, other:50}
];

const CHAOS_CARDS = [
  {title:'Diskon Gila 🏷️', text:'Pembelian properti berikutnya diskon Rp50.', effect:'discount', value:50},
  {title:'Kena Tilang 🚨', text:'Bayar Rp80 ke bank.', effect:'pay', value:80},
  {title:'Rampok Dompet 🥷', text:'Ambil sampai Rp120 dari pasangan.', effect:'take', value:120},
  {title:'Mundur Teratur ↩️', text:'Mundur 3 petak lalu selesaikan efek petaknya.', effect:'back', value:3},
  {title:'Freeze 🧊', text:'Pasangan kehilangan 1 giliran.', effect:'freeze'},
  {title:'Gaspol 🚀', text:'Maju 3 petak lalu selesaikan efek petaknya.', effect:'move', value:3},
  {title:'Pajak Kekayaan 💸', text:'Bayar Rp100.', effect:'pay', value:100},
  {title:'Rebut Momentum ⚡', text:'Kamu mendapat +2 langkah berikutnya.', effect:'boost', value:2},
  {title:'Cuan Misterius 🎁', text:'Dapat Rp180.', effect:'money', value:180},
  {title:'Swap Posisi 🔀', text:'Tukar posisi dengan pasangan.', effect:'swapPos'},
  {title:'Kartu Jahil 😼', text:'Pasangan membayar Rp60 kepadamu.', effect:'take', value:60},
  {title:'Chaos Ganda 💥', text:'Maju 1 petak dan dapat Rp100.', effect:'moveMoney', value:1, other:100}
];

function makeCode(){let c;do{c=crypto.randomBytes(3).toString('hex').slice(0,5).toUpperCase()}while(rooms.has(c));return c}
function token(){return crypto.randomBytes(18).toString('hex')}
function cleanName(v){return String(v||'Player').trim().slice(0,18)||'Player'}
function cleanAvatar(v){return ['🐻','🐰','🐼','🦊','🐱','🐯','🐨','🐸','🦁','🐹'].includes(v)?v:'🐻'}
function opponent(room,idx){return room.players[idx===0?1:0]}
function playerIndex(room,socket){return room.players.findIndex(p=>p.id===socket.id)}
function getRoom(socket){for(const r of rooms.values())if(r.players.some(p=>p.id===socket.id))return r;return null}
function getRoomByToken(t){for(const r of rooms.values()){const i=r.players.findIndex(p=>p.token===t);if(i>=0)return {room:r,index:i}}return null}
function log(room,text,kind='normal'){room.log.unshift({id:Date.now()+Math.random(),text,kind});room.log=room.log.slice(0,40)}
function publicState(room){return{code:room.code,started:room.started,winner:room.winner,turn:room.turn,phase:room.phase,pendingBuy:room.pendingBuy,players:room.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,money:p.money,pos:p.pos,skip:p.skip,boost:p.boost,discount:p.discount,connected:p.connected})),props:room.props,log:room.log,updatedAt:Date.now()}}
function emit(room){io.to(room.code).emit('state',publicState(room))}
function broadcast(room,event,payload){io.to(room.code).emit(event,payload)}
function playerByIdx(room,idx){return room.players[idx]}

function award(room,p,amount){p.money+=amount;return amount}
function charge(room,p,amount){const q=Math.min(p.money,amount);p.money-=q;return q}

function applyCard(room,p,card,depth=0){
  const idx=room.players.indexOf(p),other=opponent(room,idx);
  switch(card.effect){
    case 'money': award(room,p,card.value); break;
    case 'give': {const q=charge(room,p,card.value); other.money+=q;break}
    case 'take': {const q=charge(room,other,card.value);p.money+=q;break}
    case 'pay': charge(room,p,card.value); break;
    case 'swapMoney': {const q=p.money;p.money=other.money;other.money=q;break}
    case 'move': p.pos=(p.pos+card.value)%BOARD.length; break;
    case 'back': p.pos=(p.pos-card.value+BOARD.length)%BOARD.length; break;
    case 'boost': p.boost+=card.value||1; break;
    case 'freeze': other.skip+=1; break;
    case 'discount': p.discount+=card.value||0; break;
    case 'swapPos': {const q=p.pos;p.pos=other.pos;other.pos=q;break}
    case 'romance': {award(room,p,card.value);charge(room,other,card.other);break}
    case 'moveMoney': {p.pos=(p.pos+card.value)%BOARD.length;award(room,p,card.other);break}
  }
  return card;
}

function resolveCell(room,p,chain=0){
  if(chain>2)return {type:'chainLimit'};
  const idx=room.players.indexOf(p),cell=BOARD[p.pos],event={type:cell.type,name:cell.name};
  if(cell.type==='start'){award(room,p,100);event.message='+Rp100 dari START'}
  else if(cell.type==='bonus'){award(room,p,cell.amount);event.message=`+Rp${cell.amount} bonus`}
  else if(cell.type==='tax'){const q=charge(room,p,cell.amount);event.message=`-Rp${q} pajak`}
  else if(cell.type==='jail'){p.skip+=1;event.message='Drama Corner! Giliran berikutnya dilewati.'}
  else if(cell.type==='card'){
    const deck=cell.deck==='love'?LOVE_CARDS:CHAOS_CARDS;
    const card=deck[Math.floor(Math.random()*deck.length)];
    applyCard(room,p,card);event.card=card;
    if(['move','back','moveMoney'].includes(card.effect)){
      event.chained=resolveCell(room,p,chain+1);
    }
  } else if(cell.type==='prop'){
    const owner=room.props[p.pos];
    if(owner===undefined){room.pendingBuy=idx;room.phase='buy';event.buyable=true;event.price=cell.price;event.discount=p.discount||0;event.finalPrice=Math.max(0,cell.price-(p.discount||0))}
    else if(owner!==idx){const q=charge(room,p,cell.rent);room.players[owner].money+=q;event.rent=q;event.owner=room.players[owner].name}
  }
  return event;
}
function finishTurn(room){room.pendingBuy=null;room.phase='roll';room.turn=1-room.turn}
function checkWinner(room){const loser=room.players.findIndex(p=>p.money<=0);if(loser<0)return false;room.winner=opponent(room,loser).id;room.phase='finished';log(room,`${opponent(room,loser).name} menang! Lawan kehabisan uang.`,'win');return true}
function resetRoom(room){room.started=false;room.winner=null;room.turn=0;room.phase='roll';room.pendingBuy=null;room.props={};room.log=[];room.players.forEach(p=>{p.money=1000;p.pos=0;p.skip=0;p.boost=0;p.discount=0})}

io.on('connection',socket=>{
  socket.on('resume',({token:t}={})=>{const found=getRoomByToken(String(t||''));if(!found)return socket.emit('resumeFailed');const{room,index}=found;room.players[index].id=socket.id;room.players[index].connected=true;room.lastActivity=Date.now();socket.join(room.code);socket.emit('resumed',{code:room.code});log(room,`${room.players[index].name} kembali online.`,'system');emit(room)})
  socket.on('createRoom',data=>{const p={id:socket.id,token:token(),name:cleanName(data?.name),avatar:cleanAvatar(data?.avatar),money:1000,pos:0,skip:0,boost:0,discount:0,connected:true};const room={code:makeCode(),started:false,winner:null,turn:0,phase:'roll',pendingBuy:null,props:{},log:[],lastActivity:Date.now(),players:[p]};rooms.set(room.code,room);socket.join(room.code);socket.emit('roomCreated',{code:room.code,token:p.token});log(room,`${p.name} membuat room ${room.code}`,'system');emit(room)})
  socket.on('joinRoom',data=>{const code=String(data?.code||'').trim().toUpperCase(),room=rooms.get(code);if(!room)return socket.emit('errorMsg','Room tidak ditemukan.');if(room.players.length>=2)return socket.emit('errorMsg','Room sudah penuh.');if(room.started)return socket.emit('errorMsg','Game sudah berjalan.');const p={id:socket.id,token:token(),name:cleanName(data?.name),avatar:cleanAvatar(data?.avatar),money:1000,pos:0,skip:0,boost:0,discount:0,connected:true};room.players.push(p);room.lastActivity=Date.now();socket.join(room.code);socket.emit('joinedRoom',{code:room.code,token:p.token});log(room,`${p.name} masuk ke room.`,'system');emit(room)})
  socket.on('startGame',()=>{const room=getRoom(socket);if(!room||room.players.length!==2||!room.players.every(p=>p.connected))return socket.emit('errorMsg','Kedua pemain harus sudah masuk.');if(room.started)return;room.started=true;room.phase='roll';room.turn=0;log(room,'Game dimulai! Giliran pertama siap melempar dadu.','system');emit(room)})
  socket.on('roll',()=>{const room=getRoom(socket);if(!room||!room.started||room.winner)return;const idx=playerIndex(room,socket);if(idx!==room.turn||room.phase!=='roll')return;const p=room.players[idx];room.lastActivity=Date.now();if(p.skip>0){p.skip-=1;log(room,`${p.name} kehilangan giliran karena efek kartu.`,'bad');broadcast(room,'turnEffect',{type:'skip',playerId:p.id});finishTurn(room);emit(room);return}const dice=Math.floor(Math.random()*6)+1,extra=p.boost||0;p.boost=0;const old=p.pos,total=dice+extra,raw=old+total;if(Math.floor(raw/BOARD.length)>Math.floor(old/BOARD.length))award(room,p,100);p.pos=raw%BOARD.length;const event=resolveCell(room,p);log(room,`${p.name} melempar ${dice}${extra?` + ${extra} bonus`:''} dan mendarat di ${BOARD[p.pos].name}.`,'move');if(event.rent)log(room,`${p.name} membayar sewa Rp${event.rent} kepada ${event.owner}.`,'money');if(event.card)log(room,`🃏 ${event.card.title}: ${event.card.text}`,'card');if(event.chained?.rent)log(room,`${p.name} membayar sewa Rp${event.chained.rent} kepada ${event.chained.owner}.`,'money');broadcast(room,'rollResult',{playerId:p.id,dice,extra,from:old,to:p.pos,event});if(checkWinner(room)){emit(room);return}if(event.buyable){emit(room);return}finishTurn(room);emit(room)})
  socket.on('buy',()=>{const room=getRoom(socket);if(!room||room.winner||room.phase!=='buy')return;const idx=playerIndex(room,socket);if(idx!==room.turn||room.pendingBuy!==idx)return;const p=room.players[idx],cell=BOARD[p.pos];if(cell.type!=='prop'||room.props[p.pos]!==undefined)return;const price=Math.max(0,cell.price-p.discount);if(p.money<price)return socket.emit('errorMsg','Uangmu tidak cukup.');p.money-=price;room.props[p.pos]=idx;p.discount=0;log(room,`${p.name} membeli ${cell.name} seharga Rp${price}.`,'buy');broadcast(room,'purchase',{playerId:p.id,pos:p.pos,price});finishTurn(room);emit(room)})
  socket.on('skipBuy',()=>{const room=getRoom(socket);if(!room||room.winner||room.phase!=='buy')return;const idx=playerIndex(room,socket);if(idx===room.turn&&room.pendingBuy===idx){log(room,`${room.players[idx].name} melewatkan pembelian.`,'system');finishTurn(room);emit(room)}})
  socket.on('reaction',emoji=>{const room=getRoom(socket);if(!room)return;const idx=playerIndex(room,socket);if(idx<0)return;broadcast(room,'reaction',{playerId:room.players[idx].id,emoji:String(emoji||'❤️').slice(0,4)})})
  socket.on('chat',msg=>{const room=getRoom(socket);if(!room)return;const idx=playerIndex(room,socket);if(idx<0)return;const text=String(msg||'').trim().slice(0,80);if(!text)return;broadcast(room,'chat',{name:room.players[idx].name,text})})
  socket.on('restart',()=>{const room=getRoom(socket);if(!room)return;resetRoom(room);log(room,'Game di-reset. Siap untuk ronde baru!','system');emit(room)})
  socket.on('disconnect',()=>{for(const room of rooms.values()){const idx=room.players.findIndex(p=>p.id===socket.id);if(idx<0)continue;room.players[idx].connected=false;room.players[idx].id=null;room.lastActivity=Date.now();log(room,`${room.players[idx].name} terputus. Menunggu koneksi kembali...`,'bad');emit(room);break}})
});

setInterval(()=>{const now=Date.now();for(const [code,room] of rooms){if(now-room.lastActivity>ROOM_TTL)rooms.delete(code)}},60_000).unref();

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Cinta & Cuan running on port ${PORT}`));
