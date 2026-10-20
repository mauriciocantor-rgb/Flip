/*
  Grid Masters · Laboratorio de Ingeniería Eléctrica · Biblioteca e Información Científica (BIC) · UTP
  Código del laboratorio (versión CRIE: HTML, CSS y JavaScript separados).
  Se carga después de ../comun/js/config.js, ../comun/vendor/qrcode-generator.js
  y ../comun/js/bic-sesion.js (conexión con el Panel docente).
*/

/* ---------- Estilos dinámicos sin estilos en línea (CSP del CRIE) ----------
   Las plantillas que necesitan un ancho o un color calculado escriben
   data-css="propiedad:valor"; este observador lo aplica con CSSOM
   (element.style.setProperty), que la CSP sí permite. Solo acepta propiedades
   de presentación de la lista. */
(function(){
  const PERMITIDAS=new Set(['width','height','background','background-color','color','border-color','display','font-size','font-family','margin-top','transition','justify-content','gap','flex-wrap','align-items','left','top','opacity']);
  const aplicar=el=>{const d=el.getAttribute('data-css');if(d==null)return;el.removeAttribute('data-css');
    d.split(';').forEach(p=>{const i=p.indexOf(':');if(i<1)return;const k=p.slice(0,i).trim().toLowerCase(),v=p.slice(i+1).trim();if(PERMITIDAS.has(k)&&!/url\(|expression|javascript:/i.test(v))el.style.setProperty(k,v);});};
  const barrer=r=>{if(r.nodeType!==1)return;if(r.hasAttribute('data-css'))aplicar(r);r.querySelectorAll('[data-css]').forEach(aplicar);};
  new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='attributes')aplicar(m.target);else m.addedNodes.forEach(barrer);})).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-css']});
  barrer(document.body);
})();

(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt=(x,d=3)=>x.toFixed(d).replace('.',',');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ================= Motor de simulación: SIN simplificado de dos áreas ================= */
const F0=60;
const EDAC=[[59.4,200],[59.2,300],[59.0,400],[58.8,400],[58.6,600],[58.6,1000],[58.4,2000],[58.4,4000]]; // Acuerdo CNO 1797 de 2024 (Hz, ms)
function defaultParams(){return {
  HA:4.5,SA:8000,HB:4.0,SB:6000, Dpct:1.5, Rth:5, Rh:5, Tt:4, Tg:0.3, Tw:1.6, gateRate:0.16,
  Ki:0.04, Ks:1400, Kd:250, Brel:1.0, rsvPct:3, unitMW:250, nUnits:4, lineRating:420, l3Rating:900,
  loadA:5200, loadB:3800, impC:420, expB:600, hydroP0:630, unitsOn0:3, alphaH:0.5, startTime:60,
  blackoutHz:57.5, compress:true};}
function newSim(P){
  P=Object.assign(defaultParams(),P||{});
  const s={P,t:0,dfA:0,dfB:0,dA:0,dB:0,
    lines:{L1:true,L2:true,L3:true}, relay:{L1:0,L2:0,L3:0},
    unitsOn:P.unitsOn0, unitState:[],
    thA:0,thB:0, g:0,y:0, zA:0,zB:0,
    setH:P.hydroP0, local:false, link:true, agc:true, agcPlant:true,
    redisp:0, shedManA:0, shedManB:0, edacA:Array(8).fill(0), edacB:Array(8).fill(0), edacTimerA:Array(8).fill(0), edacTimerB:Array(8).fill(0),
    rampA:0, rampTarget:0, rampRate:0, osc:{on:false,amp:0,tripped:false,dmg:0},
    blackout:false, bt:0, log:[], hist:[], events:[], lastHist:-1, PmH:0, PL_A:0, PL_B:0, Pab:0, ace:0, rocof:0, qH:180, vBus:1.0};
  for(let i=0;i<P.nUnits;i++) s.unitState.push(i<P.unitsOn0?'on':'off');
  s.unitTimer=Array(P.nUnits).fill(0);
  // equilibrio inicial
  const genA=P.loadA-P.expB-P.impC; s.thA=genA-P.hydroP0; s.thB=P.loadB+P.expB;
  s.th0A=s.thA; s.th0B=s.thB; s.capThA=s.thA*1.12; s.capThB=s.thB*1.12;
  const C=P.unitsOn0*P.unitMW; s.g=P.hydroP0/C; s.y=s.g;
  const ang=P.expB/(2*P.Ks); s.dB=ang/2; s.dA=-ang/2;
  s.schedAB=-P.expB; // flujo programado A->B
  s.PmH=P.hydroP0; s.PL_A=P.loadA; s.PL_B=P.loadB; s.Pab=-P.expB;
  return s;
}
function nLinesAB(s){return (s.lines.L1?1:0)+(s.lines.L2?1:0);}
function hydroCap(s){return s.unitsOn*s.P.unitMW;}
function loadA(s){const P=s.P;const base=P.loadA*(1+s.rampA);const shed=s.edacA.reduce((a,b)=>a+b,0)*0.05*P.loadA+s.shedManA;return Math.max(0,base-shed);}
function loadB(s){const P=s.P;const shed=s.edacB.reduce((a,b)=>a+b,0)*0.05*P.loadB+s.shedManB;return Math.max(0,P.loadB-shed);}
function stepSim(s,dt){
  const P=s.P; if(s.blackout) {s.t+=dt;return;}
  // rampa de demanda
  if(s.rampA<s.rampTarget) s.rampA=Math.min(s.rampTarget,s.rampA+s.rampRate*dt);
  const PLA=loadA(s), PLB=loadB(s); s.PL_A=PLA; s.PL_B=PLB;
  const DA=PLA*P.Dpct/100/(0.01*F0), DB=PLB*P.Dpct/100/(0.01*F0);
  // flujo de enlace A->B
  const n=nLinesAB(s); const Pab=n*P.Ks*(s.dA-s.dB)+n*P.Kd*(s.dfA-s.dfB); s.Pab=Pab;
  const impC=s.lines.L3?P.impC:0;
  // AGC (control secundario)
  const betaA=DA+ (s.th0A/(P.Rth/100*F0))*0.35 + hydroCap(s)/(P.Rh/100*F0);
  const betaB=DB+ (s.th0B/(P.Rth/100*F0))*0.35;
  const aceA=(Pab-s.schedAB)+P.Brel*betaA*s.dfA; const aceB=(-Pab+s.schedAB)+P.Brel*betaB*s.dfB; s.ace=aceA;
  if(s.agc){ s.zA+=-P.Ki*aceA*dt; s.zB+=-P.Ki*aceB*dt; }
  const plantRemote=s.link&&!s.local&&s.agcPlant;
  const shareH=plantRemote?P.alphaH:0;
  // límites de AGC por capacidad
  const headA=(s.capThA-s.th0A)+(plantRemote?(hydroCap(s)-s.setH):0);
  s.zA=Math.max(-2000,Math.min(headA+200,s.zA)); s.zB=Math.max(-2000,Math.min(s.capThB-s.th0B+200,s.zB));
  // térmicas agregadas con reserva primaria limitada
  const rsvA=P.rsvPct/100*s.th0A, rsvB=P.rsvPct/100*s.th0B;
  const govA=Math.max(-rsvA,Math.min(rsvA,-(s.th0A/(P.Rth/100))*(s.dfA/F0)));
  const govB=Math.max(-rsvB,Math.min(rsvB,-(s.th0B/(P.Rth/100))*(s.dfB/F0)));
  const refA=Math.min(s.capThA,s.th0A+s.zA*(1-shareH)+s.redisp+govA);
  const refB=Math.max(0,Math.min(s.capThB,s.th0B+s.zB-s.redisp+govB));
  s.thA+=(refA-s.thA)/P.Tt*dt; s.thB+=(refB-s.thB)/P.Tt*dt;
  // central hidroeléctrica: gobernador + servomotor + turbina con golpe de ariete
  const C=hydroCap(s);
  let pset=s.setH+(plantRemote?s.zA*shareH:0);
  const govH=-(C/(P.Rh/100))*(s.dfA/F0);
  const cmd=C>0?Math.max(0,Math.min(1,(pset+govH)/C)):0;
  const dg=Math.max(-P.gateRate,Math.min(P.gateRate,(cmd-s.g)/P.Tg));
  s.g=Math.max(0,Math.min(1,s.g+dg*dt));
  s.y+=(s.g-s.y)/(0.5*P.Tw)*dt;
  let PmH=C*(3*s.y-2*s.g);
  if(s.osc.on&&!s.osc.tripped){s.osc.amp=Math.min(140,s.osc.amp+5*dt);PmH+=s.osc.amp*Math.sin(2*Math.PI*s.t/2.6);s.osc.dmg+=dt*(s.osc.amp/140);}
  s.PmH=PmH;
  // ecuaciones de oscilación por área
  const EA=P.HA*P.SA, EB=P.HB*P.SB;
  const imbA=PmH+s.thA+impC-PLA-DA*s.dfA-Pab;
  const imbB=s.thB-PLB-DB*s.dfB+Pab;
  const dfAdot=F0/(2*EA)*imbA, dfBdot=F0/(2*EB)*imbB;
  s.rocof=dfAdot;
  s.dfA+=dfAdot*dt; s.dfB+=dfBdot*dt;
  s.dA+=2*Math.PI*s.dfA*dt; s.dB+=2*Math.PI*s.dfB*dt;
  // relés térmicos de líneas (curva inversa didáctica)
  const per=n?Math.abs(Pab)/n:0;
  for(const L of ['L1','L2']){ if(!s.lines[L]) continue; const ld=per/P.lineRating;
    if(ld>1.0){const ttrip=Math.max(4,Math.min(120,24/(ld*ld-1)));s.relay[L]+=dt/ttrip; if(s.relay[L]>=1){s.lines[L]=false;s.relay[L]=0;evt(s,'trip',L,'Disparo por sobrecarga térmica de la línea '+L);} }
    else s.relay[L]=Math.max(0,s.relay[L]-dt/60);}
  // EDAC por baja frecuencia (8 etapas, 5 % c/u)
  edac(s,'A',60+s.dfA,dt); edac(s,'B',60+s.dfB,dt);
  // arranque de unidades
  for(let i=0;i<P.nUnits;i++) if(s.unitState[i]==='starting'){s.unitTimer[i]-=dt; if(s.unitTimer[i]<=0){const n0=s.unitsOn;s.unitState[i]='on';s.unitsOn++;rescaleGate(s,n0);evt(s,'unit','U'+(i+1),'Unidad U'+(i+1)+' sincronizada');}}
  // potencia reactiva y tensión (modelo cuasiestático didáctico)
  const qNeed=180+0.12*Math.max(0,PLA-P.loadA)+(n<2?160:0)+(s.lines.L3?0:120);
  s.vBus=1+(s.qH-qNeed)/2400;
  // apagón
  if(60+s.dfA<P.blackoutHz){s.bt+=dt;if(s.bt>1){s.blackout=true;evt(s,'blackout','A','Apagón del área Centro: actuó la protección de baja frecuencia de los generadores');}} else s.bt=0;
  s.t+=dt;
  if(s.t-s.lastHist>=0.2){s.lastHist=s.t;s.hist.push([+s.t.toFixed(2),+(60+s.dfA).toFixed(4),+(60+s.dfB).toFixed(4),+Pab.toFixed(1),+PmH.toFixed(1),+s.thA.toFixed(1),+PLA.toFixed(1),+s.rocof.toFixed(4)]);if(s.hist.length>6000)s.hist.shift();}
}
function rescaleGate(s,n0){const n1=s.unitsOn; if(n1<=0){s.g=0;s.y=0;return;} const k=n0/n1; s.g*=k; s.y*=k;}
function edac(s,area,f,dt){
  const st=area==='A'?s.edacA:s.edacB, tm=area==='A'?s.edacTimerA:s.edacTimerB;
  for(let i=0;i<8;i++){ if(st[i]) continue; const [th,ms]=EDAC[i];
    if(f<=th){tm[i]+=dt; if(tm[i]*1000>=ms){st[i]=1;evt(s,'edac',area,`EDAC etapa ${i+1} (${th.toFixed(1)} Hz): deslastre de 5 % de la demanda del área ${area==='A'?'Centro':'Norte'}`);}}
    else tm[i]=0;}
}
function evt(s,type,who,msg){s.events.push({t:s.t,type,who,msg});}
/* acciones de los roles */
function tripLine(s,L){if(s.lines[L]){s.lines[L]=false;evt(s,'trip',L,'Disparo de la línea '+L);}}
function closeLine(s,L){if(!s.lines[L]){s.lines[L]=true;s.relay[L]=0;evt(s,'close',L,'Línea '+L+' reconectada');}}
function startUnit(s,i){if(s.unitState[i]==='off'){s.unitState[i]='starting';s.unitTimer[i]=s.P.startTime;evt(s,'unit','U'+(i+1),'Arranque de la unidad U'+(i+1)+' (sincroniza en '+s.P.startTime+' s)');}}
function tripUnit(s,i){if(s.unitState[i]==='on'){const n0=s.unitsOn;s.unitState[i]='off';s.unitsOn--; if(s.unitsOn<=0){s.g=0;s.y=0;} if(i===1&&s.osc.on){s.osc.tripped=true;} evt(s,'unit','U'+(i+1),'Disparo de la unidad U'+(i+1));}}
if(typeof module!=='undefined') module.exports={newSim,stepSim,startUnit,tripUnit,tripLine,closeLine,EDAC,defaultParams,hydroCap,nLinesAB};


/* ---------- progreso (por navegador) ---------- */
const KEY='lab-gridmasters-v1';
const BADGES=[
 {id:'balance',ab:'BL',n:'Balance entendido',d:'Explora los tres experimentos de fundamentos.'},
 {id:'guiado',ab:'N1',n:'Contingencia superada',d:'Termina el escenario guiado sin apagón, responde al rayo y haz al menos tres maniobras.'},
 {id:'sinedac',ab:'0E',n:'Sin deslastre',d:'Supera el rayo en L3 sin que actúe el EDAC.'},
 {id:'voz',ab:'RD',n:'Enlace por voz',d:'Transmite una consigna por radio con el telecontrol caído.'},
 {id:'proteccion',ab:'PR',n:'Decisión de protección',d:'Dispara U2 a tiempo durante la oscilación.'},
 {id:'master',ab:'GM',n:'Grid Master',d:'Termina Grid Masters con 900 PES o más.'},
 {id:'investigador',ab:'IN',n:'Investigador',d:'Revisa los datos de una sesión en el nivel docente e investigador.'},
 {id:'quiz',ab:'QZ',n:'Repaso completo',d:'Responde bien todas las preguntas.'}];
function defP(){return {xp:0,badges:[],quiz:{},board:[],fund:[],inst:{}};}
let PR=defP(); try{const r=localStorage.getItem(KEY); if(r) PR=Object.assign(defP(),JSON.parse(r));}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(PR));}catch(e){}}
let tt=null; function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2600);}
function addXP(n,why){if(n<=0)return;PR.xp+=n;save();$('#xpVal').textContent=PR.xp;toast(`+${n} VX · ${why}`);}
function badge(id){if(PR.badges.includes(id))return;PR.badges.push(id);save();renderBadges();const b=BADGES.find(x=>x.id===id);setTimeout(()=>toast('Insignia: '+b.n),900);}
function renderBadges(){$('#badges').innerHTML=BADGES.map(b=>{const on=PR.badges.includes(b.id);return `<div class="badge ${on?'on':''}"><div class="ico" aria-hidden="true">${b.ab}</div><div><b>${esc(b.n)}</b><span>${esc(b.d)}</span><span class="mono e-d791c5d">${on?'Obtenida':'Bloqueada'}</span></div></div>`;}).join('');}
$('#xpVal').textContent=PR.xp;

