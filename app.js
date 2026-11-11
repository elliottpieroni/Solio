const LANG=(()=>{try{return localStorage.getItem('solio-lang')==='en'?'en':'fr';}catch(e){return 'fr';}})();
const $=id=>document.getElementById(id);
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const R2D=180/Math.PI,D2R=Math.PI/180,LAT=43.581,LON=7.124,KX=111320*Math.cos(LAT*D2R),KY=110574;
const KIND={restaurant:'Restaurant',cafe:'Café',bar:'Bar',pub:'Pub',fast_food:'Restauration rapide',ice_cream:'Glacier'};
const BOIRE=new Set(['bar','pub','cafe']);
const PLACES=[['Place Nationale',136,27],['Marché provençal',288,-8],['Musée Picasso',343,-32],['Plage de la Gravette',401,190],['Port Vauban',376,640],['Place de Gaulle',-281,-48],['Place de la Poste',-105,70],...[['Juan-les-Pins',-1250,-1183],['Cap d’Antibes (la Garoupe)',387,-2930]].filter(([,x,y])=>ZIDX.tiles.some(([i,j])=>x>=ZIDX.x0+i*ZIDX.ts&&x<ZIDX.x0+(i+1)*ZIDX.ts&&y<=ZIDX.y1-j*ZIDX.ts&&y>ZIDX.y1-(j+1)*ZIDX.ts))];
const P=PD.map(([n,k,x,y,o],i)=>({i,n,k,x,y,o}));
// terrasse : OpenStreetMap, complété par terrasses.json (Google : 2 = confirmée, 1 = avis qui en parlent, 0 = pas de terrasse)
let TERR={},MAN={};try{MAN=JSON.parse(localStorage.getItem('terr-manual')||'{}');}catch(e){}
// MAN : choix faits à la main (revision.html) ; 2 = terrasse, 0 = pas de terrasse, -1 = pas sûr
const hasT=p=>MAN[p.i]===2?true:MAN[p.i]===0?false:TERR[p.i]!=null?TERR[p.i]>0:!!(p.o||p.pr);
const terrLabel=p=>MAN[p.i]===2||TERR[p.i]>0||p.o?' · terrasse':' · terrasse ?';
function openFrac(x,y){let n=0,o=0;for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){if(dx*dx+dy*dy>36)continue;const X=x+dx,Y=y+dy,h=hS(X,Y);if(h===-1e9)continue;n++;if(h-hT(X,Y)<.8)o++;}return n?o/n:0;}
fetch('terrasses.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).then(j=>{if(!j||!Object.keys(j).length)return;TERR=j;
  if(typeof G!=='undefined'&&G){CARDS.clear();trayMode='';if(top5Mode)filter();schedule(false);}}).catch(()=>{});
const aerOf=p=>p.i<NTH?'thumbs/t'+p.i+'.jpg':visOf(p);
const sv=p=>'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+(LAT+p.y/KY).toFixed(6)+','+(LON+p.x/KX).toFixed(6);
const nav=p=>'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination='+(LAT+p.y/KY).toFixed(6)+','+(LON+p.x/KX).toFixed(6);
function lastSun(y,m){const d=new Date(Date.UTC(y,m+1,0));return d.getUTCDate()-d.getUTCDay();}
function toUTC(y,mo,d,min){let t=Date.UTC(y,mo,d,0,min)-3600e3;if(t>=Date.UTC(y,2,lastSun(y,2),1)&&t<Date.UTC(y,9,lastSun(y,9),1))t-=3600e3;return t;}
function sun(t){
  const jd=t/864e5+2440587.5,T=(jd-2451545)/36525;
  const L0=(280.46646+T*(36000.76983+T*.0003032))%360,M=357.52911+T*(35999.05029-.0001537*T);
  const e=.016708634-T*(.000042037+.0000001267*T);
  const C=Math.sin(M*D2R)*(1.914602-T*(.004817+.000014*T))+Math.sin(2*M*D2R)*(.019993-.000101*T)+Math.sin(3*M*D2R)*.000289;
  const om=125.04-1934.136*T,lam=L0+C-.00569-.00478*Math.sin(om*D2R);
  const eps=23+(26+(21.448-T*(46.815+T*(.00059-T*.001813)))/60)/60+.00256*Math.cos(om*D2R);
  const dec=Math.asin(Math.sin(eps*D2R)*Math.sin(lam*D2R)),y=Math.tan(eps*D2R/2)**2;
  const eq=4*R2D*(y*Math.sin(2*L0*D2R)-2*e*Math.sin(M*D2R)+4*e*y*Math.sin(M*D2R)*Math.cos(2*L0*D2R)-.5*y*y*Math.sin(4*L0*D2R)-1.25*e*e*Math.sin(2*M*D2R));
  const mins=((t/6e4)%1440+1440)%1440,ha=((mins+eq+4*LON)/4-180)*D2R,la=LAT*D2R;
  const el=Math.asin(Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(ha));
  const az=Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(la)-Math.tan(dec)*Math.cos(la))+Math.PI;
  return{el,az};
}
// ---- relief par tuiles de 512 m (zone/), chargées autour de l'utilisateur
let G=null; // non nul dès que le relief autour du départ est prêt
const ZONE={x0:ZIDX.x0,y1:ZIDX.y1,nx:ZIDX.nx,ny:ZIDX.ny,ts:ZIDX.ts,max:20};ZONE.w=ZONE.nx*ZONE.ts;ZONE.h=ZONE.ny*ZONE.ts;
const TS=ZONE.ts,TA=new Array(ZONE.nx*ZONE.ny),TILES=new Map(),TLOAD=new Map(),ZSET=new Set(ZIDX.tiles.map(t=>t[0]+'_'+t[1]));
const NTH=235; // les 235 premiers lieux ont une vue aérienne (thumbs/)
const bbox=c=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let i=0;i<c.length;i+=2){x0=Math.min(x0,c[i]);x1=Math.max(x1,c[i]);y0=Math.min(y0,c[i+1]);y1=Math.max(y1,c[i+1]);}return{c,x0,x1,y0,y1};};
async function gunzip(buf){return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
function unrow(d,off,n){for(let r=0;r<n;r++){let a=0;const o=off+r*n;for(let c=0;c<n;c++){a+=d[o+c];d[o+c]=a;}}}
function loadTile(i,j){const k=i+'_'+j;if(TLOAD.has(k))return TLOAD.get(k);if(!ZSET.has(k))return Promise.resolve(null);
  const pr=(async()=>{
    const r=await fetch('zone/t_'+k+'.bin');if(!r.ok)throw new Error('tuile '+k);
    const d=new Int16Array(await gunzip(await r.arrayBuffer())),T2=TS/2;
    if(d.length!==TS*TS+T2*T2)throw new Error('tuile '+k+' incomplète');
    unrow(d,0,TS);unrow(d,TS*TS,T2);
    const t={i,j,k,x0:ZONE.x0+i*TS,y1:ZONE.y1-j*TS,S:d.subarray(0,TS*TS),T:d.subarray(TS*TS),b:[],c:null};
    let mx=0;for(let q=0;q<t.S.length;q++)if(t.S[q]>mx)mx=t.S[q];ZONE.max=Math.max(ZONE.max,mx/10-10);
    try{const rb=await fetch('zone/b_'+k+'.json');if(rb.ok)t.b=(await rb.json()).map(bbox);}catch(e){}
    TA[j*ZONE.nx+i]=t;TILES.set(k,t);return t;
  })().catch(e=>{TLOAD.delete(k);console.warn(e);return null;});
  TLOAD.set(k,pr);return pr;}
function hS(x,y){const c=Math.floor(x-ZONE.x0),r=Math.floor(ZONE.y1-y);if(c<0||r<0)return -1e9;const i=(c/TS)|0,j=(r/TS)|0;if(i>=ZONE.nx||j>=ZONE.ny)return -1e9;
  const t=TA[j*ZONE.nx+i];if(!t)return -1e9;const v=t.S[(r-j*TS)*TS+(c-i*TS)];return v?v/10-10:-1e9;}
function hT(x,y){const c=Math.min(ZONE.w-1,Math.max(0,Math.floor(x-ZONE.x0))),r=Math.min(ZONE.h-1,Math.max(0,Math.floor(ZONE.y1-y))),i=(c/TS)|0,j=(r/TS)|0;
  const t=TA[j*ZONE.nx+i];if(!t)return 0;const v=t.T[((r-j*TS)>>1)*(TS/2)+((c-i*TS)>>1)];return v?v/10-10:0;}
function blocked(px,py,z0,dx,dy,te){const dmax=Math.min(450,(ZONE.max-z0)/te);
  for(let d=1.5;d<dmax;d+=.7){const h=hS(px+dx*d,py+dy*d);if(h===-1e9)return false;if(h>z0+d*te)return true;}return false;}
function openSky(x,y){let best=null,bd=1e9;
  for(let dy=-15;dy<=15;dy++)for(let dx=-15;dx<=15;dx++){const d=dx*dx+dy*dy;if(d>225||d>=bd)continue;const X=x+dx,Y=y+dy;
    if(hS(X,Y)-hT(X,Y)<.6&&hS(X+1,Y)-hT(X+1,Y)<1&&hS(X-1,Y)-hT(X-1,Y)<1&&hS(X,Y+1)-hT(X,Y+1)<1&&hS(X,Y-1)-hT(X,Y-1)<1){bd=d;best=[X,Y];}}
  return best||[x,y];}
function tilesFor(cx,cy,R){const out=[],i0=Math.max(0,Math.floor((cx-R-ZONE.x0)/TS)),i1=Math.min(ZONE.nx-1,Math.floor((cx+R-ZONE.x0)/TS)),j0=Math.max(0,Math.floor((ZONE.y1-cy-R)/TS)),j1=Math.min(ZONE.ny-1,Math.floor((ZONE.y1-cy+R)/TS));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)if(ZSET.has(i+'_'+j))out.push([i,j]);return out;}
async function ensureArea(cx,cy,R){const miss=tilesFor(cx,cy,R).filter(([i,j])=>!TA[j*ZONE.nx+i]);if(!miss.length)return false;
  await Promise.all(miss.map(([i,j])=>loadTile(i,j)));
  prepPlaces();return true;}
const areaR=()=>Math.max(dist,walkMin*WALK,500)+300;
const needArea=()=>{const [x,y]=PLACES[from].slice(1);return ensureArea(x,y,areaR());};
// un lieu est prêt quand sa tuile et ses voisines sont chargées : on calcule alors son ensoleillement
function prepPlaces(){let n=0;
  for(const p of P){if(p.day)continue;const i=Math.floor((p.x-ZONE.x0)/TS),j=Math.floor((ZONE.y1-p.y)/TS);
    if(i<0||j<0||i>=ZONE.nx||j>=ZONE.ny||!TA[j*ZONE.nx+i])continue;
    let ok=true;for(let a=-1;a<=1&&ok;a++)for(let b=-1;b<=1;b++){const I=i+a,J=j+b;if(I<0||J<0||I>=ZONE.nx||J>=ZONE.ny)continue;if(ZSET.has(I+'_'+J)&&!TA[J*ZONE.nx+I]){ok=false;break;}}
    if(!ok||hS(p.x,p.y)===-1e9)continue;
    [p.sx,p.sy]=openSky(p.x,p.y);p.pr=!p.o&&p.k!=='fast_food'&&openFrac(p.sx,p.sy)>=.4;dayFor(p);n++;}
  return n;}

// ---- état
const M0=420,M1=1380,STEP=10,NM=(M1-M0)/STEP;
const RADII=[200,400,700,1000,1500],WALK=80; // 80 m par minute de marche
const now=new Date();
let dYear=now.getFullYear(),dMonth=now.getMonth(),dDay=now.getDate();
let selMin=Math.min(1380,Math.max(420,Math.round((now.getHours()*60+now.getMinutes())/5)*5));
let showShade=false,cat='all',fSun=true,fTer=false,walkMin=10,sunNeed=30,dist=400,from=0,sel=null,scrubbing=false,listOpen=false;
try{const s=JSON.parse(localStorage.getItem('terr-v2')||'{}');
  if(s.dist>=100&&s.dist<=2000)dist=s.dist;if(s.walkMin>=3&&s.walkMin<=20)walkMin=s.walkMin;if(s.from!=null&&PLACES[s.from])from=s.from;
  if(['all','boire','manger'].includes(s.cat))cat=s.cat;if([15,30,45,60,75,90,105,120].includes(s.sunNeed))sunNeed=s.sunNeed;}catch(e){}
