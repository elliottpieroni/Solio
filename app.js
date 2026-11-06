const $=id=>document.getElementById(id);
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const R2D=180/Math.PI,D2R=Math.PI/180,LAT=43.581,LON=7.124,KX=111320*Math.cos(LAT*D2R),KY=110574;
const KIND={restaurant:'Restaurant',cafe:'Café',bar:'Bar',pub:'Pub',fast_food:'Restauration rapide',ice_cream:'Glacier'};
const BOIRE=new Set(['bar','pub','cafe']);
const PLACES=[['Place Nationale',136,27],['Marché provençal',288,-8],['Musée Picasso',343,-32],['Plage de la Gravette',401,190],['Port Vauban',376,640],['Place de Gaulle',-281,-48],['Place de la Poste',-105,70]];
const P=PD.map(([n,k,x,y,o],i)=>({i,n,k,x,y,o}));
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
let G=null;
async function unpack(b64,w,h){
  const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  const buf=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const d=new Int16Array(buf),o=new Float32Array(w*h);
  for(let r=0;r<h;r++){let a=0;for(let c=0;c<w;c++){a+=d[r*w+c];o[r*w+c]=a/10-10;}}return o;
}
function hS(x,y){const c=(x-G.x0)|0,r=(G.y1-y)|0;if(c<0||r<0||c>=G.w||r>=G.h)return -1e9;return G.S[r*G.w+c];}
function hT(x,y){const c=Math.min(G.w-1,Math.max(0,(x-G.x0)|0)),r=Math.min(G.h-1,Math.max(0,(G.y1-y)|0));return G.T[r*G.w+c];}
function blocked(px,py,z0,dx,dy,te){const dmax=Math.min(450,(G.max-z0)/te);
  for(let d=1.5;d<dmax;d+=.7){const h=hS(px+dx*d,py+dy*d);if(h===-1e9)return false;if(h>z0+d*te)return true;}return false;}
function openSky(x,y){let best=null,bd=1e9;
  for(let dy=-15;dy<=15;dy++)for(let dx=-15;dx<=15;dx++){const d=dx*dx+dy*dy;if(d>225||d>=bd)continue;const X=x+dx,Y=y+dy;
    if(hS(X,Y)-hT(X,Y)<.6&&hS(X+1,Y)-hT(X+1,Y)<1&&hS(X-1,Y)-hT(X-1,Y)<1&&hS(X,Y+1)-hT(X,Y+1)<1&&hS(X,Y-1)-hT(X,Y-1)<1){bd=d;best=[X,Y];}}
  return best||[x,y];}


// ---- état
const M0=420,M1=1380,STEP=10,NM=(M1-M0)/STEP;
const RADII=[200,400,700,1000,1500],WALK=80; // 80 m par minute de marche
const now=new Date();
let dYear=now.getFullYear(),dMonth=now.getMonth(),dDay=now.getDate();
let selMin=Math.round((now.getHours()*60+now.getMinutes())/5)*5;
let cat='all',fSun=true,fTer=false,walkMin=10,dist=400,from=0,sel=null,scrubbing=false,listOpen=false;
try{const s=JSON.parse(localStorage.getItem('terr-v2')||'{}');
  if(s.dist>=100&&s.dist<=2000)dist=s.dist;if(s.walkMin>=3&&s.walkMin<=20)walkMin=s.walkMin;if(s.from!=null&&PLACES[s.from])from=s.from;
  if(['all','boire','manger'].includes(s.cat))cat=s.cat;if(s.fSun!=null)fSun=!!s.fSun;}catch(e){}
function save(){try{localStorage.setItem('terr-v2',JSON.stringify({dist,from,cat,fSun,walkMin}))}catch(e){}}

