(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const defaults={blur:7.3,grain:.12,period:4.4,palette:'original',stage:5,warp:0,light:0,intro:true,text:'Liquid',family:'',weight:700,spacing:-6};
  let state={...defaults},paused=matchMedia('(prefers-reduced-motion: reduce)').matches,svg;
  const stages=[['字形','路径决定结构；它不会随动画形变。'],['灰度轮廓','三个尺度的内边缘叠加，形成明暗坡度。'],['移动扫描','灰度渐变在移动，字形仍然固定。'],['柔化场','高斯模糊建立连续的灰度过渡。'],['颗粒调制','细噪声乘入灰度场，给色带增加质感。'],['色谱映射','深蓝 → 青 → 奶黄 → 橙红 → 洋红 → 白']];
  // Typography: state.text is rendered as live SVG text in state.family.
  const ctx=document.createElement('canvas').getContext('2d');
  const quote=n=>`'${n.replace(/['"\\]/g,'')}'`;
  const embedded=new Map(); // uploaded family → @font-face rule, inlined on export
  const candidates=['Helvetica Neue','Arial','Arial Black','Avenir Next','Futura','Gill Sans','Impact','DIN Condensed','Georgia','Times New Roman','Didot','Bodoni 72','Baskerville','Menlo','Courier New','Segoe UI','PingFang SC','Hiragino Sans GB','Heiti SC','Songti SC','Kaiti SC','Yuanti SC','Microsoft YaHei','SimHei','SimSun','Noto Sans SC'];
  function installed(name){
    const probe='mmwwlli10中文',w=g=>{ctx.font=`72px ${g}`;return ctx.measureText(probe).width;};
    return ['monospace','serif'].some(g=>w(`${quote(name)}, ${g}`)!==w(g));
  }
  function addFont(name,select){
    const list=$('#font');
    if(![...list.options].some(o=>o.value===name))list.add(new Option(name,name));
    if(select)state.family=name;
  }
  candidates.filter(installed).forEach(n=>addFont(n));
  const fallbackFamily=$('#font').options[0]?.value||'sans-serif';
  if(!$('#font').options.length)addFont(fallbackFamily);
  defaults.family=state.family=fallbackFamily;
  // Scale so the ink (or the cap height, whichever is taller) fills the 129-unit line the filters are tuned for.
  function textSpec(){
    if(!state.family)return null;
    const content=state.text.trim()?state.text:defaults.text,family=`${quote(state.family)}, sans-serif`;
    ctx.font=`${state.weight} 100px ${family}`;
    const m=ctx.measureText(content),cap=ctx.measureText('H').actualBoundingBoxAscent;
    const ink=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,k=129/Math.max(ink,cap,20);
    // state.spacing is in 1/100 em; every glyph but the last adds one gap to the ink width.
    const spacing=state.spacing*k,gaps=Math.max(0,[...content].length-1);
    return {content,family,weight:state.weight,size:100*k,x:m.actualBoundingBoxLeft*k,y:(129-ink*k)/2+m.actualBoundingBoxAscent*k,spacing,width:Math.max(24,(m.actualBoundingBoxLeft+m.actualBoundingBoxRight)*k+spacing*gaps)};
  }
  function render(time) {
    const t=time??svg?.getCurrentTime()??0;
    $('#art').innerHTML=SVGMaterial.create({...state,text:textSpec(),id:'live'});
    svg=$('#art svg');svg.setCurrentTime(t);if(paused)svg.pauseAnimations();
    $('#stage-label').textContent=`0${state.stage+1} / ${stages[state.stage][0]}`;
    $('#stage-caption').textContent=stages[state.stage][1];
    $('#render-tag').textContent=state.warp||state.light?'SVG + SMIL · 扩展材质':'SVG + SMIL · 原生循环';
    document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.stage===state.stage)));
    document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===state.palette)));
    for(const key of ['blur','grain','period','warp','light']){
      $('#'+key).value=state[key];$('#'+key+'-value').textContent=state[key]+(key==='period'?'s':'');
    }
    if($('#text').value!==state.text)$('#text').value=state.text;
    $('#font').value=state.family;$('#weight').value=state.weight;$('#weight-value').textContent=state.weight;
    $('#spacing').value=state.spacing;$('#spacing-value').textContent=(state.spacing/100).toFixed(2)+'em';
    $('#intro-toggle').checked=state.intro;$('#time').max=state.period;
    updatePlay();updateClock();
  }
  function updatePlay(){ $('#play').textContent=paused?'▶':'Ⅱ';$('#play').setAttribute('aria-label',paused?'播放动画':'暂停动画'); }
  function updateClock(){
    const t=svg.getCurrentTime()%state.period;
    $('#time').value=t;$('#clock').textContent=`${t.toFixed(2)} / ${state.period.toFixed(2)}s`;
  }
  function setPaused(value){paused=value;paused?svg.pauseAnimations():svg.unpauseAnimations();updatePlay();updateClock();}
  $('#play').addEventListener('click',()=>setPaused(!paused));
  $('#replay').addEventListener('click',()=>{svg.setCurrentTime(0);setPaused(false);});
  $('#time').addEventListener('input',e=>{
    const requested=+e.target.value;
    const cycle=Math.floor(svg.getCurrentTime()/state.period);
    setPaused(true);svg.setCurrentTime(cycle*state.period+requested);updateClock();
  });
  document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{state.stage=+b.dataset.stage;render();}));
  document.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>{state.palette=b.dataset.palette;state.stage=5;render();}));
  for(const key of ['blur','grain','period','warp','light'])$('#'+key).addEventListener('input',e=>{
    const t=svg.getCurrentTime(),previous=state.period;
    state[key]=+e.target.value;if(key==='warp'||key==='light')state.stage=5;
    render(key==='period'?t*state.period/previous:t);
  });
  $('#text').addEventListener('input',e=>{state.text=e.target.value;render();});
  $('#font').addEventListener('change',e=>{state.family=e.target.value;render();});
  $('#weight').addEventListener('input',e=>{state.weight=+e.target.value;render();});
  $('#spacing').addEventListener('input',e=>{state.spacing=+e.target.value;render();});
  $('#font-file').addEventListener('change',async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    const name=file.name.replace(/\.[^.]+$/,'').replace(/['"\\<>&]/g,'')||'Uploaded';
    try{
      const data=await new Promise((ok,fail)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=fail;r.readAsDataURL(file);});
      const face=new FontFace(name,`url(${data})`,{weight:'100 900'});
      await face.load();document.fonts.add(face);
      embedded.set(name,`@font-face{font-family:${quote(name)};font-weight:100 900;src:url(${data})}`);
      addFont(name,true);render();
      $('#status').textContent=`已载入字体 ${name} · 导出时内嵌 ${(file.size/1024).toFixed(0)} KiB`;
    }catch{$('#status').textContent=`无法读取字体文件 ${file.name}`;}
  });
  if('queryLocalFonts' in window){
    $('#local-fonts').hidden=false;
    $('#local-fonts').addEventListener('click',async()=>{
      try{
        const names=[...new Set((await queryLocalFonts()).map(f=>f.family))].sort((a,b)=>a.localeCompare(b));
        names.forEach(n=>addFont(n));
        $('#status').textContent=`已读取 ${names.length} 个本机字体`;
      }catch{$('#status').textContent='未获得读取本机字体的权限';}
    });
  }
  $('#intro-toggle').addEventListener('change',e=>{state.intro=e.target.checked;render(0);});
  $('#reset').addEventListener('click',()=>{state={...defaults};render(0);$('#status').textContent='已还原默认参数';});
  $('#download').addEventListener('click',()=>{
    const text=textSpec();if(text&&embedded.has(state.family))text.fontFace=embedded.get(state.family);
    const content=SVGMaterial.create({...state,text,stage:5,id:'pro-export'});
    const slug=(text?text.content:'pro').trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu,'-')||'text';
    const url=URL.createObjectURL(new Blob([content],{type:'image/svg+xml'}));
    const a=document.createElement('a');a.href=url;a.download=`${slug}-${state.palette}.svg`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    $('#status').textContent=`已导出完整材质 · ${(new Blob([content]).size/1024).toFixed(1)} KiB · 无 JavaScript${text?(text.fontFace?' · 字体已内嵌':` · 依赖本机字体 ${state.family}`):''}`;
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)svg.pauseAnimations();else if(!paused)svg.unpauseAnimations();});
  render(paused?2.2:0);
  // This loop updates the inspector clock only. SVG/SMIL renders the material itself.
  let last=0;function tick(now){if(now-last>80&&!document.hidden){updateClock();last=now;}requestAnimationFrame(tick);}requestAnimationFrame(tick);
  // Deterministic QA hook; useful for comparing reference timestamps.
  window.lab={seek(t){setPaused(true);svg.setCurrentTime(t);updateClock();},set(patch){state={...state,...patch};render();},get state(){return {...state}},get svg(){return svg}};
})();
