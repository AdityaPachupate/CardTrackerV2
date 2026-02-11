
const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suits=[
{name:"Spades",symbol:"♠",color:"black"},
{name:"Hearts",symbol:"♥",color:"red"},
{name:"Diamonds",symbol:"♦",color:"red"},
{name:"Clubs",symbol:"♣",color:"black"}
];

const rankOrder={
  "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,
  "J":11,"Q":12,"K":13,"A":14
};

let state={
teams:{},
players:{},
teamOrder:[],
playedCards:{},
pendingCard:null,
history:[],
showRemainingOnly:false,
trumpSuit:null,
started:false
};

let nextTeam=1,nextPlayer=1;
const uidT=()=>`t${nextTeam++}`;
const uidP=()=>`p${nextPlayer++}`;

function init(){
const t1=createTeam("Team 1");
const t2=createTeam("Team 2");
addPlayer(t1,"Player 1");
addPlayer(t1,"Player 2");
addPlayer(t2,"Player 3");
addPlayer(t2,"Player 4");
buildDeck();
renderTeams();
}

function createTeam(name){
const id=uidT();
state.teams[id]={id,name,playerIds:[]};
state.teamOrder.push(id);
return id;
}

function addPlayer(teamId,name){
const id=uidP();
state.players[id]={id,name,teamId,cards:[]};
state.teams[teamId].playerIds.push(id);
}

function buildDeck(){
const grid=document.getElementById("deckGrid");
grid.innerHTML="";
for(const suit of suits){
for(const rank of ranks){
const id=`${rank} of ${suit.name}`;
if(state.showRemainingOnly && state.playedCards[id]){
const placeholder=document.createElement("div");
placeholder.className="card placeholder";
grid.appendChild(placeholder);
continue;
}

const div=document.createElement("div");
div.className="card "+suit.color;
if(rank==="10") div.classList.add("dehla");
div.innerHTML=`${rank}<span class="symbol">${suit.symbol}</span>`;
if(state.playedCards[id]){
div.classList.add("used");
}else{
div.onclick=()=>selectCard(id);
}
grid.appendChild(div);
}
}
}

function renderTeams(){
const wrap=document.getElementById("teams");
wrap.innerHTML="";

for(const tid of state.teamOrder){
const team=state.teams[tid];
const tDiv=document.createElement("div");
tDiv.className="team panel-texture";
const header=document.createElement("h3");
header.textContent=team.name;
tDiv.appendChild(header);

for(const pid of team.playerIds){
const player=state.players[pid];
const pDiv=document.createElement("div");
pDiv.className="player";

const top=document.createElement("div");
top.className="player-top";
const nameDiv=document.createElement("div");
nameDiv.textContent=player.name;
nameDiv.style.cursor="pointer";
nameDiv.title="Click to rename";
nameDiv.onclick=()=>renamePlayer(pid);
top.appendChild(nameDiv);
const badge=document.createElement("div");
badge.className="chip-badge";
badge.textContent=player.cards.length;
top.appendChild(badge);

const cards=document.createElement("div");
cards.className="player-cards";

for(const c of player.cards){
const [r,s]=c.split(" of ");
const suit=suits.find(x=>x.name===s);
const cd=document.createElement("div");
cd.className="card "+suit.color;
if(r==="10") cd.classList.add("dehla");
cd.innerHTML=`${r}<span class="symbol">${suit.symbol}</span>`;
cards.appendChild(cd);
}

pDiv.appendChild(top);
pDiv.appendChild(cards);
tDiv.appendChild(pDiv);
}
wrap.appendChild(tDiv);
}
updateTricks();
}

function parseCard(cardStr){
const [rank,suitName]=cardStr.split(" of ");
return {rank,suitName};
}

