(function () {
  'use strict';
  window.Widgets = window.Widgets || {};
  const configs = {
    domino: { rows: 8, cols: 8, limit: 31, size: 2, shapes: { D: [[0,0],[0,1]] }, names: { D: 'אבן דומינו' }, short: {D:'דומינו'}, holes: [[0,0],[7,7]], label: 'לוח דומינו, שמונה שורות ושמונה עמודות' },
    tetris: { rows: 4, cols: 5, limit: 5, size: 4, shapes: { I:[[0,0],[0,1],[0,2],[0,3]], O:[[0,0],[0,1],[1,0],[1,1]], L:[[0,0],[1,0],[2,0],[2,1]], M:[[0,0],[1,0],[2,0],[2,1]], S:[[0,1],[0,2],[1,0],[1,1]] }, names: {I:'קו ישר',O:'ריבוע',L:'צורת L ראשונה',M:'צורת L שנייה',S:'זיגזג'}, short:{I:'I',O:'O',L:'L₁',M:'L₂',S:'S'}, holes: [], unique: true, label: 'לוח טטריס, ארבע שורות וחמש עמודות' },
    tromino: { rows: 5, cols: 5, limit: 8, size: 3, shapes: { R:[[0,0],[0,1],[0,2]] }, names: { R:'אריח באורך שלוש' }, short:{R:'אריח'}, holes:[[2,2]], label:'לוח אריחים, חמש שורות וחמש עמודות' }
  };
  const variants = {
    domino: [
      {key:'opposite',label:'שתי פינות נגדיות',holes:[[0,0],[7,7]]}
    ],
    tetris: [
      {key:'double-l',label:'א. שני חלקי L',holes:[]},
      {key:'with-t',label:'ב. מחליפים L אחד ב־T',holes:[]}
    ],
    tromino: [
      {key:'center',label:'א. חור במרכז',holes:[[2,2]]},
      {key:'corner',label:'ב. חור בפינה',holes:[[0,0]]}
    ]
  };
  const copy = a => JSON.parse(JSON.stringify(a));
  function rotate(shape, turns) {
    let cells = shape.map(p => p.slice());
    for (let t=0;t<turns;t++) cells=cells.map(([r,c])=>[c,-r]);
    const minR=Math.min(...cells.map(p=>p[0])), minC=Math.min(...cells.map(p=>p[1]));
    return cells.map(([r,c])=>[r-minR,c-minC]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  }
  const isSame=(a,b)=>a[0]===b[0]&&a[1]===b[1];
  function makeWidget(host, options, type) {
    const cfg=copy(configs[type]);
    const initialVariant=variants[type].find(v=>v.key===options.variant)||variants[type][0];
    const colors=options.colors || ['#63c6ef','#ffb77b','#b6a4ed','#8fdeb1'];
    const names=options.colorNames || ['כחול','כתום','סגול','ירוק'];
    const state={ mode:options.mode||'plain', variant:initialVariant.key, selected:Object.keys(cfg.shapes)[0], turns:0, brush:0, action:'play', paint:Array(cfg.rows*cfg.cols).fill(-1), pieces:[], history:[], holes:copy(initialVariant.holes), nextId:1, status:`${initialVariant.label}. בחרו חלק, ואז לחצו על משבצת כדי להניח אותו.` };
    configureShapes();
    if(state.mode==='free'&&!options.painter) state.action='paint';
    host.classList.add('tl-widget');
    host.innerHTML=`
      <div class="tl-tools tool-row"></div>
      <div class="tl-paint paint-panel" hidden></div>
      <div class="tl-stage">
        <div class="tl-piece-area"><div class="tl-piece-picker" role="group" aria-label="בחירת חלק"></div><p class="tl-piece-instruction widget-note"></p></div>
        <div class="tl-board-shell"><div class="tl-grid" role="group" aria-label="${cfg.label}"></div><svg class="tl-outlines" aria-hidden="true"></svg></div>
      </div>
      <div class="tl-stats stats-row"></div>
      <div class="tl-color-counts" aria-live="polite"></div>
      <p class="tl-status live-status" role="status" aria-live="polite"></p>`;
    const ui={tools:host.querySelector('.tl-tools'), paint:host.querySelector('.tl-paint'), picker:host.querySelector('.tl-piece-picker'), grid:host.querySelector('.tl-grid'), svg:host.querySelector('.tl-outlines'), shell:host.querySelector('.tl-board-shell'), stats:host.querySelector('.tl-stats'), counts:host.querySelector('.tl-color-counts'), status:host.querySelector('.tl-status'), instruction:host.querySelector('.tl-piece-instruction')};
    ui.grid.style.setProperty('--tl-cols',cfg.cols);
    ui.shell.style.setProperty('--tl-max',type==='domino'?'512px':type==='tetris'?'460px':'440px');
    ui.svg.setAttribute('viewBox',`0 0 ${cfg.cols*50} ${cfg.rows*50}`);
    ui.svg.setAttribute('preserveAspectRatio','none');
    function hole(r,c){return state.holes.some(p=>isSame(p,[r,c]));}
    function owner(r,c){return state.pieces.find(p=>p.cells.some(q=>isSame(q,[r,c])));}
    function cellColor(r,c){return state.mode==='plain'?-1:state.mode==='suggested'?(r+c)%(type==='tromino'?3:2):options.painter?options.painter.color(r+','+c):state.paint[r*cfg.cols+c];}
    function status(text,error=false){state.status=text;ui.status.textContent=text;ui.status.classList.toggle('tl-error',error);}
    function currentShape(){return rotate(cfg.shapes[state.selected],state.turns);}
    function candidate(r,c){const shape=currentShape(),anchor=shape[0];return shape.map(([dr,dc])=>[r+dr-anchor[0],c+dc-anchor[1]]);}
    function allowed(cells){return cells.every(([r,c])=>r>=0&&c>=0&&r<cfg.rows&&c<cfg.cols&&!hole(r,c)&&!owner(r,c));}
    function snapshot(){state.history.push({pieces:copy(state.pieces),holes:copy(state.holes),selected:state.selected,turns:state.turns,nextId:state.nextId}); if(state.history.length>100)state.history.shift();}
    function configureShapes(){
      cfg.shapes=copy(configs[type].shapes);cfg.names=copy(configs[type].names);cfg.short=copy(configs[type].short);
      if(type==='tetris'&&state.variant==='with-t'){
        cfg.shapes.M=[[0,0],[0,1],[0,2],[1,1]];cfg.names.M='צורת T';cfg.short.M='T';
      }
    }
    function setVariant(key){
      const variant=variants[type].find(v=>v.key===key);
      if(!variant||variant.key===state.variant)return;
      state.variant=variant.key;state.holes=copy(variant.holes);configureShapes();
      // An undo may only restore moves made with the current board and piece set.
      state.pieces=[];state.history=[];state.nextId=1;state.selected=Object.keys(cfg.shapes)[0];state.turns=0;
      render();status(`${variant.label}. החלקים הוחזרו למגש. נסו לכסות את הלוח.`);
    }
    function setAction(action){state.action=action;render();status(action==='paint'?'בחרו צבע ולחצו על משבצות. אפשר לצבוע גם מתחת לחלקים.':'בחרו חלק ולחצו על הלוח. לחיצה על חלק שכבר הונח מסירה אותו.');}
    function paintCell(r,c){if(hole(r,c))return;state.paint[r*cfg.cols+c]=state.brush;renderBoard();renderCounts();status(state.brush<0?'הצביעה במשבצת נמחקה.':'המשבצת נצבעה. הצביעה נשמרת במעבר בין השלבים.');}
    function place(r,c){
      const found=owner(r,c);
      if(found){snapshot();state.pieces=state.pieces.filter(p=>p.uid!==found.uid);state.selected=found.key;state.turns=found.turns;render();status('החלק הוחזר למגש. אפשר להניח אותו מחדש.');return;}
      if(state.pieces.length>=cfg.limit){status('כל החלקים כבר על הלוח. לחצו על חלק כדי להסיר אותו.',true);return;}
      if(cfg.unique&&state.pieces.some(p=>p.key===state.selected)){status('החלק הזה כבר נמצא על הלוח. בחרו חלק אחר.',true);return;}
      const cells=candidate(r,c);
      if(!allowed(cells)){status('החלק אינו מתאים כאן: בדקו את גבולות הלוח, החור והחלקים שכבר הונחו.',true);return;}
      snapshot();state.pieces.push({uid:state.nextId++,key:state.selected,turns:state.turns,cells});
      if(cfg.unique){const next=Object.keys(cfg.shapes).find(k=>!state.pieces.some(p=>p.key===k));if(next){state.selected=next;state.turns=0;}}
      render();
      const remaining=cfg.rows*cfg.cols-state.holes.length-state.pieces.length*cfg.size;
      status(remaining===0?'הצלחתם! כל המשבצות כוסו בדיוק, בלי חפיפות ובלי חורים.':`החלק הונח. נותרו ${remaining} משבצות לכיסוי.`);
    }
    function clearPreview(){ui.grid.querySelectorAll('.tl-preview,.tl-invalid').forEach(el=>el.classList.remove('tl-preview','tl-invalid'));}
    function preview(r,c){clearPreview();if(options.painter&&options.painter.isPainting()||state.action==='paint'&&state.mode==='free'||owner(r,c))return;const cells=candidate(r,c),valid=allowed(cells);cells.forEach(([rr,cc])=>{const el=ui.grid.querySelector(`[data-r="${rr}"][data-c="${cc}"]`);if(el&&!hole(rr,cc))el.classList.add(valid?'tl-preview':'tl-invalid');});}
    function miniShape(key,turns=key===state.selected?state.turns:0){
      const shape=rotate(cfg.shapes[key],turns), rows=1+Math.max(...shape.map(p=>p[0])),cols=1+Math.max(...shape.map(p=>p[1]));
      return `<span class="tl-mini" style="grid-template-columns:repeat(${cols},13px);grid-template-rows:repeat(${rows},13px)" aria-hidden="true">${shape.map(([r,c],i)=>`<i class="${i===0?'tl-anchor':''}" style="grid-row:${r+1};grid-column:${c+1}"></i>`).join('')}</span>`;
    }
    function renderTools(){
      const variantControl=variants[type].length>1?`<label class="tl-hole-label">חלק בתרגיל <select class="tl-variant${type==='tromino'?' tl-hole':''}" aria-label="בחירת חלק בתרגיל">${variants[type].map(v=>`<option value="${v.key}" ${v.key===state.variant?'selected':''}>${v.label}</option>`).join('')}</select></label>`:'';
      ui.tools.innerHTML=`${variantControl}<button type="button" class="btn secondary tl-undo" ${state.history.length?'':'disabled'}>צעד אחורה</button><button type="button" class="btn secondary tl-reset">ניקוי הלוח</button>`;
      ui.tools.querySelector('.tl-undo').onclick=()=>{const last=state.history.pop();if(!last)return;Object.assign(state,last);render();status('הצעד האחרון בוטל.');};
      ui.tools.querySelector('.tl-reset').onclick=reset;
      const variantPicker=ui.tools.querySelector('.tl-variant');
      if(variantPicker)variantPicker.onchange=e=>setVariant(e.target.value);
    }
    function renderPaint(){
      ui.paint.hidden=!!options.painter||state.mode!=='free';
      if(options.painter||state.mode!=='free')return;
      ui.paint.innerHTML=`<div class="tool-row tl-action-row" role="group" aria-label="כלי עבודה"><button type="button" class="btn tl-action ${state.action==='paint'?'is-active':''}" data-action="paint" aria-pressed="${state.action==='paint'}">צובעים</button><button type="button" class="btn secondary tl-action ${state.action==='play'?'is-active':''}" data-action="play" aria-pressed="${state.action==='play'}">מניחים חלקים</button></div><div class="tool-row tl-brushes" role="group" aria-label="בחירת צבע">${colors.map((color,i)=>`<button class="swatch tl-swatch" type="button" data-brush="${i}" style="background:${color}" aria-label="${names[i]}" aria-pressed="${state.brush===i}"><span>${names[i]}</span></button>`).join('')}<button type="button" class="btn secondary tl-eraser" aria-pressed="${state.brush===-1}">מחק</button><button type="button" class="btn secondary tl-clear">ניקוי צביעה</button></div><p class="widget-note tl-paint-help">הצבעים שייכים למשבצות הלוח. כדי להניח או להסיר חלקים, עברו ל״מניחים חלקים״.</p>`;
      ui.paint.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>setAction(b.dataset.action));
      ui.paint.querySelectorAll('[data-brush]').forEach(b=>b.onclick=()=>{state.brush=Number(b.dataset.brush);state.action='paint';renderPaint();status(`צבע נבחר: ${names[state.brush]}. לחצו על משבצות לצביעה.`);});
      ui.paint.querySelector('.tl-eraser').onclick=()=>{state.brush=-1;state.action='paint';renderPaint();status('המחק נבחר. לחצו על משבצת כדי להסיר את צבעה.');};
      ui.paint.querySelector('.tl-clear').onclick=()=>{state.paint.fill(-1);renderBoard();renderCounts();status('הצביעה החופשית נוקתה. החלקים נשארו במקומם.');};
    }
    function renderPicker(){
      ui.picker.innerHTML=Object.keys(cfg.shapes).map(key=>{const used=cfg.unique&&state.pieces.some(p=>p.key===key);return `<button type="button" draggable="${!used}" class="tl-piece btn ${key===state.selected?'tl-selected':''}" data-shape="${key}" ${used?'disabled':''} aria-pressed="${key===state.selected}" aria-label="${cfg.names[key]}${used?' - כבר על הלוח':key===state.selected?' - לחצו לסיבוב':' - לחצו לבחירה'}">${miniShape(key)}<span>${cfg.short[key]}${used?' ✓':''}</span></button>`;}).join('');
      function selectPiece(button,rotateSelected){
        const key=button.dataset.shape;
        if(state.selected!==key)state.turns=0;
        else if(rotateSelected)state.turns=(state.turns+1)%4;
        state.selected=key;if(state.mode==='free')state.action='play';
      }
      ui.picker.querySelectorAll('[data-shape]').forEach(b=>{
        b.onclick=()=>{
          const key=b.dataset.shape,rotated=state.selected===key,hadFocus=document.activeElement===b;
          selectPiece(b,true);renderPicker();renderPaint();clearPreview();
          if(hadFocus)ui.picker.querySelector(`[data-shape="${key}"]`)?.focus({preventScroll:true});
          status(rotated?'החלק סובב. לחצו בלוח כדי להניח אותו.':'החלק נבחר. לחיצה נוספת עליו במגש תסובב אותו.');
        };
        b.ondragstart=e=>{selectPiece(b,false);e.dataTransfer.setData('text/plain',state.selected);e.dataTransfer.effectAllowed='copy';renderPaint();};
        b.ondragend=()=>{renderPicker();clearPreview();};
      });
      ui.instruction.textContent='לחצו שוב על החלק הנבחר במגש כדי לסובב. לחצו בלוח במקום של הנקודה הלבנה, או גררו. לחיצה על חלק בלוח מסירה אותו.';
    }
    function renderBoard(){
      let html='';
      for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++){
        const removed=hole(r,c),color=cellColor(r,c),piece=owner(r,c),first=piece&&isSame(piece.cells[0],[r,c]);
        const label=`שורה ${r+1}, עמודה ${c+1}${removed?', משבצת חסרה'+(color<0?'':', צבע מקורי: '+names[color]):color<0?', ללא צבע':', '+names[color]}${piece?', חלק '+piece.uid:''}`;
        html+=`<button type="button" class="tl-cell${removed?' tl-hole-cell':''}${piece?' tl-occupied':''}" data-r="${r}" data-c="${c}" style="background:${removed?'#7997a3':color<0?'#f4fbf8':colors[color]}" aria-label="${label}" ${removed?'disabled':''}>${removed?'<span aria-hidden="true">×</span>':first?`<span class="tl-piece-num" aria-hidden="true">${piece.uid}</span>`:''}</button>`;
      }
      ui.grid.innerHTML=html;
      if(state.mode==='suggested')ui.grid.querySelectorAll('.tl-hole-cell').forEach(cell=>{
        const originalColor=cellColor(Number(cell.dataset.r),Number(cell.dataset.c));
        // Keep removed squares disabled and marked while revealing their original color.
        // Inline priority overrides the gray hatch used for holes in the base problem.
        cell.style.setProperty('background',colors[originalColor],'important');
        cell.style.outline='2px dashed #15274b';
        cell.style.outlineOffset='-5px';
      });
      ui.grid.querySelectorAll('.tl-cell:not(:disabled)').forEach(b=>{
        const r=Number(b.dataset.r),c=Number(b.dataset.c);
        b.onclick=()=>{const hadFocus=document.activeElement===b;if(state.mode==='free'&&state.action==='paint')paintCell(r,c);else place(r,c);if(hadFocus)ui.grid.querySelector(`[data-r="${r}"][data-c="${c}"]`)?.focus({preventScroll:true});};
        b.onmouseenter=()=>preview(r,c);
        b.onfocus=()=>preview(r,c);
        b.onblur=clearPreview;
        b.ondragover=e=>{e.preventDefault();preview(r,c);e.dataTransfer.dropEffect='copy';};
        b.ondrop=e=>{e.preventDefault();if(state.mode==='free')state.action='play';place(r,c);};
        b.onkeydown=e=>{const deltas={ArrowRight:[0,1],ArrowLeft:[0,-1],ArrowDown:[1,0],ArrowUp:[-1,0]};if(deltas[e.key]){e.preventDefault();const [dr,dc]=deltas[e.key];ui.grid.querySelector(`[data-r="${r+dr}"][data-c="${c+dc}"]:not(:disabled)`)?.focus();}};
      });
      ui.grid.onmouseleave=clearPreview;
      ui.svg.innerHTML=state.pieces.map(p=>{
        let d='';const has=(r,c)=>p.cells.some(q=>isSame(q,[r,c]));
        p.cells.forEach(([r,c])=>{const x=c*50,y=r*50;if(!has(r-1,c))d+=`M${x},${y}h50`;if(!has(r+1,c))d+=`M${x},${y+50}h50`;if(!has(r,c-1))d+=`M${x},${y}v50`;if(!has(r,c+1))d+=`M${x+50},${y}v50`;});
        return `<path d="${d}" fill="none" stroke="#112640" stroke-width="4" stroke-linejoin="miter"/>`;
      }).join('');
    }
    function renderCounts(){
      const total=cfg.rows*cfg.cols-state.holes.length, covered=state.pieces.length*cfg.size;
      ui.stats.innerHTML=`<span class="stat">חלקים על הלוח: <bdi>${state.pieces.length} / ${cfg.limit}</bdi></span><span class="stat">משבצות פנויות: <b>${total-covered}</b></span>`;
      ui.counts.hidden=state.mode==='plain';if(state.mode==='plain'){ui.counts.innerHTML='';return;}
      const counts=colors.map(()=>({total:0,covered:0}));let blank=0;
      for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++){if(hole(r,c))continue;const color=cellColor(r,c);if(color<0){blank++;continue;}counts[color].total++;if(owner(r,c))counts[color].covered++;}
      const shown=state.mode==='suggested'?(type==='tromino'?3:2):colors.length;
      ui.counts.innerHTML=counts.slice(0,shown).map((v,i)=>`<span class="tl-color-stat"><i style="background:${colors[i]}" aria-hidden="true"></i><b>${names[i]}</b>: ${v.total} בלוח · ${v.covered} מכוסות</span>`).join('')+(state.mode==='free'?`<span class="tl-color-stat">ללא צבע: ${blank}</span>`:'');
    }
    function render(){
      const active=document.activeElement;
      let focus=null;
      if(active&&host.contains(active)){
        if(active.matches('[data-r][data-c]'))focus=`[data-r="${active.dataset.r}"][data-c="${active.dataset.c}"]`;
        else if(active.matches('[data-shape]'))focus=`[data-shape="${active.dataset.shape}"]`;
        else focus=['.tl-variant','.tl-undo','.tl-reset'].find(selector=>active.matches(selector));
      }
      renderTools();renderPaint();renderPicker();renderBoard();renderCounts();ui.status.textContent=state.status;
      if(focus){const same=host.querySelector(focus);const next=same&&!same.disabled?same:ui.picker.querySelector('[data-shape]:not(:disabled)');if(next)next.focus({preventScroll:true});}
    }
    function reset(){if(state.pieces.length)snapshot();state.pieces=[];state.nextId=1;state.selected=Object.keys(cfg.shapes)[0];state.turns=0;render();status('החלקים הוחזרו למגש. הצביעה והחלק הנבחר בתרגיל נשמרו.');}
    render();
    return {
      setMode(mode){if(!['plain','free','suggested'].includes(mode))return;state.mode=mode;state.action=mode==='free'&&!options.painter?'paint':'play';render();status(mode==='free'?'בחרו צבע וצבעו משבצות. אפשר לעבור להנחת חלקים בכל רגע.':mode==='suggested'?'הצביעה מוצגת.':'הצביעה הוסתרה.');},
      reset,
      setVariant,
      repaint:render,
      getState(){return {type,mode:state.mode,variant:state.variant,rows:cfg.rows,cols:cfg.cols,holes:copy(state.holes),pieces:copy(state.pieces),freeColors:state.paint.slice(),selected:state.selected,turns:state.turns,action:state.action,covered:state.pieces.length*cfg.size,remaining:cfg.rows*cfg.cols-state.holes.length-state.pieces.length*cfg.size};}
    };
  }
  Object.keys(configs).forEach(type=>{window.Widgets[type]=(host,options)=>makeWidget(host,options||{},type);});
  window.PisgaTilingMath={rotate,configs};
})();