function sunAt(m){const s=sun(toUTC(dYear,dMonth,dDay,m));return s.el>.5*D2R?{dx:Math.sin(s.az),dy:Math.cos(s.az),te:Math.tan(s.el)}:null;}
function elAt(m){return sun(toUTC(dYear,dMonth,dDay,m)).el;}
function computeDay(){
  const svs=[];for(let k=0;k<NM;k++)svs.push(sunAt(M0+k*STEP));
  for(const p of P){const z=hT(p.sx,p.sy)+1.2,a=new Uint8Array(NM);
    for(let k=0;k<NM;k++){const s=svs[k];a[k]=!s?0:blocked(p.sx,p.sy,z,s.dx,s.dy,s.te)?1:2;}p.day=a;}
}
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
// ouverture : si le soleil est déjà couché, on propose demain midi
if(!sunAt(selMin)){if(selMin>720){const t=new Date(dYear,dMonth,dDay+1);dYear=t.getFullYear();dMonth=t.getMonth();dDay=t.getDate();}selMin=750;}
selMin=Math.max(M0,Math.min(M1,selMin));
computeArc();

// --- plan : bâtiments et voies IGN BD TOPO, mer et végétation tirées du LiDAR
const ROADS=PLAN.r.map(([w,k,n,c])=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let i=0;i<c.length;i+=2){x0=Math.min(x0,c[i]);x1=Math.max(x1,c[i]);y0=Math.min(y0,c[i+1]);y1=Math.max(y1,c[i+1]);}return{w,k,n,c,x0,x1,y0,y1};});
const BLDG=PLAN.b.map(c=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let i=0;i<c.length;i+=2){x0=Math.min(x0,c[i]);x1=Math.max(x1,c[i]);y0=Math.min(y0,c[i+1]);y1=Math.max(y1,c[i+1]);}return{c,x0,x1,y0,y1};});
const LBL=(()=>{const best={};for(const r of ROADS){if(r.n<0||r.k)continue;const c=r.c;for(let i=0;i+3<c.length;i+=2){const L=Math.hypot(c[i+2]-c[i],c[i+3]-c[i+1]);if(!best[r.n]||L>best[r.n].L)best[r.n]={L,x:(c[i]+c[i+2])/2,y:(c[i+1]+c[i+3])/2,a:Math.atan2(-(c[i+3]-c[i+1]),c[i+2]-c[i])};}}
  return Object.entries(best).map(([n,v])=>{let a=v.a;if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;return{t:PLAN.n[n],x:v.x,y:v.y,a,L:v.L};});})();