function determineTrickWinner(entries){
if(!entries.length) return null;
const trump=state.trumpSuit;
const firstCard=parseCard(entries[0].card);
const leadSuit=firstCard.suitName;

let bestEntry=entries[0];
let bestInfo=parseCard(bestEntry.card);

function isTrump(info){
  return trump && info.suitName===trump;
}

for(let i=1;i<entries.length;i++){
  const current=entries[i];
  const info=parseCard(current.card);

  const bestIsTrump=isTrump(bestInfo);
  const curIsTrump=isTrump(info);

  let better=false;

  if(trump){
    if(curIsTrump && !bestIsTrump){
      better=true;
    }else if(curIsTrump===bestIsTrump){
      if(info.suitName===bestInfo.suitName && rankOrder[info.rank]>rankOrder[bestInfo.rank]){
        better=true;
      }else if(!curIsTrump && !bestIsTrump){
        if(bestInfo.suitName!==leadSuit && info.suitName===leadSuit){
          better=true;
        }
      }
    }
  }else{
    if(bestInfo.suitName!==leadSuit && info.suitName===leadSuit){
      better=true;
    }else if(info.suitName===bestInfo.suitName && rankOrder[info.rank]>rankOrder[bestInfo.rank]){
      better=true;
    }
  }

  if(better){
    bestEntry=current;
    bestInfo=info;
  }
}
return bestEntry;
}

function calculateScoresAndCurrentLeader(){
const result={teamTricks:{},teamTens:{},currentLeaderTeamName:""};
for(const tid of state.teamOrder){
  result.teamTricks[tid]=0;
  result.teamTens[tid]=0;
}

const h=state.history;
const fullTricks=Math.floor(h.length/4);

for(let t=0;t<fullTricks;t++){
  const start=t*4;
  const trickEntries=h.slice(start,start+4);
  const winner=determineTrickWinner(trickEntries);
  if(winner){
    const winnerTeamId=state.players[winner.pid].teamId;
    result.teamTricks[winnerTeamId]++;
    const hasTen=trickEntries.some(e=>parseCard(e.card).rank==="10");
    if(hasTen) result.teamTens[winnerTeamId]++;
  }
}

const remaining=h.length%4;
if(remaining>0){
  const start=h.length-remaining;
  const partialEntries=h.slice(start);
  const leader=determineTrickWinner(partialEntries);
  if(leader){
    const teamId=state.players[leader.pid].teamId;
    result.currentLeaderTeamName=state.teams[teamId].name;
  }
}

return result;
}

function selectCard(cardId){
if(!state.started){
alert("Please choose trump and start the game first.");
return;
}
if(state.playedCards[cardId]) return;
state.pendingCard=cardId;
showPlayerModal();
}

function showPlayerModal(){
const modal=document.getElementById("playerModal");
const content=document.getElementById("modalContent");
content.innerHTML="";
for(const tid of state.teamOrder){
for(const pid of state.teams[tid].playerIds){
const btn=document.createElement("button");
btn.textContent=state.players[pid].name;
btn.onclick=()=>assignCard(pid);
content.appendChild(btn);
}
}
modal.style.display="flex";
}

function hidePlayerModal(){
document.getElementById("playerModal").style.display="none";
}

function outsideClick(e){
if(e.target.id==="playerModal") hidePlayerModal();
}

function assignCard(pid){
const h=state.history;
const remaining=h.length%4;
if(remaining>0){
const start=h.length-remaining;
const trickEntries=h.slice(start);
const alreadyPlayed=trickEntries.some(e=>e.pid===pid);
if(alreadyPlayed){
alert("This player has already played in this trick.");
return;
}
}
const card=state.pendingCard;
if(!card) return;
state.playedCards[card]=pid;
state.players[pid].cards.push(card);
state.history.push({card,pid});
state.pendingCard=null;
hidePlayerModal();
buildDeck();
renderTeams();
}

function undoMove(){
const last=state.history.pop();
if(!last) return;
delete state.playedCards[last.card];
const arr=state.players[last.pid].cards;
arr.splice(arr.indexOf(last.card),1);
buildDeck();
renderTeams();
}