/* ---------- nivel ---------- */
let LVL='pre';
try{const l=localStorage.getItem(KEY+'-lvl'); if(l==='inv'||l==='pre') LVL=l;}catch(e){}
function setLevel(l){LVL=l;document.body.classList.toggle('lvl-pre',l==='pre');document.body.classList.toggle('lvl-inv',l==='inv');$$('[data-lvl]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lvl===l)));try{localStorage.setItem(KEY+'-lvl',l);}catch(e){}drawAll();}
$$('[data-lvl]').forEach(b=>b.onclick=()=>setLevel(b.dataset.lvl));

/* ---------- gráficas en canvas ---------- */
function prep(cv){const dpr=window.devicePixelRatio||1;const W=+cv.getAttribute('width'),H=+cv.getAttribute('height');const cw=cv.clientWidth||W;const w=Math.round(cw*dpr),h=Math.round(cw*H/W*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}const c=cv.getContext('2d');c.setTransform(cv.width/W,0,0,cv.height/H,0,0);return {c,W,H};}
function plot(cv,o){
  const {c,W,H}=prep(cv);const L=o.left||52,R=o.right||(o.y2?52:14),T=12,B=30;const pw=W-L-R,ph=H-T-B;
  c.fillStyle=css('--console');c.fillRect(0,0,W,H);
  const X=t=>L+(t-o.x0)/(o.x1-o.x0)*pw, Y=v=>T+(1-(v-o.y0)/(o.y1-o.y0))*ph, Y2=v=>T+(1-(v-o.y2[0])/(o.y2[1]-o.y2[0]))*ph;
  c.strokeStyle='#ffffff14';c.lineWidth=1;c.font='11px Noto Sans Mono, monospace';c.fillStyle='#93A3B6';
  for(let i=0;i<=o.ny;i++){const v=o.y0+(o.y1-o.y0)*i/o.ny;const y=Y(v);c.beginPath();c.moveTo(L,y);c.lineTo(L+pw,y);c.stroke();c.textAlign='right';c.fillText(o.yfmt?o.yfmt(v):v.toFixed(2),L-6,y+4);}
  for(let i=0;i<=o.nx;i++){const t=o.x0+(o.x1-o.x0)*i/o.nx;const x=X(t);c.beginPath();c.moveTo(x,T);c.lineTo(x,T+ph);c.stroke();c.textAlign='center';c.fillText((o.xfmt?o.xfmt(t):Math.round(t))+'',x,H-12);}
  if(o.y2){c.textAlign='left';for(let i=0;i<=o.ny;i++){const v=o.y2[0]+(o.y2[1]-o.y2[0])*i/o.ny;c.fillText(Math.round(v)+'',L+pw+6,Y2(v)+4);}}
  (o.bands||[]).forEach(b=>{c.fillStyle=b.fill;const ya=Y(Math.min(o.y1,b.hi)),yb=Y(Math.max(o.y0,b.lo));c.fillRect(L,ya,pw,yb-ya);});
  (o.hlines||[]).forEach(h=>{if(h.v<o.y0||h.v>o.y1)return;c.strokeStyle=h.color;c.setLineDash(h.dash||[5,4]);c.beginPath();c.moveTo(L,Y(h.v));c.lineTo(L+pw,Y(h.v));c.stroke();c.setLineDash([]);if(h.label){c.fillStyle=h.color;c.textAlign='left';c.fillText(h.label,L+6,Y(h.v)-4);}});
  (o.vlines||[]).forEach(v=>{if(v.t<o.x0||v.t>o.x1)return;c.strokeStyle='#ffffff40';c.setLineDash([2,4]);c.beginPath();c.moveTo(X(v.t),T);c.lineTo(X(v.t),T+ph);c.stroke();c.setLineDash([]);if(v.label){c.fillStyle='#C9D4E2';c.textAlign='left';c.fillText(v.label,X(v.t)+4,T+12);}});
  c.save();c.beginPath();c.rect(L,T,pw,ph);c.clip();
  for(const s of o.series){c.strokeStyle=s.color;c.lineWidth=s.w||2;c.beginPath();let st=false;for(const p of s.pts){if(p[0]<o.x0-1)continue;const x=X(p[0]),y=s.axis2?Y2(p[1]):Y(p[1]);if(!st){c.moveTo(x,y);st=true;}else c.lineTo(x,y);}c.stroke();}
  c.restore();
  if(o.ylabel){c.save();c.fillStyle='#93A3B6';c.translate(12,T+ph/2);c.rotate(-Math.PI/2);c.textAlign='center';c.fillText(o.ylabel,0,0);c.restore();}
  if(o.xlabel){c.fillStyle='#93A3B6';c.textAlign='right';c.fillText(o.xlabel,L+pw,H-0);}
}
const BAND=[{lo:59.8,hi:60.2,fill:'rgba(56,193,114,.10)'}];
const FLINES=[{v:59.4,color:'#FF5A5F',label:'EDAC etapa 1 · 59,4 Hz'},{v:59.8,color:'#38C17288'},{v:60.2,color:'#38C17288'}];

/* ---------- héroe: corrida real del motor ---------- */
function heroRun(){const s=newSim({});const dt=0.02;const pts=[];for(let i=0;i<70/dt;i++){if(Math.abs(s.t-5)<dt/2)tripLine(s,'L3');stepSim(s,dt);if(i%5===0)pts.push([s.t,60+s.dfA]);}return pts;}
let HERO=null;
function drawHero(){if(!HERO)HERO=heroRun();plot($('#heroCv'),{x0:0,x1:70,y0:59.1,y1:60.2,ny:5,nx:7,series:[{pts:HERO,color:css('--trace'),w:2.5}],bands:BAND,hlines:FLINES,vlines:[{t:5,label:'Disparo de L3'}],yfmt:v=>fmt(v,1),xlabel:'s',ylabel:'Hz'});}

/* ---------- Fundamentos 1: una sola área ---------- */
function f1(){
  const H=+$('#f1H').value,R=+$('#f1R').value,dP=+$('#f1P').value,agc=$('#f1agc').checked;
  $('#f1Ho').textContent=fmt(H,1)+' s';$('#f1Ro').textContent=fmt(R,1)+' %';$('#f1Po').textContent=dP+' MW';
  const S=10000,PL=9000,Pg=8000,D=PL*1.5/100/(0.01*60),rsv=0.05*Pg;let df=0,pm=0,z=0,nad=60;const dt=0.02,pts=[];
  for(let t=0;t<=60;t+=dt){const gov=Math.max(-rsv,Math.min(rsv,-(Pg/(R/100))*(df/60)));if(agc)z+=-0.03*(D+Pg/(R/100*60))*df*dt;pm+=(gov+z-pm)/4*dt;const imb=pm-(t>=1?dP:0)-D*df;df+=60/(2*H*S)*imb*dt;nad=Math.min(nad,60+df);if(Math.round(t/dt)%5===0)pts.push([t,60+df]);}
  const rocof=-dP*60/(2*H*S);
  $('#f1rocof').textContent=fmt(rocof,3)+' Hz/s';$('#f1nadir').textContent=fmt(nad,3)+' Hz';$('#f1ss').textContent=fmt(pts[pts.length-1][1],3)+' Hz';
  const lo=Math.min(59.0,Math.floor((nad-0.1)*10)/10);
  plot($('#f1cv'),{x0:0,x1:60,y0:lo,y1:60.2,ny:5,nx:6,series:[{pts,color:css('--trace'),w:2.5}],bands:BAND,hlines:FLINES,yfmt:v=>fmt(v,1),xlabel:'s',ylabel:'Hz'});
  const txt=nad<59.4?`La frecuencia baja hasta ${fmt(nad,2)} Hz y cruza el umbral de la primera etapa del EDAC: en la red real se desconectaría carga.`:`La frecuencia toca fondo en ${fmt(nad,2)} Hz sin llegar a 59,4 Hz.`;
  $('#f1txt').textContent=txt+(agc?' Con AGC, la frecuencia vuelve a 60 Hz porque el control secundario repone la potencia perdida.':' Sin AGC, la regulación primaria detiene la caída, pero la frecuencia queda por debajo de 60 Hz: el estatismo deja un error permanente.');
}
['f1H','f1R','f1P','f1agc'].forEach(id=>$('#'+id).addEventListener('input',()=>{f1();fund('f1');}));
/* Fundamentos 2: turbina hidráulica */
function f2(){const Tw=+$('#f2Tw').value;$('#f2Two').textContent=fmt(Tw,1)+' s';const pts=[],gate=[];for(let t=-1;t<=10;t+=0.02){gate.push([t,t<0?0:1]);pts.push([t,t<0?0:1-3*Math.exp(-2*t/Tw)]);}
  plot($('#f2cv'),{x0:-1,x1:10,y0:-2.2,y1:1.4,ny:6,nx:11,series:[{pts:gate,color:css('--traceB'),w:1.5},{pts,color:css('--trace'),w:2.5}],hlines:[{v:0,color:'#ffffff40'}],yfmt:v=>fmt(v,1),xlabel:'s',ylabel:'p.u. del escalón'});}
$('#f2Tw').addEventListener('input',()=>{f2();fund('f2');});
/* Fundamentos 3: capabilidad */
const CAP={S:278,P:250,Pmin:62,X:278,Rf:471,qu:-120};
let cp={P:200,Q:80};
function capStatus(P,Q){if(P>CAP.P)return['Supera la potencia de la turbina','bad'];if(P*P+Q*Q>CAP.S*CAP.S)return['Sobrecarga del estator','bad'];if(P*P+(Q+CAP.X)*(Q+CAP.X)>CAP.Rf*CAP.Rf)return['Sobrecalentamiento del rotor (campo)','bad'];if(Q<CAP.qu)return['Subexcitación: riesgo de inestabilidad','bad'];if(P<CAP.Pmin)return['Bajo el mínimo técnico','warn'];return['Dentro de la curva','ok'];}
function f3(){const cv=$('#f3cv');const {c,W,H}=prep(cv);c.fillStyle=css('--console');c.fillRect(0,0,W,H);
  const L=56,T=16,pw=W-L-20,ph=H-T-36;const X=q=>L+(q+200)/(520)*pw,Y=p=>T+(1-p/300)*ph;
  c.strokeStyle='#ffffff14';c.font='11px Noto Sans Mono, monospace';c.fillStyle='#93A3B6';
  for(let q=-200;q<=320;q+=80){c.beginPath();c.moveTo(X(q),T);c.lineTo(X(q),T+ph);c.stroke();c.textAlign='center';c.fillText(q,X(q),H-18);}
  for(let p=0;p<=300;p+=50){c.beginPath();c.moveTo(L,Y(p));c.lineTo(L+pw,Y(p));c.stroke();c.textAlign='right';c.fillText(p,L-6,Y(p)+4);}
  c.fillText('Q (MVAr) →',L+pw,H-4);c.save();c.translate(14,T+ph/2);c.rotate(-Math.PI/2);c.textAlign='center';c.fillText('P (MW)',0,0);c.restore();
  // región permitida
  c.beginPath();let first=true;for(let p=0;p<=CAP.P;p+=2){const q=Math.min(Math.sqrt(Math.max(0,CAP.S*CAP.S-p*p)),Math.sqrt(Math.max(0,CAP.Rf*CAP.Rf-p*p))-CAP.X);if(first){c.moveTo(X(q),Y(p));first=false;}else c.lineTo(X(q),Y(p));}
  c.lineTo(X(Math.max(CAP.qu,-Math.sqrt(Math.max(0,CAP.S*CAP.S-CAP.P*CAP.P)))),Y(CAP.P));for(let p=CAP.P;p>=0;p-=2){const q=Math.max(CAP.qu,-Math.sqrt(Math.max(0,CAP.S*CAP.S-p*p)));c.lineTo(X(q),Y(p));}c.closePath();
  c.fillStyle='rgba(56,193,114,.14)';c.fill();c.strokeStyle='#38C172';c.lineWidth=2;c.stroke();
  c.strokeStyle='#F2B53A';c.setLineDash([5,4]);c.beginPath();c.moveTo(X(-200),Y(CAP.Pmin));c.lineTo(X(320),Y(CAP.Pmin));c.stroke();c.setLineDash([]);c.fillStyle='#F2B53A';c.textAlign='left';c.fillText('mínimo técnico',X(-195),Y(CAP.Pmin)-4);
  c.fillStyle='#C9D4E2';c.fillText('límite de campo',X(150),Y(255));c.fillText('subexcitación',X(-190),Y(150));
  const [st,cls]=capStatus(cp.P,cp.Q);c.beginPath();c.arc(X(cp.Q),Y(cp.P),8,0,Math.PI*2);c.fillStyle=cls==='ok'?'#38C172':(cls==='warn'?'#F2B53A':'#FF5A5F');c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();
  $('#f3P').textContent=Math.round(cp.P)+' MW';$('#f3Q').textContent=Math.round(cp.Q)+' MVAr';$('#f3S').textContent=st;$('#f3S').style.color=cls==='ok'?'var(--ok)':(cls==='warn'?'var(--warn)':'var(--bad)');
  cv._map={L,T,pw,ph,W,H};}
(function(){const cv=$('#f3cv');let drag=false;const set=e=>{const m=cv._map;const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*m.W,y=(e.clientY-r.top)/r.height*m.H;cp.Q=Math.max(-200,Math.min(320,(x-m.L)/m.pw*520-200));cp.P=Math.max(0,Math.min(300,(1-(y-m.T)/m.ph)*300));f3();fund('f3');};
  cv.addEventListener('pointerdown',e=>{drag=true;cv.setPointerCapture(e.pointerId);set(e);});cv.addEventListener('pointermove',e=>{if(drag)set(e);});cv.addEventListener('pointerup',()=>drag=false);cv.style.touchAction='none';cv.style.cursor='crosshair';
  cv.addEventListener('keydown',e=>{const k=e.key;if(k==='ArrowUp')cp.P=Math.min(300,cp.P+5);else if(k==='ArrowDown')cp.P=Math.max(0,cp.P-5);else if(k==='ArrowRight')cp.Q=Math.min(320,cp.Q+5);else if(k==='ArrowLeft')cp.Q=Math.max(-200,cp.Q-5);else return;e.preventDefault();f3();fund('f3');});})();
function fund(id){if(PR.fund.includes(id))return;PR.fund.push(id);save();if(PR.fund.length===3){addXP(15,'fundamentos explorados');badge('balance');}}
let fundReady=false;

/* ---------- simulador ---------- */
const SPEC={guiado:{end:300,name:'Escenario guiado N-1'},juego:{end:420,name:'Grid Masters'},libre:{end:1e9,name:'Libre'}};
const G={mode:'guiado',speed:1,run:false,sim:null,params:defaultParams(),score:null,done:false,ended:false,role:'cnd',queueSet:null,queuePlant:null,lastLink:true,acted:{},lastEvent:null,phase:'Lista',scriptDone:{},osc:null,outT:0,radio:[],bandExit:null,overload:null,shedFlag:null};
function resetSim(keepDraft){
  G.sim=newSim(Object.assign({},G.params,G.draftOpts||{}));G.run=false;G.done=false;G.ended=false;G.queueSet=null;G.queuePlant=null;G.acted={};G.lastEvent=null;G.scriptDone={};G.radio=[];G.bandExit=null;G.overload=null;G.shedFlag=null;G.evSeen=0;G.noEdacB=false;G.nudged={};G.nAct=0;G.recover=null;G.osc=null;G.voiceBonus=0;G.warnedLocal=0;outAcc=0;
  G.score={pes:1000,items:[]};if(G.mode==='juego'&&G.draftCost){pes(-G.draftCost,'Costo de la reserva elegida en la preparación');}
  $('#playBtn').textContent='▶ Iniciar';$('#cSet').value=G.sim.setH;$('#pSet').value=G.sim.setH;$('#cAgc').checked=true;$('#cRed').value=0;$('#pQ').value=180;
  setPlantMode('remoto',true);$('#log').innerHTML='';$('#mRadio').innerHTML='';radio('Sistema','Enlace de telecontrol en servicio. Canal de voz de respaldo disponible.','in');
  G.phase='Lista';coach(G.mode==='juego'?'Salida: mueve «Unidades de El Cañón en línea» y «Reserva primaria de las térmicas», mira el costo y pulsa «Confirmar y empezar». Entonces arranca el reloj.':(G.mode==='guiado'?'Paso 1: repartan los roles (CND, Planta, Protecciones y Comunicaciones) y pulsen «▶ Iniciar». Durante el primer minuto todo está en calma: observen la frecuencia en 60 Hz.':'Modo libre: abre el «Panel del docente» y lanza los eventos cuando quieras.'));
  $('#draft').hidden=!(G.mode==='juego'&&!keepDraft);
  buildUnits();buildShed();updateUI(true);
}
function pes(n,why){if(!G.score)return;if(n<0&&G.score.pes<=0)return;G.score.pes=Math.max(0,G.score.pes+n);G.score.items.push([why,n,G.sim?G.sim.t:0]);}
function coach(t){$('#coachTxt').textContent=t;}
function log(t,cls){const p=document.createElement('p');p.className=cls||'';p.textContent=`[${fmtT(G.sim.t)}] ${t}`;const b=$('#log');b.prepend(p);while(b.children.length>80)b.lastChild.remove();}
function radio(who,t,dir){const p=document.createElement('p');p.className=dir||'';p.textContent=`${G.sim?fmtT(G.sim.t):'00:00'} ${who}: ${t}`;$('#mRadio').prepend(p);}
function fmtT(t){const m=Math.floor(t/60),s=Math.floor(t%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function act(role,what){const s=G.sim;G.nAct=(G.nAct||0)+1;G.roles=G.roles||{};G.roles[role]=1;if(G.lastEvent&&!G.acted[G.lastEvent.id]){G.acted[G.lastEvent.id]=s.t-G.lastEvent.t;}log(`${role}: ${what}`,'ok');}
/* guion de eventos */
function inject(ev,auto){const s=G.sim;
  if(ev==='ramp'){s.rampTarget=Math.min(0.2,s.rampTarget+0.06);s.rampRate=0.06/60;log('Inicia la rampa de demanda del área Centro (+6 % en 60 s)','warn');coach('Evento 1 · La demanda del Centro sube. CND: deja marcado «AGC activo», sube «Consigna para El Cañón» unos 50 MW y pulsa «Enviar consigna». Planta: pulsa «Arrancar» en una unidad parada; tarda 60 s y será tu reserva para el rayo.');}
  if(ev==='L3'){tripLine(s,'L3');newEvent('L3');coach('Evento 2 · ¡Rayo en L3! Faltan 420 MW y la frecuencia cae. CND: sube «Consigna para El Cañón» y pulsa «Enviar consigna». Planta: pulsa «Arrancar» en cualquier unidad parada. Si la frecuencia baja de 59,5 Hz, CND pulsa un botón de «Alivio de carga manual» antes de que actúe el EDAC.');}
  if(ev==='L1'){tripLine(s,'L1');newEvent('L1');coach('Evento 3 · Segundo rayo: L1 fuera y todo el flujo va por L2. CND: mueve «Redespacho Norte → Centro» hacia la derecha hasta que L2 quede en verde o amarillo en el diagrama (menos de 100 %). Tienes menos de un minuto.');}
  if(ev==='link'){s.link=false;newEvent('link');coach('Evento '+(G.mode==='juego'?'4':'3')+' · Telecontrol caído: las consignas ya no llegan solas. 1) Planta: pulsa «Local». 2) CND: elige la consigna y pulsa «Enviar consigna». 3) Comunicaciones: pulsa «Transmitir por radio a la planta». 4) Planta: pulsa «Aplicar consigna».');radio('Sistema','Enlace IEC 60870-5-104 caído. Usar canal de voz.','in');}
  if(ev==='linkok'){s.link=true;log('Telecontrol restablecido','ok');radio('Sistema','Enlace IEC 60870-5-104 restablecido.','in');}
  if(ev==='osc'){s.osc.on=true;s.osc.amp=10;s.osc.dmg=0;G.osc={t:s.t};newEvent('osc');coach('Evento 5 · U2 oscila y su vibración crece. Protecciones: pulsa «Disparar unidad U2» antes de 20 s (suma puntos); si esperas más de 45 s, la máquina se daña. Planta: luego arranca otra unidad para reponer esos MW.');}
  if(ev==='unit'){const i=s.unitState.findIndex(u=>u==='on');if(i>=0){tripUnit(s,i);newEvent('unit');}}
  if(!auto&&G.mode!=='libre')log('Evento inyectado por el docente','warn');
}
function newEvent(id){G.lastEvent={id:id+'@'+Math.round(G.sim.t),t:G.sim.t,kind:id};G.bandExit=null;if(id==='L3'||id==='unit'||id==='L1'){G.recover={t:G.sim.t,done:false};}}
const SCRIPT={guiado:[[60,'ramp'],[120,'L3'],[200,'link']],juego:[[10,'ramp'],[90,'L3'],[150,'L1'],[210,'link'],[300,'osc']],libre:[]};
function runScript(){const s=G.sim;for(const [t,ev] of SCRIPT[G.mode]){const k=t+ev;if(!G.scriptDone[k]&&s.t>=t){G.scriptDone[k]=1;inject(ev,true);}}
  const ph=G.mode==='juego'?(s.t<10?'Salida':s.t<90?'Evento 1 · Rampa':s.t<150?'Evento 2 · Rayo L3':s.t<210?'Evento 3 · Rayo L1':s.t<300?'Evento 4 · Sin telecontrol':s.t<420?'Evento 5 · Oscilación U2':'Meta'):(G.mode==='guiado'?(s.t<60?'Calma':s.t<120?'Evento 1 · Rampa':s.t<200?'Evento 2 · Rayo L3':'Evento 3 · Sin telecontrol'):'Libre');G.phase=ph;
  nudgeTick();}
/* recordatorios cuando nadie responde (siempre en el guiado; en Grid Masters solo en Pregrado) */
const NUDGE={ramp:'Recordatorio · La rampa sigue. CND: pulsa «Enviar consigna» con un valor más alto. Planta: pulsa «Arrancar» en la unidad parada.',
 L3:'Recordatorio · Nadie ha respondido al rayo. Planta: pulsa «Arrancar» en una unidad parada. CND: sube «Consigna para El Cañón» y pulsa «Enviar consigna».',
 L1:'Recordatorio · Mira L2 en el diagrama: si está en rojo, su relé térmico ya cuenta. CND: mueve «Redespacho Norte → Centro» a la derecha.',
 link:'Recordatorio · Sin telecontrol nada cambia solo. Planta: pulsa «Local». Comunicaciones: pulsa «Transmitir por radio a la planta» cuando aparezca la consigna del CND.',
 osc:'Recordatorio · U2 sigue oscilando. Protecciones: pulsa «Disparar unidad U2» ahora.'};
function nudgeTick(){const s=G.sim;if(!G.run||G.ended||G.mode==='libre')return;if(G.mode==='juego'&&LVL!=='pre')return;G.nudged=G.nudged||{};
  const e=G.lastEvent;if(e&&!G.acted[e.id]&&!G.nudged[e.id]&&s.t-e.t>=(e.kind==='osc'?10:15)&&NUDGE[e.kind]){G.nudged[e.id]=1;coach(NUDGE[e.kind]);toast('La guía tiene una sugerencia');}
  const f=60+s.dfA;if(f<59.5&&(!e||s.t-e.t>=7)&&s.edacA.every(x=>!x)&&!s.shedManA&&!G.nudged.shed){G.nudged.shed=1;coach('¡Atención! La frecuencia está en '+fmt(f,2)+' Hz. CND: pulsa ya un botón de «Alivio de carga manual» (100 MW) para que no actúe el EDAC.');}
}
/* puntaje en tiempo real */
let outAcc=0;
function scoreTick(dt){const s=G.sim;if(G.mode!=='juego'){/* el guiado también mide, sin puntaje visible */}
  const f=60+s.dfA;const out=f<59.8||f>60.2;
  if(out){outAcc+=dt;if(outAcc>=1){outAcc-=1;if(G.mode==='juego')pes(-10,'Segundo fuera de la banda de 59,8 a 60,2 Hz');}if(!G.bandExit)G.bandExit=s.t;}
  else if(G.bandExit!=null){const d=s.t-G.bandExit;if(G.recover&&!G.recover.done&&G.recover.t<=G.bandExit+1){G.recover.done=true;if(d<=30&&G.mode==='juego'){pes(100,`Frecuencia restablecida a la banda en ${Math.round(d)} s`);log(`Frecuencia de vuelta en banda en ${Math.round(d)} s · +100 PES`,'ok');}}G.bandExit=null;}
  // sobrecarga de L2 aliviada
  const n=nLinesAB(s);const per=n?Math.abs(s.Pab)/n:0;const ol=per>G.sim.P.lineRating;
  if(ol&&!G.overload)G.overload={t:s.t};
  if(!ol&&G.overload){const d=s.t-G.overload.t;if(d<=60&&n>0&&G.mode==='juego'&&d>2){pes(150,`Sobrecarga aliviada en ${Math.round(d)} s con redistribución de flujos`);log('Línea aliviada por debajo del 100 % · +150 PES','ok');}G.overload=null;}
}
function onSimEvents(){const s=G.sim;while(G.evSeen<s.events.length){const e=s.events[G.evSeen++];const cls=e.type==='edac'||e.type==='trip'||e.type==='blackout'?'bad':'warn';log(e.msg,cls);
  if(e.type==='trip'&&G.mode==='juego'&&/sobrecarga/.test(e.msg))pes(-200,'Disparo automático de un relé térmico ('+e.who+')');
  if(e.type==='edac'&&G.mode==='juego')pes(-50,'Actuó una etapa del EDAC (ciudades sin servicio)');
  if(e.type==='blackout'){if(G.mode==='juego')pes(-500,'Apagón del área Centro');endSession('blackout');}}}
function oscTick(){const s=G.sim;if(!G.osc||!s.osc.on)return;const el=s.t-G.osc.t;
  if(s.osc.tripped&&!G.osc.decided){G.osc.decided=true;if(el<=20){if(G.mode==='juego')pes(100,`U2 disparada a tiempo (${Math.round(el)} s)`);badge('proteccion');log('Decisión de protección a tiempo · U2 aislada','ok');}}
  if(!s.osc.tripped&&el>45&&!G.osc.decided){G.osc.decided=true;const i=1;tripUnit(s,i);s.osc.tripped=true;if(G.mode==='juego')pes(-300,'Daño mecánico en U2 por oscilación sostenida');log('Daño mecánico: la protección de sobrevelocidad dispara U2','bad');}}
function endSession(why){if(G.ended)return;G.ended=true;G.run=false;$('#playBtn').textContent='▶ Iniciar';const s=G.sim;
  const nad=s.hist.reduce((m,h)=>Math.min(m,h[1]),60);const edac=s.edacA.reduce((a,b)=>a+b,0)+s.edacB.reduce((a,b)=>a+b,0);
  if(G.mode==='juego'){PR.board.push({team:($('#teamName').value||'Equipo').slice(0,24),pes:Math.round(G.score.pes),nadir:nad,edac,date:Date.now()});PR.board.sort((a,b)=>b.pes-a.pes);PR.board=PR.board.slice(0,20);save();
    addXP(Math.max(10,Math.round(G.score.pes/20)),'sesión de Grid Masters');if(G.score.pes>=900&&why!=='blackout')badge('master');}
  let msg=why==='blackout'?'Apagón. Revisa el debriefing: ¿qué decisión llegó tarde? Pulsa «Reiniciar» e inténtalo de nuevo.':'Sesión terminada. Revisa el debriefing para la discusión.';
  if(G.mode==='guiado'&&why!=='blackout'){const l3=Object.keys(G.acted).some(k=>k.startsWith('L3@'));const ok=l3&&(G.nAct||0)>=3;
    if(ok){addXP(40,'escenario guiado completado');badge('guiado');msg='¡Contingencia superada! Ganaste la insignia y 40 VX. Ahora prueben el modo «Grid Masters».';}
    else{addXP(10,'escenario guiado recorrido');msg='La red aguantó, pero la insignia pide responder al rayo en L3 y hacer al menos tres maniobras (llevas '+(G.nAct||0)+'). Pulsa «Reiniciar» y sigue los pasos de esta franja.';}}
  if(G.mode==='juego'&&why!=='blackout')msg=G.score.pes>=900?'¡Grid Master! Terminaste con '+Math.round(G.score.pes)+' PES. Revisa el debriefing.':'Terminaste con '+Math.round(G.score.pes)+' PES. Para la insignia Grid Master necesitas 900 o más. Revisa en el debriefing dónde se perdieron puntos.';
  coach(msg);
  renderDebrief();toast(why==='blackout'?'Apagón del área Centro':'Sesión terminada');}
/* bucle */
let lastT=null;
function loop(ts){requestAnimationFrame(loop);if(lastT==null)lastT=ts;let el=Math.min(0.1,(ts-lastT)/1000);lastT=ts;
  if(G.run&&!G.ended){const dt=0.01;let n=Math.round(el*G.speed/dt);for(let i=0;i<n;i++){stepSim(G.sim,dt);scoreTick(dt);if(i%10===0){runScript();oscTick();onSimEvents();}if(G.ended)break;}
    onSimEvents();if(G.sim.t>=SPEC[G.mode].end&&!G.ended)endSession('fin');
    if(G.sim.t>0&&!G.ended&&G.sim.edacA.every(x=>!x)&&G.scriptDone['90L3']&&G.sim.t>150&&!G.noEdacB){G.noEdacB=true;badge('sinedac');}
    if(G.sim.t>0&&G.mode==='guiado'&&G.scriptDone['120L3']&&G.sim.t>200&&G.sim.edacA.every(x=>!x)&&!G.noEdacB){G.noEdacB=true;badge('sinedac');}
  }
  updateUI(false);
}
/* UI del simulador */
function buildUnits(){$('#pUnits').innerHTML=G.sim.unitState.map((u,i)=>`<div class="unit" id="u${i}"><b>U${i+1}</b><span class="st" id="us${i}"></span><span id="up${i}" class="tab"></span><button type="button" data-u="${i}"></button></div>`).join('');}
const SHED=['S/E Norte','S/E Sur','S/E Oriente','S/E Occidente','S/E Industrial'];
function buildShed(){$('#cShed').innerHTML=SHED.map((n,i)=>`<button class="btn sm" type="button" data-shed="${i}">${n} · 100 MW</button>`).join('');}
$('#pUnits').addEventListener('click',e=>{const b=e.target.closest('button[data-u]');if(!b)return;const i=+b.dataset.u;const s=G.sim;if(s.unitState[i]==='off'){startUnit(s,i);act('Planta','arranque de U'+(i+1));}else if(s.unitState[i]==='on'){if(i===1&&s.osc.on)return void $('#xTripU2').click();tripUnit(s,i);act('Planta','parada de U'+(i+1));}});
$('#cShed').addEventListener('click',e=>{const b=e.target.closest('button[data-shed]');if(!b||b.disabled)return;const s=G.sim;s.shedManA+=100;b.disabled=true;const f=60+s.dfA;act('CND','alivio de carga manual en '+SHED[+b.dataset.shed]+' (100 MW)');
  if(G.mode==='juego'&&f<59.8&&s.edacA.every(x=>!x)&&!G.shedFlag){G.shedFlag={t:s.t};pes(200,'Alivio de carga manual antes de que actúe el EDAC');log('Alivio manual eficiente · +200 PES','ok');}});
$('#cAgc').onchange=e=>{G.sim.agc=e.target.checked;act('CND','AGC '+(e.target.checked?'activado':'desactivado'));};
$('#cSet').oninput=e=>{$('#cSetO').textContent=e.target.value+' MW';};
$('#cSend').onclick=()=>{const v=+$('#cSet').value;const s=G.sim;if(s.link){s.setH=v;if(!s.local)$('#pSet').value=v;act('CND','consigna de '+v+' MW enviada por telecontrol');radio('CND → El Cañón (104)','consigna '+v+' MW','out');}else{G.queueSet=v;act('CND','consigna de '+v+' MW pendiente: sin telecontrol');radio('CND','pide '+v+' MW para El Cañón (sin enlace)','in');}};
$('#cRed').oninput=e=>{G.sim.redisp=+e.target.value;$('#cRedO').textContent=e.target.value+' MW';};
$('#cRed').onchange=e=>act('CND','redespacho de '+e.target.value+' MW hacia el Centro');
function setPlantMode(m,silent){const s=G.sim;s.local=m==='local';$$('#pMode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===m)));if(!silent)act('Planta','modo '+(m==='local'?'local':'remoto'));}
$$('#pMode button').forEach(b=>b.onclick=()=>setPlantMode(b.dataset.m));
$('#pSet').oninput=e=>{$('#pSetO').textContent=e.target.value+' MW';if(G.sim.local||!G.sim.link){G.sim.setH=+e.target.value;}};
$('#pSet').onchange=e=>{if(G.sim.local||!G.sim.link)act('Planta','consigna local '+e.target.value+' MW');else log('La planta está en modo remoto: la consigna local no se aplica. Cambia a modo local.','warn');};
$('#pQ').oninput=e=>{G.sim.qH=+e.target.value;$('#pQO').textContent=e.target.value+' MVAr';};
$('#pApply').onclick=()=>{if(G.queuePlant==null)return;G.sim.setH=G.queuePlant;$('#pSet').value=G.queuePlant;act('Planta','aplica consigna recibida por radio: '+G.queuePlant+' MW');radio('El Cañón','consigna '+G.queuePlant+' MW aplicada','out');G.queuePlant=null;};
$('#mRelay').onclick=()=>{if(G.queueSet==null)return;G.queuePlant=G.queueSet;radio('Comunicaciones → El Cañón','el CND pide '+G.queueSet+' MW','out');act('Comunicaciones','transmite por radio la consigna de '+G.queueSet+' MW');if(G.mode==='juego'&&!G.voiceBonus){G.voiceBonus=1;pes(100,'Coordinación por voz con el telecontrol caído');}badge('voz');G.queueSet=null;};
$('#mAsk').onclick=()=>{const s=G.sim;radio('Comunicaciones','solicita reporte a El Cañón','out');setTimeout(()=>radio('El Cañón',`${Math.round(s.PmH)} MW, ${s.unitsOn} unidades, f local ${fmt(60+s.dfA,2)} Hz`,'in'),600);act('Comunicaciones','pide reporte a la planta');};
$('#xTripU2').onclick=()=>{const s=G.sim;if(s.unitState[1]!=='on')return;tripUnit(s,1);act('Protecciones','disparo manual de U2');};
$('#xClose').onclick=()=>{const s=G.sim;const L=['L1','L2','L3'].find(l=>!s.lines[l]);if(!L)return;if(Math.abs(s.dfA-s.dfB)>0.05&&L!=='L3'){log('Reconexión bloqueada: diferencia de frecuencia entre áreas mayor a 0,05 Hz','warn');return;}closeLine(s,L);act('Protecciones','reconexión de '+L);};
$('#playBtn').onclick=()=>{if(G.mode==='juego'&&!$('#draft').hidden){toast('Primero confirma la preparación');return;}if(G.ended)resetSim(true);G.run=!G.run;$('#playBtn').textContent=G.run?'⏸ Pausa':'▶ Continuar';};
$('#resetBtn').onclick=()=>{G.draftOpts=null;G.draftCost=0;resetSim(false);};
$$('#modeSeg button').forEach(b=>b.onclick=()=>{G.mode=b.dataset.mode;$$('#modeSeg button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));G.draftOpts=null;G.draftCost=0;resetSim(false);});
$$('#speedSeg button').forEach(b=>b.onclick=()=>{G.speed=+b.dataset.sp;$$('#speedSeg button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$$('#gmPanel [data-ev]').forEach(b=>b.onclick=()=>{inject(b.dataset.ev,false);});
$$('#roleTabs button').forEach(b=>b.onclick=()=>{$$('#roleTabs button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$$('.roles .role').forEach(r=>r.classList.toggle('cur',r.id==='r-'+b.dataset.r));});
function draftCalc(){const u=+$('#dUnits').value,r=+$('#dRsv').value;$('#dUnitsO').textContent=u;$('#dRsvO').textContent=r+' %';const cost=Math.max(0,u-3)*30+(r-3)*15;$('#dCost').textContent=cost;return {u,r,cost};}
['dUnits','dRsv'].forEach(id=>$('#'+id).addEventListener('input',draftCalc));
$('#draftGo').onclick=()=>{const d=draftCalc();G.draftOpts={unitsOn0:d.u,rsvPct:d.r,hydroP0:Math.min(630,d.u*250-40)};G.draftCost=d.cost;resetSim(true);$('#draft').hidden=true;G.run=true;$('#playBtn').textContent='⏸ Pausa';coach('¡Empieza el reloj! En 10 s llega el evento 1, la rampa de demanda. CND: prepárate para subir «Consigna para El Cañón» y pulsar «Enviar consigna».');};
/* parámetros del docente */
const PDEF=[['HA','H área Centro (s)'],['HB','H área Norte (s)'],['Rth','Estatismo térmicas (%)'],['Rh','Estatismo hidro (%)'],['Tw','T_w turbina (s)'],['Tt','T térmicas (s)'],['Ki','Ganancia AGC K_i'],['Kd','Amortiguamiento por línea (MW/Hz)'],['impC','Importación por L3 (MW)'],['lineRating','Capacidad L1 y L2 (MW)'],['startTime','Arranque de unidad (s)']];
function buildParams(){$('#params').innerHTML=PDEF.map(([k,n])=>`<label>${n}<input type="number" step="any" data-p="${k}" value="${G.params[k]}"></label>`).join('');}
$('#params').addEventListener('change',e=>{const i=e.target.closest('input[data-p]');if(!i)return;const v=parseFloat(i.value);if(isFinite(v)&&v>0){G.params[i.dataset.p]=v;toast('Parámetro guardado: se aplica al reiniciar');}});
/* unifilar */
function drawOneline(){const s=G.sim;const n=nLinesAB(s);const per=n?Math.abs(s.Pab)/n:0;const rate=s.P.lineRating;
  const col=(on,ld)=>!on?'#6b7685':(ld>1?'#FF5A5F':(ld>0.85?'#F2B53A':'#38C172'));
  const L=(id,x1,y1,x2,y2,ld,lab)=>{const on=s.lines[id];return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col(on,ld)}" stroke-width="5" ${on?'':'stroke-dasharray="8 6"'}/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-9}" fill="#C9D4E2" font-size="12" text-anchor="middle" font-family="Noto Sans Mono">${id} ${on?Math.round(ld*100)+' %':'abierta'}</text>`;};
  const fA=60+s.dfA,fB=60+s.dfB;const shedA=s.edacA.reduce((a,b)=>a+b,0);
  const gen=(x,y,on,lbl)=>`<circle cx="${x}" cy="${y}" r="15" fill="${on==='on'?'#1f3d2b':(on==='starting'?'#4a3c12':'#2a3340')}" stroke="${on==='on'?'#38C172':(on==='starting'?'#F2B53A':'#6b7685')}" stroke-width="2"/><path d="M${x-8} ${y} q4 -8 8 0 q4 8 8 0" fill="none" stroke="#E6ECF3" stroke-width="1.6"/><text x="${x}" y="${y+30}" fill="#93A3B6" font-size="11" text-anchor="middle" font-family="Noto Sans Mono">${lbl}</text>`;
  let h=`<rect x="10" y="20" width="230" height="200" rx="12" fill="#0f1620" stroke="#2D3A4C"/><text x="24" y="42" fill="#E6ECF3" font-size="14" font-family="Archivo" font-weight="700">Área Norte</text>
  <text x="24" y="62" fill="#93A3B6" font-size="12" font-family="Noto Sans Mono">${fmt(fB,3)} Hz</text><text x="24" y="82" fill="#93A3B6" font-size="12" font-family="Noto Sans Mono">Gen. ${Math.round(s.thB)} MW</text><text x="24" y="102" fill="#93A3B6" font-size="12" font-family="Noto Sans Mono">Dem. ${Math.round(s.PL_B)} MW</text>
  <rect x="200" y="40" width="8" height="160" fill="#E6ECF3"/><rect x="520" y="40" width="8" height="160" fill="#E6ECF3"/>
  ${L('L1',208,80,520,80,s.lines.L1?per/rate:0)}${L('L2',208,160,520,160,s.lines.L2?per/rate:0)}
  <text x="364" y="120" fill="#F4C54E" font-size="12" text-anchor="middle" font-family="Noto Sans Mono">${s.Pab<0?'Norte → Centro':'Centro → Norte'} ${Math.round(Math.abs(s.Pab))} MW</text>
  <text x="364" y="136" fill="#93A3B6" font-size="10" text-anchor="middle" font-family="Noto Sans Mono">2 × 500 kV</text>
  <rect x="510" y="20" width="240" height="300" rx="12" fill="none" stroke="#2D3A4C"/><text x="540" y="42" fill="#E6ECF3" font-size="14" font-family="Archivo" font-weight="700">Área Centro</text>
  <text x="540" y="62" fill="${fA<59.4?'#FF5A5F':(fA<59.8||fA>60.2?'#F2B53A':'#38C172')}" font-size="12" font-family="Noto Sans Mono">${fmt(fA,3)} Hz</text>
  <text x="540" y="210" fill="#93A3B6" font-size="12" font-family="Noto Sans Mono">Dem. ${Math.round(s.PL_A)} MW</text><text x="540" y="226" fill="${shedA?'#FF5A5F':'#93A3B6'}" font-size="11" font-family="Noto Sans Mono">EDAC: ${shedA} etapa(s)</text>
  <text x="540" y="242" fill="#93A3B6" font-size="11" font-family="Noto Sans Mono">Térmicas ${Math.round(s.thA)} MW</text>
  <line x1="528" y1="110" x2="600" y2="110" stroke="#E6ECF3" stroke-width="2"/><text x="606" y="100" fill="#C9D4E2" font-size="11" font-family="Noto Sans Mono">El Cañón ${Math.round(s.PmH)} MW</text>`;
  s.unitState.forEach((u,i)=>{h+=gen(612+i*36,140,u,'U'+(i+1));if(i===1&&s.osc.on&&!s.osc.tripped)h+=`<circle cx="${612+i*36}" cy="140" r="20" fill="none" stroke="#FF5A5F" stroke-width="2"/>`;});
  h+=`${L('L3',364,300,524,250,s.lines.L3?s.P.impC/s.P.l3Rating:0)}<rect x="250" y="270" width="140" height="50" rx="10" fill="#0f1620" stroke="#2D3A4C"/><text x="262" y="292" fill="#E6ECF3" font-size="12" font-family="Archivo" font-weight="700">Complejo Sur</text><text x="262" y="309" fill="#93A3B6" font-size="11" font-family="Noto Sans Mono">${s.lines.L3?s.P.impC+' MW':'aislado'}</text>`;
  h+=`<g><rect x="40" y="250" width="120" height="44" rx="8" fill="#0f1620" stroke="${s.link?'#38C172':'#FF5A5F'}"/><text x="52" y="270" fill="#E6ECF3" font-size="12" font-family="Archivo" font-weight="700">CND</text><text x="52" y="286" fill="${s.link?'#38C172':'#FF5A5F'}" font-size="10" font-family="Noto Sans Mono">${s.link?'telecontrol OK':'telecontrol caído'}</text>
  <path d="M160 272 C 300 240, 520 260, 620 160" fill="none" stroke="${s.link?'#38C17288':'#FF5A5F'}" stroke-width="1.5" stroke-dasharray="${s.link?'3 5':'2 8'}"/></g>`;
  $('#oneline').innerHTML=h;}
function drawTrend(){const s=G.sim;const t1=Math.max(120,s.t),t0=t1-120;const H=s.hist.filter(h=>h[0]>=t0);
  let lo=59.2,hi=60.3;for(const h of H){lo=Math.min(lo,h[1]-0.05,h[2]-0.05);hi=Math.max(hi,h[1]+0.05);}lo=Math.floor(lo*10)/10;hi=Math.ceil(hi*10)/10;
  plot($('#trend'),{x0:t0,x1:t1,y0:lo,y1:hi,ny:5,nx:6,y2:[0,1100],series:[{pts:H.map(h=>[h[0],h[2]]),color:css('--traceB'),w:1.5},{pts:H.map(h=>[h[0],h[1]]),color:css('--trace'),w:2.5},{pts:H.map(h=>[h[0],h[4]]),color:css('--traceC'),w:1.5,axis2:true}],bands:BAND,hlines:FLINES,yfmt:v=>fmt(v,1),xfmt:t=>fmtT(t)});}
let uiTick=0;
function updateUI(force){uiTick++;if(!force&&uiTick%3)return;const s=G.sim;const f=60+s.dfA;
  $('#fLcd').innerHTML=fmt(f,3)+'<small>Hz</small>';
  const st=f<59.4||s.blackout?'r':(f<59.8||f>60.2?'y':'g');['g','y','r'].forEach(k=>$('#l'+k.toUpperCase()).classList.toggle('on',k===st));
  $('#fState').textContent='Frecuencia del área Centro · '+(s.blackout?'apagón':(st==='g'?'normal':(st==='y'?'alerta: fuera de banda':'peligro: zona de EDAC')));
  $('#sT').textContent=fmtT(s.t);$('#sFB').textContent=fmt(60+s.dfB,3)+' Hz';$('#sRocof').textContent=fmt(s.rocof,2)+' Hz/s';
  $('#sLink').textContent=s.link?'En línea':'Caído';$('#sLink').className=s.link?'ok':'bad';
  $('#sPes').textContent=G.mode==='juego'?Math.round(G.score.pes):'—';$('#sPes').className=G.mode==='juego'?(G.score.pes>=800?'ok':(G.score.pes>=500?'warn':'bad')):'';
  $('#sPhase').textContent=G.phase;
  // CND
  const n=nLinesAB(s);$('#cFlow').textContent=Math.round(-s.Pab)+' MW';$('#cLoad').textContent=Math.round(s.PL_A)+' MW';$('#cLoadB').textContent=Math.round(s.PL_B)+' MW';
  $('#cPlant').textContent=s.link?Math.round(s.PmH)+' MW · '+s.unitsOn+' unidades':'sin datos';$('#cAce').textContent=Math.round(s.ace)+' MW';
  $('#r-cnd').classList.toggle('blinded',!s.link);$('#cSetO').textContent=$('#cSet').value+' MW';$('#cRedO').textContent=$('#cRed').value+' MW';
  // planta
  s.unitState.forEach((u,i)=>{const el=$('#u'+i);if(!el)return;el.className='unit '+u+(i===1&&s.osc.on&&!s.osc.tripped?' alarm':'');$('#us'+i).textContent=u==='on'?'en línea':(u==='starting'?'arranca '+Math.ceil(s.unitTimer[i])+' s':'parada');$('#up'+i).textContent=u==='on'?Math.round(s.PmH/Math.max(1,s.unitsOn))+' MW':'–';el.querySelector('button').textContent=u==='on'?'Parar':(u==='off'?'Arrancar':'…');el.querySelector('button').disabled=u==='starting';});
  $('#pP').textContent=Math.round(s.PmH)+' MW';$('#pG').textContent=Math.round(s.g*100)+' %';$('#pF').textContent=fmt(f,3)+' Hz';$('#pSetO').textContent=$('#pSet').value+' MW';$('#pQO').textContent=$('#pQ').value+' MVAr';
  $('#pV').textContent=fmt(230*s.vBus,1)+' kV';const pu=s.unitsOn?s.PmH/s.unitsOn:0,qu=s.unitsOn?s.qH/s.unitsOn:0;const cs=capStatus(pu,qu);$('#pCap').textContent=cs[1]==='ok'?'OK':cs[0];$('#pCap').style.color=cs[1]==='ok'?'var(--s-ok)':'var(--s-bad)';
  $('#pQueue').classList.toggle('show',G.queuePlant!=null);$('#pQueueVal').textContent=G.queuePlant!=null?G.queuePlant+' MW':'';
  if(!s.link&&!s.local&&!G.warnedLocal){G.warnedLocal=1;log('Planta: sin telecontrol, la consigna remota quedó congelada. Pasa a modo local.','warn');}
  if(s.link)G.warnedLocal=0;
  // protecciones
  const per=n?Math.abs(s.Pab)/n:0;
  $('#xRelays').innerHTML=['L1','L2','L3'].map(L=>{const on=s.lines[L];const ld=L==='L3'?(on?s.P.impC/s.P.l3Rating:0):(on?per/s.P.lineRating:0);const w=Math.min(100,ld*100/1.5);const c=ld>1?'var(--s-bad)':(ld>0.85?'var(--s-warn)':'var(--s-ok)');return `<div class="relay"><span>${L}</span><div class="bar" title="carga"><i data-css="width:${w}%;background:${c}"></i></div><span class="tab">${on?Math.round(ld*100)+' %':'abierta'}</span></div>`+(on&&s.relay[L]>0?`<div class="small e-3845373">Relé térmico ${L}: ${Math.round(s.relay[L]*100)} % del tiempo de disparo</div>`:'');}).join('');
  const ed=(arr,tm,f)=>arr.map((x,i)=>`<span class="${x?'fired':(f<=EDAC[i][0]+0.1?'armed':'')}" title="${EDAC[i][0]} Hz, ${EDAC[i][1]} ms">${String(EDAC[i][0]).replace('.',',')}</span>`).join('');
  $('#xEdacA').innerHTML=ed(s.edacA,s.edacTimerA,60+s.dfA);$('#xEdacB').innerHTML=ed(s.edacB,s.edacTimerB,60+s.dfB);
  $('#xVib').textContent=s.osc.on&&!s.osc.tripped?`oscilación ±${Math.round(s.osc.amp)} MW`:(s.osc.tripped?'U2 fuera de servicio':'normal');$('#xVib').style.color=s.osc.on&&!s.osc.tripped?'var(--s-bad)':'';
  // comunicaciones
  $('#mLink').textContent=s.link?'en servicio':'caído';$('#mLink').style.color=s.link?'var(--s-ok)':'var(--s-bad)';
  $('#mQueue').classList.toggle('show',G.queueSet!=null);$('#mQueueVal').textContent=G.queueSet!=null?G.queueSet+' MW':'';
  drawOneline();drawTrend();}
/* debriefing */
function metrics(){const s=G.sim;const h=s.hist;if(!h.length)return null;let nad=60,tn=0,out=0,area=0,maxr=0;for(let i=1;i<h.length;i++){const dt=h[i][0]-h[i-1][0];const f=h[i][1];if(f<nad){nad=f;tn=h[i][0];}if(f<59.8||f>60.2)out+=dt;area+=Math.abs(f-60)*dt;maxr=Math.max(maxr,Math.abs(h[i][7]));}
  const edac=s.edacA.reduce((a,b)=>a+b,0)+s.edacB.reduce((a,b)=>a+b,0);const trips=s.events.filter(e=>e.type==='trip'&&/sobrecarga/.test(e.msg)).length;
  const resp=Object.values(G.acted);return {nad,tn,out,area,maxr,edac,trips,resp:resp.length?resp.reduce((a,b)=>a+b,0)/resp.length:null,shed:s.edacA.reduce((a,b)=>a+b,0)*0.05*s.P.loadA+s.edacB.reduce((a,b)=>a+b,0)*0.05*s.P.loadB+s.shedManA};}
function renderDebrief(){const s=G.sim;const m=metrics();if(!m)return;
  const h=s.hist;const t1=Math.max(60,s.t);let lo=Math.min(59.2,Math.floor((m.nad-0.05)*10)/10);
  const ev=[];for(const e of s.events){if(!['trip','edac','blackout'].includes(e.type))continue;const lab=e.type==='edac'?'EDAC':(e.type==='trip'?e.who:'Apagón');if(ev.length&&e.t-ev[ev.length-1].t<25)continue;ev.push({t:e.t,label:lab});if(ev.length>=7)break;}
  plot($('#debCv'),{x0:0,x1:t1,y0:lo,y1:60.3,ny:6,nx:8,y2:[0,1100],series:[{pts:h.map(x=>[x[0],x[2]]),color:css('--traceB'),w:1.5},{pts:h.map(x=>[x[0],x[1]]),color:css('--trace'),w:2.5},{pts:h.map(x=>[x[0],x[4]]),color:css('--traceC'),w:1.5,axis2:true}],bands:BAND,hlines:FLINES,vlines:ev,yfmt:v=>fmt(v,1),xfmt:t=>fmtT(t)});
  const k=[['Nadir',fmt(m.nad,3)+' Hz'],['Tiempo fuera de banda',Math.round(m.out)+' s'],['Área |Δf|·t',fmt(m.area,2)+' Hz·s'],['ROCOF máx.',fmt(m.maxr,2)+' Hz/s'],['Etapas EDAC',m.edac],['Carga desconectada',Math.round(m.shed)+' MW'],['Disparos térmicos',m.trips],['Respuesta media',m.resp==null?'–':Math.round(m.resp)+' s']];
  $('#debKpis').innerHTML=k.map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  if(G.mode==='juego'){$('#debScore').innerHTML=`<tr><td>Inicio</td><td class="mono">1000</td></tr>`+aggScore().map(x=>`<tr><td>${esc(x[0])}${x[2]>1?' ×'+x[2]:''}</td><td class="mono">${x[1]>0?'+':''}${x[1]}</td></tr>`).join('')+`<tr><td><b>Total</b></td><td class="mono"><b>${Math.round(G.score.pes)}</b></td></tr>`;}
  else $('#debScore').innerHTML=`<tr><td colspan="2" class="muted">${G.mode==='guiado'?'El escenario guiado no puntúa: revisa las métricas y el registro.':'Modo libre: sin puntaje.'}</td></tr>`;
  $('#csvBox').value='t_s,f_centro_Hz,f_norte_Hz,P_AB_MW,P_CANON_MW,P_term_centro_MW,demanda_centro_MW,rocof_Hz_s\n'+h.map(x=>x.join(',')).join('\n');
  renderBoard();}
function aggScore(){const m=new Map();for(const [w,n] of G.score.items){const k=w;const o=m.get(k)||[w,0,0];o[1]+=n;o[2]++;m.set(k,o);}return [...m.values()];}
function renderBoard(){$('#board').innerHTML=PR.board.length?PR.board.map(b=>`<tr><td>${esc(b.team)}</td><td class="mono">${b.pes}</td><td class="mono">${fmt(b.nadir,2)}</td><td class="mono">${b.edac}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">Sin sesiones de Grid Masters todavía.</td></tr>';}
$('#csvCopy').onclick=async()=>{const v=$('#csvBox').value;if(!v){toast('Aún no hay datos');return;}try{await navigator.clipboard.writeText(v);toast('Datos copiados');}catch(e){$('#csvBox').select();toast('Selecciona y copia el texto');}badge('investigador');};
new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)&&LVL==='inv'&&G.sim&&G.sim.hist.length>50)badge('investigador');},{threshold:.4}).observe($('#csvBox'));

/* ---------- autoevaluación ---------- */
const QZ=[
 {q:'¿Cuál es el rango de variación de la frecuencia en operación normal del SIN colombiano?',o:['59,0 a 61,0 Hz','59,80 a 60,20 Hz','59,95 a 60,05 Hz','No hay un rango definido'],a:1,e:'El Código de Operación (Res. CREG 025 de 1995) fija 60,00 Hz como objetivo y 59,80 a 60,20 Hz como rango en operación normal.'},
 {q:'Según el Acuerdo CNO 1797 de 2024, ¿en qué frecuencia actúa la primera etapa del EDAC?',o:['58,5 Hz','59,8 Hz','59,4 Hz','57,5 Hz'],a:2,e:'La etapa 1 actúa a 59,4 Hz con 200 ms de retardo; las ocho etapas desconectan en total el 40 % de la demanda.'},
 {q:'¿Qué controla el gobernador y qué controla el regulador automático de tensión (AVR)?',o:['Ambos controlan la tensión','El gobernador, la velocidad y la potencia activa; el AVR, la tensión y la potencia reactiva','El gobernador, la potencia reactiva; el AVR, la frecuencia','El AVR controla las compuertas del embalse'],a:1,e:'Son lazos distintos: velocidad/potencia activa (gobernador) y tensión/potencia reactiva (excitación con AVR).'},
 {q:'Al abrir de golpe el distribuidor de una turbina hidráulica, la potencia mecánica…',o:['Sube de inmediato en proporción a la apertura','Primero cae y luego sube, por la inercia del agua','No cambia','Oscila sin amortiguamiento'],a:1,e:'El modelo (1 − T_w s)/(1 + 0,5 T_w s) tiene un cero en el semiplano derecho: respuesta inversa inicial.'},
 {q:'¿De qué depende principalmente la tasa inicial de cambio de la frecuencia (ROCOF) tras perder generación?',o:['Del estatismo de los gobernadores','Del tamaño del déficit y de la inercia del sistema','Del AGC','De la tensión de las barras'],a:1,e:'ROCOF₀ = −ΔP·f₀/(2H·S): en el primer instante solo actúan la inercia y el déficit; los gobernadores aún no responden.'},
 {q:'¿Qué combina el error de control de área (ACE) que usa el AGC?',o:['La desviación del intercambio programado y la desviación de frecuencia ponderada por el bias','Solo la tensión','La potencia reactiva de cada planta','El costo marginal'],a:0,e:'ACE = ΔP_intercambio + B·Δf. El AGC lo integra para devolver la frecuencia y el intercambio a lo programado.'},
 {q:'Operar con criterio N-1 significa que…',o:['Hay una sola línea en servicio','El sistema soporta la salida de cualquier elemento sin perder carga ni violar límites','Se pierde un nodo por hora','Se desconecta una ciudad por turno'],a:1,e:'Es el criterio de seguridad para planear y operar: ante la contingencia sencilla más severa, el sistema debe seguir en estado seguro.'},
 {q:'Si se pierde el enlace de telecontrol con la central, lo correcto es…',o:['Esperar a que vuelva el enlace','Pasar la central a operación local, leer los medidores propios y coordinar por voz con el despacho','Disparar todas las unidades','Desactivar el EDAC'],a:1,e:'La central sigue operando con sus medidores locales y las consignas llegan por el canal de voz de respaldo.'},
 {q:'Abrazas con la pinza el cable completo de un calentador (fase y neutro juntos). ¿Qué marca?',o:['El doble de la corriente','La corriente de la carga','Casi cero','La tensión de la red'],a:2,e:'La corriente de ida y la de regreso producen campos opuestos que se cancelan. Para medir la carga se abraza un solo conductor.'},
 {q:'Una prueba de aislamiento da IR a 1 min = 150 MΩ e IR a 10 min = 160 MΩ en un devanado clase F. Según IEEE 43…',o:['Es apto: supera los 100 MΩ','No es apto: el índice de polarización es cercano a 1, señal de humedad o contaminación','Es apto si se prueba a 500 V','La prueba no sirve para generadores'],a:1,e:'PI = 160/150 ≈ 1,07, muy por debajo del mínimo de 2,0. La fuga domina: hay que secar o limpiar y repetir.'},
 {q:'Al sincronizar, la aguja del sincronoscopio gira despacio hacia RÁPIDO. Esto indica que…',o:['La tensión del generador es mayor','El generador gira un poco más rápido que la red','El interruptor ya está cerrado','La red está en falla'],a:1,e:'La velocidad de giro es el deslizamiento: 360° por segundo por cada hercio de diferencia. Hacia RÁPIDO, el generador va adelante y tomará carga al cerrar.'}];
const qa=new Array(QZ.length).fill(null);
function renderQuiz(){$('#quiz').innerHTML=QZ.map((x,i)=>`<fieldset class="q"><legend>PREGUNTA ${i+1}</legend><h4>${esc(x.q)}</h4>${x.o.map((o,j)=>{const a=qa[i];let c='';if(a!=null){if(j===x.a)c='right';else if(j===a)c='wrong';}return `<label class="opt ${c}"><input type="radio" name="q${i}" value="${j}" ${a===j?'checked':''} ${a!=null?'disabled':''}> <span>${esc(o)}</span></label>`;}).join('')}${qa[i]!=null?`<p class="note ${qa[i]===x.a?'ok':'bad'} small">${qa[i]===x.a?'Correcto. ':'No es correcto. '}${esc(x.e)}</p>`:''}</fieldset>`).join('');$('#qScore').textContent=qa.filter((a,i)=>a===QZ[i].a).length+' / '+QZ.length;}
$('#quiz').addEventListener('change',e=>{const m=e.target.name&&e.target.name.match(/^q(\d+)$/);if(!m)return;const i=+m[1];if(qa[i]!=null)return;qa[i]=+e.target.value;if(qa[i]===QZ[i].a&&!PR.quiz[i]){PR.quiz[i]=1;save();addXP(10,'respuesta correcta');if(Object.keys(PR.quiz).length>=QZ.length)badge('quiz');}renderQuiz();});
$('#qReset').onclick=()=>{qa.fill(null);renderQuiz();};
$('#resetAll').onclick=()=>{if($('#resetAll').dataset.c!=='1'){$('#resetAll').dataset.c='1';$('#resetAll').textContent='¿Seguro? Pulsa de nuevo';setTimeout(()=>{$('#resetAll').dataset.c='';$('#resetAll').textContent='Reiniciar mi progreso';},4000);return;}PR=defP();save();$('#xpVal').textContent=0;renderBadges();renderBoard();qa.fill(null);renderQuiz();$('#resetAll').dataset.c='';$('#resetAll').textContent='Reiniciar mi progreso';toast('Progreso reiniciado');};

/* ================= Banco de instrumentos ================= */
const ICH={
 osc:{n:'Osciloscopio',l:[['osc.rizado','Mide el rizado de onda completa con acople AC y 0,5 V/div o menos',10],['osc.smps','Haz visible el rizado de 100 kHz de la fuente conmutada (acople AC, 20 mV/div o menos y 10 µs/div o menos)',15]]},
 dmm:{n:'Multímetro',l:[['dmm.c1','Mide la batería de 12 V con la polaridad correcta',10],['dmm.c2','Obtén una lectura negativa en una fuente de CC y explica por qué',10],['dmm.c3','Mide el tomacorriente en V⎓ y observa por qué marca casi 0 V',10],['dmm.c4','Mide el rizado de la fuente lineal en modo V~',10],['dmm.c5','Descubre qué pasa si mides tensión con la punta roja en un borne de corriente',10]]},
 pmu:{n:'PMU',l:[['pmu.nadir','Marca el nadir de la frecuencia durante la prueba (±0,01 Hz)',15],['pmu.rocof','Estima el ROCOF inicial con la PMU (±25 %)',15],['pmu.tve','Encuentra el error de fase que lleva el TVE al límite del 1 %',15,'inv']]},
 pq:{n:'Analizador de red',l:[['pq.fp','Lleva el factor de potencia del motor a 0,95 o más sin sobrecompensar',15],['pq.neutro','Encuentra la carga cuya corriente de neutro supera a la de fase',10],['pq.fpreal','Explica por qué el FP real del variador es menor que su cos φ₁',10]]},
 clamp:{n:'Pinza amperimétrica',l:[['clamp.fase','Mide la corriente del calentador abrazando solo la fase',10],['clamp.cable','Descubre por qué abrazar el cable completo marca casi cero',10],['clamp.trms','Compara True RMS y respuesta promedio con la carga de computadores',15],['clamp.cc','Mide la corriente CC del banco de baterías después de poner la pinza en cero',15]]},
 meg:{n:'Megóhmetro',l:[['meg.seq','Completa una prueba segura con la tensión que recomienda IEEE 43',15],['meg.humedo','Toma la decisión correcta con el devanado húmedo',15],['meg.limpio','Toma la decisión correcta con el devanado seco y limpio',10]]},
 sync:{n:'Sincronoscopio',l:[['sync.ok','Sincroniza la unidad dentro de los límites de IEEE C50.12',15],['sync.fino','Cierra el interruptor con menos de 3° de diferencia de fase',20]]}
};
BADGES.push({id:'banco',ab:'BI',n:'Banco de instrumentos',d:'Supera al menos un reto en cada instrumento.'},{id:'metro',ab:'MT',n:'Metrología completa',d:'Supera todos los retos del banco de instrumentos.'});
const IP=()=>PR.inst||(PR.inst={});
function iDef(k){const c=ICH[k.split('.')[0]];return c?c.l.find(x=>x[0]===k):null;}
function instDone(k){const P=IP();if(P[k])return false;const c=iDef(k);if(!c)return false;P[k]=1;save();addXP(c[2],ICH[k.split('.')[0]].n+': reto superado');renderICh();
  if(Object.keys(ICH).every(id=>ICH[id].l.some(x=>P[x[0]])))badge('banco');
  if(Object.keys(ICH).every(id=>ICH[id].l.every(x=>P[x[0]])))badge('metro');
  return true;}
function renderICh(){const P=IP();for(const id in ICH){const l=ICH[id].l,box=$('#ch-'+id);
  if(box)box.innerHTML=l.map(x=>`<li class="${P[x[0]]?'done':''}${x[3]==='inv'?' inv-only':''}"><span class="ck" aria-hidden="true">✓</span><span>${esc(x[1])} <b class="mono small">+${x[2]} VX</b>${P[x[0]]?'<span class="sr"> (superado)</span>':''}</span></li>`).join('');
  const t=$('#tc-'+id);if(t)t.textContent=l.filter(x=>P[x[0]]).length+'/'+l.length;}}
$('#resetAll').addEventListener('click',()=>setTimeout(renderICh,30));

/* utilidades */
const rn=()=>{let u=0;while(!u)u=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*Math.random());};
function fitCv(cv,ratio){const r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1,W=Math.max(220,Math.round(r.width||cv.width)),H=Math.round(W*ratio);
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);return {c,W,H};}
const wrap180=a=>{a=((a+180)%360+360)%360-180;return a;};
function segSet(sel,attr,val){$$(sel+' button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attr]===String(val))));}
function chipSet(sel,attr,val){$$(sel+' .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attr]===val)));}

/* pestañas y menú */
const ITABS=['osc','dmm','pmu','pq','clamp','meg','sync'];
let ICUR='osc';const IShow={};
function showInst(id){if(!ITABS.includes(id))return;ICUR=id;
  $$('#itabs [role=tab]').forEach(b=>{const on=b.dataset.i===id;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  ITABS.forEach(k=>{$('#i-'+k).hidden=k!==id;});
  if(IShow[id])IShow[id]();try{localStorage.setItem(KEY+'-inst',id);}catch(e){}}
$('#itabs').addEventListener('click',e=>{const b=e.target.closest('[role=tab]');if(b)showInst(b.dataset.i);});
$('#itabs').addEventListener('keydown',e=>{const i=ITABS.indexOf(ICUR);let n=null;if(e.key==='ArrowRight')n=(i+1)%ITABS.length;if(e.key==='ArrowLeft')n=(i-1+ITABS.length)%ITABS.length;if(e.key==='Home')n=0;if(e.key==='End')n=ITABS.length-1;if(n==null)return;e.preventDefault();showInst(ITABS[n]);$('#t-'+ITABS[n]).focus();});
const IMB=$('#instMenuBtn'),IMN=$('#instMenu');
function instMenu(open){IMN.hidden=!open;IMB.setAttribute('aria-expanded',String(open));if(open){const a=IMN.querySelector('a');if(a)a.focus();}}
IMB.addEventListener('click',e=>{e.stopPropagation();instMenu(IMN.hidden);});
IMN.addEventListener('click',e=>{const a=e.target.closest('a[data-i]');if(!a)return;showInst(a.dataset.i);instMenu(false);});
IMN.addEventListener('keydown',e=>{const as=$$('#instMenu a');const i=as.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();as[(i+1)%as.length].focus();}if(e.key==='ArrowUp'){e.preventDefault();as[(i-1+as.length)%as.length].focus();}});
document.addEventListener('click',e=>{if(!IMN.hidden&&!e.target.closest('.navdd'))instMenu(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!IMN.hidden){instMenu(false);IMB.focus();}});
let iVis=true;try{new IntersectionObserver(es=>{iVis=es[0].isIntersecting;}).observe($('#instrumentos'));}catch(e){}

/* ---- Osciloscopio y multímetro, portados del laboratorio de tensión continua ---- */
(function(){
const fx=(n,d)=>n.toFixed(d).replace('.',',');
function fmtV(v){const a=Math.abs(v); if(a<1e-4) return '0 V'; if(a<1) return fx(v*1000,a<0.1?1:0)+' mV'; return fx(v,a<10?3:2)+' V';}
function fmtT(t){if(t<1e-3) return fx(t*1e6,0)+' µs'; return fx(t*1e3,t<1e-2?1:0)+' ms';}
function fmtF(f){if(!f) return '—'; return f>=1000? fx(f/1000,0)+' kHz' : fx(f,0)+' Hz';}
function fmtVdiv(v){return v<1? fx(v*1000,0)+' mV' : fx(v,0)+' V';}
/* ---------- Signal models ---------- */
const CAPS=[10,22,47,100,220,470,1000,2200,4700], RLS=[10,22,47,100,220,470,1000];
function pvV(cells,G){return Math.max(0,cells*(0.6+0.0257*Math.log(Math.max(G,10)/1000)));}
function rectSignal(p){
  const full=p.full, Vp=p.vrms*Math.SQRT2, drop=full?1.4:0.7, w=2*Math.PI*60, T=1/60, N=2400, dt=T/N;
  const raw=t=>{const s=Math.sin(w*t); return Math.max((full?Math.abs(s):s)*Vp-drop,0);};
  const tab=new Float64Array(N);
  if(p.filt){
    const k=Math.exp(-dt/(p.rl*p.cap*1e-6)); let v=0;
    for(let c=0;c<15;c++) for(let i=0;i<N;i++){v*=k; const r=raw(i*dt); if(r>v) v=r; if(c===14) tab[i]=v;}
  } else for(let i=0;i<N;i++) tab[i]=raw(i*dt);
  if(p.reg) for(let i=0;i<N;i++) tab[i]=tab[i]>=7?5:Math.max(tab[i]-2,0);
  return {T,freq:full?120:60,f:t=>{const x=((t%T)+T)%T; return tab[Math.floor(x/dt)%N];},Vp,drop};
}
function makeSignal(kind,p){
  switch(kind){
    case 'dc': return {T:1/60,freq:null,f:()=>p.v};
    case 'ac': {const Vp=p.vrms*Math.SQRT2,w=2*Math.PI*60; return {T:1/60,freq:60,f:t=>Vp*Math.sin(w*t)};}
    case 'rect': return rectSignal(p);
    case 'smps': {const T=1e-5; return {T,freq:1e5,f:t=>{const x=(((t%T)+T)%T)/T; const tri=x<0.5?4*x-1:3-4*x; return 12+0.03*tri;}};}
  }
}
function stats(sig){
  const N=3000; let s=0,mn=Infinity,mx=-Infinity; const vals=new Float64Array(N);
  for(let i=0;i<N;i++){const v=sig.f(i/N*sig.T); vals[i]=v; s+=v; if(v<mn)mn=v; if(v>mx)mx=v;}
  const avg=s/N; let q=0; for(let i=0;i<N;i++){const d=vals[i]-avg; q+=d*d;}
  return {avg,ac:Math.sqrt(q/N),min:mn,max:mx,pp:mx-mn};
}

/* ---------- Oscilloscope ---------- */
const VDIV=[0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50];
const TDIV=[2e-6,5e-6,1e-5,2e-5,5e-5,1e-4,2e-4,5e-4,1e-3,2e-3,5e-3,1e-2];
const S={src:'fw',vd:9,td:10,coupling:'DC',pos:-2,
  p:{vbat:12.6,vrms:12,filt:true,cap:6,rl:3,reg:false,cells:36,irr:1000}};
let sig=null, st=null;
function scopeSignal(){
  const p=S.p;
  switch(S.src){
    case 'bat': return makeSignal('dc',{v:p.vbat});
    case 'ca': return makeSignal('ac',{vrms:p.vrms});
    case 'hw': case 'fw': return makeSignal('rect',{full:S.src==='fw',vrms:p.vrms,filt:p.filt,cap:CAPS[p.cap],rl:RLS[p.rl],reg:p.reg});
    case 'smps': return makeSignal('smps');
    case 'pv': return makeSignal('dc',{v:pvV(p.cells,p.irr)});
  }
}
function fmtVdiv(v){return v<1? fx(v*1000,0)+' mV' : fx(v,0)+' V';}
const cv=$('#scope'), ctx=cv.getContext('2d');
function sizeCanvas(){
  const r=cv.getBoundingClientRect(), dpr=window.devicePixelRatio||1, w=Math.max(280,r.width);
  cv.width=Math.round(w*dpr); cv.height=Math.round(w*0.8*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); drawScope();
}
function drawScope(){
  if(!sig) return;
  const dpr=window.devicePixelRatio||1, W=cv.width/dpr, H=cv.height/dpr, dx=W/10, dy=H/8;
  ctx.fillStyle=css('--scope-bg'); ctx.fillRect(0,0,W,H);
  ctx.strokeStyle=css('--scope-grid'); ctx.lineWidth=1;
  for(let i=1;i<10;i++){ctx.beginPath();ctx.moveTo(i*dx+.5,0);ctx.lineTo(i*dx+.5,H);ctx.stroke();}
  for(let j=1;j<8;j++){ctx.beginPath();ctx.moveTo(0,j*dy+.5);ctx.lineTo(W,j*dy+.5);ctx.stroke();}
  ctx.strokeStyle=css('--scope-axis');
  for(let i=0;i<50;i++){const x=i*dx/5; ctx.beginPath();ctx.moveTo(x,H/2-3);ctx.lineTo(x,H/2+3);ctx.stroke();}
  for(let j=0;j<40;j++){const y=j*dy/5; ctx.beginPath();ctx.moveTo(W/2-3,y);ctx.lineTo(W/2+3,y);ctx.stroke();}
  const vd=VDIV[S.vd], td=TDIV[S.td], y0=H/2-S.pos*dy, span=10*td, cols=Math.ceil(W), sub=10;
  const tr=css('--trace');
  // ground marker
  ctx.fillStyle=tr; ctx.beginPath(); ctx.moveTo(0,y0-6); ctx.lineTo(9,y0); ctx.lineTo(0,y0+6); ctx.fill();
  ctx.font='600 12px "Noto Sans Mono", monospace'; ctx.fillText('1',2,y0-9);
  const disp=v=> S.coupling==='GND'?0 : S.coupling==='AC'? v-st.avg : v;
  ctx.strokeStyle=tr; ctx.lineWidth=2; ctx.shadowColor=tr; ctx.shadowBlur=6; ctx.beginPath();
  for(let c=0;c<=cols;c++){
    let mn=Infinity,mx=-Infinity;
    for(let k=0;k<sub;k++){const t=(c+k/sub)/W*span; const v=disp(sig.f(t)); if(v<mn)mn=v; if(v>mx)mx=v;}
    const ya=y0-mn/vd*dy, yb=y0-mx/vd*dy;
    if(c===0) ctx.moveTo(c,ya); else ctx.lineTo(c,ya);
    if(Math.abs(ya-yb)>0.5) ctx.lineTo(c,yb);
  }
  ctx.stroke(); ctx.shadowBlur=0;
  ctx.fillStyle=tr; ctx.font='600 13px "Noto Sans Mono", monospace';
  ctx.fillText(`CH1  ${fmtVdiv(vd)}/div  ${S.coupling}`,10,20);
  const tt=`${fmtT(td)}/div`; ctx.fillText(tt,W-ctx.measureText(tt).width-10,H-10);
}
function updateScope(){
  sig=scopeSignal(); st=stats(sig);
  $('#vdOut').textContent=fmtVdiv(VDIV[S.vd]); $('#tdOut').textContent=fmtT(TDIV[S.td]);
  const p=S.p;
  $('#oVbat').textContent=fx(p.vbat,1)+' V'; $('#oVrms').textContent=fx(p.vrms,1)+' V';
  $('#oCap').textContent=CAPS[p.cap]+' µF'; $('#oRl').textContent=RLS[p.rl]+' Ω';
  $('#oCells').textContent=p.cells; $('#oIrr').textContent=p.irr+' W/m²';
  $$('#i-osc [data-for]').forEach(el=>{const ok=el.dataset.for.split(' ').includes(S.src); el.hidden=!ok || (el.dataset.need==='filt'&&!p.filt);});
  $$('#srcChips .chip').forEach(b=>b.setAttribute('aria-pressed',b.dataset.s===S.src));
  // measurements
  const isRect=S.src==='hw'||S.src==='fw';
  const rows=[['Valor medio (V⎓)',fmtV(st.avg)],['Rizado eficaz (V~)',fmtV(st.ac)],['Pico a pico',fmtV(st.pp)],['Mín · Máx',fmtV(st.min)+' · '+fmtV(st.max)],
    ['Frecuencia',fmtF(sig.freq)],['Factor de rizado r',Math.abs(st.avg)>0.05? fx(st.ac/Math.abs(st.avg)*100,2)+' %':'—']];
  if(isRect && p.filt && !p.reg){
    const fr=S.src==='fw'?120:60, th=(sig.Vp-sig.drop)/(fr*RLS[p.rl]*CAPS[p.cap]*1e-6);
    rows.push(['Vr(pp) simulado',fmtV(st.pp)],['Vr(pp) ≈ Vp/(f·R·C)',fmtV(th)+(th>0.5*(sig.Vp-sig.drop)?' (fuera de validez)':'')]);
  }
  $('#meas').innerHTML=rows.map(r=>`<div class="m"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  const pill=$('#polPill');
  if(st.min>=-1e-9){pill.className='pill ok';pill.textContent= st.pp<1e-6?'CC pura · polaridad constante':'CC · polaridad constante';}
  else if(st.max<=1e-9){pill.className='pill ok';pill.textContent='CC negativa · polaridad constante';}
  else {pill.className='pill bad';pill.textContent='CA · la polaridad se invierte';}
  let h='';
  switch(S.src){
    case 'bat': h='Línea horizontal: polaridad y valor constantes. El rizado es nulo y un multímetro en V~ marcaría 0 V.'; break;
    case 'ca': h='La tensión cruza el cero dos veces por ciclo: la polaridad se invierte. Su valor medio es 0 V, por eso un multímetro en V⎓ marca casi 0 V, mientras que en V~ marca el valor eficaz.'; break;
    case 'hw': case 'fw':
      if(p.reg) h='El regulador entrega 5 V constantes mientras su entrada no baje de unos 7 V. Si reduces C o R hasta que el valle caiga por debajo, el rizado reaparece en la salida (caída de regulación).';
      else if(!p.filt) h='Continua pulsante: nunca cambia de signo, así que es CC, pero no es constante. Activa el condensador de filtro para suavizarla.'+(S.src==='hw'?' Compara con onda completa: el rizado tiene la mitad de frecuencia.':'');
      else h='El condensador se carga en cada pico y se descarga a través de la carga. Aumenta C o R para reducir el rizado. Cambia el acople a AC y baja los voltios por división para ampliarlo.';
      break;
    case 'smps': h='Rizado pequeño y de alta frecuencia (100 kHz, valor ilustrativo). Con acople DC parece una línea plana: prueba acople AC, 10 mV/div y 5 µs/div.'; break;
    case 'pv': h='Tensión continua sin rizado. Su valor depende sobre todo del número de celdas en serie y muy poco de la irradiancia.'; break;
  }
  $('#scopeHint').textContent=h;
  $$('#coupling button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===S.coupling));
  drawScope();
  if((S.src==='fw'||S.src==='hw')&&p.filt&&!p.reg&&S.coupling==='AC'&&VDIV[S.vd]<=0.5)instDone('osc.rizado');
  if(S.src==='smps'&&S.coupling==='AC'&&VDIV[S.vd]<=0.02&&TDIV[S.td]<=1e-5)instDone('osc.smps');
}
function autoset(){
  sig=scopeSignal(); st=stats(sig); S.coupling='DC';
  const peak=Math.max(Math.abs(st.max),Math.abs(st.min),0.01);
  const twoSided=st.min<-1e-9;
  S.pos= twoSided?0:-3;
  const avail= twoSided?3.6:6.6;
  S.vd=VDIV.findIndex(v=>peak/v<=avail); if(S.vd<0) S.vd=VDIV.length-1;
  if(sig.freq){const want=3/sig.freq/10; S.td=TDIV.findIndex(t=>t>=want); if(S.td<0)S.td=TDIV.length-1;} else S.td=10;
  $('#pos').value=S.pos; updateScope();
}
$('#srcChips').addEventListener('click',e=>{const b=e.target.closest('.chip'); if(!b) return; S.src=b.dataset.s; autoset();});
$('#vdUp').onclick=()=>{S.vd=Math.min(VDIV.length-1,S.vd+1);updateScope();};
$('#vdDown').onclick=()=>{S.vd=Math.max(0,S.vd-1);updateScope();};
$('#tdUp').onclick=()=>{S.td=Math.min(TDIV.length-1,S.td+1);updateScope();};
$('#tdDown').onclick=()=>{S.td=Math.max(0,S.td-1);updateScope();};
$('#coupling').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; S.coupling=b.dataset.c; if(S.coupling!=='DC'){S.pos=0;$('#pos').value=0;} updateScope();});
$('#pos').oninput=e=>{S.pos=+e.target.value; drawScope();};
$('#autoset').onclick=autoset;
[['pVbat','vbat',parseFloat],['pVrms','vrms',parseFloat],['oscCap','cap',parseInt],['pRl','rl',parseInt],['pCells','cells',parseInt],['pIrr','irr',parseInt]].forEach(([id,k,fn])=>{
  $('#'+id).addEventListener('input',e=>{S.p[k]=fn(e.target.value); updateScope();});
});
$('#pFilt').onchange=e=>{S.p.filt=e.target.checked; autoset();};
$('#pReg').onchange=e=>{S.p.reg=e.target.checked; autoset();};
window.addEventListener('resize',sizeCanvas);
try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{drawScope();drawGauge();});}catch(e){}
new MutationObserver(()=>{drawScope();drawGauge();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

/* ---------- Multimeter ---------- */
const DEV={
  pila:{name:'Pila alcalina AA',plus:'+',minus:'−',kind:'dc'},
  bat12:{name:'Batería de plomo-ácido 12 V',plus:'+',minus:'−',kind:'dc'},
  panel:{name:'Panel solar fotovoltaico',plus:'+',minus:'−',kind:'dc'},
  smps:{name:'Fuente conmutada 12 V',plus:'+12 V',minus:'GND',kind:'dc'},
  lineal:{name:'Fuente lineal sin regular (puente + 1000 µF, carga 100 Ω)',plus:'+',minus:'−',kind:'dc'},
  toma:{name:'Tomacorriente 120 V CA, 60 Hz',plus:'L',minus:'N',kind:'ac'}
};
const M={type:'digital',dial:'OFF',jack:'VΩ',red:null,black:null,holding:'red',range:'AUTO',arange:2,hold:false,holdVal:null,
  mm:0,mn:null,mx:null,rel:false,ref:0,fuse:true,dev:'bat12',charge:90,cells:36,irr:1000,last:null};
const CH={c1:false,c2:false,c3:false,c4:false,c5:false};
let dstat=null;
function devSignal(){
  switch(M.dev){
    case 'pila': return makeSignal('dc',{v:1.2+0.4*M.charge/100});
    case 'bat12': return makeSignal('dc',{v:11.8+0.9*M.charge/100});
    case 'panel': return makeSignal('dc',{v:pvV(M.cells,M.irr)});
    case 'smps': return makeSignal('smps');
    case 'lineal': return makeSignal('rect',{full:true,vrms:12,filt:true,cap:1000,rl:100,reg:false});
    case 'toma': return makeSignal('ac',{vrms:120});
  }
}
function updateDevice(){
  dstat=stats(devSignal());
  $('#oCharge').textContent=M.charge+' %'; $('#oDCells').textContent=M.cells; $('#oDIrr').textContent=M.irr+' W/m²';
  $$('[data-dev]').forEach(el=>el.hidden=!el.dataset.dev.split(' ').includes(M.dev));
  $$('#devChips .chip').forEach(b=>b.setAttribute('aria-pressed',b.dataset.d===M.dev));
  drawDevice(); meterTick(true);
}
function symbol(dev){
  const ink='var(--ink)';
  switch(dev){
    case 'pila': return `<line x1="110" y1="50" x2="110" y2="82" stroke="${ink}" stroke-width="2.5"/><line x1="80" y1="82" x2="140" y2="82" stroke="${ink}" stroke-width="3.5"/><line x1="95" y1="98" x2="125" y2="98" stroke="${ink}" stroke-width="6"/><line x1="110" y1="98" x2="110" y2="130" stroke="${ink}" stroke-width="2.5"/><text x="150" y="86" font-size="13" fill="var(--muted)" font-family="Noto Sans Mono, monospace">1 celda</text>`;
    case 'bat12': {let s=`<line x1="110" y1="50" x2="110" y2="62" stroke="${ink}" stroke-width="2.5"/>`; for(let i=0;i<3;i++){const y=62+i*24; s+=`<line x1="82" y1="${y}" x2="138" y2="${y}" stroke="${ink}" stroke-width="3.5"/><line x1="96" y1="${y+10}" x2="124" y2="${y+10}" stroke="${ink}" stroke-width="6"/>`; if(i<2) s+=`<line x1="110" y1="${y+10}" x2="110" y2="${y+24}" stroke="${ink}" stroke-width="2.5"/>`;} return s+`<line x1="110" y1="120" x2="110" y2="130" stroke="${ink}" stroke-width="2.5"/><text x="148" y="94" font-size="13" fill="var(--muted)" font-family="Noto Sans Mono, monospace">6 celdas</text>`;}
    case 'panel': {let s=`<rect x="62" y="58" width="96" height="64" rx="3" fill="var(--surface)" stroke="${ink}" stroke-width="2.5"/>`; for(let i=1;i<6;i++) s+=`<line x1="${62+i*16}" y1="58" x2="${62+i*16}" y2="122" stroke="var(--muted)" stroke-width="1"/>`; for(let j=1;j<4;j++) s+=`<line x1="62" y1="${58+j*16}" x2="158" y2="${58+j*16}" stroke="var(--muted)" stroke-width="1"/>`; return s+`<line x1="110" y1="50" x2="110" y2="58" stroke="${ink}" stroke-width="2.5"/><line x1="110" y1="122" x2="110" y2="130" stroke="${ink}" stroke-width="2.5"/><text x="62" y="146" font-size="12" fill="var(--muted)" font-family="Noto Sans Mono, monospace">${M.cells} celdas</text>`;}
    case 'toma': return `<circle cx="110" cy="90" r="30" fill="var(--surface)" stroke="${ink}" stroke-width="2.5"/><path d="M90 90 C 97 70, 103 70, 110 90 S 123 110, 130 90" fill="none" stroke="${ink}" stroke-width="2.5"/><line x1="110" y1="50" x2="110" y2="60" stroke="${ink}" stroke-width="2.5"/><line x1="110" y1="120" x2="110" y2="130" stroke="${ink}" stroke-width="2.5"/><text x="60" y="160" font-size="12" fill="var(--bad)" font-family="Noto Sans Mono, monospace">Peligro: tensión de red</text>`;
    default: {const lab=dev==='smps'?'SMPS':'Rect.+C'; const sub=dev==='smps'?'CA → CC 12 V':'CA → CC'; return `<rect x="58" y="60" width="104" height="60" rx="6" fill="var(--surface)" stroke="${ink}" stroke-width="2.5"/><text x="110" y="88" text-anchor="middle" font-size="15" font-weight="700" fill="${ink}" font-family="Archivo, sans-serif">${lab}</text><text x="110" y="106" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="Noto Sans Mono, monospace">${sub}</text><line x1="110" y1="50" x2="110" y2="60" stroke="${ink}" stroke-width="2.5"/><line x1="110" y1="120" x2="110" y2="130" stroke="${ink}" stroke-width="2.5"/>`;}
  }
}
function drawDevice(){
  const d=DEV[M.dev], ink='var(--ink)';
  const term=(id,y,label)=>{
    const r=M.red===id, b=M.black===id;
    let rings='';
    if(r) rings+=`<circle cx="270" cy="${y}" r="19" fill="none" stroke="var(--red)" stroke-width="5"/>`;
    if(b) rings+=`<circle cx="270" cy="${y}" r="${r?25:19}" fill="none" stroke="var(--black)" stroke-width="5"/>`;
    const tag=[r?'roja':'',b?'negra':''].filter(Boolean).join(' + ');
    return `<g class="term" tabindex="0" role="button" data-t="${id}" aria-label="Terminal ${label}${tag?', punta '+tag:''}">${rings}<circle class="post" cx="270" cy="${y}" r="13"/><text x="270" y="${y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="${ink}" font-family="Noto Sans Mono, monospace">${id==='+'?(d.plus.length>2?'+':d.plus):(d.minus.length>2?'⏚':d.minus)}</text><text x="296" y="${y+5}" font-size="12" fill="var(--muted)" font-family="Noto Sans Mono, monospace">${label}</text></g>`;
  };
  $('#devsvg').innerHTML=`<svg viewBox="0 0 360 180" role="group" aria-label="${d.name}">
    <line x1="110" y1="50" x2="257" y2="50" stroke="${ink}" stroke-width="2.5"/>
    <line x1="110" y1="130" x2="257" y2="130" stroke="${ink}" stroke-width="2.5"/>
    ${symbol(M.dev)}
    <text x="12" y="22" font-size="13" font-weight="600" fill="${ink}" font-family="Public Sans, sans-serif">${d.name}</text>
    ${term('+',50,d.plus)}${term('-',130,d.minus)}
  </svg>`;
  const nm=t=>t==null?'al aire':(t==='+'?d.plus:d.minus);
  $('#probeStatus').textContent=`Roja → ${nm(M.red)}  ·  Negra → ${nm(M.black)}`;
}
$('#devsvg').addEventListener('click',e=>{const g=e.target.closest('.term'); if(g) attach(g.dataset.t);});
$('#devsvg').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const g=e.target.closest('.term'); if(g){e.preventDefault(); attach(g.dataset.t);}}});
function attach(t){
  const k=M.holding; M[k]= M[k]===t? null : t;
  // after placing, switch to the other probe if it is free
  if(M[k]===t){const other=k==='red'?'black':'red'; if(M[other]==null) setHolding(other);}
  drawDevice(); meterTick(true);
  const f=document.querySelector(`.term[data-t="${t}"]`); if(f) f.focus();
}
function setHolding(k){M.holding=k; $$('.probe').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===k));}
$$('.probe').forEach(b=>b.onclick=()=>setHolding(b.dataset.p));
$('#freeProbes').onclick=()=>{M.red=null;M.black=null;setHolding('red');drawDevice();meterTick(true);};
$('#devChips').addEventListener('click',e=>{const b=e.target.closest('.chip'); if(!b) return; M.dev=b.dataset.d; resetFuncs(); updateDevice();});
$('#dCharge').oninput=e=>{M.charge=+e.target.value; updateDevice();};
$('#dCells').oninput=e=>{M.cells=+e.target.value; updateDevice();};
$('#dIrr').oninput=e=>{M.irr=+e.target.value; updateDevice();};

/* dial */
const DIAL=[{k:'OFF',a:-135,l:'OFF'},{k:'V~',a:-81,l:'V~'},{k:'V⎓',a:-27,l:'V⎓'},{k:'mV⎓',a:27,l:'mV⎓'},{k:'Ω',a:81,l:'Ω'},{k:'A⎓',a:135,l:'A⎓'}];
(function buildDial(){
  const dial=$('#dial');
  DIAL.forEach(d=>{const r=96, rad=d.a*Math.PI/180; const b=document.createElement('button'); b.type='button'; b.className='dpos'; b.dataset.k=d.k;
    b.style.left=`calc(50% + ${(r*Math.sin(rad)).toFixed(1)}px)`; b.style.top=`calc(50% - ${(r*Math.cos(rad)).toFixed(1)}px)`;
    b.innerHTML=d.l; b.setAttribute('aria-label','Selector en '+(d.k==='OFF'?'apagado':d.k)); b.onclick=()=>{setDial(d.k);}; dial.appendChild(b);});
  dial.addEventListener('keydown',e=>{const i=DIAL.findIndex(d=>d.k===M.dial); if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();setDial(DIAL[Math.min(DIAL.length-1,i+1)].k);} if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();setDial(DIAL[Math.max(0,i-1)].k);}});
})();
function setDial(k){M.dial=k; resetFuncs(); renderMeterChrome(); meterTick(true); const b=document.querySelector(`.dpos[data-k="${k}"]`); if(b) b.focus();}
function resetFuncs(){M.hold=false;M.holdVal=null;M.mm=0;M.mn=null;M.mx=null;M.rel=false;M.ref=0;M.range='AUTO';}
function renderMeterChrome(){
  const d=DIAL.find(x=>x.k===M.dial); $('#knob').style.transform=`rotate(${d.a}deg)`;
  $$('.dpos').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===M.dial));
  $$('.jack').forEach(j=>{if(j.dataset.j!=='COM') j.classList.toggle('red-in',j.dataset.j===M.jack); j.setAttribute('aria-label','Borne '+j.dataset.j+(j.dataset.j===M.jack?', punta roja conectada':j.dataset.j==='COM'?', punta negra conectada':''));});
  $$('.typeseg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===M.type));
  const an=M.type==='analog'; $('#lcd').hidden=an; $('#analog').hidden=!an;
  ['#bHold','#bMinMax','#bRel'].forEach(s=>$(s).disabled=an);
  $('#bHold').setAttribute('aria-pressed',M.hold); $('#bMinMax').setAttribute('aria-pressed',M.mm>0); $('#bRel').setAttribute('aria-pressed',M.rel);
  $('#bMinMax').textContent=M.mm===1?'MAX':M.mm===2?'MIN':'MIN MAX';
  $('#fuseBtn').hidden=M.fuse;
}
$('#jacks').addEventListener('click',e=>{const j=e.target.closest('.jack'); if(!j||j.dataset.j==='COM') return; M.jack=j.dataset.j; renderMeterChrome(); meterTick(true);});
$$('.typeseg button').forEach(b=>b.onclick=()=>{M.type=b.dataset.t; resetFuncs(); renderMeterChrome(); meterTick(true);});
$('#fuseBtn').onclick=()=>{M.fuse=true; renderMeterChrome(); meterTick(true);};

/* evaluation */
const DR=[6,60,600,1000], DD=[3,2,1,0], AFS=[2.5,10,50,250,1000];
function evaluate(){
  const r={off:false,text:'',unit:'',ann:{},note:'',level:'info',value:null,kind:null};
  if(M.dial==='OFF'){r.off=true; r.note='El multímetro está apagado. Gira el selector a V⎓ para medir tensión continua.'; return r;}
  const conn=M.red&&M.black&&M.red!==M.black, same=M.red&&M.red===M.black;
  const sign=conn?(M.red==='+'?1:-1):0;
  const vdc=conn?sign*dstat.avg:0, vac=conn?dstat.ac:0;
  const energized=conn&&(Math.abs(dstat.avg)>0.05||dstat.ac>0.05);
  const curJack=M.jack!=='VΩ';
  const isV=['V⎓','mV⎓','V~'].includes(M.dial);
  if(curJack && !M.fuse){r.text='FUSE'; r.level='bad'; r.note='El fusible del circuito de corriente está fundido. Pulsa "Reemplazar fusible" y mueve la punta roja al borne V Ω.'; return r;}
  if(isV && curJack){
    if(energized){M.fuse=false; CH.c5=true; r.text='FUSE'; r.level='bad'; r.note='Cortocircuito. Con la punta roja en un borne de corriente, el multímetro tiene una resistencia casi nula: al tocar la fuente circula una corriente muy alta y se funde el fusible. Para medir tensión la punta roja va en V Ω.'; renderMeterChrome(); return r;}
    r.text='LEAd'; r.level='warn'; r.note='La punta roja está en un borne de corriente. Para medir tensión, muévela al borne V Ω antes de tocar el circuito.'; return r;
  }
  if(M.dial==='Ω'){
    r.unit='Ω';
    if(curJack){r.text='LEAd'; r.level='warn'; r.note='Para medir resistencia la punta roja va en V Ω.'; return r;}
    if(energized){r.text='OL'; r.level='bad'; r.note='Nunca midas resistencia en un circuito energizado: el óhmetro inyecta su propia corriente y la tensión externa falsea la lectura o daña el instrumento.'; return r;}
    if(same){r.text='0.0'; r.note='Ambas puntas en el mismo punto: resistencia prácticamente nula.'; return r;}
    r.text='OL'; r.note='Circuito abierto: resistencia infinita.'; return r;
  }
  if(M.dial==='A⎓'){
    r.unit='A';
    if(!curJack){r.text='LEAd'; r.level='warn'; r.note='Para medir corriente la punta roja va en A o mA, y el multímetro se conecta en serie con la carga, nunca directamente sobre la fuente.'; return r;}
    if(energized){M.fuse=false; CH.c5=true; r.text='FUSE'; r.level='bad'; r.note='Conectaste el amperímetro en paralelo con la fuente: es un cortocircuito y el fusible se funde. El amperímetro se intercala en serie, abriendo el circuito.'; renderMeterChrome(); return r;}
    r.text='0.000'; r.note='Sin corriente: el amperímetro debe quedar en serie con una carga.'; return r;
  }
  // voltage modes, correct jack
  r.kind=M.dial; r.value= M.dial==='V~'? vac : vdc;
  if(!conn){r.note= same? 'Ambas puntas tocan el mismo terminal: la diferencia de potencial es 0 V.' : 'Conecta las dos puntas a terminales distintos. Con una punta al aire no hay medición.';}
  else if(M.dial==='V⎓'){
    if(DEV[M.dev].kind==='ac'){r.level='warn'; r.note='En V⎓ lees el valor medio de la senoidal, que es casi 0 V. La tensión de red se mide en V~. Usa siempre un instrumento con la categoría de medición (CAT) adecuada para la red.'; CH.c3=true;}
    else if(vdc<0){r.level='warn'; r.note='Lectura negativa: las puntas están invertidas (roja en el terminal negativo). El digital lo indica con el signo; el valor absoluto es correcto.'; CH.c2=true;}
    else {r.level='ok'; r.note= M.dev==='lineal'?'Lees el valor medio. Esta fuente tiene rizado: cámbiate a V~ para medir su componente alterna.':'Lectura correcta: valor medio entre la punta roja (+) y la negra (−).';
      if(M.dev==='bat12'&&M.red==='+') CH.c1=true;}
  }
  else if(M.dial==='V~'){
    if(M.dev==='lineal'){r.level='ok'; r.note='Esto es el rizado eficaz de la fuente: la componente alterna superpuesta a la continua.'; CH.c4=true;}
    else if(M.dev==='toma'){r.level='ok'; r.note='Valor eficaz de la tensión de red.';}
    else r.note='Una fuente de CC bien filtrada casi no tiene componente alterna.';
  }
  else r.note= Math.abs(vdc)>0.6?'Fuera de rango para milivoltios: vuelve a V⎓.':'Lectura en milivoltios.';
  return r;
}
function digitalFormat(v,kind){
  if(kind==='mV⎓'){const x=v*1000; if(Math.abs(x)>=600) return {t:'OL',u:'mV'}; return {t:(x<0?'-':'')+Math.abs(x).toFixed(1),u:'mV'};}
  let ri;
  if(M.range==='AUTO'){ri=DR.findIndex(R=>Math.abs(v)<R); if(ri<0) return {t:'OL',u:'V'};}
  else {ri=M.range; if(Math.abs(v)>=DR[ri]) return {t:'OL',u:'V'};}
  return {t:(v<0?'-':'')+Math.abs(v).toFixed(DD[ri]),u:'V'};
}
function noiseFor(v,kind){
  if(kind==='mV⎓') return (Math.random()-0.5)*0.0002;
  const ri= M.range==='AUTO'? Math.max(0,DR.findIndex(R=>Math.abs(v)<R)) : M.range;
  return (Math.random()-0.5)*2*Math.pow(10,-DD[ri]);
}
function meterTick(force){
  const r=evaluate();
  const note=$('#mmNote'); note.textContent=r.note; note.className='note'+(r.level==='info'?'':' '+r.level);
  renderSteps(); renderChallenges();
  if(M.type==='analog'){M.last=r; drawGauge(); return;}
  const ann={AUTO:false,HOLD:M.hold,MAX:M.mm===1,MIN:M.mm===2,REL:M.rel,DC:false,AC:false};
  let text='',unit='';
  if(r.off){$('#dval').textContent='';$('#dunit').textContent='';setAnn({});$('#lcd').querySelector('.ghost').style.visibility='hidden';return;}
  $('#lcd').querySelector('.ghost').style.visibility='visible';
  if(r.value==null){text=r.text; unit=r.unit;}
  else{
    ann.DC=r.kind!=='V~'; ann.AC=r.kind==='V~'; ann.AUTO=M.range==='AUTO'&&r.kind!=='mV⎓';
    let v=r.value; if(Math.abs(v)>1e-6||(M.red&&M.black)) v+=noiseFor(v,r.kind); else v=0;
    if(r.kind==='V~') v=Math.abs(v);
    if(M.rel) v-=M.ref;
    if(M.mm>0){M.mn=M.mn==null?v:Math.min(M.mn,v); M.mx=M.mx==null?v:Math.max(M.mx,v);}
    let shown= M.mm===1?M.mx : M.mm===2?M.mn : v;
    if(M.hold){ if(M.holdVal==null) M.holdVal=shown; shown=M.holdVal; }
    M.current=v;
    const f=digitalFormat(shown,r.kind); text=f.t; unit=f.u;
  }
  $('#dval').textContent=text; $('#dunit').textContent=unit; setAnn(ann);
}
function setAnn(a){$$('#ann span').forEach(s=>s.classList.toggle('on',!!a[s.dataset.a]));}
function drawGauge(){
  const svg=$('#gauge'); if(!svg||M.type!=='analog') return;
  const r=M.last||evaluate();
  const fs= r.kind==='mV⎓'?0.25:AFS[M.arange];
  const unit= r.kind==='mV⎓'?'V (0–250 mV)':'V';
  const cx=150, cy=150, R=118, a0=-50, a1=50;
  const ang=frac=>a0+(a1-a0)*frac;
  const pt=(a,rr)=>[cx+rr*Math.sin(a*Math.PI/180), cy-rr*Math.cos(a*Math.PI/180)];
  let s=`<path d="M${pt(a0,R).join(' ')} A ${R} ${R} 0 0 1 ${pt(a1,R).join(' ')}" fill="none" stroke="#2a2a2a" stroke-width="2"/>`;
  for(let i=0;i<=50;i++){const a=ang(i/50), major=i%10===0, mid=i%5===0, [x1,y1]=pt(a,R), [x2,y2]=pt(a,R-(major?14:mid?9:5)); s+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#2a2a2a" stroke-width="${major?2:1}"/>`;
    if(major){const [tx,ty]=pt(a,R-26); const val=fs*i/50; s+=`<text x="${tx.toFixed(1)}" y="${(ty+4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#2a2a2a" font-family="Noto Sans Mono, monospace">${+val.toFixed(fs<1?2:fs<10?1:0)}</text>`;}}
  let frac=0, warn='';
  const active=!r.off && r.value!=null && M.red && M.black && M.red!==M.black;
  if(active){frac=Math.abs(r.value)<1e-9?0:r.value/fs; if(frac<0){warn='La aguja golpea el tope izquierdo';frac=-0.06;} else if(frac>1){warn='Fuera de escala: sube el rango';frac=1.06;}}
  if(r.value!=null && M.dial!=='V~' && frac<0) {}
  const [nx,ny]=pt(ang(Math.max(-0.06,Math.min(1.06,frac))),R-6);
  s+=`<text x="150" y="70" text-anchor="middle" font-size="13" font-weight="700" fill="#2a2a2a" font-family="Archivo, sans-serif">${r.off?'APAGADO':(r.kind?(r.kind==='V~'?'V~ ':'V⎓ ')+'· escala '+(r.kind==='mV⎓'?'250 mV':AFS[M.arange]+' V'):(r.text||''))}</text>`;
  s+=`<text x="150" y="88" text-anchor="middle" font-size="10" fill="#555" font-family="Noto Sans Mono, monospace">${unit}</text>`;
  s+=`<line class="e-fbae743" x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#C0262D" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="7" fill="#2a2a2a"/>`;
  if(warn) s+=`<text x="150" y="112" text-anchor="middle" font-size="12" font-weight="700" fill="#C0262D" font-family="Public Sans, sans-serif">${warn}</text>`;
  svg.innerHTML=s;
  if(active && r.value<0 && r.kind!=='V~'){const n=$('#mmNote'); n.className='note bad'; n.textContent='Con un instrumento analógico, la punta roja siempre va al positivo y la negra al negativo. Invertidas, la aguja se desvía contra el tope y el instrumento puede dañarse.';}
  else if(active && frac>1){const n=$('#mmNote'); n.className='note warn'; n.textContent='La tensión supera el fondo de escala. Pulsa RANGE para elegir una escala mayor. En un analógico conviene empezar siempre por la escala más alta.';}
}
$('#bHold').onclick=()=>{M.hold=!M.hold; M.holdVal=null; renderMeterChrome(); meterTick(true);};
$('#bMinMax').onclick=()=>{M.mm=(M.mm+1)%3; if(M.mm===1){M.mn=null;M.mx=null;} renderMeterChrome(); meterTick(true);};
$('#bRel').onclick=()=>{M.rel=!M.rel; M.ref=M.rel?(M.current||0):0; renderMeterChrome(); meterTick(true);};
$('#bRange').onclick=()=>{
  if(M.type==='analog'){M.arange=(M.arange+1)%AFS.length;}
  else {M.range= M.range==='AUTO'?0 : (M.range>=DR.length-1?'AUTO':M.range+1);}
  meterTick(true);
};
function renderSteps(){
  const steps=[
    ['Gira el selector a V⎓',M.dial==='V⎓'||M.dial==='mV⎓'],
    ['La punta negra va en el borne COM',true],
    ['La punta roja va en el borne V Ω',M.jack==='VΩ'],
    ['Conecta la negra al terminal negativo (masa)',M.black==='-'],
    ['Conecta la roja al terminal positivo',M.red==='+'],
    ['Lee el valor: unidad, signo y rango',M.dial==='V⎓'&&M.jack==='VΩ'&&M.black==='-'&&M.red==='+'],
    ['Al terminar, retira primero la roja y luego la negra',false]
  ];
  $('#steps').innerHTML=steps.map(s=>`<li class="${s[1]?'done':''}"><span class="ck">✓</span><span>${s[0]}</span></li>`).join('');
}
function renderChallenges(){Object.keys(CH).forEach(k=>{if(CH[k])instDone('dmm.'+k);});}
setInterval(()=>{ if(M.type==='digital') meterTick(false); },500);

IShow.osc=()=>{sizeCanvas();};IShow.dmm=()=>{renderMeterChrome();meterTick(true);};
autoset(); sizeCanvas(); renderMeterChrome(); updateDevice();
})();


/* ================= PMU ================= */
const PMU={src:'test',win:0.5,run:false,s:null,buf:[],tr:[],ang:0,trail:[],mark:null,ended:false,fmin:60,tmin:0,acc:0,k:0,tripped:false,lastLive:null};
function pmuReset(){PMU.s=newSim({});PMU.buf=[];PMU.tr=[];PMU.ang=0;PMU.trail=[];PMU.mark=null;PMU.ended=false;PMU.run=false;PMU.fmin=60;PMU.tmin=0;PMU.acc=0;PMU.k=0;PMU.tripped=false;PMU.lastLive=null;
  $('#pmuRun').textContent='▶ Ejecutar prueba';$('#pmuMark').disabled=true;pmuDraw();}
function pmuPush(t,f){PMU.buf.push([t,f+rn()*0.0008]);PMU.tr.push([t,f]);if(PMU.buf.length>3000){PMU.buf.shift();PMU.tr.shift();}PMU.trail.push(PMU.ang);if(PMU.trail.length>40)PMU.trail.shift();}
function pmuRocof(){const b=PMU.buf;if(b.length<3)return 0;const n=b.length-1,tN=b[n][0];let j=n;while(j>0&&b[j][0]>tN-PMU.win+1e-9)j--;const d=tN-b[j][0];return d>0?(b[n][1]-b[j][1])/d:0;}
function pmuTrue(t){const a=PMU.tr;for(let i=0;i<a.length;i++)if(a[i][0]>=t-1e-9)return a[i][1];return null;}
function pmuTick(dt){
  if(PMU.src==='test'){
    if(PMU.run&&!PMU.ended){const s=PMU.s,h=0.01;PMU.acc+=dt*2;
      while(PMU.acc>=h){PMU.acc-=h;if(!PMU.tripped&&s.t>=5-1e-9){tripLine(s,'L3');PMU.tripped=true;}
        const f0=60+s.dfA;stepSim(s,h);const f=60+s.dfA;PMU.ang=wrap180(PMU.ang+360*((f0+f)/2-60)*h);
        if((PMU.k++)%2===0)pmuPush(s.t,f);
        if(s.t>5&&f<PMU.fmin){PMU.fmin=f;PMU.tmin=s.t;}
        if(s.t>=60){PMU.ended=true;PMU.run=false;pmuEnd();break;}}
      $('#pmuMark').disabled=!(PMU.run&&PMU.s.t>5);}
  } else {const s=G.sim;if(s){
      if(PMU.lastLive!=null&&s.t<PMU.lastLive-1e-6){PMU.buf=[];PMU.tr=[];PMU.trail=[];PMU.ang=0;PMU.lastLive=null;}
      if(PMU.lastLive==null||s.t-PMU.lastLive>=0.02){const f=60+s.dfA;if(PMU.lastLive!=null)PMU.ang=wrap180(PMU.ang+360*(f-60)*(s.t-PMU.lastLive));pmuPush(s.t,f);PMU.lastLive=s.t;}}}
  if(iVis)pmuDraw();}
function pmuEnd(){$('#pmuRun').textContent='▶ Repetir prueba';$('#pmuMark').disabled=true;
  const nad=`El nadir real fue ${fmt(PMU.fmin,3)} Hz a los ${fmt(PMU.tmin,1)} s.`;
  if(!PMU.mark){$('#pmuFb').textContent=`Prueba terminada. ${nad} Repite y pulsa «Marcar nadir» cuando la frecuencia deje de caer.`;return;}
  const d=Math.abs(PMU.mark.f-PMU.fmin);
  if(d<=0.01){$('#pmuFb').textContent=`Bien leído. Marcaste ${fmt(PMU.mark.f,3)} Hz. ${nad} Desde ahí la recuperan los gobernadores y después el AGC.`;instDone('pmu.nadir');}
  else $('#pmuFb').textContent=`Marcaste ${fmt(PMU.mark.f,3)} Hz, a ${fmt(d,3)} Hz del mínimo. ${nad} ${PMU.mark.t<PMU.tmin?'Te adelantaste: la caída todavía continuaba.':'Llegaste tarde: la frecuencia ya se estaba recuperando.'}`;}
function pmuDraw(){
  const b=PMU.buf,last=b.length?b[b.length-1]:null,f=last?last[1]:60,t=last?last[0]:0;
  $('#pmuF').innerHTML=fmt(f,3)+'<small>Hz</small>';$('#pmuR').textContent=fmt(pmuRocof(),3)+' Hz/s';$('#pmuA').textContent=fmt(PMU.ang,1)+'°';$('#pmuT').textContent=fmt(t,1)+' s';
  /* fasor */
  {const {c,W,H}=fitCv($('#pmuPh'),1),cx=W/2,cy=H/2,R=W*0.38;
   c.fillStyle=css('--console');c.fillRect(0,0,W,H);c.strokeStyle=css('--con-line');c.lineWidth=1;
   c.beginPath();c.arc(cx,cy,R,0,2*Math.PI);c.stroke();c.beginPath();c.moveTo(cx-R,cy);c.lineTo(cx+R,cy);c.moveTo(cx,cy-R);c.lineTo(cx,cy+R);c.stroke();
   c.fillStyle=css('--con-muted');c.font='11px "Noto Sans Mono",monospace';c.textAlign='center';
   c.fillText('0°',cx+R+14,cy+4);c.fillText('+90°',cx,cy-R-6);c.fillText('−90°',cx,cy+R+14);c.fillText('±180°',cx-R-4,cy-6);
   c.setLineDash([5,4]);c.strokeStyle=css('--con-muted');c.lineWidth=2;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+R,cy);c.stroke();c.setLineDash([]);
   const tr=css('--trace');PMU.trail.forEach((a,i)=>{const r=a*Math.PI/180;c.globalAlpha=0.08+0.5*i/PMU.trail.length;c.fillStyle=tr;c.beginPath();c.arc(cx+R*Math.cos(r),cy-R*Math.sin(r),2.2,0,2*Math.PI);c.fill();});c.globalAlpha=1;
   const r=PMU.ang*Math.PI/180,x=cx+R*Math.cos(r),y=cy-R*Math.sin(r);c.strokeStyle=tr;c.lineWidth=3;c.beginPath();c.moveTo(cx,cy);c.lineTo(x,y);c.stroke();
   const ah=10,an=Math.atan2(cy-y,x-cx);c.fillStyle=tr;c.beginPath();c.moveTo(x,y);c.lineTo(x-ah*Math.cos(an-0.4),y+ah*Math.sin(an-0.4));c.lineTo(x-ah*Math.cos(an+0.4),y+ah*Math.sin(an+0.4));c.fill();
   c.textAlign='left';c.fillStyle=css('--con-muted');c.fillText('referencia GPS (60 Hz)',8,H-8);}
  /* tendencia */
  {const {c,W,H}=fitCv($('#pmuTr'),1),L=46,Rm=10,T=12,B=24,pw=W-L-Rm,ph=H-T-B;
   c.fillStyle=css('--console');c.fillRect(0,0,W,H);
   const span=PMU.src==='test'?60:40,t1=Math.max(span,t),t0=t1-span;let lo=59.35,hi=60.1;b.forEach(p=>{if(p[0]>=t0){lo=Math.min(lo,p[1]-0.03);hi=Math.max(hi,p[1]+0.03);}});
   const X=v=>L+(v-t0)/span*pw,Y=v=>T+(hi-v)/(hi-lo)*ph;
   c.font='10px "Noto Sans Mono",monospace';c.fillStyle=css('--con-muted');c.strokeStyle=css('--con-line');c.lineWidth=1;c.textAlign='right';
   const step=(hi-lo)>0.6?0.2:0.1;for(let v=Math.ceil(lo/step)*step;v<=hi;v+=step){c.beginPath();c.moveTo(L,Y(v));c.lineTo(W-Rm,Y(v));c.stroke();c.fillText(fmt(v,1),L-4,Y(v)+3);}
   c.textAlign='center';for(let s=Math.ceil(t0/10)*10;s<=t1;s+=10){c.fillText(s+' s',X(s),H-8);}
   const hl=(v,col)=>{if(v<lo||v>hi)return;c.setLineDash([5,4]);c.strokeStyle=col;c.beginPath();c.moveTo(L,Y(v));c.lineTo(W-Rm,Y(v));c.stroke();c.setLineDash([]);};
   hl(59.8,css('--s-ok'));hl(60.2,css('--s-ok'));hl(59.4,css('--s-bad'));
   c.strokeStyle=css('--trace');c.lineWidth=2;c.beginPath();let st=false;b.forEach(p=>{if(p[0]<t0)return;const x=X(p[0]),y=Y(p[1]);if(!st){c.moveTo(x,y);st=true;}else c.lineTo(x,y);});c.stroke();
   if(PMU.mark&&PMU.mark.t>=t0){c.strokeStyle=css('--gold');c.lineWidth=2;c.beginPath();c.arc(X(PMU.mark.t),Y(PMU.mark.f),6,0,2*Math.PI);c.stroke();}
   if(PMU.ended){c.fillStyle=css('--s-bad');c.beginPath();c.arc(X(PMU.tmin),Y(PMU.fmin),3.5,0,2*Math.PI);c.fill();}}
}
$('#pmuSrc').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PMU.src=b.dataset.s;segSet('#pmuSrc','s',PMU.src);pmuReset();
  $('#pmuRun').disabled=PMU.src!=='test';$('#pmuReset').disabled=PMU.src!=='test';
  $('#pmuFb').textContent=PMU.src==='live'?'La PMU lee la frecuencia del área A del simulador de la sala de control. Inicia o reanuda el escenario allí y vuelve aquí a observar el fasor.':'Pulsa «Ejecutar prueba». A los 5 s se pierde la importación de 420 MW.';});
$('#pmuWin').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PMU.win=+b.dataset.w;segSet('#pmuWin','w',b.dataset.w);pmuDraw();});
$('#pmuRun').onclick=()=>{if(PMU.src!=='test')return;if(PMU.ended||!PMU.s)pmuReset();PMU.run=!PMU.run;$('#pmuRun').textContent=PMU.run?'❚❚ Pausa':'▶ Continuar';if(PMU.run&&!PMU.mark)$('#pmuFb').textContent='Prueba en curso a doble velocidad. Observa el fasor y la tendencia.';};
$('#pmuMark').onclick=()=>{if(!PMU.run)return;const s=PMU.s;PMU.mark={t:s.t,f:60+s.dfA};$('#pmuFb').textContent=`Marcaste ${fmt(PMU.mark.f,3)} Hz a los ${fmt(PMU.mark.t,1)} s. Se evalúa al terminar la prueba; puedes volver a marcar.`;};
$('#pmuReset').onclick=()=>{pmuReset();$('#pmuFb').textContent='Prueba reiniciada.';};
$('#pmuEstGo').onclick=()=>{const v=parseFloat(String($('#pmuEst').value).replace(',','.'));const fb=$('#pmuEstFb');
  const f0=pmuTrue(5),f1=pmuTrue(5.5);if(PMU.src!=='test'||f0==null||f1==null||PMU.tr[PMU.tr.length-1][0]<5.5){fb.textContent='Primero ejecuta la prueba en modo «Prueba» hasta pasar el evento de los 5 s.';return;}
  if(!isFinite(v)){fb.textContent='Escribe un número, por ejemplo −0,15.';return;}
  const ref=(f1-f0)/0.5;
  if(Math.sign(v)!==Math.sign(ref)){fb.textContent='Revisa el signo: tras perder generación, la frecuencia cae, así que el ROCOF es negativo.';return;}
  if(Math.abs(v-ref)<=0.25*Math.abs(ref)){fb.textContent=`Correcto. En el primer medio segundo el ROCOF fue ${fmt(ref,3)} Hz/s. En ese instante solo responde la inercia; los gobernadores aún no actúan.`;instDone('pmu.rocof');}
  else fb.textContent=`Aún no. Tu valor se aleja más de un 25 % del medido. Vuelve a ejecutar la prueba y lee la PMU justo después de los 5 s con la ventana de 500 ms.`;};
function pmuTve(){const ep=+$('#pmuEp').value*Math.PI/180,em=+$('#pmuEm').value/100;const tve=Math.sqrt((1+em)**2-2*(1+em)*Math.cos(ep)+1)*100;
  $('#pmuEpO').textContent=fmt(+$('#pmuEp').value,2)+'°';$('#pmuEmO').textContent=fmt(+$('#pmuEm').value,2)+' %';const o=$('#pmuTve');o.textContent=fmt(tve,3)+' %';o.style.color=tve>1?'var(--bad)':'var(--ok)';return {tve,em};}
['#pmuEp','#pmuEm'].forEach(s=>$(s).addEventListener('input',pmuTve));
$('#pmuTveGo').onclick=()=>{const {tve,em}=pmuTve();const fb=$('#pmuTveFb');
  if(em>0.0001){fb.textContent='Deja el error de magnitud en 0 para aislar el efecto de la fase.';return;}
  if(tve>1){fb.textContent='Te pasaste: con ese error el TVE supera el 1 %.';return;}
  if(tve<0.95){fb.textContent='Todavía cabe más error de fase. Acércate al límite.';return;}
  fb.textContent='Exacto: unos 0,57° de fase bastan para llegar al 1 %. A 60 Hz eso equivale a unos 26 µs de error de sincronización, por eso la PMU necesita GPS.';instDone('pmu.tve');};
IShow.pmu=()=>{if(!PMU.s)pmuReset();pmuDraw();};

/* ================= Analizador de red ================= */
const PQL={
 res:{n:'Calefactores resistivos de 15 kW. Corriente senoidal y en fase con la tensión.',I1:40,phi:0,h:{}},
 mot:{n:'Motor de inducción de 15 kW a plena carga. Consume potencia reactiva para magnetizarse.',I1:48,phi:34.9,h:{5:-0.03,7:-0.02}},
 vfd:{n:'Variador de velocidad de 15 kW con rectificador de 6 pulsos y sin reactor. Corriente en pulsos, rica en armónicos 5.º y 7.º.',I1:40,phi:6,h:{5:-0.33,7:-0.12,11:0.07,13:0.05,17:-0.03,19:-0.02}},
 led:{n:'Luminarias LED y computadores conectados entre fase y neutro. Fuentes conmutadas con corriente de pico estrecho.',I1:20,phi:-8,h:{3:-0.75,5:0.45,7:-0.22,9:0.12,11:-0.08,13:0.05,15:-0.03},mono:true}};
const PQ={l:'mot',kvar:0,V1:127,Xs:0.08,ans:null};
function pqCalc(){const L=PQL[PQ.l],V1=PQ.V1,phi=L.phi*Math.PI/180;
  const P=V1*L.I1*Math.cos(phi),Qc=PQ.kvar*1000/3,Q1=V1*L.I1*Math.sin(phi)-Qc,I1=Math.hypot(P,Q1)/V1,phi1=Math.atan2(Q1,P);
  let sI=0,sV=0,sN=0;const H=[];for(const h in L.h){const Ih=Math.abs(L.h[h])*L.I1,Vh=Ih*h*PQ.Xs;sI+=Ih*Ih;sV+=Vh*Vh;if(h%3===0)sN+=Ih*Ih;H.push([+h,Ih]);}
  const Irms=Math.sqrt(I1*I1+sI),Vrms=Math.sqrt(V1*V1+sV),S=Vrms*Irms,In=L.mono?3*Math.sqrt(sN):0;
  return {L,P,Q1,I1,phi1,Irms,Vrms,S,PF:P/S,DPF:P/Math.hypot(P,Q1),THDi:Math.sqrt(sI)/I1,THDv:Math.sqrt(sV)/V1,In,H};}
function pqUpdate(){const r=pqCalc(),L=r.L;
  $('#pqKvarO').textContent=fmt(PQ.kvar,1)+' kvar';$('#pqName').textContent=L.n;chipSet('#pqLoads','l',PQ.l);
  const cls=(v,a,b)=>v>=a?'ok':v>=b?'warn':'bad';
  const k=[['Tensión fase',fmt(r.Vrms,1)+' V',''],['Corriente fase',fmt(r.Irms,1)+' A',''],['Neutro',fmt(r.In,1)+' A',r.In>r.Irms?'bad':''],['P total',fmt(3*r.P/1000,2)+' kW',''],['Q total',fmt(3*r.Q1/1000,2)+' kvar',r.Q1<-50?'warn':''],['S total',fmt(3*r.S/1000,2)+' kVA',''],['FP real',fmt(r.PF,3),cls(r.PF,0.95,0.9)],['cos φ₁',fmt(r.DPF,3)+(r.Q1<-1?' cap.':''),cls(r.DPF,0.95,0.9)],['THD corriente',fmt(r.THDi*100,1)+' %',r.THDi>0.2?'bad':r.THDi>0.08?'warn':'ok'],['THD tensión',fmt(r.THDv*100,1)+' %',r.THDv>0.08?'bad':r.THDv>0.05?'warn':'ok']];
  $('#pqKpis').innerHTML=k.map(x=>`<div class="kpi"><span>${x[0]}</span><b class="${x[2]}">${x[1]}</b></div>`).join('');
  let n='';
  if(PQ.l==='res')n='El factor de potencia es 1: toda la corriente produce trabajo. El banco de condensadores solo empeoraría las cosas.';
  else if(PQ.l==='mot')n=r.DPF>=0.95&&r.Q1>=-1?'Factor de potencia corregido. La corriente de línea bajó porque la reactiva ahora la entrega el banco, no la red.':r.Q1<-1?'Sobrecompensaste: el banco entrega más reactiva de la que pide el motor y el factor de potencia se vuelve capacitivo.':'El motor pide reactiva para magnetizarse. Sube el banco de condensadores hasta que el cos φ₁ llegue a 0,95.';
  else if(PQ.l==='vfd')n='Aunque la corriente fundamental casi está en fase con la tensión, los armónicos aumentan la corriente eficaz sin aportar potencia. Los condensadores no corrigen eso y pueden entrar en resonancia con la red.';
  else n=`Los armónicos múltiplos de 3 de las tres fases no se cancelan en el neutro: se suman. Aquí el neutro lleva ${fmt(r.In,1)} A, más que cada fase (${fmt(r.Irms,1)} A). Por eso en estas instalaciones el neutro se sobredimensiona.`;
  $('#pqNote').textContent=n;$('#pqQ').hidden=PQ.l!=='vfd';
  if(PQ.l==='mot'&&r.DPF>=0.95&&r.Q1>=-1)instDone('pq.fp');
  if(PQ.l==='led'&&r.In>r.Irms)instDone('pq.neutro');
  pqDraw(r);}
function pqDraw(r){const L=r.L,phiL=L.phi*Math.PI/180;
  {const {c,W,H}=fitCv($('#pqWave'),0.62),m=10,mid=H/2;c.fillStyle=css('--console');c.fillRect(0,0,W,H);
   c.strokeStyle=css('--con-line');c.beginPath();c.moveTo(0,mid);c.lineTo(W,mid);c.stroke();for(let i=1;i<4;i++){c.beginPath();c.moveTo(i*W/4,0);c.lineTo(i*W/4,H);c.stroke();}
   const N=400,vs=[],is=[],ns=[];let vmax=0,imax=0;
   for(let k=0;k<=N;k++){const th=k/N*4*Math.PI;let v=Math.sin(th),i=(r.I1/L.I1)*Math.sin(th-r.phi1),n=0;
     for(const h in L.h){const c2=L.h[h];v-=Math.abs(c2)*L.I1*h*PQ.Xs/PQ.V1*Math.sign(c2)*Math.cos(h*(th-phiL));i+=c2*Math.sin(h*(th-phiL));if(L.mono&&h%3===0)n+=3*c2*Math.sin(h*(th-phiL));}
     vs.push(v);is.push(i);ns.push(n);vmax=Math.max(vmax,Math.abs(v));imax=Math.max(imax,Math.abs(i),Math.abs(n));}
   const plot=(arr,mx,col,w)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();arr.forEach((y,k)=>{const x=k/N*W,yy=mid-y/mx*(mid-m);k?c.lineTo(x,yy):c.moveTo(x,yy);});c.stroke();};
   plot(vs,vmax,css('--traceB'),2);plot(is,imax,css('--trace'),2.2);if(L.mono)plot(ns,imax,css('--traceD'),1.6);
   c.font='11px "Noto Sans Mono",monospace';c.textAlign='left';c.fillStyle=css('--traceB');c.fillText('v',8,16);c.fillStyle=css('--trace');c.fillText('i',28,16);if(L.mono){c.fillStyle=css('--traceD');c.fillText('neutro',48,16);}}
  {const {c,W,H}=fitCv($('#pqSpec'),0.62),Lm=36,B=22,T=12,pw=W-Lm-8,ph=H-T-B;c.fillStyle=css('--console');c.fillRect(0,0,W,H);
   const hs=[1,3,5,7,9,11,13,15,17,19],vals=hs.map(h=>{if(h===1)return 100;const x=r.H.find(z=>z[0]===h);return x?x[1]/r.I1*100:0;});
   const ymax=Math.max(20,Math.ceil(Math.max(...vals.slice(1))*1.25/10)*10),Y=v=>T+ph-Math.min(v,ymax)/ymax*ph,bw=pw/hs.length;
   c.font='10px "Noto Sans Mono",monospace';c.textAlign='right';c.fillStyle=css('--con-muted');c.strokeStyle=css('--con-line');
   for(let v=0;v<=ymax;v+=ymax/4){c.beginPath();c.moveTo(Lm,Y(v));c.lineTo(W-8,Y(v));c.stroke();c.fillText(Math.round(v)+'%',Lm-4,Y(v)+3);}
   hs.forEach((h,k)=>{const x=Lm+k*bw+bw*0.18,w=bw*0.64,v=vals[k];c.fillStyle=h===1?css('--traceB'):css('--trace');c.fillRect(x,Y(v),w,T+ph-Y(v));
     c.fillStyle=css('--con-muted');c.textAlign='center';c.fillText(h,x+w/2,H-8);if(h===1){c.fillStyle=css('--con-ink');}});
   if(LVL==='inv'){c.strokeStyle=css('--s-bad');c.setLineDash([4,3]);c.lineWidth=1.5;const lim=h=>h<11?4:h<17?2:1.5;c.beginPath();hs.forEach((h,k)=>{if(h===1)return;const x=Lm+k*bw,y=Y(lim(h));c.moveTo(x,y);c.lineTo(x+bw,y);});c.stroke();c.setLineDash([]);
     c.fillStyle=css('--s-bad');c.textAlign='right';c.fillText('límite IEEE 519 (Isc/IL < 20)',W-10,T+12);}}
}
$('#pqLoads').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;PQ.l=b.dataset.l;PQ.kvar=0;$('#pqKvar').value=0;pqUpdate();});
$('#pqKvar').addEventListener('input',e=>{PQ.kvar=+e.target.value;pqUpdate();});
const PQO=[['La tensión de la red es demasiado baja',0],['La corriente tiene armónicos que suman corriente eficaz sin aportar potencia activa',1],['El variador consume mucha potencia reactiva a 60 Hz',0],['El banco de condensadores está desconectado',0]];
$('#pqOpts').innerHTML=PQO.map((o,i)=>`<label class="opt"><input type="radio" name="pqq" value="${i}"> <span>${esc(o[0])}</span></label>`).join('');
$('#pqOpts').addEventListener('change',e=>{const i=+e.target.value,ok=PQO[i][1]===1;$$('#pqOpts .opt').forEach((l,j)=>{l.classList.toggle('right',ok&&j===i);l.classList.toggle('wrong',!ok&&j===i);});
  $('#pqQFb').textContent=ok?'Correcto. FP = cos φ₁ / √(1 + THDi²): con una THDi del 36 % el FP cae aunque el cos φ₁ sea casi 1. Se corrige con reactores o filtros, no con condensadores.':'No es eso. Compara el cos φ₁ con el FP real y mira la THD de corriente.';if(ok)instDone('pq.fpreal');});
