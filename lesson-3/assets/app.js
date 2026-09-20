'use strict';
(() => {
  const {graphs,analyse}=LessonGraphs;
  const svgNS='http://www.w3.org/2000/svg';
  const make=(tag,attrs={},text)=>{const e=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;return e;};
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  function geometry(g,a,b){
    const [x,y]=g.v[a],[ex,ey]=g.v[b],r=26;
    if(a===b){
      const dx=x-300,dy=y-210,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux;
      const p=(out,side)=>[x+ux*out+px*side,y+uy*out+py*side];
      const s=p(15,21),c1=p(90,67),c2=p(90,-67),t=p(15,-21),label=p(77,0);
      return {d:`M${s} C${c1} ${c2} ${t}`,label};
    }
    const dx=ex-x,dy=ey-y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
    const both=g.directed&&g.e.some(([u,v])=>u===b&&v===a);
    if(both){
      const cx=(x+ex)/2+nx*48,cy=(y+ey)/2+ny*48;
      const ls=Math.hypot(cx-x,cy-y),lt=Math.hypot(ex-cx,ey-cy);
      const sx=x+(cx-x)*r/ls,sy=y+(cy-y)*r/ls,tx=ex-(ex-cx)*(r+3)/lt,ty=ey-(ey-cy)*(r+3)/lt;
      return {d:`M${sx},${sy} Q${cx},${cy} ${tx},${ty}`,label:[(sx+2*cx+tx)/4+nx*14,(sy+2*cy+ty)/4+ny*14]};
    }
    return {d:`M${x+dx*r/len},${y+dy*r/len} L${ex-dx*(r+3)/len},${ey-dy*(r+3)/len}`,label:[(x+ex)/2+nx*16,(y+ey)/2+ny*16]};
  }
  let serial=0;
  document.querySelectorAll('[data-graph]').forEach(host=>{
    const g=graphs[host.dataset.graph],analysis=analyse(g),id='graph-'+serial++;
    if(!g)return;
    const interactive=host.dataset.static!=='true';
    const route=[],used=[];let showDegrees=false;
    const map=el('div','graph-map'),info=el('div','graph-info');
    const svg=make('svg',{viewBox:'0 0 600 420',role:'group','aria-label':host.dataset.title||'גרף'});
    map.append(svg);host.append(map,info);
    const degreeLabel=el('label','degree-toggle'),degreeBox=document.createElement('input');degreeBox.type='checkbox';degreeLabel.append(degreeBox,document.createTextNode(g.directed?'הצגת כניסות ויציאות':'הצגת דרגות'));
    info.append(degreeLabel);
    const meta=el('p','meta',`${g.v.length} צמתים · ${g.e.length} קשתות`);info.append(meta);
    const counter=el('p','small'),path=el('p','route'),status=el('p','graph-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const controls=el('div','graph-controls'),undo=el('button','','צעד אחורה'),reset=el('button','','התחלה מחדש');undo.type=reset.type='button';controls.append(undo,reset);
    if(interactive){info.append(counter,path,status,controls);}
    const keyboard=(e,fn)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}};
    function message(text){status.textContent=text;}
    function step(i){
      if(!route.length){message('בחרו תחילה צומת התחלה.');return;}
      if(used.includes(i)){message('בקשת הזאת כבר עברתם. אפשר לבטל צעד ולנסות דרך אחרת.');return;}
      const [a,b]=g.e[i],current=route.at(-1);
      if(a!==current&&(g.directed||b!==current)){message(g.directed?'אי אפשר לעבור בקשת הזאת מהמיקום הנוכחי ובכיוון החץ.':'הקשת אינה מחוברת למיקום הנוכחי.');return;}
      route.push(a===current?b:a);used.push(i);render();
    }
    function nodeClick(v){
      if(!route.length){route.push(v);render();return;}
      const current=route.at(-1),i=g.e.findIndex(([a,b],i)=>!used.includes(i)&&((a===current&&b===v)||(!g.directed&&b===current&&a===v)));
      if(i<0){message('אין מעבר פנוי מתאים לצומת הזה.');return;}step(i);
    }
    function render(){
      const active=document.activeElement;
      const focusedNode=svg.contains(active)?active.getAttribute('data-node'):null;
      const focusedEdge=svg.contains(active)?active.getAttribute('data-edge'):null;
      svg.replaceChildren();const defs=make('defs');svg.append(defs);
      g.e.forEach(([a,b],i)=>{
        const taken=used.includes(i),color=taken?'#2463a6':'#77857b',markerId=id+'-arrow-'+i;
        const marker=make('marker',{id:markerId,viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'3.4',markerHeight:'3.4',orient:'auto'});marker.append(make('path',{d:'M0 0 L10 5 L0 10 Z',fill:color}));defs.append(marker);
        const geom=geometry(g,a,b),group=make('g',{'data-edge':i});
        const label=g.directed?`קשת מ־${a+1} אל ${b+1}`:`קשת בין ${a+1} ל־${b+1}`;
        group.append(make('title',{},label));
        if(interactive){group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',label+(taken?' — נוצלה':''));group.addEventListener('click',()=>step(i));group.addEventListener('keydown',e=>keyboard(e,()=>step(i)));}
        group.append(make('path',{d:geom.d,class:'edge-hit'}));
        const line=make('path',{d:geom.d,class:'edge-line',stroke:color,'stroke-dasharray':taken?'8 4':'none'});if(g.directed)line.setAttribute('marker-end',`url(#${markerId})`);group.append(line);
        if(g.lock){const [lx,ly]=geom.label;group.append(make('text',{x:lx,y:ly+6,'text-anchor':'middle','font-size':18,fill:color,stroke:'#fff','stroke-width':5,'paint-order':'stroke',direction:'ltr'},`${a+1}${b+1}`));}
        svg.append(group);
      });
      g.v.forEach(([x,y],v)=>{
        const group=make('g',{'data-node':v});
        if(interactive){group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',`צומת ${v+1}`);group.addEventListener('click',()=>nodeClick(v));group.addEventListener('keydown',e=>keyboard(e,()=>nodeClick(v)));}
        group.append(make('circle',{cx:x,cy:y,r:25,class:'node',fill:route.at(-1)===v?'#ffda63':'white'}));group.append(make('text',{x,y:y+8,'text-anchor':'middle',class:'node-label'},v+1));
        if(showDegrees){const text=g.directed?`כניסה ${analysis.incoming[v]} · יציאה ${analysis.outgoing[v]}`:`דרגה ${analysis.degree[v]}`;group.append(make('text',{x,y:y+49,'text-anchor':'middle',class:'degree-label',direction:'rtl',stroke:'#fff','stroke-width':5,'paint-order':'stroke'},text));}
        svg.append(group);
      });
      counter.textContent=`קשתות שנוצלו: ${used.length} מתוך ${g.e.length}`;
      path.textContent=route.length?route.map(v=>v+1).join(' → '):'—';
      undo.disabled=!route.length;reset.disabled=!route.length;
      if(!route.length)message('בחרו צומת התחלה.');
      else if(used.length===g.e.length)message(route[0]===route.at(-1)?'הצלחתם: עברתם בכל הקשתות וחזרתם להתחלה.':'הצלחתם: עברתם בכל הקשתות וסיימתם בצומת אחר.');
      else if(!g.e.some(([a,b],i)=>!used.includes(i)&&(a===route.at(-1)||(!g.directed&&b===route.at(-1)))))message('הניסיון הזה נעצר ונשארו קשתות. האם בחירה אחרת תעזור?');
      else message('המשיכו בקשת שטרם נוצלה.');
      if(host.dataset.trace){document.getElementById(host.dataset.trace).textContent=route.length?route.map(v=>v+1).join(''):'—';}
      if(focusedNode!==null)svg.querySelector(`[data-node="${focusedNode}"]`)?.focus({preventScroll:true});
      else if(focusedEdge!==null)svg.querySelector(`[data-edge="${focusedEdge}"]`)?.focus({preventScroll:true});
    }
    undo.addEventListener('click',()=>{route.pop();used.pop();render();});reset.addEventListener('click',()=>{route.length=used.length=0;render();});degreeBox.addEventListener('change',()=>{showDegrees=degreeBox.checked;render();});
    render();
  });
  document.querySelectorAll('[data-lock]').forEach(host=>{
    let n=Number(host.dataset.lock);const digits=[];
    host.classList.add('lock');
    const display=el('div','lock-display','––');display.setAttribute('aria-label','שתי הספרות האחרונות');
    const sequence=el('div','lock-sequence','\u00a0');sequence.setAttribute('aria-label','רצף הלחיצות');
    const keys=el('div','lock-keys');keys.setAttribute('aria-label','כפתורי המנעול');
    const stats=el('div','lock-stats'),progress=el('span','lock-code-count'),count=el('span');stats.append(progress,count);
    const codes=el('div','lock-codes');codes.setAttribute('aria-label','קודים שנבדקו');
    const actions=el('div','lock-actions'),undo=el('button','','ביטול לחיצה'),reset=el('button','','איפוס');undo.type=reset.type='button';actions.append(undo,reset);
    const status=el('p','lock-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    host.append(display,sequence,keys,stats,codes,actions,status);
    const cells=new Map();
    function press(v){digits.push(v);render();}
    function setup(){
      keys.replaceChildren();codes.replaceChildren();cells.clear();keys.style.gridTemplateColumns=`repeat(${n<=3?n:n<=6?3:4},minmax(0,1fr))`;codes.style.gridTemplateColumns=`repeat(${n},minmax(0,1fr))`;
      for(let a=1;a<=n;a++){
        const button=el('button','',String(a));button.type='button';button.dataset.digit=a;button.setAttribute('aria-label',`ספרה ${a}`);button.addEventListener('click',()=>press(String(a)));keys.append(button);
        for(let b=1;b<=n;b++){const code=''+a+b,cell=el('div','lock-code',code);cells.set(code,cell);codes.append(cell);}
      }
      render();
    }
    function render(){
      const seen=new Set();for(let i=1;i<digits.length;i++)seen.add(digits[i-1]+digits[i]);
      const current=digits.length>=2?digits.slice(-2).join(''):'';
      display.textContent=digits.slice(-2).join('').padStart(2,'–');sequence.textContent=digits.join('')||'\u00a0';sequence.scrollTop=sequence.scrollHeight;
      progress.textContent=`${seen.size} מתוך ${n*n} קודים`;count.textContent=digits.length+' לחיצות';
      for(const[code,cell]of cells){cell.classList.toggle('seen',seen.has(code));cell.classList.toggle('current',code===current);cell.setAttribute('aria-label',code+(seen.has(code)?' — נבדק':' — טרם נבדק'));}
      undo.disabled=reset.disabled=!digits.length;
      status.textContent=seen.size===n*n?'כל הקודים נבדקו.':'';
    }
    undo.addEventListener('click',()=>{digits.pop();render();});reset.addEventListener('click',()=>{digits.length=0;render();});
    if(host.dataset.select){document.getElementById(host.dataset.select).addEventListener('change',e=>{n=Number(e.target.value);digits.length=0;setup();});}
    document.addEventListener('keydown',event=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)||event.target.isContentEditable||!host.getClientRects().length)return;
      if(/^[1-9]$/.test(event.key)&&Number(event.key)<=n){event.preventDefault();press(event.key);}
      if(event.key==='Backspace'){event.preventDefault();digits.pop();render();}
    });setup();
  });
})();
