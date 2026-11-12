// Deterministic checks of the real pointer handlers with a controlled rAF queue.
// node scripts/check-drag-raf.cjs [index.html]
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const src = fs.readFileSync(process.argv[2] || path.join(__dirname,'..','index.html'),'utf8');
const dragCode = src.slice(src.indexOf('    /* ---- drag the page ---- */'),src.indexOf('    /* ---- Pages sheet ---- */'));
const poseCode = src.slice(src.indexOf('    function poseDragAt(d)'),src.indexOf('    function gateDragFlip(d, dir)'));
function fixture(mag=false) {
  const handlers={}, frames=new Map(), poses=[], settlements=[];
  let id=0, now=1000;
  const wrap={style:{},classList:{add(){},remove(){}},addEventListener(n,fn){handlers[n]=fn;},setPointerCapture(){}};
  const c={performance:{now:()=>now},Math,parseFloat,
    requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},
    bookWrap:wrap,bookEl:{getBoundingClientRect:()=>({left:0,top:0})},
    sheet:{classList:{contains:()=>false}},textIsOpen:false,animating:false,turnGen:1,
    pageSize:300,pageH:300,flipped:0,HALF:30,focusMode:false,turnMode:mag?'magazine':'hardcover',
    camX:0,camAnim:null,focus:0,REDUCED:false,FLIP_MS:950,leafDurMul:1,
    slideSec:0,slideTapPaused:false,glideEl:{style:{transform:'translateX(-150px)'}},
    turnCorner:'bottom',lastPoseP:0,
    isMag:()=>mag,warmAround(){},manualNav(){},
    gateDragFlip(d,dir){d.active=true;d.dir=dir;d.kind='flip';d.g0=-150;d.g1=0;},
    poseLeaf(...args){poses.push(args);},
    poseTurn(F){poses.push(F);return (300-F.x)/600;},
    dragF(d,x,y){return {x:x-300,y};},calcFold(F){return {valid:true,progress:(300-F.x)/600};},
    stateAfter:dir=>dir==='next'?1:-1,camTargetFor:()=>0,tweenCam(){},
    magMs:()=>700,linearEase:t=>t,easeInOutSine:t=>t,
    turnStartF:()=>({x:290,y:298}),turnEndF:()=>({x:-300,y:298}),
    animateLeaf(...args){settlements.push(args);},animateTurnF(...args){settlements.push(args);}
  };
  vm.createContext(c);vm.runInContext(poseCode+'\n'+dragCode,c);
  function event(n,x,y=220){handlers[n]({pointerId:1,clientX:x,clientY:y,target:{closest:()=>null}});}
  function tick(){const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(now);}
  return {c,frames,poses,settlements,event,tick,setNow:v=>now=v};
}
let checks=0;
for (const mag of [false,true]) {
  const f=fixture(mag);
  f.event('pointerdown',590);
  for(let i=1;i<=20;i++)f.event('pointermove',590-i*5);
  assert.equal(f.poses.length,0,'pointermove must not paint');
  assert.equal(f.frames.size,1,'one queued frame per event burst');
  assert.equal(f.c.drag.dx,-100,'latest position retained');
  assert.equal(f.c.drag.samples.length,12,'velocity sample policy retained');
  f.tick();assert.equal(f.poses.length,1,'one pose on frame');
  if(!mag)assert.equal(f.poses[0][0],-60);
  f.event('pointermove',450);f.event('pointermove',430);
  f.setNow(1200);f.event('pointerup',430);
  assert.equal(f.frames.size,0,'release cancels queued drag frame');
  assert.equal(f.poses.length,1,'release must not paint off-frame');
  assert.equal(f.settlements.length,1,'release starts one settle');
  if(!mag)assert.equal(f.settlements[0][0],-96,'settle uses last unpainted position');
  else assert.equal(f.settlements[0][1].x,130,'magazine settle uses last finger');
  f.tick();assert.equal(f.poses.length,1,'no stale callback after release');
  checks++;
}
// Release before ANY queued drag frame: no one-frame old pose at settlement.
{
  const f=fixture();f.event('pointerdown',590);f.event('pointermove',420);f.event('pointerup',420);
  assert.equal(f.poses.length,0);assert.equal(f.settlements[0][0],-102);assert.equal(f.frames.size,0);checks++;
}
// Superseded turns and drag objects cannot paint the previous gesture.
for (const change of [f=>f.c.turnGen++,f=>{f.c.drag=null;}]) {
  const f=fixture();f.event('pointerdown',590);f.event('pointermove',450);change(f);f.tick();
  assert.equal(f.poses.length,0);checks++;
}
// Reverse-turn uses latest position too; cancel behavior is intentionally unchanged.
{
  const f=fixture();f.c.flipped=3;f.event('pointerdown',10);f.event('pointermove',170);f.event('pointercancel',170);
  assert.equal(f.settlements[0][0],-84);assert.equal(f.frames.size,0);checks++;
}
console.log(JSON.stringify({checks,status:'passed',burstMoves:20,posesBeforeFrame:0,posesOnFrame:1,releaseUsesLatest:true}));
