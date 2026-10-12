// KPK bitbase (white pawn), retrograde like Stockfish's kpk generation
const dist=(a,b)=>Math.max(Math.abs((a>>3)-(b>>3)),Math.abs((a&7)-(b&7)));
const N=2*64*64*64; const res=new Uint8Array(N); // 0 unknown,1 win,2 draw,3 invalid
const id=(stm,wk,bk,p)=>((stm*64+wk)*64+bk)*64+p;
// squares: 0=a8 ... row r=sq>>3 (0=rank8). pawn moves toward row 0.
function attackedByPawn(p,s){const r=p>>3,f=p&7;return (s>>3)===r-1&&Math.abs((s&7)-f)===1}
function init(stm,wk,bk,p){
 const pr=p>>3; if(pr===0||pr===7) return 3; if(wk===bk||wk===p||bk===p) return 3; if(dist(wk,bk)<=1) return 3;
 if(stm===0 && attackedByPawn(p,bk)) return 3; // black in check with white to move: illegal
 if(stm===0 && pr===1){ const q=p-8; if(q!==wk&&q!==bk&&(dist(bk,q)>1||dist(wk,q)===1)) return 1; }
 if(stm===1){ // black: stalemate or capture
   let moves=0; for(let dr=-1;dr<=1;dr++)for(let df=-1;df<=1;df++){ if(!dr&&!df)continue; const r=(bk>>3)+dr,f=(bk&7)+df; if(r<0||r>7||f<0||f>7)continue; const s=r*8+f;
     if(dist(s,wk)<=1) continue; if(s!==p&&attackedByPawn(p,s)) continue; moves++; if(s===p&&dist(wk,p)>1) return 2; }
   if(!moves) return 2;
   if(dist(bk,p)===1&&dist(wk,p)>1) return 2;
 }
 return 0;
}
for(let stm=0;stm<2;stm++)for(let wk=0;wk<64;wk++)for(let bk=0;bk<64;bk++)for(let p=0;p<64;p++)res[id(stm,wk,bk,p)]=init(stm,wk,bk,p);
function kmoves(k){const o=[];for(let dr=-1;dr<=1;dr++)for(let df=-1;df<=1;df++){if(!dr&&!df)continue;const r=(k>>3)+dr,f=(k&7)+df;if(r>=0&&r<8&&f>=0&&f<8)o.push(r*8+f)}return o}
function classify(stm,wk,bk,p){
 if(stm===0){ let any=false;
  for(const s of kmoves(wk)){ if(s===p||dist(s,bk)<=1)continue; const v=res[id(1,s,bk,p)]; if(v===1)return 1; if(v===0)any=true; }
  const pr=p>>3; if(pr>1){ const q=p-8; if(q!==wk&&q!==bk){ const v=res[id(1,wk,bk,q)]; if(v===1)return 1; if(v===0)any=true;
     if(pr===6){const q2=p-16; if(q2!==wk&&q2!==bk){const v2=res[id(1,wk,bk,q2)]; if(v2===1)return 1; if(v2===0)any=true;}}}}
  return any?0:2;
 } else { let any=false;
  for(const s of kmoves(bk)){ if(dist(s,wk)<=1||s===p||attackedByPawn(p,s))continue; const v=res[id(0,wk,s,p)]; if(v===2)return 2; if(v===0)any=true; }
  return any?0:1;
 }
}
let changed=true; while(changed){changed=false; for(let stm=0;stm<2;stm++)for(let wk=0;wk<64;wk++)for(let bk=0;bk<64;bk++)for(let p=8;p<56;p++){const i=id(stm,wk,bk,p); if(res[i]!==0)continue; const v=classify(stm,wk,bk,p); if(v){res[i]=v;changed=true;}}}
for(let i=0;i<N;i++)if(res[i]===0)res[i]=2;
module.exports={probe:(stm,wk,bk,p)=>res[id(stm,wk,bk,p)]};