let PLANR=null;
function rgb(c){const t=document.createElement('canvas').getContext('2d');t.fillStyle=c;t.fillRect(0,0,1,1);return t.getImageData(0,0,1,1).data;}
function buildPlanRaster(){const w=G.w,h=G.h,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.fillStyle='#000';g.strokeStyle='#000';g.lineWidth=3;for(const b of BLDG){g.beginPath();for(let i=0;i<b.c.length;i+=2){const x=b.c[i]-G.x0,y=G.y1-b.c[i+1];i?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();g.fill();g.stroke();}
  const bm=g.getImageData(0,0,w,h).data,im=g.createImageData(w,h),d=im.data,sea=rgb(css('--sea')),park=rgb(css('--park'));
  for(let i=0;i<w*h;i++){const o=i*4;let col=null;if(G.T[i]<.3&&G.S[i]<.6)col=sea;else if(G.S[i]-G.T[i]>2&&bm[o+3]<10)col=park;if(col){d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=255;}}
  g.clearRect(0,0,w,h);g.putImageData(im,0,0);PLANR=c;}
function drawPlan(g,w,h,ccx,ccy,sc){
  const X=x=>w/2+(x-ccx)*sc,Y=y=>h/2-(y-ccy)*sc,vx0=ccx-w/2/sc-20,vx1=ccx+w/2/sc+20,vy0=ccy-h/2/sc-20,vy1=ccy+h/2/sc+20;
  g.fillStyle=css('--land');g.fillRect(0,0,w,h);
  if(PLANR){g.imageSmoothingEnabled=sc<2;g.drawImage(PLANR,X(G.x0),Y(G.y1),G.w*sc,G.h*sc);g.imageSmoothingEnabled=true;}
  const vis=ROADS.filter(r=>r.x1>vx0&&r.x0<vx1&&r.y1>vy0&&r.y0<vy1);
  g.lineCap='round';g.lineJoin='round';
  for(const pass of [0,1])for(const r of vis){const lw=Math.max(r.k?1:1.6,r.w*sc);
    if(r.k&&pass===0)continue;
    g.strokeStyle=pass?css('--road'):css('--road-edge');g.lineWidth=pass?lw:lw+2;
    if(r.k&&pass){g.strokeStyle=css('--road-edge');g.setLineDash(r.k===2?[2,2]:[4,3]);g.lineWidth=Math.max(1.2,r.w*sc*.6);}
    g.beginPath();for(let i=0;i<r.c.length;i+=2){i?g.lineTo(X(r.c[i]),Y(r.c[i+1])):g.moveTo(X(r.c[i]),Y(r.c[i+1]));}g.stroke();g.setLineDash([]);}
  g.fillStyle=css('--bldg');g.strokeStyle=css('--bldg-edge');g.lineWidth=.7;
  for(const b of BLDG){if(b.x1<vx0||b.x0>vx1||b.y1<vy0||b.y0>vy1)continue;g.beginPath();for(let i=0;i<b.c.length;i+=2){i?g.lineTo(X(b.c[i]),Y(b.c[i+1])):g.moveTo(X(b.c[i]),Y(b.c[i+1]));}g.closePath();g.fill();if(sc>1)g.stroke();}
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
  else shT=setTimeout(()=>{computeShadow(false);drawMap();},150);}

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
  const [fx,fy]=PLACES[from].slice(1),c=w2s(fx,fy),r=dist*scale;
  mx.save();mx.beginPath();mx.rect(0,0,w,h);mx.arc(c[0],c[1],r,0,Math.PI*2);mx.fillStyle=TK.veil;mx.fill('evenodd');mx.restore();
  mx.save();mx.strokeStyle=TK.fg;mx.globalAlpha=.4;mx.lineWidth=1.25;mx.setLineDash([5,6]);mx.beginPath();mx.arc(c[0],c[1],r,0,Math.PI*2);mx.stroke();mx.restore();
  mx.fillStyle=TK.fg;mx.strokeStyle=TK.bg;mx.lineWidth=2.5;mx.beginPath();mx.arc(c[0],c[1],5,0,Math.PI*2);mx.fill();mx.stroke();
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
  cy0=((tr.bottom-ar.top)+(pr.top-ar.top))/2;}
function visH(){const pr=$('panel').getBoundingClientRect(),tr=$('top').getBoundingClientRect();return Math.max(200,pr.top-tr.bottom);}
function fitScale(){return clamp(.46*Math.min(mc.clientWidth,visH())/dist,.35,5);}
function goOverview(ms){const [fx,fy]=PLACES[from].slice(1);fly(fx,fy,fitScale(),ms);}

// gestes : glisser, pincer, molette, toucher un point
const ptrs=new Map();let pinch0=null,moved=0;
mc.addEventListener('pointerdown',e=>{flightId++;mc.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);moved=0;
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0={d:Math.hypot(a[0]-b[0],a[1]-b[1]),s:scale};}});
mc.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const prev=ptrs.get(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===2&&pinch0){const [a,b]=[...ptrs.values()];scale=clamp(pinch0.s*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch0.d,.35,10);moved+=10;}
  else if(ptrs.size===1){const dx=e.clientX-prev[0],dy=e.clientY-prev[1];moved+=Math.abs(dx)+Math.abs(dy);cxw-=dx/scale;cyw+=dy/scale;}
  drawMap();});
function pointerUp(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=null;
  if(moved>6){requestShadow(false);return;}
  if(ptrs.size===0){const r=mc.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;let best=null,bd=28;
    for(const {p} of RES){const q=w2s(p.sx,p.sy),d=Math.hypot(q[0]-px,q[1]-py);if(d<bd){bd=d;best=p;}}
    if(best)select(best);}}
mc.addEventListener('pointerup',pointerUp);
mc.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);pinch0=null;});
mc.addEventListener('wheel',e=>{e.preventDefault();flightId++;scale=clamp(scale*(e.deltaY<0?1.2:1/1.2),.35,10);drawMap();requestShadow(false);},{passive:false});