IShow.pq=pqUpdate;

/* ================= Pinza amperimétrica ================= */
const CLN=720,CLW={heat:new Float64Array(CLN),pcs:new Float64Array(CLN),dc:new Float64Array(CLN)};
(function(){let s2=0;for(let i=0;i<CLN;i++){const th=i/CLN*2*Math.PI,s=Math.sin(th);CLW.heat[i]=12.5*Math.SQRT2*s;const m=Math.max(0,(Math.abs(s)-0.72)/0.28);CLW.pcs[i]=Math.sign(s)*m*m;s2+=CLW.pcs[i]**2;CLW.dc[i]=18+0.15*Math.sin(2*th*6);}
  const k=6/Math.sqrt(s2/CLN);for(let i=0;i<CLN;i++)CLW.pcs[i]*=k;})();
const CL={l:'heat',p:'L',m:'trms',zc:0,zeroed:false,zeroOk:false,used:{},off:0.42};
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,rms=a=>Math.sqrt(a.reduce((x,y)=>x+y*y,0)/a.length);
function clNet(){const w=CLW[CL.l],f=CL.p==='L'?1:CL.p==='N'?-1:0,out=new Float64Array(CLN);
  for(let i=0;i<CLN;i++){out[i]=f*w[i];if(CL.p==='LN'&&CL.l!=='dc')out[i]+=0.004*Math.SQRT2*Math.sin(i/CLN*2*Math.PI);}return out;}