function updateTricks(){
const totalPlayed=Object.keys(state.playedCards).length;
document.getElementById("trickCount").textContent=Math.floor(totalPlayed/4);
const info=calculateScoresAndCurrentLeader();

const scoreWrap=document.getElementById("scoreBoard");
if(scoreWrap){
  const rows=state.teamOrder.map(tid=>{
    const team=state.teams[tid];
    const tricks=info.teamTricks[tid]||0;
    const tens=info.teamTens[tid]||0;
    return `<tr>
      <td style="text-align:left;padding:6px 10px;">${team.name}</td>
      <td style="padding:6px 10px;">${tricks}</td>
      <td style="padding:6px 10px;">${tens}</td>
    </tr>`;
  }).join("");
  scoreWrap.innerHTML=`
    <div class="panel-texture" style="padding:8px;">
      <div style="font-weight:bold;margin-bottom:6px;">Scoreboard</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="opacity:0.9;">
            <th style="text-align:left;padding:6px 10px;">Team</th>
            <th style="padding:6px 10px;">Tricks</th>
            <th style="padding:6px 10px;">10s (captured)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
const el=document.getElementById("currentTrickInfo");
if(el){
  if(info.currentLeaderTeamName){
    el.textContent=`Current trick is winning for ${info.currentLeaderTeamName}`;
  }else{
    el.textContent="";
  }
}
}

function toggleRemaining(){
state.showRemainingOnly=!state.showRemainingOnly;
document.getElementById("toggleBtn").textContent=
state.showRemainingOnly ? "Full Deck" : "Remaining Only";
buildDeck();
}

function resetGame(){
state.playedCards={};
state.history=[];
for(const pid in state.players){
state.players[pid].cards=[];
}
state.trumpSuit=null;
const sel=document.getElementById("trumpSelect");
if(sel) sel.value="";
state.started=false;
const start=document.getElementById("startScreen");
if(start) start.style.display="flex";
buildDeck();
renderTeams();
}

function setTrumpSuit(value){
state.trumpSuit=value||null;
updateTricks();
}

function showRules(){
const modal=document.getElementById("rulesModal");
if(modal) modal.style.display="flex";
}

function hideRules(){
const modal=document.getElementById("rulesModal");
if(modal) modal.style.display="none";
}

function outsideRulesClick(e){
if(e.target.id==="rulesModal") hideRules();
}

function startGame(){
const trumpSel=document.getElementById("startTrump");
const trump=trumpSel ? trumpSel.value : "";
if(!trump){
alert("Please select a trump suit to start.");
return;
}

const defaultNames=["Player 1","Player 2","Player 3","Player 4"];
const inputs=[
document.getElementById("startP1"),
document.getElementById("startP2"),
document.getElementById("startP3"),
document.getElementById("startP4")
];
const names=inputs.map((inp,idx)=>{
if(!inp) return defaultNames[idx];
const v=(inp.value||"").trim();
return v || defaultNames[idx];
});

// Map names to players: team1 -> P1,P2; team2 -> P3,P4
if(state.teamOrder.length>=2){
const t1=state.teamOrder[0];
const t2=state.teamOrder[1];
const team1Players=state.teams[t1].playerIds;
const team2Players=state.teams[t2].playerIds;
if(team1Players[0]) state.players[team1Players[0]].name=names[0];
if(team1Players[1]) state.players[team1Players[1]].name=names[1];
if(team2Players[0]) state.players[team2Players[0]].name=names[2];
if(team2Players[1]) state.players[team2Players[1]].name=names[3];
}

const mainTrump=document.getElementById("trumpSelect");
if(mainTrump) mainTrump.value=trump;
setTrumpSuit(trump);

state.started=true;
const start=document.getElementById("startScreen");
if(start) start.style.display="none";
renderTeams();
}

function renamePlayer(pid){
const current=state.players[pid].name||"";
const next=prompt("Enter player name",current);
if(next===null) return;
const name=next.trim();
if(!name) return;
state.players[pid].name=name;
renderTeams();
}

init();