// ---- cartes
const CARDS=new Map();
function makeCard(p){
  const el=document.createElement('article');el.className='card';el.dataset.i=p.i;
  const th=document.createElement('button');th.className='th';th.setAttribute('aria-label','Agrandir la vue aérienne de '+p.n);
  const img=new Image();img.alt='';img.loading='lazy';img.decoding='async';img.src='thumbs/t'+p.i+'.jpg';th.appendChild(img);
  const m=document.createElement('span');m.className='mk sh';const span=80/1.8;
  m.style.left=(50+(p.sx-p.x)/span*100)+'%';m.style.top=(50-(p.sy-p.y)/span*100)+'%';th.appendChild(m);
  th.onclick=e=>{e.stopPropagation();openLB(p);};
  const ct=document.createElement('div');ct.className='ct';
  ct.innerHTML='<div class="cn"></div><div class="ck"></div><div class="pill"><span class="dot"></span><span class="ptxt"></span></div><div class="links"><a class="go" target="_blank" rel="noopener">Y aller ↗</a><a class="svl" target="_blank" rel="noopener">Street View ↗</a></div>';
  ct.querySelector('.cn').textContent=p.n;ct.querySelector('.go').href=nav(p);ct.querySelector('.svl').href=sv(p);
  el.append(th,ct);el._mk=m;el._pill=ct.querySelector('.pill');el._ptxt=ct.querySelector('.ptxt');el._ck=ct.querySelector('.ck');
  el.addEventListener('click',e=>{if(e.target.closest('a'))return;pick(p);});
  CARDS.set(p.i,el);return el;
}
function paintCard(el,p,d,st){
  const [cls,txt]=pill(p,st),ck=(KIND[p.k]||p.k)+' · '+Math.round(d/10)*10+' m'+(p.o?' · terrasse':'');
  if(el._cls!==cls){el._cls=cls;el._pill.className='pill '+cls;el._mk.className='mk '+(st===2?'sun':'sh');}
  if(el._txt!==txt){el._txt=txt;el._ptxt.textContent=txt;}
  if(el._ckt!==ck){el._ckt=ck;el._ck.textContent=ck;}
  el.classList.toggle('on',p===sel);
}
let trayMode='';
function renderCards(){
  const tray=$('tray');
  if(!G){if(trayMode!=='skel'){trayMode='skel';tray.innerHTML='<div class="skel">Calcul des ombres sur le relief LiDAR…</div>';}return;}
  if(!RES.length){
    const sig='empty'+dist+fSun+from+cat+fTer;if(trayMode===sig)return;trayMode=sig;
    const [fn]=PLACES[from];
    const e=document.createElement('div');e.className='empty';
    e.innerHTML='<b></b><span></span><div class="erow"></div>';
    e.querySelector('b').textContent=fSun?'Aucune terrasse au soleil à cette heure':'Aucune terrasse dans ce rayon';
    e.querySelector('span').textContent='Rayon de '+(dist<1000?dist+' m':(dist/1000).toString().replace('.',',')+' km')+' autour de '+fn+'. Déplacez le curseur de l’heure pour voir passer le soleil.';
    const row=e.querySelector('.erow');
    if(dist<RADII[RADII.length-1]){const b=document.createElement('button');b.className='chip';b.dataset.a='wide';b.textContent='Élargir le rayon';row.appendChild(b);}
    if(fSun){const b=document.createElement('button');b.className='chip';b.dataset.a='shade';b.textContent='Afficher aussi l’ombre';row.appendChild(b);}
    tray.replaceChildren(e);return;
  }
  const list=RES.slice(0,60),els=[];
  for(const {p,d,st} of list){const el=CARDS.get(p.i)||makeCard(p);paintCard(el,p,d,st);els.push(el);}
  const same=trayMode==='cards'&&tray.children.length===els.length&&els.every((e,i)=>tray.children[i]===e);
  if(!same){trayMode='cards';tray.replaceChildren(...els);if(sel)centerCard(sel,false);}
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
  if(p&&o.fly!==false)fly(p.sx,p.sy,o.zoom||(scale<2?2.6:scale));
  drawDial();drawMap();}