function clRead(){const n=clNet();if(CL.m==='dc')return mean(n)+CL.off-CL.zc;const ac=CL.l==='dc'?n.map(x=>x-mean(n)):n;return CL.m==='trms'?rms(ac):1.1107*mean(ac.map(Math.abs));}
function clUpdate(){chipSet('#clLoads','l',CL.l);chipSet('#clPos','p',CL.p);segSet('#clMode','m',CL.m);$('#clZero').disabled=CL.m!=='dc';
  const dc=CL.l==='dc';$$('#clPos .chip').forEach(b=>{const p=b.dataset.p;b.textContent=p==='empty'?'Nada (mordaza vacía)':p==='L'?(dc?'Solo el positivo':'Solo la fase'):p==='N'?(dc?'Solo el negativo':'Solo el neutro'):'El cable completo';});
  const v=clRead();$('#clLcd').innerHTML=(Math.abs(v)<0.005?'0,00':fmt(v,2))+'<small>A</small>';
  $('#clAnn').innerHTML=(CL.m==='trms'?'TRUE RMS · CA':CL.m==='avg'?'PROMEDIO · CA':'CC'+(CL.zeroed?' · ZERO':''))+'<br>'+(CL.l==='heat'?'Calentador':CL.l==='pcs'?'Computadores':'Baterías 48 V');
  const w=CLW[CL.l],trueRms=rms(w),pk=Math.max(...w.map(Math.abs));let n='';
  if(CL.p==='empty')n=CL.m==='dc'&&!CL.zeroed?`La mordaza está vacía y aun así marca ${fmt(CL.off,2)} A: es el magnetismo remanente del sensor Hall. Pulsa ZERO ahora, con la mordaza vacía.`:'Mordaza vacía. Rodea uno de los conductores.';
  else if(CL.p==='LN')n='La corriente que va por un conductor regresa por el otro: sus campos magnéticos se cancelan y la pinza marca casi cero. Así se buscan corrientes de fuga, pero para medir la carga hay que abrazar un solo conductor.';
  else if(CL.m==='dc'&&!dc)n='En A⎓ la pinza promedia la corriente; una corriente alterna da un promedio cercano a cero. Cambia a una función de CA.';
  else if(CL.m!=='dc'&&dc)n='Con la función de CA la pinza solo ve la pequeña ondulación de la corriente continua. Usa A⎓.';
  else if(CL.m==='dc'&&!CL.zeroed)n=`Lectura con error: incluye ${fmt(CL.off,2)} A de remanencia. Pon la pinza en cero con la mordaza vacía antes de medir corriente continua.`;
  else if(CL.m==='dc'&&!CL.zeroOk)n='Pusiste en cero con un conductor dentro de la mordaza, así que la pinza restó la corriente real. Vacía la mordaza y vuelve a pulsar ZERO.';
  else if(CL.l==='pcs')n=CL.m==='avg'?`Una pinza de respuesta promedio supone una senoidal. Con pulsos estrechos (factor de cresta ${fmt(pk/trueRms,1)}) marca ${fmt(clRead(),2)} A cuando la corriente eficaz real es ${fmt(trueRms,2)} A.`:`True RMS: ${fmt(trueRms,2)} A, el valor que calienta los conductores. Prueba la función de respuesta promedio y compara.`;
  else n=dc?'Corriente continua del banco medida correctamente.':'Corriente de la carga medida correctamente.';
  $('#clNote').textContent=n;
  if(CL.l==='heat'&&CL.p==='L'&&CL.m!=='dc')instDone('clamp.fase');
  if(CL.l!=='dc'&&CL.p==='LN')instDone('clamp.cable');
  if(CL.l==='pcs'&&CL.p==='L'&&CL.m!=='dc'){CL.used[CL.m]=1;if(CL.used.trms&&CL.used.avg)instDone('clamp.trms');}
  if(dc&&CL.m==='dc'&&CL.p==='L'&&CL.zeroed&&CL.zeroOk)instDone('clamp.cc');
  clDraw();}