// défaut provisoire : Plage de la Gravette à 12 h 30 (mettre DEF_MIN=null pour reprendre l'heure réelle)
const DEF_MIN=750,DEF_PLACE='Plage de la Gravette';
{const i=PLACES.findIndex(q=>q[0]===DEF_PLACE);if(i>=0)from=i;if(typeof DEF_MIN==='number')selMin=DEF_MIN;}
function save(){try{localStorage.setItem('terr-v2',JSON.stringify({dist,from,cat,fSun,walkMin,sunNeed}))}catch(e){}}

function sunAt(m){const s=sun(toUTC(dYear,dMonth,dDay,m));return s.el>.5*D2R?{dx:Math.sin(s.az),dy:Math.cos(s.az),te:Math.tan(s.el)}:null;}
function elAt(m){return sun(toUTC(dYear,dMonth,dDay,m)).el;}
let SVS=null;
function dayFor(p){if(!SVS)SVS=Array.from({length:NM},(_,k)=>sunAt(M0+k*STEP));
  const z=hT(p.sx,p.sy)+1.2,a=new Uint8Array(NM);
  for(let k=0;k<NM;k++){const s=SVS[k];a[k]=!s?0:blocked(p.sx,p.sy,z,s.dx,s.dy,s.te)?1:2;}p.day=a;}
function computeDay(){SVS=null;for(const p of P)if(p.day)dayFor(p);}
function stateAt(p,m){if(m<M0){const s=sunAt(m);if(!s)return 0;return blocked(p.sx,p.sy,hT(p.sx,p.sy)+1.2,s.dx,s.dy,s.te)?1:2;}
  return p.day[Math.min(NM-1,Math.round((m-M0)/STEP))];}
const hm=m=>Math.floor(m/60)+' h '+String(Math.round(m%60)).padStart(2,'0');
function pill(p,st){const k=Math.max(0,Math.min(NM-1,Math.round((selMin-M0)/STEP)));
  if(st===2){let j=k;while(j<NM&&p.day[j]===2)j++;return['sun',j>=NM?'Soleil jusqu’au soir':'Soleil jusqu’à '+hm(M0+j*STEP)];}
  if(st===0)return['sh','Nuit'];
  let j=k;while(j<NM&&p.day[j]!==2)j++;return['sh',j>=NM?'Ombre jusqu’au coucher':'Ombre · soleil à '+hm(M0+j*STEP)];}

// courbe de hauteur du soleil pour la date choisie
let ARC=[],maxEl=.01,sunrise=null,sunset=null;
function computeArc(){ARC=[];maxEl=.01;
  for(let m=M0;m<=M1;m+=STEP){const e=elAt(m);ARC.push(e);if(e>maxEl)maxEl=e;}
  sunrise=sunset=null;for(let m=0;m<1440;m+=2){if(elAt(m)>.5*D2R){if(sunrise==null)sunrise=m;sunset=m;}}}
// ouverture : toujours l'heure actuelle
selMin=Math.max(M0,Math.min(M1,selMin));
computeArc();

// --- plan : bâtiments et voies IGN BD TOPO, mer et végétation tirées du LiDAR
const ROADS=PLAN.r.map(([w,k,n,c])=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let i=0;i<c.length;i+=2){x0=Math.min(x0,c[i]);x1=Math.max(x1,c[i]);y0=Math.min(y0,c[i+1]);y1=Math.max(y1,c[i+1]);}return{w,k,n,c,x0,x1,y0,y1};});
const LBL=(()=>{const best={};for(const r of ROADS){if(r.n<0||r.k)continue;const c=r.c;for(let i=0;i+3<c.length;i+=2){const L=Math.hypot(c[i+2]-c[i],c[i+3]-c[i+1]);if(!best[r.n]||L>best[r.n].L)best[r.n]={L,x:(c[i]+c[i+2])/2,y:(c[i+1]+c[i+3])/2,a:Math.atan2(-(c[i+3]-c[i+1]),c[i+2]-c[i])};}}
  return Object.entries(best).map(([n,v])=>{let a=v.a;if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;return{t:PLAN.n[n],x:v.x,y:v.y,a,L:v.L};});})();
function rgb(c){const t=document.createElement('canvas').getContext('2d');t.fillStyle=c;t.fillRect(0,0,1,1);return t.getImageData(0,0,1,1).data;}
function tilePlan(t){if(t.c)return t.c;const w=TS,T2=w/2,c=document.createElement('canvas');c.width=c.height=w;const g=c.getContext('2d');
  g.fillStyle='#000';g.strokeStyle='#000';g.lineWidth=3;for(const b of t.b){g.beginPath();for(let i=0;i<b.c.length;i+=2){const x=b.c[i]-t.x0,y=t.y1-b.c[i+1];i?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();g.fill();g.stroke();}
  const bm=g.getImageData(0,0,w,w).data,im=g.createImageData(w,w),d=im.data,sea=rgb(css('--sea')),park=rgb(css('--park'));
  for(let r=0;r<w;r++)for(let q=0;q<w;q++){const i=r*w+q,s=t.S[i];if(!s)continue;const S=s/10-10,T=t.T[(r>>1)*T2+(q>>1)]/10-10;let col=null;
    if(T<.3&&S<.6)col=sea;else if(S-T>2&&bm[i*4+3]<10)col=park;if(col){const o=i*4;d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=255;}}
  g.clearRect(0,0,w,w);g.putImageData(im,0,0);t.c=c;return c;}
function drawPlan(g,w,h,ccx,ccy,sc){
  const X=x=>w/2+(x-ccx)*sc,Y=y=>h/2-(y-ccy)*sc,vx0=ccx-w/2/sc-20,vx1=ccx+w/2/sc+20,vy0=ccy-h/2/sc-20,vy1=ccy+h/2/sc+20;
  g.fillStyle=css('--land');g.fillRect(0,0,w,h);
  g.imageSmoothingEnabled=sc<2;for(const t of TILES.values()){const x=X(t.x0),y=Y(t.y1),z=TS*sc;if(x>w||y>h||x+z<0||y+z<0)continue;g.drawImage(tilePlan(t),x,y,z+.6,z+.6);}g.imageSmoothingEnabled=true;
  const vis=ROADS.filter(r=>r.x1>vx0&&r.x0<vx1&&r.y1>vy0&&r.y0<vy1);
  g.lineCap='round';g.lineJoin='round';
  for(const pass of [0,1])for(const r of vis){const lw=Math.max(r.k?1:1.6,r.w*sc);
    if(r.k&&pass===0)continue;
    g.strokeStyle=pass?css('--road'):css('--road-edge');g.lineWidth=pass?lw:lw+2;
    if(r.k&&pass){g.strokeStyle=css('--road-edge');g.setLineDash(r.k===2?[2,2]:[4,3]);g.lineWidth=Math.max(1.2,r.w*sc*.6);}
    g.beginPath();for(let i=0;i<r.c.length;i+=2){i?g.lineTo(X(r.c[i]),Y(r.c[i+1])):g.moveTo(X(r.c[i]),Y(r.c[i+1]));}g.stroke();g.setLineDash([]);}
  g.fillStyle=css('--bldg');g.strokeStyle=css('--bldg-edge');g.lineWidth=.7;
  for(const t of TILES.values()){if(t.x0>vx1||t.x0+TS<vx0||t.y1-TS>vy1||t.y1<vy0)continue;
    for(const b of t.b){if(b.x1<vx0||b.x0>vx1||b.y1<vy0||b.y0>vy1)continue;g.beginPath();for(let i=0;i<b.c.length;i+=2){i?g.lineTo(X(b.c[i]),Y(b.c[i+1])):g.moveTo(X(b.c[i]),Y(b.c[i+1]));}g.closePath();g.fill();if(sc>1)g.stroke();}}
}
function drawLabels(g,w,h,ccx,ccy,sc){if(sc<1.4)return;
  g.font='500 '+(sc>4?12:11)+'px "DM Sans",sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
  for(const l of LBL){const x=w/2+(l.x-ccx)*sc,y=h/2-(l.y-ccy)*sc;if(x<-80||y<-20||x>w+80||y>h+20)continue;
    const tw=g.measureText(l.t).width;if(tw>l.L*sc*1.1)continue;
    g.save();g.translate(x,y);g.rotate(l.a);g.strokeStyle=css('--land');g.lineWidth=3;g.strokeText(l.t,0,0);g.fillStyle=css('--label');g.fillText(l.t,0,0);g.restore();}}
function shadowMask(nx,ny,cs,x0,y1,s){const c=document.createElement('canvas');c.width=nx;c.height=ny;const g=c.getContext('2d'),im=g.createImageData(nx,ny),col=rgb(css('--shadow')),a=Math.round(255*parseFloat(css('--shadow-a')));
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=x0+(i+.5)*cs,y=y1-(j+.5)*cs,z=hS(x,y);if(z===-1e9)continue;
    if(blocked(x,y,z+.3,s.dx,s.dy,s.te)){const o=(j*nx+i)*4;im.data[o]=col[0];im.data[o+1]=col[1];im.data[o+2]=col[2];im.data[o+3]=a;}}
  g.putImageData(im,0,0);return c;}

// ---- carte
const mc=$('map'),mx=mc.getContext('2d');
let cxw=0,cyw=0,scale=1,cy0=0,shM=null,shB=null,shT=0,flightId=0;
const TK={};
function readTokens(){for(const [k,v] of Object.entries({bg:'--bg',fg:'--fg',muted:'--muted',sun:'--sun',shade:'--shade',night:'--night',line:'--line',card:'--card',veil:'--veil'}))TK[k]=css(v);}
readTokens();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function w2s(x,y){return[mc.clientWidth/2+(x-cxw)*scale,mc.clientHeight/2-(y-cyw)*scale];}
function s2w(px,py){return[cxw+(px-mc.clientWidth/2)/scale,cyw-(py-mc.clientHeight/2)/scale];}
function computeShadow(fast){
  const s=sunAt(selMin);shB=null;if(!s||!G)return;
  const w=mc.clientWidth,h=mc.clientHeight,cs=fast?Math.max(2,6/scale):Math.max(1,2/scale);
  const [x0,y1]=s2w(-40,-40),nx=Math.ceil((w+80)/scale/cs),ny=Math.ceil((h+80)/scale/cs);
  shM=shadowMask(nx,ny,cs,x0,y1,s);shB={x0,y1,w:nx*cs,h:ny*cs};
}
function requestShadow(fast){clearTimeout(shT);
  if(fast){computeShadow(true);drawMap();}
  else shT=setTimeout(()=>{computeShadow(false);drawMap();
    if(G&&!document.hidden)ensureArea(cxw,cyw,Math.hypot(mc.clientWidth,mc.clientHeight)/scale/2+250).then(c=>{if(c){filter();schedule(true);}}).catch(()=>{});},150);}