function pick(p){if(listOpen)setOpen(false);select(p);}
function setOpen(v){listOpen=v;$('panel').classList.toggle('open',v);$('grab').setAttribute('aria-expanded',v);
  $('grab').setAttribute('aria-label',v?'Replier la liste':'Afficher la liste');
  requestAnimationFrame(()=>{layout();if(sel){centerCard(sel,false);fly(sel.sx,sel.sy,scale,350);}else drawMap();});}

// ---- cadran solaire
const dial=$('dial');
function drawDial(){
  const W=dial.clientWidth,H=dial.clientHeight;if(!W)return;
  const dpr=devicePixelRatio||1;if(dial.width!==Math.round(W*dpr)||dial.height!==Math.round(H*dpr)){dial.width=Math.round(W*dpr);dial.height=Math.round(H*dpr);}
  const g=dial.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const pad=14,y0=H-28,X=m=>pad+(m-M0)/(M1-M0)*(W-2*pad),top=12,aH=y0-8-top,Y=el=>y0-9-(Math.max(0,el)/maxEl)*aH;
  // arc du soleil
  g.lineCap='round';g.lineJoin='round';
  g.strokeStyle=TK.fg;g.globalAlpha=.16;g.lineWidth=1.6;g.beginPath();
  ARC.forEach((el,i)=>{const x=X(M0+i*STEP),y=Y(el);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();g.globalAlpha=1;
  g.strokeStyle=TK.sun;g.lineWidth=3;g.beginPath();let started=false;
  ARC.forEach((el,i)=>{const m=M0+i*STEP;if(m>selMin||el<=.5*D2R)return;const x=X(m),y=Y(el);started?g.lineTo(x,y):g.moveTo(x,y);started=true;});g.stroke();
  // journée de la terrasse choisie (soleil, ombre, nuit), sinon durée du jour
  const bx=X(M0),bw=X(M1)-bx;g.save();g.beginPath();g.roundRect(bx,y0,bw,6,3);g.clip();
  if(sel&&sel.day){const cols=[TK.night,TK.shade,TK.sun];for(let k=0;k<NM;k++){g.fillStyle=cols[sel.day[k]];g.fillRect(X(M0+k*STEP),y0,(W-2*pad)/NM+.7,6);}}
  else{g.fillStyle=TK.fg;g.globalAlpha=.1;g.fillRect(bx,y0,bw,6);g.globalAlpha=1;
    if(sunrise!=null){g.fillStyle=TK.sun;g.globalAlpha=.55;g.fillRect(X(Math.max(M0,sunrise)),y0,X(Math.min(M1,sunset))-X(Math.max(M0,sunrise)),6);g.globalAlpha=1;}}
  g.restore();
  // repères d'heures
  g.fillStyle=TK.muted;g.font='500 11px "DM Sans",sans-serif';g.textAlign='center';g.textBaseline='alphabetic';
  for(const h of [8,12,16,20]){g.fillText(h+' h',X(h*60),H-4);}
  // curseur
  const e=elAt(selMin),up=e>.5*D2R,tx=X(selMin),ty=up?Y(e):y0-9;
  g.strokeStyle=TK.fg;g.globalAlpha=.3;g.lineWidth=1;g.beginPath();g.moveTo(tx,ty);g.lineTo(tx,y0+6);g.stroke();g.globalAlpha=1;
  if(up){const gr=g.createRadialGradient(tx,ty,0,tx,ty,26);gr.addColorStop(0,'rgba(255,176,0,.55)');gr.addColorStop(1,'rgba(255,176,0,0)');g.fillStyle=gr;g.beginPath();g.arc(tx,ty,26,0,Math.PI*2);g.fill();}
  g.fillStyle=up?TK.sun:TK.muted;g.strokeStyle=TK.bg;g.lineWidth=3;g.beginPath();g.arc(tx,ty,9,0,Math.PI*2);g.fill();g.stroke();
  dial.setAttribute('aria-valuenow',selMin);dial.setAttribute('aria-valuetext',hm(selMin));
}
function dialX(cx){const r=dial.getBoundingClientRect(),pad=14;
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
function filter(){
  const [fx,fy]=PLACES[from].slice(1),list=[];
  for(const p of P){const b=BOIRE.has(p.k);if(cat==='boire'&&!b||cat==='manger'&&b)continue;if(fTer&&!p.o)continue;
    const d=Math.hypot(p.sx-fx,p.sy-fy);if(d>dist)continue;const st=stateAt(p,selMin);p.st=st;if(fSun&&st!==2&&p!==sel)continue;list.push({p,d,st});}
  list.sort((a,b)=>a.d-b.d);RES=list;
}
const fmtDate=()=>new Date(dYear,dMonth,dDay).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
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
  $('fSun').setAttribute('aria-pressed',fSun);$('fTer').setAttribute('aria-pressed',fTer);
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
  $('lb').hidden=false;lbImg.onload=drawLB;lbImg.src='thumbs/t'+p.i+'.jpg';if(lbImg.complete)drawLB();$('lbx').focus();}
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
let splashT=setTimeout(()=>showAsk(),reduced?500:3000);
$('splash').addEventListener('click',()=>{clearTimeout(splashT);showAsk();});
function showAsk(){$('askwhen').textContent=fmtDate()+' · '+hm(selMin);go('ask');}
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
    setTimeout(()=>{delete b.dataset.busy;openWalk();},reduced?0:420);});
});