function clDraw(){const dc=CL.l==='dc',ink=css('--con-ink'),mut=css('--con-muted'),cL=dc?'#E0575B':'#E8E2D0',cN=dc?'#8A96A8':'#6FA8FF';
  const yL=58,yN=104,jaw=CL.p==='empty'?{y:170,r:22}:CL.p==='L'?{y:yL,r:20}:CL.p==='N'?{y:yN,r:20}:{y:(yL+yN)/2,r:42};
  const lab=dc?['+','−']:['L','N'],load=CL.l==='heat'?'Calentador':CL.l==='pcs'?'Computadores':'Inversor';
  $('#clSvg').innerHTML=`<svg viewBox="0 0 420 210" role="img" aria-label="Tablero, conductores y carga; la mordaza abraza: ${CL.p==='empty'?'nada':CL.p==='LN'?'ambos conductores':CL.p==='L'?'el conductor '+lab[0]:'el conductor '+lab[1]}">
   <rect x="12" y="34" width="70" height="96" rx="6" fill="none" stroke="${mut}" stroke-width="2"/><text x="47" y="150" text-anchor="middle" font-size="11" fill="${mut}" font-family="Noto Sans Mono,monospace">${dc?'Banco':'Tablero'}</text>
   <rect x="330" y="34" width="78" height="96" rx="6" fill="none" stroke="${mut}" stroke-width="2"/><text x="369" y="150" text-anchor="middle" font-size="11" fill="${mut}" font-family="Noto Sans Mono,monospace">${load}</text>
   <g><circle cx="215" cy="${jaw.y}" r="${jaw.r}" fill="none" stroke="#F2A900" stroke-width="7" stroke-dasharray="${2*Math.PI*jaw.r-10} 10" transform="rotate(-60 215 ${jaw.y})"/><rect x="207" y="${jaw.y+jaw.r}" width="16" height="${Math.max(8,196-jaw.y-jaw.r)}" rx="4" fill="#F2A900"/></g>
   <line x1="82" y1="${yL}" x2="330" y2="${yL}" stroke="${cL}" stroke-width="7" stroke-linecap="round"/><line x1="82" y1="${yN}" x2="330" y2="${yN}" stroke="${cN}" stroke-width="7" stroke-linecap="round"/>
   <text x="96" y="${yL-10}" font-size="12" font-weight="700" fill="${cL}" font-family="Noto Sans Mono,monospace">${lab[0]} →</text><text x="96" y="${yN+22}" font-size="12" font-weight="700" fill="${cN}" font-family="Noto Sans Mono,monospace">← ${lab[1]}</text>
  </svg>`;
  const {c,W,H}=fitCv($('#clWave'),0.36),w=CLW[CL.l],mx=Math.max(...w.map(Math.abs))*1.1,mid=dc?H-14:H/2,sc=dc?(H-24)/mx:(H/2-10)/mx;
  c.fillStyle=css('--console');c.fillRect(0,0,W,H);c.strokeStyle=css('--con-line');c.beginPath();c.moveTo(0,mid);c.lineTo(W,mid);c.stroke();
  c.strokeStyle=css('--trace');c.lineWidth=2;c.beginPath();for(let k=0;k<=2*CLN;k+=2){const x=k/(2*CLN)*W,y=mid-w[k%CLN]*sc;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
  c.fillStyle=mut;c.font='11px "Noto Sans Mono",monospace';c.textAlign='left';c.fillText(`I eficaz ${fmt(rms(w),2)} A · pico ${fmt(Math.max(...w.map(Math.abs)),1)} A`,8,14);}
$('#clLoads').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;CL.l=b.dataset.l;clUpdate();});
$('#clPos').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;CL.p=b.dataset.p;clUpdate();});
$('#clMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;CL.m=b.dataset.m;clUpdate();});
$('#clZero').onclick=()=>{if(CL.m!=='dc')return;CL.zc=CL.off+mean(clNet());CL.zeroed=true;CL.zeroOk=CL.p==='empty';clUpdate();};
IShow.clamp=clUpdate;

/* ================= Megóhmetro ================= */
const MGC={limpio:{n:'seco y limpio',Rl:20e9},humedo:{n:'húmedo',Rl:150e6},contam:{n:'contaminado',Rl:2e9}};
const MGK=1.8e-10,MGRATE=30,MGDIS=2400/6;
const MG={c:'limpio',T:25,V:5000,safe:false,conn:false,run:false,t:0,done:false,dis:0,rem:false,curve:[],res:null,dec:false};
function mgFT(T){const B=T<40?1245:4230;return Math.exp(B*(1/(T+273)-1/313));}
function mgIR(t){const g=1/MGC[MG.c].Rl+MGK*Math.pow(Math.max(t,1)/60,-0.5);return mgFT(MG.T)/g;}
const fmtR=r=>r>=1e9?fmt(r/1e9,r>=1e10?1:2)+' GΩ':fmt(r/1e6,0)+' MΩ';
function mgReset(keep){MG.safe=keep?MG.safe:false;MG.conn=keep?MG.conn:false;MG.run=false;MG.t=0;MG.done=false;MG.dis=0;MG.rem=false;MG.curve=[];MG.res=null;MG.dec=false;$('#mgDec').textContent='';mgUpdate();}
function mgUpdate(){chipSet('#mgCond','c',MG.c);segSet('#mgV','v',MG.V);$('#mgTempO').textContent=MG.T+' °C';
  const st={safe:MG.safe,conn:MG.conn,run:MG.done,dis:MG.dis>=2400,rem:MG.rem};$$('#mgSteps .btn').forEach(b=>b.classList.toggle('done',!!st[b.dataset.st]));
  const live=MG.run?mgIR(MG.t):MG.done?mgIR(600):null;$('#mgLcd').innerHTML=live?fmtR(live).replace(/ (\S+)$/,'<small>$1</small>'):'----<small>Ω</small>';
  const m=Math.floor(MG.t/60),s=Math.floor(MG.t%60);$('#mgT').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  const vo=MG.run?MG.V:MG.done&&MG.dis<2400?MG.V*Math.exp(-MG.dis/400):0;$('#mgVo').textContent=fmt(vo,0)+' V';$('#mgVo').className=vo>50?'bad':'';
  $('#mgState').innerHTML=MG.run?'Aplicando tensión':MG.done&&MG.dis<2400&&MG.dis>0?'Descargando':MG.done&&MG.dis<2400?'Devanado cargado':MG.rem?'Prueba cerrada':MG.conn?'Conectado':'En espera';
  const R=MG.res;$('#mgRes').innerHTML=R?[['IR a 30 s',fmtR(R.i30)],['IR a 1 min',fmtR(R.i60)],['IR a 10 min',fmtR(R.i600)],['DAR (60 s / 30 s)',fmt(R.dar,2)],['Índice de polarización PI',fmt(R.pi,2)],['IR a 1 min corregida a 40 °C',fmtR(R.i40)]].map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join(''):'<tr><td colspan="2" class="muted">Los resultados aparecen al terminar la prueba.</td></tr>';
  $('#mgYes').disabled=$('#mgNo').disabled=!MG.done||MG.dec;
  $$('#mgV button,#mgCond .chip').forEach(b=>b.disabled=MG.run);$('#mgTemp').disabled=MG.run;
  if(iVis)mgDraw();}
function mgDraw(){const {c,W,H}=fitCv($('#mgCv'),0.46),L=58,B=22,T=10,pw=W-L-10,ph=H-T-B;c.fillStyle=css('--console');c.fillRect(0,0,W,H);
  const lo=7,hi=11,X=t=>L+t/600*pw,Y=r=>T+(hi-Math.log10(Math.max(r,1e7)))/(hi-lo)*ph;
  c.font='10px "Noto Sans Mono",monospace';c.fillStyle=css('--con-muted');c.strokeStyle=css('--con-line');c.lineWidth=1;c.textAlign='right';
  ['10 MΩ','100 MΩ','1 GΩ','10 GΩ','100 GΩ'].forEach((l,i)=>{const y=Y(Math.pow(10,7+i));c.beginPath();c.moveTo(L,y);c.lineTo(W-10,y);c.stroke();c.fillText(l,L-4,y+3);});
  c.textAlign='center';for(let m=0;m<=10;m+=2)c.fillText(m+' min',X(m*60),H-6);
  const thr=100e6*mgFT(MG.T);c.setLineDash([5,4]);c.strokeStyle=css('--s-bad');c.beginPath();c.moveTo(L,Y(thr));c.lineTo(W-10,Y(thr));c.stroke();c.setLineDash([]);c.fillStyle=css('--s-bad');c.textAlign='left';c.fillText('mínimo IR₁ (100 MΩ a 40 °C)',L+6,Y(thr)+13);
  c.strokeStyle=css('--trace');c.lineWidth=2;c.beginPath();MG.curve.forEach((p,i)=>{const x=X(p[0]),y=Y(p[1]);i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();
  if(MG.res){[[60,MG.res.i60],[600,MG.res.i600]].forEach(p=>{c.fillStyle=css('--gold');c.beginPath();c.arc(X(p[0]),Y(p[1]),4,0,2*Math.PI);c.fill();});}}
function megTick(dt){if(MG.run){MG.t=Math.min(600,MG.t+dt*MGRATE);MG.curve.push([MG.t,mgIR(MG.t)]);
    if(MG.t>=600){MG.run=false;MG.done=true;const i30=mgIR(30),i60=mgIR(60),i600=mgIR(600);MG.res={i30,i60,i600,dar:i60/i30,pi:i600/i60,i40:i60/mgFT(MG.T)};
      $('#mgFb').textContent=`Prueba terminada: PI = ${fmt(MG.res.pi,2)}. El devanado quedó cargado a ${fmt(MG.V,0)} V. Antes de tocar nada, descárgalo a tierra.`;}
    mgUpdate();}
  else if(MG.done&&MG.dis>0&&MG.dis<2400){MG.dis=Math.min(2400,MG.dis+dt*MGDIS);if(MG.dis>=2400)$('#mgFb').textContent='Devanado descargado durante 40 min, cuatro veces la duración de la prueba. Ya puedes retirar las conexiones.';mgUpdate();}}
$('#mgSteps').addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(!b)return;const k=b.dataset.st,fb=$('#mgFb');
  if(k==='safe'){if(MG.run)return;MG.safe=true;fb.textContent='Unidad fuera de servicio, interruptor y seccionadores abiertos y bloqueados, ausencia de tensión verificada y devanado puesto a tierra. Retira la tierra solo para conectar el megóhmetro.';}
  else if(k==='conn'){if(!MG.safe){fb.textContent='Peligro: no conectes nada a un devanado sin bloquearlo y verificar que no tiene tensión.';return;}if(MG.run)return;MG.conn=true;fb.textContent='L al devanado, E al marco del estator y G a la guarda para desviar la corriente superficial. Elige la tensión de prueba.';}
  else if(k==='run'){if(!MG.conn){fb.textContent=MG.safe?'Conecta primero el megóhmetro.':'Primero bloquea y verifica la ausencia de tensión.';return;}if(MG.run)return;if(MG.done&&!MG.rem){fb.textContent='Ya tienes una prueba completa. Descarga y retira, o reinicia cambiando la condición.';return;}
    if(MG.rem){MG.rem=false;MG.done=false;MG.res=null;MG.dec=false;MG.dis=0;$('#mgDec').textContent='';}
    MG.run=true;MG.t=0;MG.curve=[];const ok=MG.V>=5000;fb.textContent=ok?`Aplicando ${fmt(MG.V,0)} V durante 10 minutos (acelerado). Observa si la resistencia sigue subiendo.`:`Aplicando ${fmt(MG.V,0)} V. Para un devanado de 13,8 kV, IEEE 43 recomienda entre 5 y 10 kV: la prueba es válida, pero queda por debajo de lo recomendado.`;}
  else if(k==='dis'){if(!MG.done){fb.textContent='No hay carga que descargar: la prueba no ha terminado.';return;}if(MG.dis>=2400)return;MG.dis=1;fb.textContent='Descargando a tierra. IEEE 43 pide al menos cuatro veces el tiempo de aplicación de la tensión.';}
  else if(k==='rem'){if(!MG.done){fb.textContent='La prueba no ha terminado.';return;}
    if(MG.dis<2400){fb.textContent=`Detente: el devanado conserva ${fmt(MG.V*Math.exp(-MG.dis/400),0)} V. La capacitancia del estator y la absorción del dieléctrico mantienen carga durante muchos minutos. Completa la descarga.`;return;}
    MG.rem=true;MG.conn=false;fb.textContent='Prueba cerrada con seguridad.';if(MG.safe&&MG.V>=5000)instDone('meg.seq');else if(MG.V<5000)fb.textContent+=' Para el reto, repite con 5 o 10 kV.';}
  mgUpdate();});
function mgDecide(yes){if(!MG.done||MG.dec)return;const R=MG.res,okIR=R.i40>=100e6,okPI=R.pi>=2||R.i40>5e9,apt=okIR&&okPI,right=yes===apt;MG.dec=true;
  const why=`IR₁ a 40 °C = ${fmtR(R.i40)} (${okIR?'cumple':'no cumple'} el mínimo de 100 MΩ) y PI = ${fmt(R.pi,2)} (${okPI?'cumple':'no cumple'} el mínimo de 2,0 para clase F).`;
  $('#mgDec').innerHTML=`<b data-css="color:var(--${right?'ok':'bad'})">${right?'Decisión correcta.':'Decisión incorrecta.'}</b> ${esc(why)} ${apt?'':esc(MG.c==='humedo'?'Con humedad, la fuga domina y la resistencia apenas sube: hay que secar el devanado (calefacción o corriente de secado) y repetir.':'La fuga superficial aplana la curva: hay que limpiar el devanado y repetir la prueba.')}`;
  if(right&&MG.c==='humedo')instDone('meg.humedo');if(right&&MG.c==='limpio')instDone('meg.limpio');mgUpdate();}
$('#mgYes').onclick=()=>mgDecide(true);$('#mgNo').onclick=()=>mgDecide(false);
$('#mgCond').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b||MG.run)return;MG.c=b.dataset.c;mgReset(true);$('#mgFb').textContent=`Devanado ${MGC[MG.c].n}. ${MG.conn?'Ya está conectado: aplica la tensión.':'Sigue la secuencia desde el paso que corresponda.'}`;});
$('#mgV').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||MG.run)return;MG.V=+b.dataset.v;if(MG.done&&!MG.rem){mgUpdate();return;}mgReset(true);});
$('#mgTemp').addEventListener('input',e=>{if(MG.run)return;MG.T=+e.target.value;if(MG.done)mgReset(true);else mgUpdate();});
IShow.meg=mgUpdate;