let RES=[];
function drawMap(){
  if(!G)return;
  const dpr=devicePixelRatio||1,w=mc.clientWidth,h=mc.clientHeight;if(!w||!h)return;
  if(mc.width!==Math.round(w*dpr)||mc.height!==Math.round(h*dpr)){mc.width=Math.round(w*dpr);mc.height=Math.round(h*dpr);}
  mx.setTransform(dpr,0,0,dpr,0,0);
  drawPlan(mx,w,h,cxw,cyw,scale);
  if(shB){const p=w2s(shB.x0,shB.y1);mx.imageSmoothingEnabled=true;mx.drawImage(shM,p[0],p[1],shB.w*scale,shB.h*scale);}
  else if(!sunAt(selMin)){mx.globalAlpha=.4;mx.fillStyle=TK.night;mx.fillRect(0,0,w,h);mx.globalAlpha=1;}
  drawLabels(mx,w,h,cxw,cyw,scale);
  // rayon de recherche : l'extérieur s'efface
  const [fx,fy]=PLACES[from].slice(1),c=w2s(fx,fy),r=dist*scale,showR=sel&&route&&route.p===sel;
  {  mx.save();mx.beginPath();mx.rect(0,0,w,h);mx.arc(c[0],c[1],r,0,Math.PI*2);mx.fillStyle=TK.veil;mx.fill('evenodd');mx.restore();
  mx.save();mx.strokeStyle=TK.fg;mx.globalAlpha=.4;mx.lineWidth=1.25;mx.setLineDash([5,6]);mx.beginPath();mx.arc(c[0],c[1],r,0,Math.PI*2);mx.stroke();mx.restore();
  mx.fillStyle='rgba(47,107,255,.22)';mx.beginPath();mx.arc(c[0],c[1],15,0,Math.PI*2);mx.fill();mx.fillStyle='#2f6bff';mx.strokeStyle='#fff';mx.lineWidth=3;mx.beginPath();mx.arc(c[0],c[1],7,0,Math.PI*2);mx.fill();mx.stroke();
  }
  if(showR)drawRoute(mx);
  // terrasses
  let onQ=null;
  for(const {p,st} of RES){const q=w2s(p.sx,p.sy);if(q[0]<-30||q[1]<-30||q[0]>w+30||q[1]>h+30)continue;
    if(p===sel){onQ=[q,st];continue;}
    if(st===2){const gr=mx.createRadialGradient(q[0],q[1],0,q[0],q[1],18);gr.addColorStop(0,'rgba(255,176,0,.5)');gr.addColorStop(1,'rgba(255,176,0,0)');
      mx.fillStyle=gr;mx.beginPath();mx.arc(q[0],q[1],18,0,Math.PI*2);mx.fill();
      mx.fillStyle=TK.sun;mx.strokeStyle=TK.bg;mx.lineWidth=2;mx.beginPath();mx.arc(q[0],q[1],6.5,0,Math.PI*2);mx.fill();mx.stroke();}
    else{mx.fillStyle=TK.shade;mx.strokeStyle=TK.bg;mx.lineWidth=1.5;mx.beginPath();mx.arc(q[0],q[1],4.5,0,Math.PI*2);mx.fill();mx.stroke();}}
  if(onQ){const [q,st]=onQ;
    if(st===2){const gr=mx.createRadialGradient(q[0],q[1],0,q[0],q[1],30);gr.addColorStop(0,'rgba(255,176,0,.55)');gr.addColorStop(1,'rgba(255,176,0,0)');
      mx.fillStyle=gr;mx.beginPath();mx.arc(q[0],q[1],30,0,Math.PI*2);mx.fill();}
    mx.strokeStyle=TK.fg;mx.lineWidth=2;mx.beginPath();mx.arc(q[0],q[1],13,0,Math.PI*2);mx.stroke();
    mx.fillStyle=st===2?TK.sun:TK.shade;mx.strokeStyle=TK.bg;mx.lineWidth=2.5;mx.beginPath();mx.arc(q[0],q[1],8,0,Math.PI*2);mx.fill();mx.stroke();
    mx.font='600 12.5px "DM Sans",sans-serif';mx.textAlign='center';mx.textBaseline='middle';
    const tw=mx.measureText(sel.n).width,bw=tw+18,bh=26,bx=clamp(q[0]-bw/2,8,w-bw-8),by=q[1]-bh-20;
    mx.fillStyle=TK.card;mx.strokeStyle=TK.line;mx.lineWidth=1;mx.beginPath();mx.roundRect(bx,by,bw,bh,13);mx.fill();mx.stroke();
    mx.fillStyle=TK.fg;mx.fillText(sel.n,bx+bw/2,by+bh/2+.5);}
}


// ---- itinéraire à pied (graphe des rues du plan)
const GR=(()=>{const nodes=[],adj=[],segs=[],map=new Map(),key=(x,y)=>Math.round(x/2)+','+Math.round(y/2);
  const node=(x,y)=>{const k=key(x,y);let i=map.get(k);if(i==null){i=nodes.length;nodes.push([x,y]);adj.push([]);map.set(k,i);}return i;};
  const link=(a,b)=>{if(a===b)return;const d=Math.hypot(nodes[a][0]-nodes[b][0],nodes[a][1]-nodes[b][1]);adj[a].push([b,d]);adj[b].push([a,d]);};
  for(const r of ROADS){let pv=-1;for(let i=0;i+1<r.c.length;i+=2){const n=node(r.c[i],r.c[i+1]);if(pv>=0&&pv!==n){link(pv,n);segs.push([pv,n]);}pv=n;}}
  const H=new Map(),hk=(x,y)=>Math.floor(x/6)+','+Math.floor(y/6);
  nodes.forEach((q,i)=>{const k=hk(q[0],q[1]);(H.get(k)||H.set(k,[]).get(k)).push(i);});
  nodes.forEach((q,i)=>{const cx=Math.floor(q[0]/6),cy=Math.floor(q[1]/6);
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const j of H.get((cx+a)+','+(cy+b))||[])if(j>i&&Math.hypot(nodes[j][0]-q[0],nodes[j][1]-q[1])<5&&!adj[i].some(e=>e[0]===j))link(i,j);});
  return{nodes,adj,segs};})();
function snapSeg(x,y){let best=null,bd=1e9;
  for(const [a,b] of GR.segs){const A=GR.nodes[a],B=GR.nodes[b],dx=B[0]-A[0],dy=B[1]-A[1],L=dx*dx+dy*dy||1;
    let t=((x-A[0])*dx+(y-A[1])*dy)/L;t=Math.max(0,Math.min(1,t));const px=A[0]+t*dx,py=A[1]+t*dy,d=Math.hypot(x-px,y-py);
    if(d<bd){bd=d;best={a,b,px,py,d};}}
  return best;}
function walkRoute(ax,ay,bx,by){
  const N0=GR.nodes.length,sa=snapSeg(ax,ay),sb=snapSeg(bx,by);if(!sa||!sb||sa.d>90||sb.d>90)return null;
  const touched=[];
  const addT=s=>{const i=GR.nodes.length;GR.nodes.push([s.px,s.py]);GR.adj.push([]);
    for(const e of [s.a,s.b]){const d=Math.hypot(GR.nodes[e][0]-s.px,GR.nodes[e][1]-s.py);GR.adj[i].push([e,d]);GR.adj[e].push([i,d]);touched.push(e);}return i;};
  const S=addT(sa),T=addT(sb);
  if(sa.a===sb.a&&sa.b===sb.b){const d=Math.hypot(sa.px-sb.px,sa.py-sb.py);GR.adj[S].push([T,d]);GR.adj[T].push([S,d]);}
  const n=GR.nodes.length,dist=new Float64Array(n).fill(1e12),prev=new Int32Array(n).fill(-1),done=new Uint8Array(n);dist[S]=0;
  const heap=[[0,S]];const push=v=>{heap.push(v);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const t=heap[0],l=heap.pop();if(heap.length){heap[0]=l;let i=0;for(;;){let c=2*i+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[i][0]<=heap[c][0])break;[heap[i],heap[c]]=[heap[c],heap[i]];i=c;}}return t;};
  while(heap.length){const [d,u]=pop();if(done[u])continue;done[u]=1;if(u===T)break;
    for(const [v,w] of GR.adj[u])if(d+w<dist[v]){dist[v]=d+w;prev[v]=u;push([dist[v],v]);}}
  let path=null;
  if(done[T]){path=[];for(let u=T;u>=0;u=prev[u])path.push(GR.nodes[u].slice());path.reverse();}
  // nettoyage
  GR.nodes.length=N0;GR.adj.length=N0;for(const e of touched)GR.adj[e]=GR.adj[e].filter(x=>x[0]<N0);
  if(!path)return null;
  const pts=[[ax,ay],...path,[bx,by]];let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
  const direct=Math.hypot(bx-ax,by-ay);
  if(len>direct*3.2+120)return{pts:[[ax,ay],[bx,by]],len:direct*1.25,straight:true};
  return{pts,len,straight:false};}
let route=null,routeProg=1,routeAnim=0;
function makeRoute(p){const [,fx,fy]=PLACES[from];let r=walkRoute(fx,fy,p.sx,p.sy);if(!r){const d=Math.hypot(p.sx-fx,p.sy-fy);r={pts:[[fx,fy],[p.sx,p.sy]],len:d*1.25,straight:true};}r.p=p;return r;}
function revealRoute(){const id=++routeAnim;if(matchMedia('(prefers-reduced-motion: reduce)').matches){routeProg=1;drawMap();return;}
  routeProg=0;const t0=performance.now();(function st(t){if(id!==routeAnim)return;const k=Math.min(1,(t-t0-250)/900);routeProg=Math.max(0,1-Math.pow(1-k,3));drawMap();if(k<1)requestAnimationFrame(st);})(t0);}
function fitRoute(ms){if(!route)return;const xs=route.pts.map(q=>q[0]),ys=route.pts.map(q=>q[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),dx=Math.max(60,x1-x0),dy=Math.max(60,y1-y0);
  const sc=clamp(Math.min((mc.clientWidth-110)/dx,(visH()-150)/dy),.18,4.2);fly((x0+x1)/2,(y0+y1)/2,sc,ms);}
function drawRoute(mx){
  const pts=route.pts.map(q=>w2s(q[0],q[1])),seg=[];let tot=0;
  for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);tot+=d;}
  const lim=tot*routeProg,path=[pts[0]];let acc=0;
  for(let i=1;i<pts.length;i++){if(acc+seg[i-1]<=lim){path.push(pts[i]);acc+=seg[i-1];}else{const k=seg[i-1]?(lim-acc)/seg[i-1]:0;path.push([pts[i-1][0]+(pts[i][0]-pts[i-1][0])*k,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*k]);break;}}
  const stroke=(w,c,dash)=>{mx.save();mx.lineCap='round';mx.lineJoin='round';mx.setLineDash(dash||[]);mx.lineWidth=w;mx.strokeStyle=c;mx.beginPath();path.forEach((q,i)=>i?mx.lineTo(q[0],q[1]):mx.moveTo(q[0],q[1]));mx.stroke();mx.restore();};
  if(route.straight){stroke(8,'rgba(255,255,255,.9)');stroke(4,'#2f6bff',[1,9]);}
  else{stroke(10,'rgba(255,255,255,.95)');stroke(6,'#2f6bff');}
  // départ
  const o=pts[0];mx.fillStyle='rgba(47,107,255,.22)';mx.beginPath();mx.arc(o[0],o[1],17,0,Math.PI*2);mx.fill();
  mx.fillStyle='#2f6bff';mx.strokeStyle='#fff';mx.lineWidth=3.5;mx.beginPath();mx.arc(o[0],o[1],7.5,0,Math.PI*2);mx.fill();mx.stroke();
  // pastille durée
  if(routeProg>.85){let half=tot/2,acc2=0,m=pts[0];for(let i=1;i<pts.length;i++){if(acc2+seg[i-1]>=half){const k=(half-acc2)/(seg[i-1]||1);m=[pts[i-1][0]+(pts[i][0]-pts[i-1][0])*k,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*k];break;}acc2+=seg[i-1];}
    const mins=Math.max(1,Math.round(route.len/WALK)),txt=mins+' min · '+(route.len<950?Math.round(route.len/10)*10+' m':(route.len/1000).toFixed(1).replace('.',',')+' km');
    mx.font='700 12.5px "DM Sans",sans-serif';mx.textAlign='center';mx.textBaseline='middle';const tw=mx.measureText(txt).width,bw=tw+22,bh=26;
    const bx=clamp(m[0]-bw/2,8,mc.clientWidth-bw-8),by=m[1]-bh/2;
    mx.fillStyle='#2f6bff';mx.beginPath();mx.roundRect(bx,by,bw,bh,13);mx.fill();mx.strokeStyle='#fff';mx.lineWidth=2;mx.stroke();mx.fillStyle='#fff';mx.fillText(txt,bx+bw/2,by+bh/2+.5);}
}

// caméra : vol animé, le point visé se place au centre de la zone visible
function focus(tx,ty,sc){return[tx,ty-(mc.clientHeight/2-cy0)/sc];}
function fly(tx,ty,sc,ms){
  if(ms==null)ms=520;if(matchMedia('(prefers-reduced-motion: reduce)').matches)ms=0;
  const [ex,ey]=focus(tx,ty,sc),sx=cxw,sy=cyw,ss=scale,t0=performance.now(),id=++flightId;
  if(!ms){cxw=ex;cyw=ey;scale=sc;drawMap();requestShadow(false);return;}
  (function step(t){if(id!==flightId)return;const k=Math.min(1,(t-t0)/ms),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
    scale=ss*Math.pow(sc/ss,e);cxw=sx+(ex-sx)*e;cyw=sy+(ey-sy)*e;drawMap();
    if(k<1)requestAnimationFrame(step);else requestShadow(false);})(t0);
}
function layout(){const ar=$('app').getBoundingClientRect(),pr=$('panel').getBoundingClientRect(),tr=$('top').getBoundingClientRect();
  cy0=((tr.bottom-ar.top)+(pr.top-ar.top))/2;const z=$('zoom');if(z){z.style.top='auto';z.style.transform='none';z.style.bottom=Math.round(ar.bottom-pr.top+12)+'px';}}