// classement : soleil maintenant, durée du soleil à venir, proximité, terrasse signalée
function topSpots(){
  const [fx,fy]=PLACES[from].slice(1),k=clamp(Math.round((selMin-M0)/STEP),0,NM-1),out=[],R=walkMin*WALK;
  for(const p of P){const b=BOIRE.has(p.k);if(cat==='boire'&&!b||cat==='manger'&&b)continue;
    const d=Math.hypot(p.sx-fx,p.sy-fy);if(d>R)continue;
    const st=stateAt(p,selMin);let j=k;if(st===2)while(j<NM&&p.day[j]===2)j++;
    const sunMin=st===2?(j-k)*STEP:0;
    out.push({p,d,st,sunMin,score:(st===2?1:0)+Math.min(sunMin,240)/240*.8+(1-d/R)*.5+(p.o?.15:0)});}
  out.sort((a,b)=>b.score-a.score);return out.slice(0,5);
}
function spotCard(r,i){
  const {p,d,st}=r,[cls,txt]=pill(p,st);
  const el=document.createElement('button');el.className='spot stg'+(i===0?' first':'');el.style.setProperty('--i',i+2);
  el.innerHTML='<div class="ph"><div class="im"><img alt="" decoding="async"><span class="mk"></span></div><span class="rk"></span></div><div class="sb"><div class="sn"></div><div class="sk"></div><div class="pill"><span class="dot"></span><span class="ptxt"></span></div></div>';
  const img=el.querySelector('img');img.src='thumbs/t'+p.i+'.jpg';img.onerror=()=>{img.style.display='none';};
  const mk=el.querySelector('.mk'),span=80;
  mk.className='mk '+(st===2?'sun':'sh');mk.style.left=(50+(p.sx-p.x)/span*100)+'%';mk.style.top=(50-(p.sy-p.y)/span*100)+'%';
  el.querySelector('.rk').textContent=i===0?'N° 1 · meilleur spot':String(i+1);
  el.querySelector('.sn').textContent=p.n;
  el.querySelector('.sk').textContent=(KIND[p.k]||p.k)+' · '+Math.round(d/10)*10+' m'+(p.o?' · terrasse signalée':'');
  const pl=el.querySelector('.pill');pl.classList.add(cls);el.querySelector('.ptxt').textContent=txt;
  el.addEventListener('click',()=>openMapOn(p));
  return el;
}
let t5List=[];
async function renderTop5(){
  const box=$('t5list');
  const SUN='<span class="sunword"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.500"/><path d="M12 1.500v3.500M12 19v3.500M1.500 12H5M19 12h3.500M4.600 4.600l2.500 2.500M16.900 16.900l2.500 2.500M4.600 19.400l2.500-2.500M16.900 7.100l2.500-2.500"/></svg>au soleil</span>';
  $('t5title').innerHTML=(cat==='boire'?'Bois un verre en terrasse ':'Mange en terrasse ')+SUN+' ici :';
  $('walkChip').querySelector('span').textContent=walkMin+' min à pied max';
  $('t5sub').textContent=fmtDate()+' · '+hm(selMin)+' · ombres calculées en direct';
  $('wname2').textContent=PLACES[from][0];$('from2').value=from;
  if(!G){box.innerHTML='<div class="skel">Calcul des ombres sur le relief LiDAR…</div>';await READY;}
  t5List=topSpots();box.replaceChildren();
  if(!t5List.length){box.innerHTML='<div class="empty"><b>Aucun spot dans ce rayon</b><span>Essayez un autre point de départ.</span></div>';return;}
  t5List.forEach((r,i)=>box.appendChild(spotCard(r,i)));box.scrollTop=0;
}
function showTop5(){go('top5');renderTop5();}
PLACES.forEach((pl,i)=>{const o=document.createElement('option');o.value=i;o.textContent=pl[0];$('from2').appendChild(o);});
$('from2').onchange=e=>{from=+e.target.value;$('from').value=from;save();renderTop5();};
$('t5back').onclick=()=>showAsk();
$('t5map').onclick=()=>{if(t5List.length)openMapOn(t5List[0].p);else openMapOn(null);};
$('back').onclick=()=>{stopPlay();showTop5();};
function openMapOn(p){
  stopPlay();go(null);dist=Math.max(150,walkMin*WALK);save();layout();sel=p||null;filter();
  if(p&&!RES.some(r=>r.p===p))sel=null;
  render(true,true);
  if(sel)select(sel,{zoom:3.2});else goOverview(500);
}