/* ================= Sincronoscopio ================= */
const SY={fb:60,vb:1,fg:59.7,fgs:59.7,vg:0.95,vgs:0.95,ph:0,closing:0,closed:false};
function syNew(){let f=59.55+Math.random()*0.9;if(Math.abs(f-60)<0.15)f=f<60?59.8:60.2;SY.fg=SY.fgs=+f.toFixed(2);SY.vg=SY.vgs=+(0.92+Math.random()*0.12).toFixed(3);SY.ph=Math.random()*360-180;SY.closing=0;SY.closed=false;SY.fb=60;
  $('#syTag').textContent='Interruptor 52G abierto';$('#syClose').disabled=false;$$('#syGov button,#syAvr button').forEach(b=>b.disabled=false);$('#syFb').textContent='Unidad en vacío a velocidad cercana a la nominal. Iguala frecuencia y tensión. El interruptor tarda 0,1 s en cerrar.';syDraw();}
function syTick(dt){if(!SY.closed){SY.fb=Math.min(60.01,Math.max(59.99,SY.fb+(Math.random()-0.5)*0.0008));SY.fg+=(SY.fgs-SY.fg)*Math.min(1,dt/1.5);SY.vg+=(SY.vgs-SY.vg)*Math.min(1,dt/0.8);SY.ph=wrap180(SY.ph+360*(SY.fg-SY.fb)*dt);
    if(SY.closing>0){SY.closing-=dt;if(SY.closing<=0)syClose();}}
  if(iVis)syDraw();}