function visH(){const pr=$('panel').getBoundingClientRect(),tr=$('top').getBoundingClientRect();return Math.max(200,pr.top-tr.bottom);}
function fitScale(){return clamp(.46*Math.min(mc.clientWidth,visH())/dist,.18,5);}
function goOverview(ms){const [fx,fy]=PLACES[from].slice(1);fly(fx,fy,fitScale(),ms);}

// gestes : glisser, pincer, molette, toucher un point
const ptrs=new Map();let pinch0=null,moved=0;
mc.addEventListener('pointerdown',e=>{flightId++;mc.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);moved=0;
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0={d:Math.hypot(a[0]-b[0],a[1]-b[1]),s:scale};}});
mc.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const prev=ptrs.get(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===2&&pinch0){const [a,b]=[...ptrs.values()];scale=clamp(pinch0.s*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch0.d,.18,10);moved+=10;}
  else if(ptrs.size===1){const dx=e.clientX-prev[0],dy=e.clientY-prev[1];moved+=Math.abs(dx)+Math.abs(dy);cxw-=dx/scale;cyw+=dy/scale;}
  drawMap();});
function pointerUp(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=null;
  if(moved>6){requestShadow(false);return;}
  if(ptrs.size===0){const r=mc.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;let best=null,bd=28;
    for(const {p} of RES){const q=w2s(p.sx,p.sy),d=Math.hypot(q[0]-px,q[1]-py);if(d<bd){bd=d;best=p;}}
    if(best)select(best);}}
mc.addEventListener('pointerup',pointerUp);
mc.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);pinch0=null;});
mc.addEventListener('wheel',e=>{e.preventDefault();flightId++;scale=clamp(scale*(e.deltaY<0?1.2:1/1.2),.18,10);drawMap();requestShadow(false);},{passive:false});

// ---- cartes
const CARDS=new Map();
function splitName(el,n){el.textContent='';const w=n.split(' ');if(w.length<2){el.textContent=n;return;}let bi=1,bd=1e9;for(let i=1;i<w.length;i++){const d=Math.abs(w.slice(0,i).join(' ').length-w.slice(i).join(' ').length);if(d<bd){bd=d;bi=i;}}el.append(w.slice(0,bi).join(' '),document.createElement('br'),w.slice(bi).join(' '));}
function sunParts(txt,sm,b){const m=/^(.*?)(\d{1,2})\s?h\s?(\d{2})$/.exec(txt);b.textContent='';if(m){sm.textContent=m[1].trim();b.className='';b.append(m[2]+' h',document.createElement('br'),m[3]);}else{sm.textContent='';b.className='sm';b.textContent=txt;}}
function makeCard(p){
  const el=document.createElement('article');el.className='card';el.dataset.i=p.i;
  const th=document.createElement('button');th.className='th';th.setAttribute('aria-label','Agrandir la vue aérienne de '+p.n);
  const img=new Image();img.alt='';img.loading='lazy';img.decoding='async';const aer=aerOf(p),pic=photoOf(p);img.src=pic||aer;if(pic)th.classList.add('has-photo');
  img.onerror=()=>{if(pic&&th.classList.contains('has-photo')){th.classList.remove('has-photo');img.src=aer;}};th.appendChild(img);
  const m=document.createElement('span');m.className='mk sh';const span=80/1.8;
  m.style.left=(50+(p.sx-p.x)/span*100)+'%';m.style.top=(50-(p.sy-p.y)/span*100)+'%';th.appendChild(m);
  th.onclick=e=>{e.stopPropagation();openGal(p);};
  const ct=document.createElement('div');ct.className='ct';
  ct.innerHTML='<span class="ck"></span><div class="cn"></div><div class="cbot"><div class="csun"><small></small><b></b></div><a class="go" target="_blank" rel="noopener">Y aller</a></div>';
  splitName(ct.querySelector('.cn'),p.n);ct.querySelector('.go').href=nav(p);
  el.append(th,ct);el._mk=m;el._sl=ct.querySelector('.csun small');el._sb=ct.querySelector('.csun b');el._ck=ct.querySelector('.ck');
  el.addEventListener('click',e=>{if(e.target.closest('a'))return;openGal(p);});
  CARDS.set(p.i,el);return el;
}
function paintCard(el,p,d,st){
  const [cls,txt]=pill(p,st),ck=(top5Mode&&RES.length&&RES[0].p===p?'N° 1 · ':'')+(KIND[p.k]||p.k);
  if(el._cls!==cls){el._cls=cls;el._mk.className='mk '+(st===2?'sun':'sh');}
  if(el._txt!==txt){el._txt=txt;sunParts(txt,el._sl,el._sb);}
  if(el._ckt!==ck){el._ckt=ck;el._ck.textContent=ck;}
  el.classList.toggle('on',p===sel);
}
let trayMode='';
function renderCards(){
  const tray=$('tray');
  if(!G){if(trayMode!=='skel'){trayMode='skel';tray.innerHTML='<div class="skel">Calcul des ombres sur le relief LiDAR…</div>';}return;}
  if(!RES.length){
    const sig='empty'+dist+fSun+from+cat;if(trayMode===sig)return;trayMode=sig;
    const [fn]=PLACES[from];
    const e=document.createElement('div');e.className='empty';
    e.innerHTML='<b></b><span></span><div class="erow"></div>';
    e.querySelector('b').textContent=fSun?'Aucune terrasse au soleil à cette heure':'Aucune terrasse dans ce rayon';
    e.querySelector('span').textContent='Rayon de '+(dist<1000?dist+' m':(dist/1000).toString().replace('.',',')+' km')+' autour de '+fn+'. Déplacez le curseur de l’heure pour voir passer le soleil.';
    const row=e.querySelector('.erow');
    if(dist<RADII[RADII.length-1]){const b=document.createElement('button');b.className='chip';b.dataset.a='wide';b.textContent='Élargir le rayon';row.appendChild(b);}
    
    tray.replaceChildren(e);return;
  }
  const list=RES.slice(0,60),els=[];
  for(const {p,d,st} of list){const el=CARDS.get(p.i)||makeCard(p);paintCard(el,p,d,st);els.push(el);}
  const same=trayMode==='cards'&&tray.children.length===els.length&&els.every((e,i)=>tray.children[i]===e);
  if(!same){trayMode='cards';tray.replaceChildren(...els);if(sel)centerCard(sel,false);}
  thumbsFor();
}
$('tray').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;
  if(b.dataset.a==='wide'){dist=RADII.find(r=>r>dist)||dist;save();goOverview();schedule(false);}
  else{fSun=false;save();schedule(false);}});

let prog=0,sT=0;
function centerCard(p,smooth){const el=CARDS.get(p.i),tr=$('tray');if(!el||el.parentNode!==tr)return;
  if(listOpen){tr.scrollTo({top:Math.max(0,el.offsetTop-8),behavior:smooth?'smooth':'auto'});return;}
  prog=Date.now()+(smooth?650:200);
  tr.scrollTo({left:Math.max(0,el.offsetLeft-(tr.clientWidth-el.offsetWidth)/2),behavior:smooth?'smooth':'auto'});}
$('tray').addEventListener('scroll',()=>{if(listOpen||Date.now()<prog)return;clearTimeout(sT);sT=setTimeout(()=>{
  const tr=$('tray'),mid=tr.scrollLeft+tr.clientWidth/2;let best=null,bd=1e9;
  for(const el of tr.children){if(!el.classList.contains('card'))continue;const d=Math.abs(el.offsetLeft+el.offsetWidth/2-mid);if(d<bd){bd=d;best=el;}}
  if(best){const p=P[+best.dataset.i];if(p!==sel)select(p,{scroll:false});}},70);},{passive:true});

function select(p,o){o=o||{};sel=p;
  CARDS.forEach((el,i)=>el.classList.toggle('on',!!p&&p.i===i));
  if(p&&o.scroll!==false)centerCard(p,true);
  route=p?makeRoute(p):null;
  if(p&&o.fly!==false){layout();if(route){fitRoute();revealRoute();}else fly(p.sx,p.sy,o.zoom||(scale<2?2.6:scale));}
  else if(route)routeProg=1;
  drawDial();drawMap();}
let curH=0,NAT=0;
function natH(){const p=$('panel'),had=p.classList.contains('sz');p.classList.remove('sz');const h=p.offsetHeight;if(had)p.classList.add('sz');return h;}
const maxH=()=>Math.round($('app').clientHeight*.72);
function setH(h,anim){const p=$('panel');if(!NAT)NAT=natH();h=clamp(Math.round(h),40,maxH());curH=h;
  p.classList.toggle('anim',!!anim);p.classList.add('sz');p.style.setProperty('--ph',h+'px');
  const mn=h<84,op=h>NAT+36;p.classList.toggle('min',mn);p.classList.toggle('open',op&&!mn);listOpen=op&&!mn;
  $('grab').setAttribute('aria-label',mn?'Afficher les terrasses':'Ajuster la taille du panneau');
  clearTimeout(setH.t);setH.t=setTimeout(()=>{layout();if(G){if(sel&&!mn){if(route&&route.p===sel)fitRoute(350);else fly(sel.sx,sel.sy,scale,350);}else drawMap();requestShadow(false);}},anim?300:120);}