// ---- contrôles
PLACES.forEach((pl,i)=>{const o=document.createElement('option');o.value=i;o.textContent=pl[0];$('from').appendChild(o);});
$('from').value=from;
$("from").onchange=e=>{from=+e.target.value;$("from2").value=from;save();sel=null;goOverview(650);schedule(false);};
$('rad').onclick=()=>{dist=RADII.find(r=>r>dist)||RADII[0];save();goOverview(550);schedule(false);};
$('seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cat=b.dataset.c;save();schedule(false);});
$('fSun').onclick=()=>{fSun=!fSun;save();schedule(false);};
$('fTer').onclick=()=>{fTer=!fTer;schedule(false);};
$('grab').onclick=()=>setOpen(!listOpen);
$('date').onchange=e=>{const v=e.target.value.split('-').map(Number);
  if(v.length===3&&v[0]){stopPlay();[dYear,dMonth,dDay]=[v[0],v[1]-1,v[2]];computeArc();if(G)computeDay();schedule(true);}};
document.querySelector('.datebtn').addEventListener('click',()=>{try{$('date').showPicker();}catch(e){}});
$('now').onclick=()=>{stopPlay();const n=new Date();[dYear,dMonth,dDay]=[n.getFullYear(),n.getMonth(),n.getDate()];
  selMin=clamp(Math.round((n.getHours()*60+n.getMinutes())/5)*5,M0,M1);computeArc();if(G)computeDay();schedule(true);};

// ---- thème
function themeChanged(){readTokens();if(G)buildPlanRaster();drawDial();if(G){schedule(true);if(lbP)drawLB();}}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',themeChanged);
new MutationObserver(themeChanged).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
let rz=0;
new ResizeObserver(()=>{clearTimeout(rz);rz=setTimeout(()=>{layout();placeInd();drawDial();if(G){drawMap();requestShadow(false);}if(lbP)drawLB();},80);}).observe($('app'));
new ResizeObserver(()=>{layout();if(G)drawMap();}).observe($('panel'));

// ---- démarrage
$('play').innerHTML=ICON_PLAY;
layout();updateChrome();drawDial();renderCards();
setTimeout(async()=>{try{
  const L=LIDAR,S=await unpack(L.s,L.w,L.h),T=await unpack(L.t,L.w,L.h);let m=0;for(const v of S)if(v>m)m=v;
  G={x0:L.x0,y1:L.y1,w:L.w,h:L.h,S,T,max:m};buildPlanRaster();
  for(const p of P)[p.sx,p.sy]=openSky(p.x,p.y);computeDay();
  layout();const [fx,fy]=PLACES[from].slice(1);scale=fitScale();[cxw,cyw]=focus(fx,fy,scale);
  filter();render(true,false);readyRes();
}catch(e){$('tray').innerHTML='<div class="empty"><b>Le relief n’a pas pu être chargé</b><span></span></div>';$('tray').querySelector('span').textContent=e.message;readyRes();}},250);

// ---- Autour de moi (géolocalisation)
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),4200);}
let MYIDX=-1;
async function locate(){
  if(!navigator.geolocation){toast('La localisation n’est pas disponible sur cet appareil.');return;}
  const btn=$('loc');btn.classList.add('busy');await READY;
  navigator.geolocation.getCurrentPosition(pos=>{
    btn.classList.remove('busy');
    const x=(pos.coords.longitude-LON)*KX,y=(pos.coords.latitude-LAT)*KY;
    const inside=x>G.x0+30&&x<G.x0+G.w-30&&y<G.y1-30&&y>G.y1-G.h+30;
    if(!inside){toast('Vous êtes hors de la zone couverte : le centre d’Antibes. Choisissez un point de départ dans la liste.');return;}
    if(MYIDX<0){MYIDX=PLACES.length;PLACES.push(['Ma position',x,y]);
      for(const id of ['from','from2']){const o=document.createElement('option');o.value=MYIDX;o.textContent='Ma position';$(id).appendChild(o);}}
    else PLACES[MYIDX]=['Ma position',x,y];
    from=MYIDX;$('from').value=from;$('from2').value=from;sel=null;
    if($('top5').classList.contains('on'))renderTop5();else{goOverview(500);schedule(false);}
  },err=>{
    btn.classList.remove('busy');
    toast(err.code===1?'Localisation refusée. Autorisez-la dans Réglages > Confidentialité > Service de localisation.':'Position introuvable pour le moment. Réessayez dehors ou choisissez un point dans la liste.');
  },{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
}
$('loc').addEventListener('click',locate);

// ---- fenêtre « distance à pied »
function walkTxt(m){const d=m*WALK;return '≈ '+(d<1000?d+' m':(d/1000).toFixed(1).replace('.',',')+' km');}
function paintWalk(){const r=$('walkRange');r.value=walkMin;r.style.setProperty('--p',((walkMin-3)/17*100)+'%');
  $('walkMin').textContent=walkMin;$('walkM').textContent=walkTxt(walkMin);
  document.querySelectorAll('#walk .wc').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.m===walkMin));
  $('walker').style.left=((walkMin-3)/17*100)+'%';}
function openWalk(){$('walkWhat').textContent=cat==='boire'?'Pour boire un verre':'Pour manger dehors';paintWalk();
  const w=$('walk');w.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>w.classList.add('on')));$('walkRange').focus({preventScroll:true});}
function closeWalk(){const w=$('walk');w.classList.remove('on');setTimeout(()=>{if(!w.classList.contains('on'))w.hidden=true;},420);}
$('walkRange').addEventListener('input',e=>{walkMin=+e.target.value;paintWalk();});
document.querySelectorAll('#walk .wc').forEach(b=>b.addEventListener('click',()=>{walkMin=+b.dataset.m;paintWalk();}));
$('walkGo').onclick=()=>{save();closeWalk();if($('top5').classList.contains('on'))renderTop5();else showTop5();};
$('walkX').onclick=closeWalk;$('walkScrim').onclick=closeWalk;
$('walkChip').onclick=openWalk;
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('walk').hidden)closeWalk();});