function syClose(){const a=SY.ph,s=SY.fg-SY.fb,dv=(SY.vg-SY.vb)/SY.vb*100,okA=Math.abs(a)<=10,okS=Math.abs(s)<=0.067,okV=dv>=-0.05&&dv<=5,ok=okA&&okS&&okV,p=SY.vg*SY.vb/0.25*Math.sin(a*Math.PI/180);
  SY.closed=true;SY.fg=SY.fgs=SY.fb;SY.vg=SY.vgs=SY.vb;SY.ph=0;$('#syTag').textContent='Interruptor 52G cerrado';$$('#syGov button,#syAvr button').forEach(b=>b.disabled=true);
  const parts=[`Cierre a ${fmt(a,1)}° (${okA?'dentro':'fuera'} de ±10°)`,`deslizamiento ${fmt(s,3)} Hz (${okS?'dentro':'fuera'} de ±0,067 Hz)`,`ΔV ${fmt(dv,1)} % (${okV?'dentro':'fuera'} de 0 a +5 %)`];
  let msg=parts.join(', ')+'. ';
  if(ok)msg+=`Sincronización suave. ${s>0?'El generador iba un poco más rápido y toma algo de carga al cerrar.':'El generador iba un poco más lento: al cerrar absorbe una pequeña potencia de la red hasta que subas la consigna.'}`;
  else{msg+=`Golpe de potencia estimado ≈ ${fmt(Math.abs(p),2)} p.u. (con X″d = 0,25). `;if(!okA)msg+='Un cierre fuera de fase somete el eje, el acople y los devanados a un esfuerzo que se acumula maniobra tras maniobra. ';if(!okS)msg+=s<0?'Con el generador tan lento, la red lo arrastra como motor y puede actuar el relé de potencia inversa (32). ':'Con tanta diferencia de velocidad, la red frena bruscamente la máquina. ';if(!okV)msg+=dv<0?'Con tensión baja, la máquina absorbe reactiva al cerrar. ':'Con tensión muy alta, entrega un pulso de reactiva. ';}
  $('#syFb').textContent=msg;$('#syClose').disabled=true;
  if(ok)instDone('sync.ok');if(ok&&Math.abs(a)<=3)instDone('sync.fino');syDraw();}
function syDraw(){const {c,W,H}=fitCv($('#syCv'),1.13),cx=W/2,cy=W*0.48,R=W*0.36;c.fillStyle=css('--console');c.fillRect(0,0,W,H);
  c.fillStyle=css('--console-2');c.strokeStyle=css('--con-line');c.lineWidth=2;c.beginPath();c.arc(cx,cy,R+12,0,2*Math.PI);c.fill();c.stroke();
  c.strokeStyle=css('--s-ok');c.lineWidth=10;c.beginPath();c.arc(cx,cy,R,-Math.PI/2-10*Math.PI/180,-Math.PI/2+10*Math.PI/180);c.stroke();
  c.strokeStyle=css('--con-muted');c.lineWidth=1.5;for(let d=0;d<360;d+=15){const r=d*Math.PI/180,l=d%90===0?14:7;c.beginPath();c.moveTo(cx+R*Math.sin(r),cy-R*Math.cos(r));c.lineTo(cx+(R-l)*Math.sin(r),cy-(R-l)*Math.cos(r));c.stroke();}
  c.fillStyle=css('--con-muted');c.font='600 11px "Noto Sans Mono",monospace';c.textAlign='center';c.fillText('RÁPIDO →',cx+R*0.6,cy+R*0.35);c.fillText('← LENTO',cx-R*0.6,cy+R*0.35);c.fillText('EN FASE',cx,cy-R-18);
  const a=SY.ph*Math.PI/180;c.strokeStyle=SY.closed?css('--s-ok'):css('--trace');c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(cx-0.18*R*Math.sin(a),cy+0.18*R*Math.cos(a));c.lineTo(cx+(R-18)*Math.sin(a),cy-(R-18)*Math.cos(a));c.stroke();c.lineCap='butt';
  c.fillStyle=css('--con-ink');c.beginPath();c.arc(cx,cy,6,0,2*Math.PI);c.fill();
  const br=SY.closed?0:Math.abs(Math.sin(a/2));const ly=W*0.98;[-1,0,1].forEach(k=>{const x=cx+k*W*0.2;c.fillStyle=`rgba(255,${190+40*br|0},90,${0.08+0.9*br})`;c.strokeStyle=css('--con-line');c.lineWidth=2;c.beginPath();c.arc(x,ly,13,0,2*Math.PI);c.fill();c.stroke();});
  c.fillStyle=css('--con-muted');c.font='10px "Noto Sans Mono",monospace';c.fillText('lámparas: oscuras = en fase',cx,ly+28);
  const s=SY.fg-SY.fb,dv=(SY.vg-SY.vb)/SY.vb*100,cl=(ok)=>ok?'ok':'bad';
  const rows=[['Generador',fmt(SY.fg,3)+' Hz',''],['Red',fmt(SY.fb,3)+' Hz',''],['Deslizamiento',(s>=0?'+':'')+fmt(s,3)+' Hz',cl(Math.abs(s)<=0.067)],['Ángulo',fmt(SY.ph,1)+'°',cl(Math.abs(SY.ph)<=10)],['V generador',fmt(13.8*SY.vg,2)+' kV',''],['V red',fmt(13.8*SY.vb,2)+' kV',''],['ΔV',(dv>=0?'+':'')+fmt(dv,1)+' %',cl(dv>=-0.05&&dv<=5)],['Giro de la aguja',fmt(Math.abs(360*s),1)+' °/s','']];
  $('#syStats').innerHTML=rows.map(r=>`<div class="stat"><span>${r[0]}</span><b class="${r[2]}">${r[1]}</b></div>`).join('');}