function pick(p){if(curH&&curH<84)setH(NAT,true);select(p);}
function setOpen(v){setH(v?Math.min(maxH(),NAT+200):NAT,true);}
function zoomBy(f){flightId++;scale=clamp(scale*f,.18,10);drawMap();requestShadow(false);}
// ---- cadran solaire
const dial=$('dial');
function drawDial(){
  const W=dial.clientWidth,H=dial.clientHeight;if(!W)return;
  const dpr=devicePixelRatio||1;if(dial.width!==Math.round(W*dpr)||dial.height!==Math.round(H*dpr)){dial.width=Math.round(W*dpr);dial.height=Math.round(H*dpr);}
  const g=dial.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const pad=6,y0=H-30,X=m=>pad+(m-M0)/(M1-M0)*(W-2*pad),top=8,aH=y0-8-top,Y=el=>y0-9-(Math.max(0,el)/maxEl)*aH;
  // arc du soleil
  g.lineCap='round';g.lineJoin='round';
  g.strokeStyle='#fff';g.globalAlpha=.16;g.lineWidth=1.6;g.beginPath();
  ARC.forEach((el,i)=>{const x=X(M0+i*STEP),y=Y(el);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();g.globalAlpha=1;
  g.strokeStyle=TK.sun;g.globalAlpha=.55;g.lineWidth=2.6;g.beginPath();let started=false;
  ARC.forEach((el,i)=>{const m=M0+i*STEP;if(m>selMin||el<=.5*D2R)return;const x=X(m),y=Y(el);started?g.lineTo(x,y):g.moveTo(x,y);started=true;});g.stroke();g.globalAlpha=1;
  // frise : soleil de la terrasse choisie (sinon durée du jour)
  const bx=X(M0),bw=X(M1)-bx;g.save();g.beginPath();g.roundRect(bx,y0,bw,8,4);g.clip();
  g.fillStyle='rgba(255,255,255,.22)';g.fillRect(bx,y0,bw,8);
  if(sel&&sel.day){g.fillStyle=TK.sun;for(let k=0;k<NM;k++){if(sel.day[k]===2)g.fillRect(X(M0+k*STEP),y0,(W-2*pad)/NM+.7,8);}}
  else if(sunrise!=null){g.fillStyle=TK.sun;g.globalAlpha=.7;g.fillRect(X(Math.max(M0,sunrise)),y0,X(Math.min(M1,sunset))-X(Math.max(M0,sunrise)),8);g.globalAlpha=1;}
  g.restore();
  // repères d'heures
  g.fillStyle='rgba(255,255,255,.72)';g.font='500 11px "DM Sans",sans-serif';g.textAlign='center';g.textBaseline='alphabetic';
  for(const h of [8,12,16,20]){g.fillText(LANG==='en'?h+':00':h+' h',X(h*60),H-3);}
  // curseur + soleil
  const e=elAt(selMin),up=e>.5*D2R,tx=X(selMin),ty=up?Y(e):y0-9;
  g.strokeStyle='#fff';g.globalAlpha=.3;g.lineWidth=1.5;g.beginPath();g.moveTo(tx,ty);g.lineTo(tx,y0+12);g.stroke();g.globalAlpha=1;
  if(up){const gr=g.createRadialGradient(tx,ty,0,tx,ty,26);gr.addColorStop(0,'rgba(255,176,0,.32)');gr.addColorStop(1,'rgba(255,176,0,0)');g.fillStyle=gr;g.beginPath();g.arc(tx,ty,26,0,Math.PI*2);g.fill();}
  g.globalAlpha=.78;g.fillStyle=up?TK.sun:'rgba(255,255,255,.6)';g.strokeStyle='rgba(24,17,10,.5)';g.lineWidth=2.5;g.beginPath();g.arc(tx,ty,8,0,Math.PI*2);g.fill();g.stroke();g.globalAlpha=1;
  dial.setAttribute('aria-valuenow',selMin);dial.setAttribute('aria-valuetext',hm(selMin));
}
function dialX(cx){const r=dial.getBoundingClientRect(),pad=6;
  selMin=clamp(Math.round((M0+(cx-r.left-pad)/(r.width-2*pad)*(M1-M0))/5)*5,M0,M1);schedule(true);}
dial.addEventListener('pointerdown',e=>{stopPlay();dial.setPointerCapture(e.pointerId);scrubbing=true;dialX(e.clientX);});
dial.addEventListener('pointermove',e=>{if(scrubbing&&dial.hasPointerCapture(e.pointerId))dialX(e.clientX);});
function dialEnd(e){if(!scrubbing||playing)return;scrubbing=false;requestShadow(false);render(true,false);}
dial.addEventListener('pointerup',dialEnd);dial.addEventListener('pointercancel',dialEnd);
dial.addEventListener('keydown',e=>{const d={ArrowLeft:-10,ArrowDown:-10,ArrowRight:10,ArrowUp:10,PageDown:-60,PageUp:60}[e.key];
  if(d){e.preventDefault();stopPlay();selMin=clamp(selMin+d,M0,M1);schedule(true);}});

let playing=false,acc=0;
const ICON_PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.500v13a1 1 0 0 0 1.500.9l10.500-6.500a1 1 0 0 0 0-1.700L9.500 4.600A1 1 0 0 0 8 5.500z"/></svg>';
const ICON_PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.200" height="14" rx="1.400"/><rect x="13.800" y="5" width="4.200" height="14" rx="1.400"/></svg>';
function stopPlay(){if(!playing)return;playing=false;scrubbing=false;$('play').innerHTML=ICON_PLAY;$('play').setAttribute('aria-label','Lire la journée');requestShadow(false);render(true,false);}
function startPlay(){if(!G)return;playing=true;scrubbing=true;$('play').innerHTML=ICON_PAUSE;$('play').setAttribute('aria-label','Mettre en pause');
  if(selMin>=M1-10)selMin=sunrise!=null?clamp(Math.ceil(sunrise/5)*5,M0,M1):M0;acc=selMin;let last=performance.now();
  (function tick(t){if(!playing)return;acc=Math.min(M1,acc+(t-last)*.075);last=t;const m=Math.round(acc/5)*5;
    if(m!==selMin){selMin=m;schedule(true);}
    if(acc>=M1){stopPlay();return;}requestAnimationFrame(tick);})(last);}
$('play').onclick=()=>playing?stopPlay():startPlay();

// ---- rendu
let top5Mode=false;
function filter(){
  if(top5Mode){RES=topSpots(true).map(r=>{r.p.st=r.st;return{p:r.p,d:r.d,st:r.st};});
    if(showShade){const [fx,fy]=PLACES[from].slice(1),R=walkMin*WALK,sh=[];
      for(const p of P){if(!p.day)continue;const b=BOIRE.has(p.k);if(cat==='boire'&&!b||cat==='manger'&&b||!hasT(p))continue;const d=Math.hypot(p.sx-fx,p.sy-fy);if(d>R)continue;
        const st=stateAt(p,selMin);if(st!==1)continue;p.st=st;sh.push({p,d,st});}
      sh.sort((a,b)=>a.d-b.d);RES=RES.concat(sh);}
    return;}
  const [fx,fy]=PLACES[from].slice(1),list=[];
  for(const p of P){if(!p.day)continue;const b=BOIRE.has(p.k);if(cat==='boire'&&!b||cat==='manger'&&b||!hasT(p))continue;
    const d=Math.hypot(p.sx-fx,p.sy-fy);if(d>dist)continue;const st=stateAt(p,selMin);p.st=st;if(fSun&&st!==2&&p!==sel)continue;list.push({p,d,st});}
  list.sort((a,b)=>a.d-b.d);RES=list;
}
const fmtDate=()=>new Date(dYear,dMonth,dDay).toLocaleDateString(LANG==='en'?'en-GB':'fr-FR',{weekday:'short',day:'numeric',month:'short'});
const kmTxt=d=>d<1000?d+' m':(d/1000).toString().replace('.',',')+' km';
function placeInd(){const b=$('seg').querySelector('[aria-pressed="true"]'),ind=$('ind');if(!b||!b.offsetWidth)return;
  ind.style.width=b.offsetWidth+'px';ind.style.transform='translateX('+b.offsetLeft+'px)';}
function updateChrome(){
  const h=Math.floor(selMin/60),mm=String(selMin%60).padStart(2,'0');
  $('tbig').innerHTML='<b>'+h+'</b><i>h</i><b>'+mm+'</b>';$('tbig').classList.toggle('night',!sunAt(selMin));
  $('dlabel').textContent=fmtDate();$('date').value=dYear+'-'+String(dMonth+1).padStart(2,'0')+'-'+String(dDay).padStart(2,'0');
  $('sunspan').textContent=sunrise==null?'Pas de soleil ce jour-là':'Lever '+hm(sunrise)+' · coucher '+hm(sunset);
  $('wname').textContent=PLACES[from][0];$('rad').textContent=kmTxt(dist);
  $('cnt').textContent=G?RES.length:'–';
  $('fSun').setAttribute('aria-pressed',fSun);$('fShade').setAttribute('aria-pressed',showShade);
  $('seg').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===cat));placeInd();
}
let lastCards=0;
function render(force,shadow){
  updateChrome();
  if(!G){drawDial();return;}
  filter();if(sel&&!RES.some(r=>r.p===sel))sel=null;
  const t=performance.now();
  if(!scrubbing||force||t-lastCards>90){renderCards();lastCards=t;}
  $('cnt').textContent=RES.filter(r=>!fSun||r.st===2).length;
  drawDial();
  if(shadow){requestShadow(scrubbing);if(!scrubbing)drawMap();}else drawMap();
}
let rf=0,pendShadow=false;
function schedule(shadow){if(shadow)pendShadow=true;if(rf)return;
  rf=requestAnimationFrame(()=>{rf=0;const s=pendShadow;pendShadow=false;render(false,s);});}

// --- agrandissement de la vue aérienne
let lbP=null,lbPlan=true;const lbImg=new Image();
function openLB(p){lbP=p;$('lbn').textContent=p.n+' ↗';$('lbn').href=nav(p);$('lbsv').href=sv(p);
  const [,txt]=pill(p,stateAt(p,selMin));$('lbk').textContent=(KIND[p.k]||p.k)+' · '+txt+' · ombres à '+hm(selMin);setLB(lbPlan);
  $('lb').hidden=false;lbImg.onload=drawLB;lbImg.src=aerOf(p);if(lbImg.complete)drawLB();$('lbx').focus();}
function drawLB(){if(!lbP)return;const cv=$('lbc'),w=cv.clientWidth,dpr=devicePixelRatio||1;cv.width=w*dpr;cv.height=w*dpr;const g=cv.getContext('2d');g.scale(dpr,dpr);
  const s=sunAt(selMin),k=w/80,p=lbP;
  if(!lbPlan){if(lbImg.complete&&lbImg.naturalWidth)g.drawImage(lbImg,0,0,w,w);}
  else{drawPlan(g,w,w,p.x,p.y,k);
    if(s){const off=shadowMask(160,160,.5,p.x-40,p.y+40,s);g.imageSmoothingEnabled=true;g.drawImage(off,0,0,w,w);}
    drawLabels(g,w,w,p.x,p.y,k);}
  const mxp=(p.sx-p.x+40)*k,myp=(40-(p.sy-p.y))*k,st=stateAt(p,selMin);
  g.fillStyle=st===2?css('--sun'):css('--shade');g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(mxp,myp,9,0,7);g.fill();g.stroke();
  if(s){g.strokeStyle=css('--sun');g.lineWidth=2;g.setLineDash([6,5]);g.beginPath();g.moveTo(mxp,myp);g.lineTo(mxp+s.dx*w,myp-s.dy*w);g.stroke();g.setLineDash([]);}
  g.fillStyle=lbPlan?css('--fg'):'#fff';g.fillRect(10,w-14,10*k,3);g.font='600 11px "DM Sans",monospace';g.textAlign='left';g.fillText('10 m',10,w-20);}
function closeLB(){$('lb').hidden=true;lbP=null;}
$('lbx').onclick=closeLB;$('lb').onclick=e=>{if(e.target===$('lb'))closeLB();};
addEventListener('keydown',e=>{if(e.key==='Escape'&&lbP)closeLB();});
function setLB(v){lbPlan=v;$('lbPlan').setAttribute('aria-pressed',v);$('lbPhoto').setAttribute('aria-pressed',!v);drawLB();}
$('lbPlan').onclick=()=>setLB(true);$('lbPhoto').onclick=()=>setLB(false);

// ---- parcours : intro -> choix -> top 5 -> carte
let readyRes;const READY=new Promise(r=>{readyRes=r;});
const SCRS=['splash','ask','top5'];
function go(id){
  for(const s of SCRS){const e=$(s);
    if(s===id){e.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>e.classList.add('on')));}
    else if(e.classList.contains('on')||!e.hidden){e.classList.remove('on');setTimeout(()=>{if(!e.classList.contains('on'))e.hidden=true;},560);}}
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
(function(){const C=['#ff4d6d','#fff','#2a1700','#3aa0e8','#7ad35f','#ff8a1f','#b06cff','#ffe45e'],box=$('conf');if(!box)return;
  for(let i=0;i<46;i++){const e=document.createElement('i'),a=Math.random()*Math.PI*2,d=90+Math.random()*190;
    const w=5+Math.random()*7,sq=Math.random()<.5;e.style.cssText='--x:'+Math.round(Math.cos(a)*d)+'px;--y:'+Math.round(Math.sin(a)*d*.8-40)+'px;--a:'+Math.round((Math.random()-.5)*540)+'deg;--d:'+(1.15+Math.random()*.35).toFixed(2)+'s;--c:'+C[i%C.length]+';--w:'+w+'px;--h:'+(sq?w:w*2.2)+'px;--r:'+(Math.random()<.4?'50%':'2px');box.appendChild(e);}})();
