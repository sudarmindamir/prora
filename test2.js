
/* ===== GLOBALS ===== */
let gender='male',pplCount='1',rawLock=false;

/* ===== THEME ===== */
function toggleTheme(){const h=document.documentElement,n=h.getAttribute('data-theme')==='dark'?'light':'dark';h.setAttribute('data-theme',n);document.getElementById('thDot').textContent=n==='dark'?'🌙':'☀️';localStorage.setItem('it',n);vpDraw()}
(()=>{const s=localStorage.getItem('it');if(s){document.documentElement.setAttribute('data-theme',s);document.getElementById('thDot').textContent=s==='dark'?'🌙':'☀️'}})();

/* ===== COLLAPSE ===== */
function togCol(el){const p=el.closest?el.closest('.collapse-section,.viewport-container'):el.parentElement;if(!p)return;const b=p.querySelector('.collapse-body,.viewport-body');const a=el.querySelector('.collapse-arrow');if(b)b.classList.toggle('open');if(a)a.classList.toggle('open')}

/* ===== TOGGLES ===== */
function setPpl(v){pplCount=v;document.querySelectorAll('#pplGrp .tog-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===v));document.getElementById('pplCust').classList.toggle('show',v==='custom');gen()}
function setGn(g){gender=g;document.querySelectorAll('#genGrp .tog-btn').forEach(b=>b.classList.toggle('active',b.dataset.v===g));gen()}
function hc(sel,cid){const d=document.getElementById(cid);if(d)d.classList.toggle('show',sel.value==='custom');gen()}
function gv(id){const el=document.getElementById(id);if(!el||!el.value||el.value==='custom'){const cd=document.getElementById(id+'C');if(cd){const inp=cd.querySelector('input');return inp?inp.value.trim():''}return ''}return el.value}

/* ===== LOCK ===== */
function togLk(btn){btn.classList.toggle('locked');const blk=btn.closest('.blk');if(!blk)return;const lk=btn.classList.contains('locked');btn.textContent=lk?'🔒':'🔓';blk.querySelectorAll('select,textarea,input:not([type=checkbox]):not([type=color])').forEach(e=>e.disabled=lk)}

/* ===== COLORS ===== */
function sCol(n){document.getElementById('hex'+n).value=document.getElementById('col'+n).value;gen()}
function hCol(n){let h=document.getElementById('hex'+n).value.trim();if(!h.startsWith('#'))h='#'+h;if(/^#[0-9A-Fa-f]{6}$/.test(h))document.getElementById('col'+n).value=h;gen()}
function getColors(){const m=[['OP','outfit primary'],['OA','outfit accent'],['BG','background']],s=[];m.forEach(([id,lbl])=>{const u=document.getElementById('use'+id);if(u&&u.checked)s.push(`${lbl} hex ${document.getElementById('hex'+id).value.trim()}`)});return s}

/* ===== TEMPLATES ===== */
const tpls=[
  {n:"Street Documentary",d:"Film grain, raw city",tag:"street",s:{pfxGenre:"street documentary",pfxCam:"35mm film analog grain",pfxArt:"raw documentary honesty",environment:"urban street",atmosphere:"dynamic energetic",lighting:"natural window",lens:"35mm environmental",shotSize:"full body",composition:"leading lines",grade:"filmic S-curve"}},
  {n:"Corporate Executive",d:"Studio, clean, professional",tag:"mood",s:{pfxGenre:"corporate headshot",pfxCam:"medium format high fidelity",pfxArt:"quiet confidence understated luxury",environment:"clean studio seamless backdrop",atmosphere:"premium",lighting:"soft editorial softbox",lens:"85mm flattering",shotSize:"medium CU",composition:"centered symmetrical",grade:"clean commercial"}},
  {n:"Fashion Editorial",d:"Magazine, sculpted light",tag:"mood",s:{pfxGenre:"fashion editorial",pfxCam:"cinematic anamorphic",pfxArt:"bold graphic high impact editorial",lighting:"split lighting",shadow:"high sculpted",lens:"85mm flattering",shotSize:"waist up",composition:"negative space",grade:"high contrast punchy"}},
  {n:"Cyberpunk Neon",d:"Neon, rain, techwear",tag:"film",s:{pfxGenre:"cyberpunk neon portrait",pfxCam:"cinematic anamorphic",pfxArt:"cyberpunk neon futurism",environment:"neon-lit city night rain-soaked",atmosphere:"mysterious brooding",lighting:"neon gel",shadow:"high sculpted",wb:"cool 7000K",lens:"35mm environmental",aperture:"f/1.4 bokeh",wardrobe:"techwear cyberpunk",grade:"high contrast punchy"}},
  {n:"High Streetwear",d:"Oversized, urban swagger",tag:"street",s:{pfxGenre:"high streetwear photography",pfxArt:"high streetwear editorial",environment:"urban street",atmosphere:"dynamic energetic",lighting:"natural window",wardrobe:"high streetwear brands",camAngle:"low angle",shotSize:"full body",grade:"high contrast punchy"}},
  {n:"Wes Anderson",d:"Pastel, symmetrical",tag:"film",s:{pfxGenre:"conceptual",pfxCam:"medium format high fidelity",pfxArt:"Wes Anderson pastel symmetry",atmosphere:"nostalgic warm",lighting:"soft editorial softbox",composition:"centered symmetrical",palette:"pastel",grade:"clean commercial"}},
  {n:"Wong Kar-wai",d:"Neon melancholy, blur",tag:"film",s:{pfxGenre:"cinematic film still",pfxCam:"35mm film analog grain",pfxArt:"Wong Kar-wai neon melancholy",environment:"neon-lit city night rain-soaked",atmosphere:"mysterious brooding",lighting:"neon gel",wb:"warm 3200K",grade:"filmic S-curve",resolution:"soft focus"}},
  {n:"Film Noir",d:"B&W, dramatic shadow",tag:"film",s:{pfxGenre:"film noir high contrast",pfxArt:"dark moody cinematic",environment:"dark alley atmospheric",atmosphere:"tense dramatic",lighting:"split lighting",shadow:"chiaroscuro",grade:"B&W",composition:"leading lines"}},
  {n:"Golden Hour",d:"Warm backlight, glow",tag:"mood",s:{pfxGenre:"environmental portrait",pfxArt:"warm human approachable",environment:"outdoor natural",atmosphere:"calm composed",lighting:"golden hour",wb:"golden sunset",grade:"filmic S-curve"}},
];
const tg=document.getElementById('tplGrid');
tpls.forEach((t,i)=>{const c=document.createElement('div');c.className='tpl-card';c.innerHTML=`<div class="tn">${t.n}</div><div class="td">${t.d}</div><span class="tpl-tag ${t.tag}">${t.tag}</span>`;c.onclick=()=>{Object.entries(t.s).forEach(([id,val])=>{const el=document.getElementById(id);if(el&&!el.disabled){const opt=Array.from(el.options).find(o=>o.value===val);if(opt)el.value=val}});gen();toast('Template applied ✓')};tg.appendChild(c)});

/* ===== RE ===== */
function copyRE(){navigator.clipboard.writeText(document.getElementById('rePromptText').textContent).then(()=>toast('RE Prompt copied ✓'))}
function analyzeRE(){
  const inp=document.getElementById('rePaste').value.trim();if(!inp){toast('Paste analysis first');return}
  const btn=document.getElementById('reBtn');btn.classList.add('analyzing');btn.textContent='⏳...';
  setTimeout(()=>{
    const p=parseRE(inp);
    const {filled, custom} = applyRE(p);
    btn.classList.remove('analyzing');
    btn.textContent='🔍 Analyze & Auto-Fill';
    
    // Collapse RE section if open
    const reBody = document.getElementById('reBody');
    if(reBody && reBody.style.display !== 'none') {
       const hdr = reBody.parentElement.querySelector('.col-hdr');
       if(hdr) togCol(hdr);
    }
    
    // Show toast
    toast(`Analysis ✓ ${filled} filled, ${custom} custom`);
    
    // Update internal info
    const ks=Object.keys(p);
    document.getElementById('reResult').innerHTML=`<div style="background:hsl(var(--muted));border:1px solid hsl(var(--border));border-radius:var(--radius);padding:8px;font-size:10px;color:hsl(var(--muted-foreground))"><span style="color:hsl(var(--ok))">✓ ${ks.length} vars parsed (${filled} matched, ${custom} custom)</span></div>`;
    document.getElementById('reResult').style.display='block';
    gen();
  },400);
}
function parseRE(t){const r={};t.split('\n').forEach(l=>{const cl=l.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '');const m=cl.match(/^([A-Z_]+)\s*:\s*(.+)$/i);if(m)r[m[1].trim().toUpperCase()]=m[2].trim().replace(/^\[|\]$/g,'').trim()});return r}
const reMap={PHOTOGRAPHY_GENRE:'pfxGenre',CAMERA_FORMAT:'pfxCam',ART_DIRECTION:'pfxArt',BRAND_INDUSTRY:'brandIndustry',SUBJECT_TYPE:'subjectType',SUBJECT_AGE:'subjectAge',SUBJECT_BUILD:'subjectBuild',SUBJECT_HAIR:'subjectHair',FACIAL_EXPRESSION:'expression',MICRO_EXPRESSION:'microExpr',EYE_INTENSITY:'eyeIntensity',EMOTION_CORE:'emotionCore',POWER_LEVEL:'power',ARCHETYPE:'archetype',ENVIRONMENT:'environment',ATMOSPHERE:'atmosphere',FRAME_DENSITY:'frameDensity',WARDROBE:'wardrobe',WARDROBE_DETAIL:'wardrobeDetail',OUTERWEAR:'outerwear',ACCESSORIES:'accessories',ACTION_POSE:'action',HAND_POSITION:'hand',SUBJECT_FACING:'subjectFacing',GAZE:'subjectFacing',MAKEUP:'makeup',MOTION_BLUR:'motionBlur',FOREGROUND_DISTANCE:'fgDist',BACKGROUND_DISTANCE:'bgDist',FRAMING_CROP:'framing',PALETTE:'palette',LIGHTING:'lighting',SHADOW:'shadow',WHITE_BALANCE:'wb',LENS:'lens',APERTURE:'aperture',CAMERA_ANGLE:'camAngle',SHOT_SIZE:'shotSize',COMPOSITION:'composition',RETOUCH:'retouch',COLOR_GRADE:'grade',RESOLUTION:'resolution',ASPECT_RATIO:'aspectRatio',SUBJECT_ETHNICITY:'ethnicity'};
function fuz(a,b){if(a===b)return 1;const w=a.split(/[\s,]+/).filter(x=>x.length>1);if(!w.length)return 0;let m=0;w.forEach(x=>{if(b.includes(x))m++});return m/w.length}
function applyRE(p){
  let filled=0, custom=0;
  if(p.SUBJECT_GENDER){setGn(p.SUBJECT_GENDER.toLowerCase().includes('female')?'female':'male'); filled++;}
  if(p.PEOPLE_COUNT){const v=p.PEOPLE_COUNT;if(v==='1'||v==='2')setPpl(v);else setPpl('3+'); filled++;}
  ['OUTFIT_HEX','BACKGROUND_HEX'].forEach(k=>{if(p[k]&&p[k].toLowerCase()!=='not specified'){const hex=p[k].replace(/[^#0-9a-fA-F]/g,'');if(/^#?[0-9A-Fa-f]{6}$/.test(hex)){const h=hex.startsWith('#')?hex:'#'+hex;const map={OUTFIT_HEX:'OP',BACKGROUND_HEX:'BG'};const n=map[k];if(n){document.getElementById('col'+n).value=h;document.getElementById('hex'+n).value=h;document.getElementById('use'+n).checked=true; filled++;}}}});
  for(const[rk,fid] of Object.entries(reMap)){
    if(!fid||!p[rk])continue;
    const val=p[rk];
    if(val.toLowerCase()==='none'||val.toLowerCase()==='not specified')continue;
    const el=document.getElementById(fid);
    if(!el||el.disabled)continue;
    if(el.tagName==='TEXTAREA'){el.value=val; filled++; continue}
    if(el.tagName==='SELECT'){
      const isC=val.toLowerCase().startsWith('custom:');
      const cv=isC?val.replace(/^custom:\s*/i,'').trim():val;
      const opts=Array.from(el.options).filter(o=>o.value&&o.value!=='custom');
      let best=null,bs=0;
      opts.forEach(o=>{const s=fuz(cv.toLowerCase(),o.value.toLowerCase());if(s>bs){bs=s;best=o}});
      if(bs>.3&&!isC){el.value=best.value;el.classList.add('auto-filled'); filled++;}
      else{
        const hasC=Array.from(el.options).some(o=>o.value==='custom');
        if(hasC){
          el.value='custom';
          const cd=document.getElementById(fid+'C');
          if(cd){cd.classList.add('show');const inp=cd.querySelector('input');if(inp)inp.value=cv;}
          custom++;
        }
      }
    }
  }
  return {filled, custom};
}

/* ===== PUPPET VIEWPORT ===== */
let vpCanvas,vpCtx,joints={},dragJ=null,hoverJ=null;
const JNAMES={head:'Head',neck:'Neck',shL:'Shoulder L',shR:'Shoulder R',elL:'Elbow L',elR:'Elbow R',haL:'Hand L',haR:'Hand R',hip:'Hip',hiL:'Hip L',hiR:'Hip R',knL:'Knee L',knR:'Knee R',ftL:'Foot L',ftR:'Foot R'};
const BONES=[['head','neck'],['neck','shL'],['neck','shR'],['shL','elL'],['shR','elR'],['elL','haL'],['elR','haR'],['neck','hip'],['hip','hiL'],['hip','hiR'],['hiL','knL'],['hiR','knR'],['knL','ftL'],['knR','ftR']];
const POSES={
  tpose:{head:{x:.5,y:.1},neck:{x:.5,y:.17},shL:{x:.3,y:.21},shR:{x:.7,y:.21},elL:{x:.15,y:.21},elR:{x:.85,y:.21},haL:{x:.05,y:.21},haR:{x:.95,y:.21},hip:{x:.5,y:.44},hiL:{x:.43,y:.47},hiR:{x:.57,y:.47},knL:{x:.42,y:.62},knR:{x:.58,y:.62},ftL:{x:.41,y:.78},ftR:{x:.59,y:.78}},
  stand:{head:{x:.5,y:.1},neck:{x:.5,y:.17},shL:{x:.37,y:.21},shR:{x:.63,y:.21},elL:{x:.33,y:.33},elR:{x:.67,y:.33},haL:{x:.35,y:.43},haR:{x:.65,y:.43},hip:{x:.5,y:.44},hiL:{x:.44,y:.47},hiR:{x:.56,y:.47},knL:{x:.43,y:.62},knR:{x:.57,y:.62},ftL:{x:.42,y:.78},ftR:{x:.58,y:.78}},
  walk:{head:{x:.5,y:.1},neck:{x:.5,y:.17},shL:{x:.37,y:.21},shR:{x:.63,y:.21},elL:{x:.41,y:.32},elR:{x:.59,y:.32},haL:{x:.45,y:.41},haR:{x:.55,y:.41},hip:{x:.5,y:.44},hiL:{x:.44,y:.47},hiR:{x:.56,y:.47},knL:{x:.37,y:.60},knR:{x:.58,y:.64},ftL:{x:.33,y:.78},ftR:{x:.63,y:.78}},
  sit:{head:{x:.5,y:.1},neck:{x:.5,y:.17},shL:{x:.37,y:.21},shR:{x:.63,y:.21},elL:{x:.31,y:.33},elR:{x:.69,y:.33},haL:{x:.33,y:.43},haR:{x:.67,y:.43},hip:{x:.5,y:.44},hiL:{x:.43,y:.47},hiR:{x:.57,y:.47},knL:{x:.33,y:.51},knR:{x:.67,y:.51},ftL:{x:.33,y:.65},ftR:{x:.67,y:.65}},
  lean:{head:{x:.47,y:.1},neck:{x:.48,y:.17},shL:{x:.36,y:.22},shR:{x:.62,y:.20},elL:{x:.29,y:.33},elR:{x:.69,y:.29},haL:{x:.27,y:.43},haR:{x:.73,y:.37},hip:{x:.5,y:.44},hiL:{x:.44,y:.47},hiR:{x:.56,y:.47},knL:{x:.43,y:.62},knR:{x:.58,y:.60},ftL:{x:.42,y:.78},ftR:{x:.60,y:.76}},
  crouch:{head:{x:.5,y:.2},neck:{x:.5,y:.27},shL:{x:.37,y:.31},shR:{x:.63,y:.31},elL:{x:.29,y:.39},elR:{x:.71,y:.39},haL:{x:.31,y:.49},haR:{x:.69,y:.49},hip:{x:.5,y:.47},hiL:{x:.43,y:.49},hiR:{x:.57,y:.49},knL:{x:.33,y:.55},knR:{x:.67,y:.55},ftL:{x:.37,y:.69},ftR:{x:.63,y:.69}},
};
function setPose(n){const p=POSES[n]||POSES.tpose;Object.keys(p).forEach(k=>{joints[k]={...p[k]}});vpDraw()}

function initVP(){
  vpCanvas=document.getElementById('vpCanvas');if(!vpCanvas)return;
  const w=vpCanvas.parentElement;const dpr=window.devicePixelRatio||1;
  vpCanvas.width=w.clientWidth*dpr;vpCanvas.height=w.clientHeight*dpr;
  vpCanvas.style.width=w.clientWidth+'px';vpCanvas.style.height=w.clientHeight+'px';
  vpCtx=vpCanvas.getContext('2d');vpCtx.scale(dpr,dpr);
  setPose('tpose');
  vpCanvas.addEventListener('pointerdown',e=>{const p=cPos(e);dragJ=findJ(p);if(dragJ)vpCanvas.setPointerCapture(e.pointerId)});
  vpCanvas.addEventListener('pointermove',e=>{const p=cPos(e);if(dragJ){joints[dragJ].x=Math.max(.02,Math.min(.98,p.x));joints[dragJ].y=Math.max(.02,Math.min(.98,p.y));vpDraw()}else{const h=findJ(p);if(h!==hoverJ){hoverJ=h;const l=document.getElementById('vpJointLbl');if(h){l.textContent=JNAMES[h];const r=vpCanvas.getBoundingClientRect();l.style.left=(joints[h].x*r.width+8)+'px';l.style.top=(joints[h].y*r.height-12)+'px';l.style.display='block'}else l.style.display='none';vpCanvas.style.cursor=h?'grab':'default';vpDraw()}}});
  vpCanvas.addEventListener('pointerup',e=>{if(dragJ){vpCanvas.releasePointerCapture(e.pointerId);dragJ=null;vpCanvas.style.cursor='default'}});
  vpCanvas.addEventListener('pointerleave',()=>{dragJ=null;hoverJ=null;document.getElementById('vpJointLbl').style.display='none';vpDraw()});
  vpDraw();
}
function cPos(e){const r=vpCanvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
function findJ(p,t){t=t||.035;let c=null,m=Infinity;for(const[n,j] of Object.entries(joints)){const d=Math.hypot(j.x-p.x,j.y-p.y);if(d<t&&d<m){m=d;c=n}}return c}

function vpDraw(){
  if(!vpCtx||!vpCanvas)return;const c=vpCtx,W=vpCanvas.clientWidth,H=vpCanvas.clientHeight;
  const dk=document.documentElement.getAttribute('data-theme')!=='light';
  c.fillStyle=dk?'#0d0d14':'#e8e8e0';c.fillRect(0,0,W,H);
  // Grid
  c.strokeStyle=dk?'#1a1a2a':'#d0d0c8';c.lineWidth=.5;const gy=H*.82;
  for(let i=0;i<20;i++){const x=i*(W/19);c.beginPath();c.moveTo(x,gy);c.lineTo(x,H);c.stroke()}
  for(let i=0;i<6;i++){const y=gy+i*((H-gy)/5);c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
  // Bones
  c.lineCap='round';const fc=dk?'#7c6aff':'#5b46e0',jc=dk?'#e8d84a':'#9e8c10',hc2=dk?'#ff6b6b':'#e03030',dc=dk?'#4ade80':'#22a355';
  c.strokeStyle=fc;c.lineWidth=2.5;
  BONES.forEach(([a,b])=>{if(!joints[a]||!joints[b])return;c.beginPath();c.moveTo(joints[a].x*W,joints[a].y*H);c.lineTo(joints[b].x*W,joints[b].y*H);c.stroke()});
  // Head
  if(joints.head){const hx=joints.head.x*W,hy=joints.head.y*H;c.strokeStyle=fc;c.lineWidth=2;c.beginPath();c.arc(hx,hy,H*.04,0,Math.PI*2);c.stroke();c.fillStyle=jc;c.beginPath();c.arc(hx,hy-H*.015,2,0,Math.PI*2);c.fill()}
  // Joints
  for(const[n,j] of Object.entries(joints)){const jx=j.x*W,jy=j.y*H,r=n==='head'?5:n==='hip'?4:3.5;
    c.fillStyle=n===dragJ?dc:n===hoverJ?hc2:jc;c.beginPath();c.arc(jx,jy,r,0,Math.PI*2);c.fill();
    if(n===hoverJ||n===dragJ){c.strokeStyle=n===dragJ?dc:hc2;c.lineWidth=1.5;c.beginPath();c.arc(jx,jy,r+3,0,Math.PI*2);c.stroke()}}
  // Camera
  const ch=parseInt(document.getElementById('vpCamH').value)||0;
  const camY=H*.45-ch*.3,camX=25;c.fillStyle=dk?'#6ee06b':'#2a8028';
  c.beginPath();c.moveTo(camX+10,camY);c.lineTo(camX,camY-6);c.lineTo(camX,camY+6);c.closePath();c.fill();
  c.fillRect(camX-10,camY-4,10,8);
  c.fillStyle=dk?'rgba(110,224,107,.5)':'rgba(42,128,40,.5)';c.font='7px Manrope';c.textAlign='center';c.fillText('CAM',camX,camY+14);
  // Frame
  const shot=document.getElementById('vpShot').value;let ft=.05,fb=.85,fl=.15,fr=.85;
  if(shot==='close-up'){ft=.02;fb=.35;fl=.3;fr=.7}else if(shot==='medium CU'){ft=.02;fb=.45;fl=.25;fr=.75}else if(shot==='waist up'){fb=.55}else if(shot==='long shot'){fl=.05;fr=.95;ft=0;fb=.9}
  c.strokeStyle=dk?'rgba(255,255,255,.15)':'rgba(0,0,0,.12)';c.lineWidth=1.5;c.setLineDash([5,3]);c.strokeRect(fl*W,ft*H,(fr-fl)*W,(fb-ft)*H);c.setLineDash([]);
  // Info
  const pd=derivePose();c.fillStyle=dk?'rgba(255,255,255,.35)':'rgba(0,0,0,.3)';c.font='8px Manrope';c.textAlign='left';
  c.fillText('Pose: '+pd.body,8,H-16);c.fillText('Head: '+pd.head,8,H-6);
}
function derivePose(){
  const j=joints;let body='standing';
  if(j.knL&&j.hiL){if(Math.abs(j.knL.y-j.hiL.y)<.08)body='crouching';else if(Math.abs(j.knL.x-j.knR.x)>.25)body='sitting';else if(Math.abs(j.ftL.y-j.ftR.y)>.06)body='walking'}
  if(j.shL&&j.shR&&Math.abs(j.shL.y-j.shR.y)>.03)body='leaning';
  if(j.haL&&j.shL&&Math.abs(j.haL.y-j.shL.y)<.04&&j.haL.x<.15)body='t-pose';
  let head='facing camera';if(j.head&&j.neck){const dx=j.head.x-j.neck.x;if(dx<-.03)head='looking left';else if(dx>.03)head='looking right';if(j.head.y<j.neck.y-.08)head='looking up'}
  return{body,head};
}
function vpUpdate(){
  const ch=parseInt(document.getElementById('vpCamH').value);
  const hl=[[-90,"Worm's eye"],[-30,'Low'],[0,'Eye level'],[30,'Slight high'],[90,"Bird's eye"]];
  let cl='Eye level',md=999;hl.forEach(([k,v])=>{const d=Math.abs(k-ch);if(d<md){md=d;cl=v}});
  document.getElementById('vpCamHV').textContent=cl;
  document.getElementById('vpCamDV').textContent=document.getElementById('vpCamD').value;
  vpDraw();
}
function vpAccept(){
  const p=derivePose();
  const pMap={'standing':'standing confidently','walking':'walking purposefully','sitting':'seated at desk','leaning':'leaning against wall','crouching':'crouching low','t-pose':'standing confidently'};
  const hMap={'facing camera':'facing camera directly','looking left':'three-quarter left','looking right':'three-quarter right','looking up':'facing camera directly'};
  const el=id=>document.getElementById(id);
  if(pMap[p.body]){const o=Array.from(el('action').options).find(o=>o.value===pMap[p.body]);if(o)el('action').value=o.value}
  if(hMap[p.head]){const o=Array.from(el('subjectFacing').options).find(o=>o.value===hMap[p.head]);if(o)el('subjectFacing').value=o.value}
  const ch=parseInt(el('vpCamH').value);if(ch<-30)el('camAngle').value='low angle';else if(ch>30)el('camAngle').value='slight high';else el('camAngle').value='eye level';
  const ss=el('vpShot').value;const ssM={'close-up':'close-up','medium CU':'medium CU','medium':'medium CU','waist up':'waist up','full body':'full body','long shot':'long shot'};
  if(ssM[ss]){const o=Array.from(el('shotSize').options).find(o=>o.value===ssM[ss]);if(o)el('shotSize').value=o.value}
  const info=document.getElementById('vpInfo');info.innerHTML=`✅ Applied: Pose→${p.body}, Head→${p.head}, Angle→${el('camAngle').value}, Shot→${el('shotSize').value}`;info.style.display='block';setTimeout(()=>info.style.display='none',4000);
  gen();toast('Viewport applied ✓');
}

/* ===== CONFLICT DETECTION ===== */
const CRULES=[
  {a:'shotSize',b:'lens',ck:(a,b)=>(a.includes('close')||a.includes('CU'))&&b.includes('wide')?'Close-up + wide lens = facial distortion. Use 85mm+ for close-ups.':a.includes('full body')&&b.includes('135')?'Full body + telephoto needs very far distance.':null},
  {a:'environment',b:'frameDensity',ck:(a,b)=>a.includes('studio')&&b.includes('environmental')?'Studio backdrop conflicts with environmental storytelling.':null},
  {a:'retouch',b:'guardrails',ck:(a,b)=>a.includes('beauty')&&b.includes('no plastic')?'Beauty smooth retouch may create plastic skin vs photorealistic guardrail.':null},
  {a:'composition',b:'frameDensity',ck:(a,b)=>a.includes('centered')&&b.includes('environmental')?'Centered composition clashes with environmental density.':null},
  {a:'subjectFacing',b:'expression',ck:(a,b)=>a.includes('back')&&(b.includes('smile')||b.includes('laugh'))?'Back view makes face invisible — expression will be ignored.':null},
  {a:'subjectFacing',b:'microExpr',ck:(a,b)=>a.includes('back')&&b?'Back view + micro-expression = invisible to camera.':null},
  {a:'lighting',b:'environment',ck:(a,b)=>a.includes('softbox')&&b.includes('outdoor')?'Studio softbox in outdoor = contradictory.':a.includes('neon')&&b.includes('studio')&&b.includes('seamless')?'Neon gel rarely matches clean studio.':null},
  {a:'fgDist',b:'bgDist',ck:(a,b)=>a.includes('very close')&&b.includes('very close')?'Both FG and BG very close = cramped depth.':null},
  {a:'shadow',b:'lighting',ck:(a,b)=>a==='chiaroscuro'&&b.includes('high key')?'Chiaroscuro + high key are opposite approaches.':a.includes('low soft')&&b.includes('split')?'Low soft contradicts split lighting.':null},
  {a:'grade',b:'palette',ck:(a,b)=>a==='B&W'&&b.includes('neon')?'B&W grade eliminates neon palette.':null},
  {a:'motionBlur',b:'resolution',ck:(a,b)=>a.includes('heavy')&&b.includes('hyper')?'Heavy blur contradicts hyper detail.':null},
  {a:'aperture',b:'bgDist',ck:(a,b)=>a.includes('f/8')&&b.includes('infinite')?'f/8 + infinite BG = no subject isolation.':null},
  {a:'framing',b:'shotSize',ck:(a,b)=>a.includes('tight face')&&b.includes('full body')?'Tight face crop contradicts full body shot size.':a.includes('forehead')&&b.includes('full body')?'Forehead crop contradicts full body.':null},
  {a:'hand',b:'action',ck:(a,b)=>a.includes('holding')&&b.includes('arms folded')?'Holding object conflicts with arms folded.':a.includes('through hair')&&b.includes('arms folded')?'Through hair conflicts with arms folded.':null},
  {a:'makeup',b:'retouch',ck:(a,b)=>a.includes('heavy glam')&&b.includes('natural pore')?'Heavy glam makeup + natural pore retouch may conflict.':null},
];
function checkConflicts(){
  const cs=[];CRULES.forEach(r=>{const va=gv(r.a),vb=gv(r.b);if(va&&vb){const m=r.ck(va,vb);if(m)cs.push({a:r.a,b:r.b,msg:m})}});
  const area=document.getElementById('conflictArea'),list=document.getElementById('conflictList');
  document.querySelectorAll('.conflict-hl').forEach(el=>el.classList.remove('conflict-hl'));
  if(cs.length){
    area.style.display='block';
    list.innerHTML=cs.map(c=>`<div class="conflict-item" onclick="scrollToConflict('${c.a}','${c.b}')" style="cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='hsl(var(--warn)/0.1)'" onmouseout="this.style.background='hsl(var(--warn)/0.05)'">⚠ <strong>${c.a}</strong> ↔ <strong>${c.b}</strong>: ${c.msg}</div>`).join('');
    cs.forEach(c=>{
      const ea=document.getElementById(c.a), eb=document.getElementById(c.b);
      if(ea) ea.classList.add('conflict-hl');
      if(eb) eb.classList.add('conflict-hl');
    });
  } else area.style.display='none';
}
function scrollToConflict(a,b){
  const el = document.getElementById(a) || document.getElementById(b);
  if(el){
    el.scrollIntoView({behavior:'smooth', block:'center'});
    el.focus();
  }
}

/* ===== PROMPT GENERATION ===== */
function gen(){
  if(rawLock)return;const v=id=>gv(id),lines=[];
  lines.push('=== PREFIX ===');
  if(v('pfxGenre'))lines.push('Genre: '+v('pfxGenre'));
  if(v('pfxCam'))lines.push('Camera Format: '+v('pfxCam'));
  if(v('pfxArt'))lines.push('Art Direction: '+v('pfxArt'));
  const pe=document.getElementById('pfxExtra').value.trim();if(pe)lines.push('Prefix Extra: '+pe);
  if(v('brandIndustry')||v('brandUsage')||v('brandTone')){lines.push('');lines.push('=== BRAND ===');if(v('brandIndustry'))lines.push('Industry: '+v('brandIndustry'));if(v('brandUsage'))lines.push('Usage: '+v('brandUsage'));if(v('brandTone'))lines.push('Tone: '+v('brandTone'))}
  lines.push('');lines.push('=== SCENE DESCRIPTION ===');
  const gl=gender==='female'?'woman':'man';let pl='';if(pplCount==='2')pl='Two people, ';else if(pplCount==='3+')pl='Group, ';else if(pplCount==='custom')pl=(document.getElementById('pplCustVal').value.trim()||'group')+', ';
  lines.push('Subject: '+pl+'A '+gl+(v('subjectType')?', '+v('subjectType'):'')+(v('subjectAge')?', '+v('subjectAge'):'')+(v('subjectBuild')?', '+v('subjectBuild'):''));
  if(v('ethnicity'))lines.push('Ethnicity: '+v('ethnicity'));
  if(v('subjectHair'))lines.push('Hair: '+v('subjectHair'));
  if(v('subjectFacing'))lines.push('Facing: '+v('subjectFacing'));
  if(v('expression'))lines.push('Expression: '+v('expression'));
  if(v('microExpr'))lines.push('Micro-expression: '+v('microExpr'));
  if(v('eyeIntensity'))lines.push('Eye Intensity: '+v('eyeIntensity'));
  if(v('makeup'))lines.push('Makeup: '+v('makeup'));
  if(v('wardrobe'))lines.push('Wardrobe: '+v('wardrobe'));
  const wd=document.getElementById('wardrobeDetail').value.trim();if(wd)lines.push('Wardrobe Detail: '+wd);
  if(v('outerwear'))lines.push('Outerwear: '+v('outerwear'));
  if(v('accessories'))lines.push('Accessories: '+v('accessories'));
  if(v('action'))lines.push('Action: '+v('action'));
  if(v('hand'))lines.push('Hand: '+v('hand'));
  if(v('emotionCore'))lines.push('Emotion: '+v('emotionCore'));
  if(v('power'))lines.push('Power: '+v('power'));
  if(v('archetype'))lines.push('Archetype: '+v('archetype'));
  if(v('environment'))lines.push('Environment: '+v('environment'));
  if(v('atmosphere'))lines.push('Atmosphere: '+v('atmosphere'));
  if(v('frameDensity'))lines.push('Frame Density: '+v('frameDensity'));
  if(v('motionBlur'))lines.push('Motion Blur: '+v('motionBlur'));
  if(v('fgDist'))lines.push('Foreground Distance: '+v('fgDist'));
  if(v('bgDist'))lines.push('Background Distance: '+v('bgDist'));
  const pr=document.getElementById('props').value.trim();if(pr)lines.push('Props: '+pr);
  const se=document.getElementById('sceneExtra').value.trim();if(se)lines.push('Scene Extra: '+se);
  lines.push('');lines.push('=== SUFFIX ===');
  if(v('palette'))lines.push('Palette: '+v('palette'));
  const cs=getColors();if(cs.length)lines.push('Colors: '+cs.join(', '));
  if(v('lighting'))lines.push('Lighting: '+v('lighting'));
  if(v('shadow'))lines.push('Shadow: '+v('shadow'));
  if(v('wb'))lines.push('White Balance: '+v('wb'));
  if(v('lens'))lines.push('Lens: '+v('lens'));
  if(v('aperture'))lines.push('Aperture: '+v('aperture'));
  if(v('camAngle'))lines.push('Camera Angle: '+v('camAngle'));
  if(v('shotSize'))lines.push('Shot Size: '+v('shotSize'));
  if(v('composition'))lines.push('Composition: '+v('composition'));
  if(v('framing'))lines.push('Framing: '+v('framing'));
  if(v('retouch'))lines.push('Retouch: '+v('retouch'));
  if(v('grade'))lines.push('Color Grade: '+v('grade'));
  if(v('resolution'))lines.push('Resolution: '+v('resolution'));
  if(v('guardrails'))lines.push('Guardrails: '+v('guardrails'));
  if(v('aspectRatio'))lines.push('Aspect Ratio: '+v('aspectRatio'));
  const sx=document.getElementById('sfxExtra').value.trim();if(sx)lines.push('Suffix Extra: '+sx);
  const raw=lines.join('\n');const rawEl=document.getElementById('rawEdit');rawEl.value=raw;
  rawStr=raw; 
  buildOut(raw);checkConflicts();
}

function buildOut(raw){
  const sec={prefix:'',scene:'',suffix:'',brand:''};let cur='';
  raw.split('\n').forEach(l=>{if(l.includes('=== PREFIX'))cur='prefix';else if(l.includes('=== BRAND'))cur='brand';else if(l.includes('=== SCENE'))cur='scene';else if(l.includes('=== SUFFIX'))cur='suffix';else if(l.trim())sec[cur]+=(sec[cur]?'\n':'')+l});
  const flat=l=>l.split('\n').map(x=>x.replace(/^[^:]+:\s*/,'')).filter(Boolean).join(', ');
  const pf=flat(sec.prefix),sc=flat(sec.scene),sf=flat(sec.suffix),br=flat(sec.brand);
  const bx=br?` For ${br} brand photography.`:'';
  const cg=`Generate a photorealistic image:\n\n**Style:** ${pf||'Professional photography'}\n\n**Scene:** ${sc}${bx}\n\n**Technical:** ${sf}\n\nIMPORTANT: Real photograph. Natural skin, realistic fabric. No text, watermarks, logos. Correct proportions.`;
  document.getElementById('outChatgpt').textContent=cg;document.getElementById('outChatgpt').dataset.raw=cg;
  const gm=`Professional photograph: ${[pf,sc,sf].filter(Boolean).join(', ')}${bx}\n\nPhotorealistic, magazine quality, no text, no watermark.`;
  document.getElementById('outGemini').textContent=gm;document.getElementById('outGemini').dataset.raw=gm;
  const mg=`${pf}, ${sc}, ${sf}${bx}\n\nUltra resolution, masterful photography, exceptional detail, volumetric lighting, award-winning.`;
  document.getElementById('outMagnific').textContent=mg;document.getElementById('outMagnific').dataset.raw=mg;
}

/* ===== BIDIRECTIONAL RAW SYNC ===== */
const RMAP={'Genre':'pfxGenre','Camera Format':'pfxCam','Art Direction':'pfxArt','Prefix Extra':'pfxExtra','Industry':'brandIndustry','Usage':'brandUsage','Tone':'brandTone','Ethnicity':'ethnicity','Hair':'subjectHair','Facing':'subjectFacing','Expression':'expression','Micro-expression':'microExpr','Eye Intensity':'eyeIntensity','Makeup':'makeup','Wardrobe':'wardrobe','Wardrobe Detail':'wardrobeDetail','Outerwear':'outerwear','Accessories':'accessories','Action':'action','Hand':'hand','Emotion':'emotionCore','Power':'power','Archetype':'archetype','Environment':'environment','Atmosphere':'atmosphere','Frame Density':'frameDensity','Motion Blur':'motionBlur','Foreground Distance':'fgDist','Background Distance':'bgDist','Props':'props','Scene Extra':'sceneExtra','Palette':'palette','Lighting':'lighting','Shadow':'shadow','White Balance':'wb','Lens':'lens','Aperture':'aperture','Camera Angle':'camAngle','Shot Size':'shotSize','Composition':'composition','Framing':'framing','Retouch':'retouch','Color Grade':'grade','Resolution':'resolution','Guardrails':'guardrails','Aspect Ratio':'aspectRatio','Suffix Extra':'sfxExtra'};
function onRawEdit(){
  rawLock=true;clearTimeout(window._rt);
  window._rt=setTimeout(()=>{
    const raw=document.getElementById('rawEdit').value;
    raw.split('\n').forEach(line=>{const m=line.match(/^([^:=]+):\s*(.+)$/);if(!m)return;const lbl=m[1].trim(),val=m[2].trim();if(lbl==='Subject'||lbl==='Colors'||lbl.startsWith('==='))return;
      const fid=RMAP[lbl];if(!fid)return;const el=document.getElementById(fid);if(!el||el.disabled)return;
      if(el.tagName==='TEXTAREA'){el.value=val;return}
      if(el.tagName==='SELECT'){const ex=Array.from(el.options).find(o=>o.value===val);if(ex){el.value=val;return}const opts=Array.from(el.options).filter(o=>o.value&&o.value!=='custom');let best=null,bs=0;opts.forEach(o=>{const s=fuz(val.toLowerCase(),o.value.toLowerCase());if(s>bs){bs=s;best=o}});if(bs>.4&&best)el.value=best.value}});
    buildOut(raw);checkConflicts();rawLock=false;
  },400);
}

/* ===== TABS ===== */
function swTab(t){document.querySelectorAll('.out-tab').forEach(x=>x.classList.toggle('active',x.dataset.t===t));document.querySelectorAll('.out-pane').forEach(x=>x.classList.toggle('active',x.dataset.t===t))}

/* ===== COPY ===== */
function copyOut(t){let txt='';if(t==='raw')txt=document.getElementById('rawEdit').value;else{const el=document.getElementById('out'+t.charAt(0).toUpperCase()+t.slice(1));txt=el.dataset.raw||el.textContent}navigator.clipboard.writeText(txt).then(()=>toast(`Copied ✓`))}

/* ===== SAVE TXT ===== */
function saveTxt(platform){
  let txt='';const ts=new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
  if(!platform||platform==='raw')txt=document.getElementById('rawEdit').value;
  else{const el=document.getElementById('out'+platform.charAt(0).toUpperCase()+platform.slice(1));txt=el.dataset.raw||el.textContent}
  const blob=new Blob([txt],{type:'text/plain'});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`proras-${platform||'raw'}-${ts}.txt`;a.click();URL.revokeObjectURL(a.href);toast('Saved ✓');
}

/* ===== TOAST ===== */
function showToast(msg, ok=false){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.style.background=ok?'hsl(var(--ok))':'hsl(var(--foreground))';
  t.classList.add('show');
  clearTimeout(t.to);
  t.to=setTimeout(()=>t.classList.remove('show'),3000);
}
function toast(m){showToast(m)}

// Dock Controls
function setDockState(state) {
  const dock = document.getElementById('bottomDock');
  if (state === 'minimized') {
    dock.classList.add('dock-minimized');
    dock.classList.remove('dock-fullscreen');
    document.body.classList.remove('spotlight-active');
    document.getElementById('dockMinPreview').textContent = document.getElementById('rawEdit').value.substring(0, 100) + '...';
  } else if (state === 'standard') {
    dock.classList.remove('dock-minimized', 'dock-fullscreen');
    document.body.classList.remove('spotlight-active');
  } else if (state === 'fullscreen') {
    dock.classList.remove('dock-minimized');
    dock.classList.add('dock-fullscreen');
    document.body.classList.add('spotlight-active');
  }
}
function toggleDockMin() { setDockState(document.getElementById('bottomDock').classList.contains('dock-minimized') ? 'standard' : 'minimized'); }
function toggleDockFull() { setDockState(document.getElementById('bottomDock').classList.contains('dock-fullscreen') ? 'standard' : 'fullscreen'); }
function ensureDockVisible() {
  const dock = document.getElementById('bottomDock');
  if (dock.classList.contains('dock-minimized')) {
    setDockState('standard');
  }
}

/* ===== RESET ===== */
function resetAll(){
  document.querySelectorAll('select').forEach(s=>{s.selectedIndex=0;s.classList.remove('auto-filled');s.disabled=false});
  document.querySelectorAll('textarea').forEach(t=>{t.value='';t.disabled=false});
  document.querySelectorAll('.cust-inp').forEach(d=>d.classList.remove('show'));
  document.querySelectorAll('.cust-inp input').forEach(i=>{i.value='';i.disabled=false});
  document.querySelectorAll('.lock-btn').forEach(b=>{b.classList.remove('locked');b.textContent='🔓'});
  setGn('male');setPpl('1');
  ['pfxGenre:editorial portrait','pfxCam:full frame DSLR photorealistic','pfxArt:bold graphic high impact editorial','subjectAge:30s','power:balanced','palette:cool tech tone','lighting:soft editorial softbox','shadow:medium balanced','wb:neutral 5500K','lens:85mm flattering','aperture:f/2.0 shallow','camAngle:eye level','shotSize:medium CU','composition:rule of thirds','retouch:natural pore preserved','grade:clean commercial','resolution:sharp high detail'].forEach(p=>{const[id,val]=p.split(':');document.getElementById(id).value=val});
  setPose('tpose');gen();toast('Reset ✓');
}

/* ===== INIT ===== */
document.querySelectorAll('select').forEach(el=>el.addEventListener('change',()=>{gen();checkConflicts()}));
document.querySelectorAll('textarea:not(.raw-edit):not(#rePaste)').forEach(el=>el.addEventListener('input',gen));
gen();setTimeout(initVP,200);
window.addEventListener('resize',()=>{if(vpCanvas){const w=vpCanvas.parentElement,dpr=window.devicePixelRatio||1;vpCanvas.width=w.clientWidth*dpr;vpCanvas.height=w.clientHeight*dpr;vpCanvas.style.width=w.clientWidth+'px';vpCanvas.style.height=w.clientHeight+'px';vpCtx=vpCanvas.getContext('2d');vpCtx.scale(dpr,dpr);vpDraw()}});