$('#syGov').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||SY.closed)return;SY.fgs=Math.min(61,Math.max(59,+(SY.fgs+ +b.dataset.df).toFixed(3)));});
$('#syAvr').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||SY.closed)return;SY.vgs=Math.min(1.15,Math.max(0.85,+(SY.vgs+ +b.dataset.dv).toFixed(4)));});
$('#syClose').onclick=()=>{if(SY.closed||SY.closing>0)return;SY.closing=0.1;$('#syClose').disabled=true;$('#syFb').textContent='Orden de cierre enviada…';};
$('#syNew').onclick=syNew;
IShow.sync=syDraw;

/* bucle y arranque del banco */
let iLast=null;
function iLoop(ts){requestAnimationFrame(iLoop);const dt=iLast==null?0:Math.min(0.1,(ts-iLast)/1000);iLast=ts;
  if(ICUR==='pmu')pmuTick(dt);else if(ICUR==='sync')syTick(dt);else if(ICUR==='meg')megTick(dt);}
new MutationObserver(()=>{if(IShow[ICUR])IShow[ICUR]();}).observe(document.body,{attributes:true,attributeFilter:['class']});
try{new MutationObserver(()=>{if(IShow[ICUR])IShow[ICUR]();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(IShow[ICUR])IShow[ICUR]();});}catch(e){}
let irz=null;window.addEventListener('resize',()=>{clearTimeout(irz);irz=setTimeout(()=>{if(IShow[ICUR])IShow[ICUR]();},150);});
pmuReset();pmuTve();syNew();mgUpdate();renderICh();
{let h=(location.hash||'').replace('#','');let st=null;try{st=localStorage.getItem(KEY+'-inst');}catch(e){}
 const start=h.startsWith('i-')&&ITABS.includes(h.slice(2))?h.slice(2):ITABS.includes(st)?st:'osc';showInst(start);}
requestAnimationFrame(iLoop);

/* ================= Recorrido guiado (motor común de la colección BIC) ================= */
const BicTour=(function(){
  let S=null;
  const RM=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const owlSvg=()=>{const o=document.querySelector('.owl svg');if(!o)return '';const c=o.cloneNode(true);c.setAttribute('viewBox','20 0 460 285');c.removeAttribute('role');c.setAttribute('aria-hidden','true');c.removeAttribute('aria-label');return c.outerHTML;};
  const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
  function target(st){let el=null;try{el=typeof st.el==='function'?st.el():st.el?document.querySelector(st.el):null;}catch(e){el=null;}return vis(el)?el:null;}
  function open(cfg){close(false);const root=document.createElement('div');root.className='bt-root';
    root.innerHTML=`<div class="bt-shield"></div><div class="bt-spot off"></div><div class="bt-pop" role="dialog" aria-modal="true" aria-labelledby="btT" aria-describedby="btB"><button class="bt-x" type="button" aria-label="Cerrar el recorrido">×</button><div class="bt-hd"><div class="bt-owl">${owlSvg()}</div><div><span class="bt-n" id="btN"></span><h3 id="btT"></h3></div></div><div id="btB"></div><div class="bt-ft"><div class="bt-dots" aria-hidden="true"></div><button class="bt-prev" type="button">Atrás</button><button class="bt-next" type="button">Siguiente</button></div></div>`;
    document.body.appendChild(root);document.body.classList.add('bt-on');
    S={cfg,i:0,root,spot:root.querySelector('.bt-spot'),pop:root.querySelector('.bt-pop'),el:null,back:document.activeElement,raf:null};
    root.querySelector('.bt-x').onclick=()=>close(false);
    root.querySelector('.bt-prev').onclick=()=>go(S.i-1);
    root.querySelector('.bt-next').onclick=()=>{if(S.i>=S.cfg.steps.length-1)close(true);else go(S.i+1);};
    root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(false);}else if(e.key==='ArrowRight'){e.preventDefault();root.querySelector('.bt-next').click();}else if(e.key==='ArrowLeft'&&S.i>0){e.preventDefault();go(S.i-1);}
      else if(e.key==='Tab'){const f=[...S.pop.querySelectorAll('button:not([disabled])')];const a=f.indexOf(document.activeElement);if(e.shiftKey&&a<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&a===f.length-1){e.preventDefault();f[0].focus();}}});
    window.addEventListener('resize',onMove);window.addEventListener('scroll',onMove,true);
    go(0);}
  function onMove(){if(!S)return;cancelAnimationFrame(S.raf);S.raf=requestAnimationFrame(place);}
  function go(i){if(!S)return;const st=S.cfg.steps[i];if(!st)return;S.i=i;
    try{if(st.before)st.before();}catch(e){}
    const n=S.cfg.steps.length;S.root.querySelector('#btN').textContent=`Paso ${i+1} de ${n}`;
    S.root.querySelector('#btT').textContent=st.title;
    S.root.querySelector('#btB').innerHTML=st.html;
    S.root.querySelector('.bt-dots').innerHTML=S.cfg.steps.map((_,k)=>`<span class="${k===i?'on':''}"></span>`).join('');
    S.root.querySelector('.bt-prev').disabled=i===0;
    const nx=S.root.querySelector('.bt-next');nx.textContent=i===n-1?(S.cfg.doneLabel||'¡A jugar!'):'Siguiente';nx.classList.toggle('go',i===n-1);
    setTimeout(()=>{if(!S)return;S.el=target(st);
      if(S.el){const r=S.el.getBoundingClientRect();const fits=r.top>=70&&r.bottom<=window.innerHeight-20;if(!fits){const tall=r.height>window.innerHeight*0.55;const y=tall?r.top+window.scrollY-96:r.top+window.scrollY-(window.innerHeight-r.height)/2;window.scrollTo({top:Math.max(0,y),behavior:RM?'auto':'smooth'});}}
      place();setTimeout(place,RM?0:420);nx.focus({preventScroll:true});},st.wait||60);}
  function place(){if(!S)return;const pop=S.pop,spot=S.spot,vw=window.innerWidth,vh=window.innerHeight,m=12;
    const pw=pop.offsetWidth,ph=pop.offsetHeight;
    if(!S.el||!vis(S.el)){spot.classList.add('off');spot.style.cssText=`left:${vw/2}px;top:${vh/2}px;width:0;height:0`;pop.style.left=Math.max(m,(vw-pw)/2)+'px';pop.style.top=Math.max(m,(vh-ph)/2)+'px';return;}
    spot.classList.remove('off');const r=S.el.getBoundingClientRect(),pad=8;
    const L=Math.max(4,r.left-pad),T=Math.max(4,r.top-pad),W=Math.min(vw-8,r.right+pad)-L,H=Math.min(vh-8,r.bottom+pad)-T;
    spot.style.left=L+'px';spot.style.top=T+'px';spot.style.width=Math.max(0,W)+'px';spot.style.height=Math.max(0,H)+'px';
    let top,left=Math.min(vw-pw-m,Math.max(m,r.left+r.width/2-pw/2));
    if(T+H+ph+m*2<=vh)top=T+H+m;else if(T-ph-m>=m)top=T-ph-m;
    else{top=vh-ph-m;if(r.right+pw+m*2<=vw)left=r.right+m;else if(r.left-pw-m>=m)left=r.left-pw-m;}
    pop.style.left=left+'px';pop.style.top=Math.max(m,top)+'px';}
  function close(done){if(!S)return;const s=S;S=null;window.removeEventListener('resize',onMove);window.removeEventListener('scroll',onMove,true);s.root.remove();document.body.classList.remove('bt-on');
    try{localStorage.setItem(s.cfg.key,'1');}catch(e){}
    try{if(done&&s.cfg.onDone)s.cfg.onDone();if(s.cfg.onClose)s.cfg.onClose(done);}catch(e){}
    if(s.back&&s.back.focus)try{s.back.focus({preventScroll:true});}catch(e){}}
  function invite(cfg){let seen=null;try{seen=localStorage.getItem(cfg.key);}catch(e){}if(seen)return;
    setTimeout(()=>{if(S||document.querySelector('.bt-invite'))return;const d=document.createElement('div');d.className='bt-invite';d.setAttribute('role','dialog');d.setAttribute('aria-label','Invitación al recorrido guiado');
      d.innerHTML=`<b>${cfg.inviteTitle||'¿Primera vez aquí?'}</b><p>${cfg.inviteText||'Te muestro cómo se juega en un minuto.'}</p><div class="row"><button class="y" type="button">Muéstrame</button><button class="n" type="button">Ahora no</button></div>`;
      document.body.appendChild(d);d.querySelector('.y').onclick=()=>{d.remove();open(cfg);};d.querySelector('.n').onclick=()=>{d.remove();try{localStorage.setItem(cfg.key,'1');}catch(e){}};},cfg.inviteDelay||1800);}
  return {open,close,invite,get active(){return !!S;}};
})();

/* ---------- Recorrido guiado de Grid Masters ---------- */
{const mob=()=>window.innerWidth<=860;
const TOUR_GM={key:KEY+'-tour',inviteTitle:'¿Primera vez en la sala de control?',inviteText:'Te muestro en un minuto cómo se juega y cómo evitar el apagón.',
 steps:[
  {title:'¡Hola! Soy el búho de la BIC',html:'<p>En Grid Masters tu equipo opera una central hidroeléctrica y el despacho nacional. Tu misión: <b>mantener la red en 60 Hz</b> aunque lleguen rayos y fallas.</p><span class="bt-tip">Puedes avanzar con las flechas del teclado y salir con Esc.</span>'},
  {el:'.chipbar .seg',title:'Elige tu nivel',html:'<p><b>Pregrado</b> te guía paso a paso. <b>Docente e investigador</b> muestra ecuaciones y datos. Si es tu primera vez, quédate en Pregrado.</p>'},
  {el:'#xpChip',title:'Tus puntos de experiencia',html:'<p>Aquí se acumulan tus <b>VX</b>. Los ganas al jugar, al superar retos de instrumentos y al responder la autoevaluación.</p>'},
  {el:'#modeSeg',title:'Elige cómo jugar',html:'<p><b>Escenario guiado</b>: para aprender, con pistas. <b>Grid Masters</b>: la partida con puntaje e insignia. <b>Libre</b>: sin reloj.</p><span class="bt-tip">Empieza por el escenario guiado.</span>'},
  {el:'#playBtn',title:'Pulsa Iniciar',html:'<p>Arranca el reloj. Al lado eliges la velocidad (×1, ×2, ×4) y escribes el nombre de tu equipo para la tabla de clasificación.</p>'},
  {el:'.freqbox',title:'El corazón del juego',html:'<p>Esta es la frecuencia. <b>Verde</b>: entre 59,8 y 60,2 Hz, todo bien. <b>Amarillo</b>: fuera de banda. <b>Rojo</b>: el deslastre desconecta ciudades.</p><span class="bt-tip">Si baja de 57,5 Hz por más de un segundo, hay apagón y termina la partida.</span>'},
  {el:'#coach',title:'La guía te habla',html:'<p>Lee esta franja durante la partida: te avisa qué pasó y qué conviene hacer ahora.</p>'},
  {el:()=>mob()?document.getElementById('roleTabs'):document.querySelector('.roles'),title:'Cuatro roles, un equipo',html:'<p><b>CND</b> ve toda la red. <b>Planta</b> maneja las máquinas. <b>Protecciones</b> vigila relés y deslastre. <b>Comunicaciones</b> conecta las salas por radio.</p><span class="bt-tip">Repártanse los roles: una persona por consola.</span>'},
  {el:()=>{const b=document.getElementById('sPes');return b&&b.closest('.stat');},title:'Tu marcador',html:'<p>En el modo Grid Masters empiezas con <b>1000 PES</b>. Las buenas decisiones a tiempo suman; los errores restan.</p><span class="bt-tip">Termina con 900 PES o más y sin apagón para ganar la insignia Grid Master.</span>'},
  {el:'#instMenuBtn',title:'Misiones extra',html:'<p>En <b>Instrumentos</b> hay siete instrumentos de medición con retos cortos: osciloscopio, multímetro, PMU, pinza y más.</p>'},
  {el:'#badges',title:'Tus insignias',html:'<p>Aquí ves las insignias que ganaste y las que te faltan. Cada una dice cómo conseguirla.</p>'},
  {before:()=>{const s=document.getElementById('simulador');if(s)s.scrollIntoView({block:'start',behavior:'auto'});},title:'¡Listo para tu primera partida!',html:'<p>Elige <b>Escenario guiado</b> y pulsa <b>▶ Iniciar</b>. Si te pierdes, el botón <b>¿Cómo se juega?</b> de la esquina inferior izquierda repite este recorrido.</p><span class="bt-tip">Completar el recorrido te da tus primeros 5 VX.</span>'}],
 onDone:()=>{if(!PR.tour){PR.tour=1;save();addXP(5,'recorrido guiado completado');}}};
const hb=document.createElement('button');hb.type='button';hb.className='bt-help';hb.innerHTML='<i aria-hidden="true">?</i><span>¿Cómo se juega?</span>';hb.onclick=()=>BicTour.open(TOUR_GM);
hb.setAttribute('aria-label','¿Cómo se juega? Abre el recorrido guiado');document.body.appendChild(hb);
BicTour.invite(TOUR_GM);}

/* ---------- referencias ---------- */
const REFS=[
 ['Comisión de Regulación de Energía y Gas, CREG. (1995). Resolución 025 de 1995: Código de Redes (Código de Operación, numeral 5.1). Citado en el Concepto CREG 2380 de 2010.','https://gestornormativo.creg.gov.co/gestor/entorno/docs/concepto_creg_0002380_2010.htm'],
 ['Consejo Nacional de Operación, CNO. (2024). Acuerdo 1797 de 2024: Esquema de Deslastre Automático de Carga (EDAC) por baja frecuencia para el año 2024.','https://gestornormativo.creg.gov.co/gestor/entorno/docs/acuerdo_cno_1797_2024.htm'],
 ['Kundur, P. (1994). Power system stability and control. McGraw-Hill. Capítulos 5 (generadores sincrónicos), 9 (turbinas y gobernadores) y 11 (control de frecuencia y potencia).',null],
 ['IEEE Working Group on Prime Mover and Energy Supply Models for System Dynamic Performance Studies. (1992). Hydraulic turbine and turbine control models for system dynamic studies. IEEE Transactions on Power Systems, 7(1), 167-179.','https://doi.org/10.1109/59.141700'],
 ['International Electrotechnical Commission. (2006). IEC 60870-5-104: Telecontrol equipment and systems. Part 5-104: Transmission protocols.',null],
 ['IEEE. (2018). IEC/IEEE 60255-118-1:2018. Measuring relays and protection equipment. Part 118-1: Synchrophasor for power systems. Measurements.',null],
 ['IEEE. (2022). IEEE Std 519-2022: IEEE standard for harmonic control in electric power systems.',null],
 ['International Electrotechnical Commission. (2015). IEC 61000-4-30: Power quality measurement methods.',null],
 ['IEEE. (2014). IEEE Std 43-2013: IEEE recommended practice for testing insulation resistance of electric machinery.','https://standards.ieee.org/standard/43-2013.html'],
 ['IEEE. (2005). IEEE Std C50.12-2005: IEEE standard for salient-pole 50 Hz and 60 Hz synchronous generators and generator/motors for hydraulic turbine applications rated 5 MVA and above.','https://standards.ieee.org/standard/C50_12-2005.html'],
 ['Thompson, M. J. (2012). Fundamentals and advancements in generator synchronizing systems. 65th Annual Conference for Protective Relay Engineers. Schweitzer Engineering Laboratories.','https://cms-cdn.selinc.com/assets/Literature/Publications/Technical%20Papers/6459_FundamentalsAdvancements_MT_20120402_Web2.pdf'],
 ['Fluke Corporation. (s. f.). True measurements of non-linear loads require a true-rms measurement tool.','https://www.fluke.com/en/learn/blog/electrical/true-measurements-of-non-linear-loads-require-a-true-rms-measurement-tool'],
 ['Fluke Corporation. (s. f.). How to measure DC voltage with a digital multimeter.','https://www.fluke.com/en/learn/blog/digital-multimeters/how-to-measure-dc-voltage-with-a-digital-multimeter'],
 ['Kuphaldt, T. R. (s. f.). Circuitos eléctricos II: corriente alterna. LibreTexts Español.','https://espanol.libretexts.org/Bookshelves/Vocacional/Tecnologia_Electronica/Libro%3A_Circuitos_electricos_II_-_Corriente_alterna_(Kuphaldt)/01%3A_Teor%C3%ADa_b%C3%A1sica_de_AC/1.01%3A_%C2%BFQu%C3%A9_es_la_corriente_alterna_(CA)%3F'],
 ['Sailer, M. y Homner, L. (2020). The gamification of learning: A meta-analysis. Educational Psychology Review, 32, 77-112.','https://doi.org/10.1007/s10648-019-09498-w']];
$('#refs').innerHTML=REFS.map(r=>`<li>${r[1]?`<a href="${r[1]}" target="_blank" rel="noopener">${esc(r[0])}</a>`:esc(r[0])}</li>`).join('');

$('#printBtn').onclick=()=>window.print();
/* ---------- arranque ---------- */
function drawAll(){drawHero();f1();f2();f3();if(G.sim)updateUI(true);}
buildParams();draftCalc();resetSim(false);renderQuiz();renderBadges();renderBoard();setLevel(LVL);
requestAnimationFrame(loop);
let rz=null;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(drawAll,120);});
/* ---------- Conexión de Grid Masters con el Panel docente BIC ---------- */
{
  const R=n=>Math.round(n);
  const edacN=s=>s.edacA.reduce((a,b)=>a+b,0)+s.edacB.reduce((a,b)=>a+b,0);
  const ev=(tipo,detalle,puntos,rol)=>{if(window.BicSesion)BicSesion.evento(tipo,detalle,puntos,rol,G.sim?R(G.sim.t):0);};
  // acciones de los roles
  const act0=act;act=function(role,what){act0(role,what);ev('accion',what,0,role);};
  // puntos PES
  // los segundos fuera de banda se agrupan de a 10 para no inundar el panel
  let fb={n:0,p:0};const flushFB=()=>{if(fb.n){ev('puntos',`${fb.n} s fuera de la banda de 59,8 a 60,2 Hz`,fb.p);fb={n:0,p:0};}};
  const pes0=pes;pes=function(n,why){const antes=G.score?G.score.pes:0;pes0(n,why);if(!G.score||G.score.pes===antes)return;const d=G.score.pes-antes;
    if(/^Segundo fuera de la banda/.test(why)){fb.n++;fb.p+=d;if(fb.n>=10)flushFB();return;}flushFB();ev('puntos',why,d);};
  // eventos del guion o del docente
  const NOMBRE={ramp:'Rampa de demanda',L3:'Rayo en L3',L1:'Segundo rayo: L1',link:'Telecontrol caído',linkok:'Telecontrol restablecido',osc:'Oscilación de U2',unit:'Disparo de una unidad'};
  const inject0=inject;inject=function(e,auto){inject0(e,auto);ev('evento',(auto?'':'Docente: ')+(NOMBRE[e]||e));};
  // recordatorios de la franja guía: el docente ve qué equipos los necesitan
  const coach0=coach;coach=function(t){coach0(t);if(/^Recordatorio|^¡Atención!/.test(t))ev('guia',t);};
  // fin de la partida
  const end0=endSession;endSession=function(why){const ya=G.ended;if(!ya)flushFB();end0(why);if(ya||!window.BicSesion||!BicSesion.activa())return;G.why=why;
    const m=metrics()||{};const ap=why==='blackout';
    let insignia,puntaje,resultado;
    if(G.mode==='juego'){puntaje=R(G.score.pes);insignia=!ap&&G.score.pes>=900;resultado=ap?'Apagón del área Centro':'Sin apagón';}
    else{puntaje=G.nAct||0;insignia=!ap&&G.mode==='guiado'&&Object.keys(G.acted).some(k=>k.startsWith('L3@'))&&(G.nAct||0)>=3;resultado=(ap?'Apagón':'Sin apagón')+' · '+(G.nAct||0)+' maniobras';}
    BicSesion.final({puntaje,insignia,resultado,
      metricas:{modo:G.mode,nadir:m.nad!=null?+m.nad.toFixed(3):null,fuera_banda_s:m.out!=null?R(m.out):null,edac:m.edac,disparos:m.trips,respuesta_media_s:m.resp!=null?R(m.resp):null,acciones:G.nAct||0},
      resumen:(G.mode==='juego'?puntaje+' PES · ':'')+resultado+(insignia?' · ¡insignia ganada!':'')});};
  // inicio de partida
  $('#playBtn').addEventListener('click',()=>{if(G.run&&G.sim&&G.sim.t<1){if(window.BicSesion)BicSesion.reiniciar();ev('evento','Inicio de la partida ('+SPEC[G.mode].name+')');}});
  $('#draftGo').addEventListener('click',()=>{if(window.BicSesion)BicSesion.reiniciar();ev('evento','Inicio de la partida (Grid Masters) · reserva: '+G.draftOpts.unitsOn0+' unidades, '+G.draftOpts.rsvPct+' %');});
  if(window.BicSesion)BicSesion.init({lab:'grid-masters',
    nombreEquipo:()=>$('#teamName').value,
    alUnirse:(d)=>{$('#teamName').value=d.nombre;const ss=d.sesion;if(!ss)return;
      if(ss.nivel&&typeof setLevel==='function'&&LVL!==ss.nivel)setLevel(ss.nivel);
      if(ss.modo&&G.mode!==ss.modo&&!G.run){const b=document.querySelector(`#modeSeg [data-mode="${ss.modo}"]`);if(b)b.click();}},
    estado:()=>{const s=G.sim;if(!s)return {};const m=s.hist.length?s.hist.reduce((a,h)=>Math.min(a,h[1]),60):60;const le=G.lastEvent;
      return {t:R(s.t),modo:G.mode,nivel:LVL,jugando:G.run&&!G.ended,terminado:!!G.ended,momento:G.phase,
        puntaje:G.mode==='juego'&&G.score?R(G.score.pes):null,frecuencia:+(60+s.dfA).toFixed(3),nadir:+m.toFixed(3),edac:edacN(s),
        apagon:G.why==='blackout'&&G.ended,acciones:G.nAct||0,roles:Object.keys(G.roles||{}),telecontrol:!!s.link,
        evento:le?NOMBRE[le.kind]||le.kind:null,sin_respuesta:le&&!G.acted[le.id]&&!G.ended?R(s.t-le.t):0};},
    comando:(c,a)=>{const draft=!$('#draft').hidden;
      if(c==='iniciar'){if(G.mode==='juego'&&draft)$('#draftGo').click();else if(!G.run)$('#playBtn').click();document.getElementById('simulador')?.scrollIntoView({block:'start'});}
      if(c==='pausar'&&G.run)$('#playBtn').click();
      if(c==='reanudar'&&!G.run&&!G.ended&&!draft)$('#playBtn').click();
      if(c==='evento'&&G.sim&&!G.ended)inject(a,false);
      if(c==='mensaje')coach0('Docente: '+a);}});
}

})();