let splashT=setTimeout(()=>showAsk(),reduced?500:4300);
$('splash').addEventListener('click',()=>{clearTimeout(splashT);showAsk();});
function showAsk(){go('ask');}
// tuiles : inclinaison au doigt, éclats de soleil au choix
function burst(x,y,host){const cols=['#ffb000','#ffd36b','#ff7058','#ffffff','#ff9f80'];
  for(let i=0;i<18;i++){const s=document.createElement('span');s.className='spk';s.style.left=x+'px';s.style.top=y+'px';s.style.background=cols[i%cols.length];
    if(i%3===0){s.style.borderRadius='3px';s.style.width='8px';s.style.height='14px';}host.appendChild(s);
    const a=Math.random()*Math.PI*2,d=70+Math.random()*110;
    s.animate([{transform:'translate(0,0) rotate(0) scale(1)',opacity:1},{transform:'translate('+Math.cos(a)*d+'px,'+(Math.sin(a)*d+50)+'px) rotate('+(Math.random()*540)+'deg) scale(.4)',opacity:0}],{duration:750+Math.random()*250,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>s.remove();}}
document.querySelectorAll('.tile').forEach(b=>{
  const art=b.querySelector('.art');
  const tilt=e=>{const r=b.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5;art.style.setProperty('--ry',(nx*26)+'deg');art.style.setProperty('--rx',(-ny*22)+'deg');};
  b.addEventListener('pointermove',tilt);b.addEventListener('pointerdown',tilt);
  b.addEventListener('pointerleave',()=>{art.style.setProperty('--ry','0deg');art.style.setProperty('--rx','0deg');});
  b.addEventListener('click',e=>{if(b.dataset.busy)return;b.dataset.busy=1;cat=b.dataset.c;save();
    const r=$('ask').getBoundingClientRect();burst(e.clientX-r.left,e.clientY-r.top,$('ask'));
    locate(true);
    setTimeout(()=>{delete b.dataset.busy;openWalk();},reduced?0:420);});
});

// classement : soleil maintenant, durée du soleil à venir, proximité, terrasse signalée
function topSpots(all){
  const [fx,fy]=PLACES[from].slice(1),k=clamp(Math.round((selMin-M0)/STEP),0,NM-1),out=[],R=walkMin*WALK;
  for(const p of P){if(!p.day)continue;const b=BOIRE.has(p.k);if(cat==='boire'&&!b||cat==='manger'&&b||!hasT(p))continue;
    const d=Math.hypot(p.sx-fx,p.sy-fy);if(d>R)continue;
    const st=stateAt(p,selMin);let j=k;if(st===2)while(j<NM&&p.day[j]===2)j++;
    const sunMin=st===2?(j-k)*STEP:0;
    if(st!==2||sunMin<sunNeed)continue;
    out.push({p,d,st,sunMin,score:(st===2?1:0)+Math.min(sunMin,240)/240*.8+(1-d/R)*.5+(p.o||TERR[p.i]===2||MAN[p.i]===2?.15:p.pr?.04:0)});}
  out.sort((a,b)=>b.score-a.score);return all?out:out.slice(0,5);
}
function spotCard(r,i){
  const {p,d,st}=r,[cls,txt]=pill(p,st);
  const el=document.createElement('button');el.className='spot stg'+(i===0?' first':'');el.style.setProperty('--i',i+2);
  el.innerHTML='<div class="ph"><div class="im"><img alt="" decoding="async"><span class="mk"></span></div><span class="rk"></span></div><div class="sb"><div class="shd"><div class="sn"></div><div class="sk"></div></div><div class="pill"><span class="dot"></span><span class="ptxt"></span></div></div>';
  const img=el.querySelector('img'),aer=aerOf(p),pic=photoOf(p),phEl=el.querySelector('.ph');
  img.src=pic||aer;if(pic)phEl.classList.add('has-photo');
  img.onerror=()=>{if(pic&&phEl.classList.contains('has-photo')){phEl.classList.remove('has-photo');img.src=aer;}else img.style.display='none';};
  if(pic&&i===0&&p.i<NTH){const ins=document.createElement('span');ins.className='aer';const ai=new Image();ai.alt='';ai.src=aer;const am=document.createElement('span');am.className='mk '+(st===2?'sun':'sh');
    const sp=80/1.8;am.style.left=(50+(p.sx-p.x)/sp*100)+'%';am.style.top=(50-(p.sy-p.y)/sp*100)+'%';ins.append(ai,am);phEl.appendChild(ins);}
  const mk=el.querySelector('.mk'),span=80;
  mk.className='mk '+(st===2?'sun':'sh');mk.style.left=(50+(p.sx-p.x)/span*100)+'%';mk.style.top=(50-(p.sy-p.y)/span*100)+'%';
  if(GP[p.i]&&GP[p.i].u&&i===0&&photoOf(p)===GP[p.i].u){const cr=document.createElement('span');cr.className='gcred';cr.textContent='Photo © '+(GP[p.i].a||'contributeur')+' · Google';phEl.appendChild(cr);}
  el.querySelector('.rk').textContent=i===0?'N° 1 · meilleur spot':String(i+1);
  el.querySelector('.sn').textContent=p.n;
  el.querySelector('.sk').textContent=(KIND[p.k]||p.k);
  const pl=el.querySelector('.pill');pl.classList.add(cls);el.querySelector('.ptxt').textContent=txt;
  el.addEventListener('click',()=>openGal(p));
  return el;
}
let t5List=[];
async function renderTop5(){
  const box=$('t5list');
  const SUN='<span class="sunword"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.500"/><path d="M12 1.500v3.500M12 19v3.500M1.500 12H5M19 12h3.500M4.600 4.600l2.500 2.500M16.900 16.900l2.500 2.500M4.600 19.400l2.500-2.500M16.900 7.100l2.500-2.500"/></svg>au soleil</span>';
  $('t5title').innerHTML=(cat==='boire'?'Bois un verre en terrasse ':'Mange en terrasse ')+SUN+' ici :';
  $('walkChip').querySelector('span').textContent=walkMin+' min à pied max';
  $('wname2').textContent=PLACES[from][0];$('from2').value=from;
  if(!G){box.innerHTML='<div class="skel">Calcul des ombres sur le relief LiDAR…</div>';await READY;}
  t5List=topSpots();box.replaceChildren();
  if(!t5List.length){box.innerHTML='<div class="empty"><b>Aucune terrasse ensoleillée</b><span>Élargis la distance ou réduis les minutes de soleil.</span></div>';return;}
  let late=false;
  if(GKEY){const ens=mediaEnsure(t5List.map(r=>r.p));const t=await Promise.race([ens.then(()=>'ok'),new Promise(res=>setTimeout(()=>res('late'),1600))]);
    if(t==='late')ens.then(ch=>{if(ch&&$('top5').classList.contains('on'))renderTop5();});}
  t5List.forEach((r,i)=>box.appendChild(spotCard(r,i)));box.scrollTop=0;
}
function showTop5(){go('top5');renderTop5();}
PLACES.forEach((pl,i)=>{const o=document.createElement('option');o.value=i;o.textContent=pl[0];$('from2').appendChild(o);});
$('from2').onchange=async e=>{from=+e.target.value;$('from').value=from;save();try{await needArea();}catch(x){}renderTop5();};
$('t5back').onclick=()=>showAsk();
$('t5map').onclick=()=>{if(t5List.length)openMapOn(t5List[0].p);else openMapOn(null);};
$('back').onclick=()=>{stopPlay();top5Mode=false;showAsk();};
function openMapOn(p){
  stopPlay();go(null);dist=Math.max(150,walkMin*WALK);save();layout();sel=p||null;filter();
  if(p&&!RES.some(r=>r.p===p))sel=null;
  render(true,true);
  if(sel)select(sel);else goOverview(500);
}

// ---- contrôles
PLACES.forEach((pl,i)=>{const o=document.createElement('option');o.value=i;o.textContent=pl[0];$('from').appendChild(o);});
$('from').value=from;
function refit(){setTimeout(()=>{try{layout();if(sel&&route&&!scrubbing)fitRoute(300);}catch(e){}},750);}
function selFirst(){try{render(true,true);if(RES.length){select(RES[0].p,{scroll:false});refit();if(CARDS.get(RES[0].p.i))centerCard(RES[0].p,false);}else goOverview(500);}catch(e){goOverview(500);}}
$("from").onchange=e=>{from=+e.target.value;$("from2").value=from;save();sel=null;goOverview(650);schedule(false);needArea().then(()=>{selFirst();}).catch(()=>{});};
$('rad').onclick=()=>{top5Mode=false;dist=RADII.find(r=>r>dist)||RADII[0];save();goOverview(550);schedule(false);needArea().then(c=>{if(c)schedule(true);}).catch(()=>{});};
$('seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;top5Mode=false;cat=b.dataset.c;save();schedule(false);});
$('fSun').onclick=()=>{fSun=!fSun;showShade=!fSun;save();schedule(false);};
$('fShade').onclick=()=>{showShade=!showShade;fSun=!showShade;trayMode='';schedule(false);};
(()=>{const gb=$('grab');let y0=null,h0=0,mv=0,t0=0;
  gb.addEventListener('pointerdown',e=>{y0=e.clientY;mv=0;t0=Date.now();if(!NAT)NAT=natH();h0=curH||$('panel').offsetHeight;try{gb.setPointerCapture(e.pointerId);}catch(_){}});
  gb.addEventListener('pointermove',e=>{if(y0==null)return;const dy=e.clientY-y0;mv=Math.max(mv,Math.abs(dy));if(mv>6)setH(h0-dy,false);});
  const end=e=>{if(y0==null)return;const dy=e.clientY-y0;y0=null;
    if(mv<=6){setH(curH&&curH<84?NAT:(curH>NAT+36?NAT:40),true);return;} // simple tap : replie / déplie
    if(curH<84+20&&curH<NAT/2)setH(40,true);else if(Math.abs(curH-NAT)<28)setH(NAT,true);};
  gb.addEventListener('pointerup',end);gb.addEventListener('pointercancel',end);})();
$('zin').onclick=()=>zoomBy(1.4);$('zout').onclick=()=>zoomBy(1/1.4);
$('date').onchange=e=>{const v=e.target.value.split('-').map(Number);
  if(v.length===3&&v[0]){stopPlay();[dYear,dMonth,dDay]=[v[0],v[1]-1,v[2]];computeArc();if(G)computeDay();schedule(true);}};
document.querySelector('.datebtn').addEventListener('click',()=>{try{$('date').showPicker();}catch(e){}});
$('now').onclick=()=>{stopPlay();const n=new Date();[dYear,dMonth,dDay]=[n.getFullYear(),n.getMonth(),n.getDate()];
  selMin=clamp(Math.round((n.getHours()*60+n.getMinutes())/5)*5,M0,M1);computeArc();if(G)computeDay();schedule(true);};
let hidAt=0;document.addEventListener('visibilitychange',()=>{if(document.hidden){hidAt=Date.now();return;}if(typeof DEF_MIN!=='number'&&hidAt&&Date.now()-hidAt>120000&&!scrubbing){try{$('now').onclick();}catch(e){}}hidAt=0;});

// ---- thème
function themeChanged(){readTokens();for(const t of TILES.values())t.c=null;drawDial();if(G){schedule(true);if(lbP)drawLB();}}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',themeChanged);
new MutationObserver(themeChanged).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
let rz=0;
new ResizeObserver(()=>{clearTimeout(rz);rz=setTimeout(()=>{layout();placeInd();drawDial();if(G){drawMap();requestShadow(false);}if(lbP)drawLB();},80);}).observe($('app'));
new ResizeObserver(()=>{layout();if(G)drawMap();}).observe($('panel'));

// ---- démarrage
$('play').innerHTML=ICON_PLAY;
layout();updateChrome();drawDial();renderCards();
setTimeout(async()=>{try{
  await needArea();G={ready:true};
  layout();const [fx,fy]=PLACES[from].slice(1);scale=fitScale();[cxw,cyw]=focus(fx,fy,scale);
  filter();render(true,false);readyRes();locate(true);
}catch(e){$('tray').innerHTML='<div class="empty"><b>Le relief n’a pas pu être chargé</b><span></span></div>';$('tray').querySelector('span').textContent=e.message;readyRes();}},250);

// ---- Autour de moi (géolocalisation)
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),4200);}
let MYIDX=-1;
let locP=null,locWarned=false;
function locate(auto){return locP=new Promise(done=>locateRun(auto,done));}
async function locateRun(auto,done){
  if(auto&&typeof DEF_MIN==='number'){done(false);return;} // défaut provisoire : pas de géoloc automatique
  if(!navigator.geolocation){if(!auto)toast('La localisation n’est pas disponible sur cet appareil.');done(false);return;}
  const btn=$('loc');btn.classList.add('busy');await READY;
  navigator.geolocation.getCurrentPosition(async pos=>{
    btn.classList.remove('busy');
    const x=(pos.coords.longitude-LON)*KX,y=(pos.coords.latitude-LAT)*KY;
    const inside=tilesFor(x,y,250).length>0;
    if(!inside){if(!auto||!locWarned){locWarned=true;toast('Vous êtes hors de la zone couverte (commune d’Antibes) : on part de la place Nationale.');}done(false);return;}
    if(MYIDX<0){MYIDX=PLACES.length;PLACES.push(['Ma position',x,y]);
      for(const id of ['from','from2']){const o=document.createElement('option');o.value=MYIDX;o.textContent='Ma position';$(id).appendChild(o);}}
    else PLACES[MYIDX]=['Ma position',x,y];
    from=MYIDX;$('from').value=from;$('from2').value=from;sel=null;
    try{await needArea();}catch(e){console.warn(e);}
    done(true);
    if($('top5').classList.contains('on'))renderTop5();
    else if(top5Mode&&!SCRS.some(x=>$(x).classList.contains('on')))openTop5Map(true);
    else{goOverview(500);schedule(false);selFirst();}
  },err=>{
    btn.classList.remove('busy');done(false);
    if(auto&&locWarned)return;locWarned=true;toast(err.code===1?'Localisation refusée. Autorisez-la dans Réglages > Confidentialité > Service de localisation.':'Position introuvable pour le moment. Réessayez dehors ou choisissez un point dans la liste.');
  },{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
}
$('loc').addEventListener('click',()=>locate(false));

// ---- fenêtre « distance à pied »
function walkTxt(m){const d=m*WALK;return '≈ '+(d<1000?d+' m':(d/1000).toFixed(1).replace('.',',')+' km');}
function paintWalk(){const r=$('walkRange');r.value=walkMin;r.style.setProperty('--p',((walkMin-3)/17*100)+'%');
  $('walkMin').textContent=walkMin;
  const sr=$('sunRange');if(sr){sr.value=sunNeed;sr.style.setProperty('--p',((sunNeed-15)/105*100)+'%');$('sunV').textContent=sunNeed;
  $('sunner').style.left='calc(17px + (100% - 34px) * '+((sunNeed-15)/105)+')';}
  $('walker').style.left='calc(17px + (100% - 34px) * '+((walkMin-3)/17)+')';}
function openWalk(){$('walkWhat').textContent=cat==='boire'?'Pour boire un verre':'Pour manger dehors';paintWalk();
  const w=$('walk');w.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>w.classList.add('on')));}
function closeWalk(){const w=$('walk');w.classList.remove('on');setTimeout(()=>{if(!w.classList.contains('on'))w.hidden=true;},420);}
let walkT=0,sunT=0;$('walkRange').addEventListener('input',e=>{const v=+e.target.value,wk=$('walker');wk.classList.toggle('back',v<walkMin);walkMin=v;paintWalk();
  wk.classList.add('go');clearTimeout(walkT);walkT=setTimeout(()=>wk.classList.remove('go'),420);});
if($('sunRange'))$('sunRange').addEventListener('input',e=>{sunNeed=+e.target.value;paintWalk();const sn=$('sunner');sn.classList.add('go');clearTimeout(sunT);sunT=setTimeout(()=>sn.classList.remove('go'),500);});
function resetNow(){const n=new Date(),key=''+dYear+dMonth+dDay;let night=false;
  dYear=n.getFullYear();dMonth=n.getMonth();dDay=n.getDate();selMin=Math.round((n.getHours()*60+n.getMinutes())/5)*5;
  if(!sunAt(selMin)){night=true;if(selMin>720){const t=new Date(dYear,dMonth,dDay+1);dYear=t.getFullYear();dMonth=t.getMonth();dDay=t.getDate();}selMin=750;}
  if(typeof DEF_MIN==='number'){selMin=DEF_MIN;night=false;}
  selMin=clamp(selMin,M0,M1);computeArc();if(G&&(key!==''+dYear+dMonth+dDay||!SVS))computeDay();return night;}

const THQ=new Set();
function thumbsFor(){if(!GKEY||!RES.length)return;const ps=RES.slice(0,30).map(r=>r.p).filter(p=>!THQ.has(p.i));if(!ps.length)return;ps.forEach(p=>THQ.add(p.i));
  mediaEnsure(ps).then(()=>{for(const p of ps){const el=CARDS.get(p.i);if(!el)continue;const th=el.querySelector('.th'),im=th&&th.querySelector('img'),u=photoOf(p);if(im&&u&&im.getAttribute('src')!==u){th.classList.add('has-photo');im.src=u;}}
    if(top5Mode&&$('top5').classList.contains('on')){renderTop5();}});}
function openTop5Map(keep){
  stopPlay();top5Mode=true;dist=walkMin*WALK;save();go(null);layout();sel=null;route=null;filter();render(true,true);
  if(RES.length){try{select(RES[0].p,{scroll:false});refit();}catch(e){goOverview(keep?400:0);}}else goOverview(keep?400:0);
  if(!RES.length)toast('Aucune terrasse ensoleillée dans ce rayon : élargis la distance ou réduis les minutes de soleil.');
  thumbsFor();}
$('walkGo').onclick=async()=>{save();closeWalk();await READY;let night=false;
  try{night=resetNow();}catch(e){console.warn(e);}
  try{if(MYIDX<0&&locP)await Promise.race([locP,new Promise(r=>setTimeout(r,2500))]);}catch(e){}
  try{await Promise.race([needArea(),new Promise(r=>setTimeout(r,12000))]);}catch(e){console.warn(e);}
  openTop5Map();if(night)toast('Le soleil est couché : on te montre demain à 12 h 30.');};
$('walkX').onclick=closeWalk;$('walkScrim').onclick=closeWalk;
$('walkChip').onclick=openWalk;
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('walk').hidden)closeWalk();});

// ---- vraies photos des établissements (photos.json, produit par build_photos.py)
var PHOTOS={};
const visOf=p=>'visuels/v'+((BOIRE.has(p.k)?0:8)+(p.i*5+p.n.length)%8)+'.jpg';

// ---- galerie photos du lieu (Google Maps)
const GPL={};let galP=null,GPERR='';
const gpNear=(pl,p)=>pl.location&&Math.hypot((pl.location.longitude-(LON+p.x/KX))*KX,(pl.location.latitude-(LAT+p.y/KY))*KY)<45;
async function gpPhotos(p){if(GPL[p.i])return GPL[p.i];if(!GKEY)return GPL[p.i]=[];
  try{const r=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':GKEY,'X-Goog-FieldMask':'places.displayName,places.photos,places.location'},
      body:JSON.stringify({textQuery:p.n+' Antibes',maxResultCount:1,languageCode:'fr',locationBias:{circle:{center:{latitude:LAT+p.y/KY,longitude:LON+p.x/KX},radius:70}}})});
    if(!r.ok){let m='';try{m=((await r.json()).error||{}).message||'';}catch(_){}diag('gp','GP '+r.status);GPERR='Google Places : erreur '+r.status+(m?' – '+m.slice(0,90):'');return[];}
    const j=await r.json(),pl=(j.places||[])[0];
    if(!pl){diag('gp','GP aucun lieu');GPERR='Aucun lieu trouvé sur Google Maps';return GPL[p.i]=[];}
    if(!(gpSame(pl.displayName&&pl.displayName.text,p.n)||gpNear(pl,p))){diag('gp','GP nom ≠ '+((pl.displayName&&pl.displayName.text)||'?').slice(0,18));return GPL[p.i]=[];}
    diag('gp','GP '+((pl.photos||[]).length)+' photos');
    return GPL[p.i]=(pl.photos||[]).slice(0,10).map(ph=>({u:'https://places.googleapis.com/v1/'+ph.name+'/media?maxWidthPx=900&key='+GKEY,a:(ph.authorAttributions&&ph.authorAttributions[0]&&ph.authorAttributions[0].displayName)||''}));
  }catch(e){diag('gp','GP réseau');GPERR='Connexion à Google impossible ('+(e&&e.message||e)+')';return[];}}
async function openGal(p){try{return await openGal0(p);}catch(e){toast('Galerie : '+(e&&e.message||e));}}
async function openGal0(p){galP=p;const g=$('gal'),sl=$('galsl');g.hidden=false;sl.replaceChildren();sl.scrollLeft=0;
  {const gn=$('galn'),w=p.n.split(' ');gn.textContent='';if(w.length<2)gn.textContent=p.n;else{let bi=1,bd=1e9;for(let i=1;i<w.length;i++){const d=Math.abs(w.slice(0,i).join(' ').length-w.slice(i).join(' ').length);if(d<bd){bd=d;bi=i;}}gn.append(w.slice(0,bi).join(' '),document.createElement('br'),w.slice(bi).join(' '));}}const st=stateAt(p,selMin),[,txt]=pill(p,st);
  let wm=0;try{const [,fx,fy]=PLACES[from];wm=Math.max(1,Math.round(Math.hypot(p.sx-fx,p.sy-fy)*1.25/WALK));}catch(e){}
  $('galk').textContent=(KIND[p.k]||p.k)+(wm?' · '+wm+' min à pied':'');
  {const m=/^(.*?)(\d{1,2}(?:\s?h\s?|:)\d{2})$/.exec(txt),uv=$('galuv');$('galul').textContent=m?m[1].trim().replace(/[’']$/,'’').replace(/jusqu’à$/,'Soleil jusqu’à').replace(/^Soleil Soleil/,'Soleil'):'';uv.textContent='';if(m){const hh=/(\d{1,2})(?:\s?h\s?|:)(\d{2})/.exec(m[2]);uv.append(hh[1]+' h',document.createElement('br'),hh[2]);}else uv.textContent=txt;uv.classList.toggle('sm',!m);
   if(m&&!/^Soleil/.test($('galul').textContent))$('galul').textContent=m[1].trim();
   const bar=$('galbar');bar.replaceChildren();try{if(!p.day)dayFor(p);let k=0;while(k<NM){if(p.day[k]===2){let j=k;while(j<NM&&p.day[j]===2)j++;const e=document.createElement('i');e.style.left=(k/NM*100)+'%';e.style.width=((j-k)/NM*100)+'%';bar.appendChild(e);k=j;}else k++;}
   const u=document.createElement('u');u.style.left=(Math.max(0,Math.min(1,(selMin-M0)/(M1-M0)))*100)+'%';bar.appendChild(u);}catch(e){}}
  $('galgo').href=nav(p);$('galsv').href=sv(p);$('galcount').textContent='';$('galcr').textContent='';
  const slides=[];
  const svu=(svOk(p)&&SV[p.i].u)||null;if(svu)slides.push({u:svu,a:'',sv:1});
  const add=l=>{for(const x of l)if(!slides.some(s=>s.u===x.u))slides.push(x);};
  if(GP[p.i]&&GP[p.i].u)add([{u:GP[p.i].u,a:GP[p.i].a}]);
  const draw=()=>{const list=slides.length?slides.filter(s=>!s.sv).concat(slides.filter(s=>s.sv)):[{u:PHOTOS[p.i]||visOf(p),a:'',fb:1}];
    sl.replaceChildren();list.forEach((s,i)=>{const f=document.createElement('figure');const im=new Image();im.alt=p.n;im.decoding='async';im.src=s.u;
      im.onerror=()=>{f.remove();upd();};f.appendChild(im);f.dataset.a=s.sv?'Street View · Google':s.fb?'':('Photo © '+(s.a||'contributeur')+' · Google');sl.appendChild(f);});upd();};
  const upd=()=>{const fs=[...sl.children],w=sl.clientWidth||1,i=Math.min(fs.length-1,Math.round(sl.scrollLeft/w));
    $('galcount').textContent=fs.length>1?(i+1)+' / '+fs.length:'';{const d=$('galdots');if(d.children.length!==fs.length){d.replaceChildren();fs.forEach(()=>d.appendChild(document.createElement('i')));}[...d.children].forEach((e,n)=>e.classList.toggle('on',n===i));}$('galprev').classList.toggle('off',fs.length<2||i<=0);$('galnext').classList.toggle('off',fs.length<2||i>=fs.length-1);$('galcr').textContent=(fs[i]&&fs[i].dataset.a)||'';};
  sl.onscroll=upd;draw();$('galprev').onclick=()=>sl.scrollBy({left:-sl.clientWidth,behavior:'smooth'});$('galnext').onclick=()=>sl.scrollBy({left:sl.clientWidth,behavior:'smooth'});
  if(GKEY&&!svOk(p))svFetch(p).then(()=>{if(galP===p&&svOk(p)&&SV[p.i].u){add([]);slides.unshift({u:SV[p.i].u,a:'',sv:1});draw();}});
  GPERR='';const more=await gpPhotos(p);if(galP!==p)return;if(more.length){add(more);draw();}else{const g=[...sl.children].some(f=>/googleapis/.test(f.querySelector('img')&&f.querySelector('img').src||''));if(!g)$('galcr').textContent=GPERR||(GKEY?'Pas de photo Google pour ce lieu':'Clé Google absente');}}
function closeGal(){$('gal').hidden=true;galP=null;}
$('galx').onclick=closeGal;
addEventListener('keydown',e=>{if(e.key==='Escape'&&galP)closeGal();});

// ---- photos Google Places (clé dans config.js)
const APPV='v62',DG={};function diag(k,v){DG[k]=v;const e=document.querySelector('.ver');if(e)e.textContent=APPV+(DG.sv?' · '+DG.sv:'')+(DG.gp?' · '+DG.gp:'');}
const GKEY=(window.GOOGLE_KEY||'').trim();let GP={},gpOff=!GKEY;const gpBusy=new Set(),GP_TTL=7*864e5;
try{GP=JSON.parse(localStorage.getItem('gp-v2')||'{}');}catch(e){}
const gpOk=p=>{const g=GP[p.i];return g&&Date.now()-g.t<(g.u?GP_TTL:864e5);};
let SV={},svOff=!GKEY;const svBusy=new Set(),SV_TTL=30*864e5;try{SV=JSON.parse(localStorage.getItem('sv-v2')||'{}');}catch(e){}
const svOk=p=>SV[p.i]&&Date.now()-SV[p.i].t<(SV[p.i].u?SV_TTL:864e5);
async function svFetch(p){if(svOff||svOk(p)||svBusy.has(p.i))return false;svBusy.add(p.i);
  const lat=LAT+p.y/KY,lon=LON+p.x/KX,base='https://maps.googleapis.com/maps/api/streetview',key='&key='+GKEY;
  try{let u=null;
    try{const r=await fetch(base+'/metadata?location='+lat+','+lon+'&radius=60&source=outdoor'+key);
      if(r.status===403||r.status===401){svOff=true;diag('sv','SV '+r.status);return false;}
      const j=await r.json();
      if(j.status==='OK'){const dx=(lon-j.location.lng)*KX,dy=(lat-j.location.lat)*KY,h=Math.round((Math.atan2(dx,dy)*180/Math.PI+360)%360);
        u=base+'?size=480x360&pano='+encodeURIComponent(j.pano_id)+'&heading='+h+'&fov=75&pitch=6&source=outdoor&return_error_code=true'+key;}
      else if(j.status==='REQUEST_DENIED'){svOff=true;diag('sv','SV refusé');return false;}
    }catch(e){ u=base+'?size=480x360&location='+lat+','+lon+'&fov=85&pitch=6&source=outdoor&return_error_code=true'+key; }
    if(u)diag('sv','SV ok');
    SV[p.i]=u?{t:Date.now(),u}:{t:Date.now()};
    try{localStorage.setItem('sv-v2',JSON.stringify(SV));}catch(e){}
    return !!u;
  }finally{svBusy.delete(p.i);}}
async function mediaEnsure(ps){if(!GKEY)return false;const a=await gpEnsure(ps);const left=ps.filter(p=>!(GP[p.i]&&GP[p.i].u));const b=await Promise.all(left.map(svFetch));return a||b.some(Boolean);}
const photoOf=p=>(GP[p.i]&&GP[p.i].u&&Date.now()-GP[p.i].t<GP_TTL?GP[p.i].u:null)||(svOk(p)&&SV[p.i].u)||PHOTOS[p.i]||visOf(p);
const gpNorm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
function gpSame(a,b){a=gpNorm(a).trim();b=gpNorm(b).trim();if(!a||!b)return false;if(a.includes(b)||b.includes(a))return true;
  const ta=a.split(/ +/).filter(t=>t.length>3),tb=b.split(/ +/).filter(t=>t.length>3);return ta.some(t=>tb.includes(t));}
async function gpFetch(p){if(gpOff||gpOk(p)||gpBusy.has(p.i))return false;gpBusy.add(p.i);
  try{const r=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':GKEY,'X-Goog-FieldMask':'places.displayName,places.photos,places.location'},
      body:JSON.stringify({textQuery:p.n+' Antibes',maxResultCount:1,languageCode:'fr',locationBias:{circle:{center:{latitude:LAT+p.y/KY,longitude:LON+p.x/KX},radius:70}}})});
    if(!r.ok){if(r.status===400||r.status===401||r.status===403)gpOff=true;diag('gp','GP '+r.status);return false;}
    const j=await r.json(),pl=(j.places||[])[0],ph=pl&&pl.photos&&pl.photos[0];
    if(ph&&(gpSame(pl.displayName&&pl.displayName.text,p.n)||gpNear(pl,p)))GP[p.i]={t:Date.now(),u:'https://places.googleapis.com/v1/'+ph.name+'/media?maxWidthPx=800&key='+GKEY,
        a:(ph.authorAttributions&&ph.authorAttributions[0]&&ph.authorAttributions[0].displayName)||''};
    else GP[p.i]={t:Date.now()};
    try{localStorage.setItem('gp-v2',JSON.stringify(GP));}catch(e){}
    if(GP[p.i].u)diag('gp','GP ok');
    return !!GP[p.i].u;
  }catch(e){diag('gp','GP réseau');return false;}finally{gpBusy.delete(p.i);}}
async function gpEnsure(ps){const rs=await Promise.all(ps.map(gpFetch));return rs.some(Boolean);}
setTimeout(()=>{try{if(!GKEY){diag('gp','clé Google absente');return;}const q=(PD&&P&&P[0])||null;if(q){delete GP[q.i];delete SV[q.i];gpFetch(q);svFetch(q);}else diag('gp','aucun lieu');}catch(e){diag('gp','err '+(e&&e.message));}},3500);
fetch('photos.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).then(j=>{
  PHOTOS=j||{};if(!Object.keys(PHOTOS).length)return;
  CARDS.clear();trayMode='';
  if($('top5').classList.contains('on')&&G)renderTop5();else if(G)schedule(false);
}).catch(()=>{});

// ---- langue : FR / EN (traduction du DOM ; les noms de lieux restent tels quels)
document.documentElement.lang=LANG;
document.querySelectorAll('.langbtn').forEach(b=>{b.textContent=LANG==='en'?'FR':'EN';b.setAttribute('aria-label',LANG==='en'?'Passer en français':'Switch to English');
  b.onclick=()=>{try{localStorage.setItem('solio-lang',LANG==='en'?'fr':'en');}catch(e){}location.reload();};});
if(LANG==='en'){(()=>{
  const EX={'Autour de':'Around','terrasses, au soleil seulement':'sunny terraces only','Tout':'All','Boire':'Drink','Manger':'Eat','Terrasses à l’ombre':'Shaded terraces','Maintenant':'Now','h':':',
   'Localisateur de terrasses ensoleillées autour de toi':'Find sunny terraces around you','Un coin de':'A touch of','soleil':'sunshine','pour…':'for…','C’est parti':'Let’s go','un verre':'a drink','Bars, cafés, pubs':'Bars, cafés, pubs','Miam':'Yum','dehors':'outside','Restaurants, glaciers, snacks':'Restaurants, ice cream, snacks',
   'Voir sur la carte':'View on map','Jusqu’où veux-tu marcher ?':'How far do you want to walk?','min à pied':'min walk','Combien de min de soleil restantes au minimum ?':'At least how many minutes of sun left?','min de soleil':'min of sun','Voir les terrasses ensoleillées':'See sunny terraces',
   'Retour':'Back','Y aller':'Directions','Y aller ↗':'Directions ↗','Plan et ombres':'Map & shadows','Photo aérienne':'Aerial photo','Fermer':'Close',
   'Carte des ombres':'Shadow map','Retour aux meilleurs spots':'Back to top spots','Point de départ':'Starting point','Seulement les terrasses au soleil':'Only sunny terraces','Zoom avant':'Zoom in','Zoom arrière':'Zoom out','Afficher la liste':'Show list','Boire ou manger':'Drink or eat','Afficher aussi les terrasses à l’ombre':'Also show shaded terraces','Changer le rayon':'Change radius','Lire la journée':'Play the day','Heure':'Time','Changer : boire ou manger':'Switch: drink or eat','Autour de moi':'Around me','Minutes de marche maximum':'Maximum walking minutes','Minutes de soleil restantes minimum':'Minimum minutes of sun left','Photos du lieu':'Place photos','Photo précédente':'Previous photo','Photo suivante':'Next photo','Vue agrandie':'Enlarged view',
   'Soleil jusqu’à':'Sun until','Ombre · soleil à':'Shade · sun at','Nuit':'Night','Ma position':'My location',
   'Aucune terrasse au soleil à cette heure':'No sunny terrace at this time','Aucune terrasse dans ce rayon':'No terrace in this radius','. Déplacez le curseur de l’heure pour voir passer le soleil.':'. Move the time slider to follow the sun.','Élargir le rayon':'Widen radius','Pas de soleil ce jour-là':'No sun that day','Aucune terrasse ensoleillée':'No sunny terrace','Élargis la distance ou réduis les minutes de soleil.':'Widen the distance or reduce the minutes of sun.','Le relief n’a pas pu être chargé':'The terrain could not be loaded',
   'La localisation n’est pas disponible sur cet appareil.':'Location is not available on this device.','Vous êtes hors de la zone couverte (commune d’Antibes) : on part de la place Nationale.':'You are outside the covered area (Antibes): starting from Place Nationale.','Localisation refusée. Autorisez-la dans Réglages > Confidentialité > Service de localisation.':'Location denied. Allow it in Settings > Privacy > Location Services.','Position introuvable pour le moment. Réessayez dehors ou choisissez un point dans la liste.':'Position not found right now. Try again outside or pick a point in the list.',
   'Aucune terrasse ensoleillée dans ce rayon : élargis la distance ou réduis les minutes de soleil.':'No sunny terrace in this radius: widen the distance or reduce the minutes of sun.','Le soleil est couché : on te montre demain à 12 h 30.':'The sun has set: showing you tomorrow at 12:30.',
   'Bois un verre en terrasse':'Have a drink on a terrace','Mange en terrasse':'Eat on a terrace','au soleil':'in the sun','ici :':'here:',
   'Pour boire un verre':'To grab a drink','Pour manger dehors':'To eat outside','Aucun lieu trouvé sur Google Maps':'No place found on Google Maps','Pas de photo Google pour ce lieu':'No Google photo for this place','Clé Google absente':'Google key missing'};
  const FR=[[/Soleil jusqu’au soir/g,'Sun until evening'],[/Soleil jusqu’à/g,'Sun until'],[/Ombre jusqu’au coucher/g,'Shade until sunset'],[/Ombre · soleil à/g,'Shade · sun at'],[/ombres à/g,'shade at'],[/ min à pied/g,' min walk'],[/· terrasse \?/g,'· terrace ?'],[/· terrasse/g,'· terrace'],
    [/^Glacier(?= ·|$)/,'Ice cream'],[/Restauration rapide/g,'Fast food'],[/Lever (\d+) h (\d\d) · coucher/g,'Sunrise $1:$2 · sunset'],[/^(\d+) h$/,'$1:00'],[/(\d+) h (\d\d)/g,'$1:$2'],[/(\d),(\d) km/g,'$1.$2 km'],[/^Agrandir la vue aérienne de /,'Enlarge aerial view of '],[/contributeur/g,'contributor']];
  const tr=(s,node)=>{const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s),core=m[2].replace(/\u00a0/g,' ');if(!core)return s;let r=EX[core];
    if(node&&node.parentElement&&node.parentElement.closest&&node.parentElement.closest('.tile')){if(core==='Boire')r='Grab';else if(core==='Manger')r='Eat';}
    if(r==null){r=core;for(const [re,t] of FR)r=r.replace(re,t);}return m[1]+r+m[3];};
  const doText=n=>{if(n.parentElement&&n.parentElement.closest&&n.parentElement.closest('#galuv,.csun b'))return;const v=n.nodeValue,r=tr(v,n);if(r!==v)n.nodeValue=r;};
  const doAttr=e=>{for(const a of ['aria-label','title']){const v=e.getAttribute&&e.getAttribute(a);if(v){const r=tr(v);if(r!==v)e.setAttribute(a,r);}}};
  const walk=root=>{if(root.nodeType===3){if(!/^(SCRIPT|STYLE)$/.test((root.parentNode||{}).nodeName))doText(root);return;}if(root.nodeType!==1||/^(SCRIPT|STYLE|CANVAS)$/.test(root.nodeName))return;
    doAttr(root);const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.nodeType===3){if(!/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName))doText(n);}else doAttr(n);}};
  walk(document.body);
  new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList')m.addedNodes.forEach(walk);else if(m.type==='characterData')doText(m.target);else if(m.type==='attributes')doAttr(m.target);}})
    .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','title']});
})();}
